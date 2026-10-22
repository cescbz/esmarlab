"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import { quoteSchema } from "@/lib/validators/quote";
import type { ActionResult } from "./customers";

export async function saveQuote(
  values: unknown,
  quoteId: string | undefined,
  send: boolean
): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "VENTAS");
  } catch {
    return { ok: false, error: "No tenés permiso para gestionar presupuestos." };
  }
  const parsed = quoteSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const data = parsed.data;

  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer || !customer.active) return { ok: false, error: "El cliente no está disponible." };

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: data.lines.map((line) => line.variantId) } },
    include: { product: true },
  });
  const variantMap = new Map(variants.map((variant) => [variant.id, variant]));

  const lines = data.lines.map((line) => {
    const variant = variantMap.get(line.variantId);
    if (!variant) throw new Error("Variante inexistente");
    return {
      variantId: line.variantId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountPercent: line.discountPercent,
      isCustomized: line.isCustomized,
      customizationDetail: line.isCustomized ? line.customizationDetail || "Personalización con logo" : null,
      taxRate: variant.product.taxRate,
      lineTotal: Math.round(line.unitPrice * line.quantity * (1 - line.discountPercent / 100)),
    };
  });
  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const date = new Date(`${data.date}T12:00:00-03:00`);

  try {
    if (quoteId) {
      const existing = await prisma.quote.findUnique({ where: { id: quoteId } });
      if (!existing) return { ok: false, error: "El presupuesto no existe." };
      if (existing.status === "APROBADO" || existing.status === "RECHAZADO") {
        return { ok: false, error: "No se puede editar un presupuesto aprobado o rechazado." };
      }
      await prisma.$transaction(async (tx) => {
        await tx.quoteLine.deleteMany({ where: { quoteId } });
        await tx.quote.update({
          where: { id: quoteId },
          data: {
            customerId: data.customerId,
            date,
            validityDays: data.validityDays,
            observations: data.observations || null,
            subtotal: total,
            total,
            status: send ? "ENVIADO" : existing.status,
            lines: { create: lines },
          },
        });
      });
      revalidatePath("/presupuestos");
      revalidatePath(`/presupuestos/${quoteId}`);
      return { ok: true, id: quoteId };
    }

    const count = await prisma.quote.count();
    const quote = await prisma.quote.create({
      data: {
        number: `PRES-${String(count + 1).padStart(4, "0")}`,
        customerId: data.customerId,
        date,
        validityDays: data.validityDays,
        observations: data.observations || null,
        subtotal: total,
        total,
        status: send ? "ENVIADO" : "BORRADOR",
        userId: "ventas",
        lines: { create: lines },
      },
    });
    revalidatePath("/presupuestos");
    return { ok: true, id: quote.id };
  } catch {
    return { ok: false, error: "No pudimos guardar el presupuesto. Intentá nuevamente." };
  }
}

export async function markQuoteSent(quoteId: string): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "VENTAS");
  } catch {
    return { ok: false, error: "No tenés permiso." };
  }
  await prisma.quote.update({ where: { id: quoteId }, data: { status: "ENVIADO" } });
  revalidatePath("/presupuestos");
  revalidatePath(`/presupuestos/${quoteId}`);
  return { ok: true, id: quoteId };
}

export async function rejectQuote(quoteId: string): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "VENTAS");
  } catch {
    return { ok: false, error: "No tenés permiso." };
  }
  await prisma.quote.update({ where: { id: quoteId }, data: { status: "RECHAZADO" } });
  revalidatePath("/presupuestos");
  revalidatePath(`/presupuestos/${quoteId}`);
  return { ok: true, id: quoteId };
}

export async function approveQuote(quoteId: string): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "VENTAS");
  } catch {
    return { ok: false, error: "No tenés permiso para aprobar presupuestos." };
  }

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lines: true, customer: true, orders: true },
  });
  if (!quote) return { ok: false, error: "El presupuesto no existe." };
  if (quote.status === "APROBADO" && quote.orders[0]) {
    return { ok: true, id: quote.orders[0].id };
  }
  if (quote.lines.length === 0) return { ok: false, error: "El presupuesto no tiene líneas." };

  try {
    const order = await prisma.$transaction(async (tx) => {
      const count = await tx.salesOrder.count();
      const created = await tx.salesOrder.create({
        data: {
          number: `PED-${String(count + 1).padStart(4, "0")}`,
          customerId: quote.customerId,
          quoteId: quote.id,
          date: new Date(),
          deliveryDate: new Date(Date.now() + 7 * 86_400_000),
          shippingAddress: [quote.customer.address, quote.customer.city].filter(Boolean).join(", "),
          status: "PENDIENTE",
          observations: quote.observations,
          total: quote.total,
          userId: "ventas",
          lines: {
            create: quote.lines.map((line) => ({
              variantId: line.variantId,
              quantity: line.quantity,
              quantityShipped: 0,
              quantityInvoiced: 0,
              unitPrice: line.unitPrice,
              discountPercent: line.discountPercent,
              taxRate: line.taxRate,
              lineTotal: line.lineTotal,
              isCustomized: line.isCustomized,
              customizationDetail: line.customizationDetail,
            })),
          },
        },
      });
      await tx.quote.update({ where: { id: quote.id }, data: { status: "APROBADO" } });
      return created;
    });
    revalidatePath("/presupuestos");
    revalidatePath(`/presupuestos/${quoteId}`);
    revalidatePath("/pedidos");
    return { ok: true, id: order.id };
  } catch {
    return { ok: false, error: "No pudimos generar el pedido." };
  }
}
