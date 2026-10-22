"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import { emitInvoice, emitCreditNote, cancelInvoiceRecord } from "@/lib/billing";
import type { ActionResult } from "./customers";

const orderInvoiceSchema = z.object({
  orderId: z.string().min(1),
  expeditionPointId: z.string().min(1, "Seleccioná un punto de expedición."),
  condition: z.enum(["CONTADO", "CREDITO"]),
  termDays: z.coerce.number().int().min(0).max(365),
  date: z.string().min(1, "Seleccioná la fecha."),
  lines: z
    .array(z.object({ orderLineId: z.string(), quantity: z.coerce.number().int().min(0) }))
    .refine((lines) => lines.some((line) => line.quantity > 0), "Ingresá al menos una cantidad a facturar."),
});

export async function createInvoiceFromOrder(values: unknown): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "VENTAS", "CAJA");
  } catch {
    return { ok: false, error: "No tenés permiso para facturar." };
  }
  const parsed = orderInvoiceSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const data = parsed.data;

  const order = await prisma.salesOrder.findUnique({
    where: { id: data.orderId },
    include: { lines: { include: { variant: { include: { product: true } } } }, customer: true },
  });
  if (!order) return { ok: false, error: "El pedido no existe." };
  if (order.status === "ANULADO") return { ok: false, error: "El pedido está anulado." };

  const lineMap = new Map(order.lines.map((line) => [line.id, line]));
  const invoiceLines = [];
  for (const line of data.lines.filter((line) => line.quantity > 0)) {
    const orderLine = lineMap.get(line.orderLineId);
    if (!orderLine) return { ok: false, error: "Una línea no pertenece al pedido." };
    const pending = orderLine.quantity - orderLine.quantityInvoiced;
    if (line.quantity > pending) {
      return { ok: false, error: `La cantidad de ${orderLine.variant.product.name} supera lo pendiente de facturar (${pending}).` };
    }
    invoiceLines.push({
      variantId: orderLine.variantId,
      description: `${orderLine.variant.product.name} · Talle ${orderLine.variant.size} · ${orderLine.variant.color}`,
      quantity: line.quantity,
      unitPrice: orderLine.unitPrice,
      discountPercent: orderLine.discountPercent,
      taxRate: orderLine.taxRate,
      orderLineId: orderLine.id,
    });
  }
  if (invoiceLines.length === 0) return { ok: false, error: "No hay líneas para facturar." };

  const openSession =
    data.condition === "CONTADO"
      ? await prisma.cashSession.findFirst({
          where: { status: "ABIERTA", cashRegister: { expeditionPointId: data.expeditionPointId } },
          select: { id: true },
        })
      : null;

  try {
    const invoice = await emitInvoice({
      customerId: order.customerId,
      expeditionPointId: data.expeditionPointId,
      condition: data.condition,
      termDays: data.termDays,
      issueDate: new Date(`${data.date}T12:00:00-03:00`),
      userId: session.user.username,
      orderId: order.id,
      lines: invoiceLines,
      cashSessionId: openSession?.id,
      paymentMethodId: "pm_EFECTIVO",
    });
    revalidatePath("/facturas");
    revalidatePath(`/pedidos/${order.id}`);
    revalidatePath("/");
    return { ok: true, id: invoice.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No pudimos emitir la factura." };
  }
}

const directInvoiceSchema = z.object({
  customerId: z.string().min(1, "Seleccioná un cliente."),
  expeditionPointId: z.string().min(1, "Seleccioná un punto de expedición."),
  condition: z.enum(["CONTADO", "CREDITO"]),
  termDays: z.coerce.number().int().min(0).max(365),
  date: z.string().min(1),
  lines: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
        unitPrice: z.coerce.number().int().min(0).optional(),
        discountPercent: z.coerce.number().int().min(0).max(100).default(0),
      })
    )
    .min(1),
});

export async function createDirectInvoice(values: unknown): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "VENTAS", "CAJA");
  } catch {
    return { ok: false, error: "No tenés permiso para facturar." };
  }
  const parsed = directInvoiceSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const data = parsed.data;

  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer) return { ok: false, error: "El cliente no existe." };

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: data.lines.map((line) => line.variantId) } },
    include: {
      product: true,
      priceItems: { where: { priceListId: customer.priceListId }, take: 1 },
    },
  });
  const variantMap = new Map(variants.map((variant) => [variant.id, variant]));

  const lines = data.lines.map((line) => {
    const variant = variantMap.get(line.variantId);
    if (!variant) throw new Error("Variante inexistente.");
    const listPrice = variant.priceItems[0]?.price ?? variant.priceOverride ?? variant.product.basePrice;
    return {
      variantId: variant.id,
      description: `${variant.product.name} · Talle ${variant.size} · ${variant.color}`,
      quantity: line.quantity,
      unitPrice: line.unitPrice ?? listPrice,
      discountPercent: line.discountPercent,
      taxRate: variant.product.taxRate,
    };
  });

  try {
    const invoice = await emitInvoice({
      customerId: data.customerId,
      expeditionPointId: data.expeditionPointId,
      condition: data.condition,
      termDays: data.termDays,
      issueDate: new Date(`${data.date}T12:00:00-03:00`),
      userId: session.user.username,
      lines,
    });
    revalidatePath("/facturas");
    return { ok: true, id: invoice.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No pudimos emitir la factura." };
  }
}

const creditNoteSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce.number().int().positive("El monto debe ser mayor a cero."),
  reason: z.string().min(3, "Ingresá el motivo de la nota de crédito."),
});

export async function createCreditNote(values: unknown): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "VENTAS", "CAJA");
  } catch {
    return { ok: false, error: "No tenés permiso para emitir notas de crédito." };
  }
  const parsed = creditNoteSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  try {
    const note = await emitCreditNote({
      invoiceId: parsed.data.invoiceId,
      amount: parsed.data.amount,
      reason: parsed.data.reason,
      userId: session.user.username,
    });
    revalidatePath("/facturas");
    revalidatePath(`/facturas/${parsed.data.invoiceId}`);
    return { ok: true, id: note.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No pudimos emitir la nota de crédito." };
  }
}

export async function cancelInvoice(invoiceId: string): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "VENTAS", "CAJA");
  } catch {
    return { ok: false, error: "No tenés permiso para cancelar facturas." };
  }
  try {
    await cancelInvoiceRecord(invoiceId, session.user.username);
    revalidatePath("/facturas");
    revalidatePath(`/facturas/${invoiceId}`);
    return { ok: true, id: invoiceId };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No pudimos cancelar la factura." };
  }
}
