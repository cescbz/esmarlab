"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import { emitInvoice } from "@/lib/billing";
import { getSessionSummary } from "@/lib/cash";
import { StockError } from "@/lib/stock";
import type { ActionResult } from "./customers";

export async function openCashSession(cashRegisterId: string, openingAmount: number): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "CAJA");
  } catch {
    return { ok: false, error: "No tenés permiso para abrir caja." };
  }
  if (!Number.isFinite(openingAmount) || openingAmount < 0) {
    return { ok: false, error: "El monto inicial no puede ser negativo." };
  }
  const register = await prisma.cashRegister.findUnique({ where: { id: cashRegisterId } });
  if (!register || !register.active) return { ok: false, error: "La caja no está disponible." };
  const existing = await prisma.cashSession.findFirst({
    where: { cashRegisterId, status: "ABIERTA" },
  });
  if (existing) return { ok: false, error: "Esta caja ya tiene una sesión abierta." };

  const session = await prisma.cashSession.create({
    data: {
      cashRegisterId,
      userId: "caja",
      openedAt: new Date(),
      openingAmount: Math.round(openingAmount),
      status: "ABIERTA",
    },
  });
  revalidatePath("/caja");
  return { ok: true, id: session.id };
}

const closeSchema = z.object({
  sessionId: z.string().min(1),
  counted: z.record(z.coerce.number().int().min(0)),
  observations: z.string().optional().default(""),
});

export async function closeCashSession(values: unknown): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "CAJA");
  } catch {
    return { ok: false, error: "No tenés permiso para cerrar caja." };
  }
  const parsed = closeSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const summary = await getSessionSummary(parsed.data.sessionId);
  if (!summary) return { ok: false, error: "La sesión no existe." };
  if (summary.session.status === "CERRADA") return { ok: false, error: "Esta caja ya fue cerrada." };

  const details = summary.rows.map((row) => {
    const counted = Math.round(Number(parsed.data.counted[row.methodId] ?? 0));
    return {
      medio: row.name,
      esperado: row.expected,
      contado: counted,
      diferencia: counted - row.expected,
    };
  });
  const totalCounted = details.reduce((sum, detail) => sum + detail.contado, 0);
  const difference = details.reduce((sum, detail) => sum + detail.diferencia, 0);

  await prisma.cashSession.update({
    where: { id: summary.session.id },
    data: {
      status: "CERRADA",
      closedAt: new Date(),
      countedAmount: totalCounted,
      difference,
      closingDetails: details,
      observations: parsed.data.observations || null,
    },
  });
  revalidatePath("/caja");
  return { ok: true, id: summary.session.id };
}

const paymentSchema = z.object({
  paymentMethodId: z.string().min(1, "Seleccioná un medio de pago."),
  amount: z.coerce.number().int().min(1, "El monto debe ser mayor a cero."),
});

const quickSaleSchema = z.object({
  customerId: z.string().min(1, "Seleccioná un cliente."),
  sessionId: z.string().min(1),
  lines: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
      })
    )
    .min(1, "Agregá al menos un producto."),
  payments: z.array(paymentSchema).min(1, "Agregá al menos un medio de pago."),
});

export async function quickSale(values: unknown): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "CAJA");
  } catch {
    return { ok: false, error: "No tenés permiso para vender en caja." };
  }
  const parsed = quickSaleSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const data = parsed.data;

  const [cashSession, customer, variants] = await Promise.all([
    prisma.cashSession.findUnique({
      where: { id: data.sessionId },
      include: { cashRegister: true },
    }),
    prisma.customer.findUnique({ where: { id: data.customerId } }),
    prisma.productVariant.findMany({
      where: { id: { in: data.lines.map((line) => line.variantId) } },
      include: { product: true, priceItems: { where: { priceListId: "pl_general" }, take: 1 } },
    }),
  ]);
  if (!cashSession || cashSession.status !== "ABIERTA") return { ok: false, error: "La caja no está abierta." };
  if (!customer) return { ok: false, error: "El cliente no existe." };

  const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
  const lines = data.lines.map((line) => {
    const variant = variantMap.get(line.variantId);
    if (!variant) throw new Error("Variante inexistente.");
    const price = variant.priceItems[0]?.price ?? variant.priceOverride ?? variant.product.basePrice;
    return {
      variantId: variant.id,
      description: `${variant.product.name} · Talle ${variant.size} · ${variant.color}`,
      quantity: line.quantity,
      unitPrice: price,
      discountPercent: 0,
      taxRate: variant.product.taxRate,
      unitCost: variant.product.cost,
      warehouseId: variant.product.type === "FABRICADO" ? "wh_pt" : "wh_central",
    };
  });

  try {
    const invoice = await emitInvoice({
      customerId: data.customerId,
      expeditionPointId: cashSession.cashRegister.expeditionPointId,
      condition: "CONTADO",
      termDays: 0,
      issueDate: new Date(),
      userId: session.user.username,
      cashSessionId: cashSession.id,
      lines,
      payments: data.payments,
      discountStock: true,
    });
    revalidatePath("/caja");
    revalidatePath("/facturas");
    revalidatePath("/stock");
    revalidatePath("/stock/movimientos");
    return { ok: true, id: invoice.id };
  } catch (error) {
    return { ok: false, error: error instanceof StockError ? error.message : error instanceof Error ? error.message : "No pudimos registrar la venta." };
  }
}

const receiptSchema = z.object({
  customerId: z.string().min(1, "Seleccioná un cliente."),
  sessionId: z.string().min(1),
  date: z.string().min(1),
  observations: z.string().optional().default(""),
  invoices: z
    .array(z.object({ invoiceId: z.string(), amount: z.coerce.number().int().min(1) }))
    .min(1, "Seleccioná al menos una factura."),
  payments: z.array(paymentSchema).min(1, "Agregá al menos un medio de pago."),
});

export async function createReceipt(values: unknown): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "CAJA", "VENTAS");
  } catch {
    return { ok: false, error: "No tenés permiso para registrar cobros." };
  }
  const parsed = receiptSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const data = parsed.data;

  const cashSession = await prisma.cashSession.findUnique({
    where: { id: data.sessionId },
    include: { cashRegister: { include: { expeditionPoint: true } } },
  });
  if (!cashSession || cashSession.status !== "ABIERTA") return { ok: false, error: "La caja no está abierta." };

  const invoices = await prisma.invoice.findMany({
    where: { id: { in: data.invoices.map((invoice) => invoice.invoiceId) }, customerId: data.customerId },
  });
  const invoiceMap = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  for (const allocation of data.invoices) {
    const invoice = invoiceMap.get(allocation.invoiceId);
    if (!invoice) return { ok: false, error: "Una factura no pertenece al cliente." };
    if (allocation.amount > invoice.balance) {
      return { ok: false, error: `El monto aplicado a ${invoice.number} supera el saldo (${invoice.balance}).` };
    }
  }
  const totalAllocations = data.invoices.reduce((sum, allocation) => sum + allocation.amount, 0);
  const totalPayments = data.payments.reduce((sum, payment) => sum + payment.amount, 0);
  if (totalAllocations !== totalPayments) {
    return { ok: false, error: "La suma de pagos debe coincidir con el total aplicado." };
  }

  try {
    const receipt = await prisma.$transaction(async (tx) => {
      const point = cashSession.cashRegister.expeditionPoint;
      const seq = point.lastReceiptNumber + 1;
      await tx.expeditionPoint.update({
        where: { id: point.id },
        data: { lastReceiptNumber: { increment: 1 } },
      });
      const number = `REC-${point.establecimiento}-${point.punto}-${String(seq).padStart(7, "0")}`;
      const created = await tx.receipt.create({
        data: {
          number,
          customerId: data.customerId,
          cashSessionId: cashSession.id,
          expeditionPointId: point.id,
          date: new Date(`${data.date}T12:00:00-03:00`),
          total: totalAllocations,
          userId: session.user.username,
          observations: data.observations || null,
          allocations: {
            create: data.invoices.map((allocation) => ({
              invoiceId: allocation.invoiceId,
              amount: allocation.amount,
            })),
          },
          payments: {
            create: data.payments.map((payment) => ({
              paymentMethodId: payment.paymentMethodId,
              amount: payment.amount,
            })),
          },
          cashMovements: {
            create: data.payments.map((payment) => ({
              cashSessionId: cashSession.id,
              type: "INGRESO_COBRO",
              paymentMethodId: payment.paymentMethodId,
              amount: payment.amount,
              reference: number,
              description: `Cobro ${number}`,
              date: new Date(`${data.date}T12:00:00-03:00`),
            })),
          },
        },
      });
      for (const allocation of data.invoices) {
        await tx.invoice.update({
          where: { id: allocation.invoiceId },
          data: {
            paidAmount: { increment: allocation.amount },
            balance: { decrement: allocation.amount },
          },
        });
      }
      return created;
    });

    revalidatePath("/caja");
    revalidatePath("/recibos");
    revalidatePath("/facturas");
    revalidatePath("/");
    return { ok: true, id: receipt.id };
  } catch {
    return { ok: false, error: "No pudimos registrar el cobro." };
  }
}

const expenseSchema = z.object({
  date: z.string().min(1),
  categoryId: z.string().min(1, "Seleccioná una categoría."),
  supplierId: z.string().optional().nullable(),
  description: z.string().min(3, "Ingresá una descripción."),
  amount: z.coerce.number().int().positive("El monto debe ser mayor a cero."),
  paymentMethodId: z.string().min(1),
  paidFromCash: z.boolean().default(false),
  voucherNumber: z.string().optional().default(""),
  sessionId: z.string().optional().nullable(),
});

export async function createExpense(values: unknown): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "CAJA");
  } catch {
    return { ok: false, error: "No tenés permiso para registrar gastos." };
  }
  const parsed = expenseSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const data = parsed.data;

  let cashSessionId: string | null = null;
  if (data.paidFromCash) {
    const cashSession = data.sessionId
      ? await prisma.cashSession.findUnique({ where: { id: data.sessionId } })
      : await prisma.cashSession.findFirst({ where: { status: "ABIERTA" } });
    if (!cashSession || cashSession.status !== "ABIERTA") {
      return { ok: false, error: "No hay una caja abierta para registrar el gasto." };
    }
    cashSessionId = cashSession.id;
  }

  try {
    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          date: new Date(`${data.date}T12:00:00-03:00`),
          categoryId: data.categoryId,
          supplierId: data.supplierId || null,
          voucherNumber: data.voucherNumber || null,
          description: data.description,
          amount: data.amount,
          taxRate: 10,
          paymentMethodId: data.paymentMethodId,
          cashSessionId,
          paidFromCash: data.paidFromCash,
          userId: session.user.username,
        },
      });
      if (cashSessionId) {
        await tx.cashMovement.create({
          data: {
            cashSessionId,
            type: "EGRESO_GASTO",
            paymentMethodId: data.paymentMethodId,
            amount: data.amount,
            reference: created.voucherNumber ?? created.id,
            description: `Gasto: ${data.description}`,
            date: new Date(`${data.date}T12:00:00-03:00`),
          },
        });
      }
      return created;
    });
    revalidatePath("/caja");
    revalidatePath("/gastos");
    return { ok: true, id: expense.id };
  } catch {
    return { ok: false, error: "No pudimos registrar el gasto." };
  }
}

const withdrawalSchema = z.object({
  sessionId: z.string().min(1),
  amount: z.coerce.number().int().positive("El monto debe ser mayor a cero."),
  description: z.string().optional().default("Retiro de efectivo"),
});

export async function withdrawCash(values: unknown): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "CAJA");
  } catch {
    return { ok: false, error: "No tenés permiso para retirar efectivo." };
  }
  const parsed = withdrawalSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const summary = await getSessionSummary(parsed.data.sessionId);
  if (!summary || summary.session.status !== "ABIERTA") return { ok: false, error: "La caja no está abierta." };
  if (parsed.data.amount > summary.cashExpected) {
    return { ok: false, error: `El efectivo disponible es ${summary.cashExpected}.` };
  }
  await prisma.cashMovement.create({
    data: {
      cashSessionId: parsed.data.sessionId,
      type: "RETIRO",
      paymentMethodId: "pm_EFECTIVO",
      amount: parsed.data.amount,
      description: parsed.data.description || "Retiro de efectivo",
      reference: `RET-${Date.now()}`,
    },
  });
  revalidatePath("/caja");
  return { ok: true };
}
