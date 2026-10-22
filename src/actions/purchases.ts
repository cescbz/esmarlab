"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import { applyMovement } from "@/lib/stock";
import type { ActionResult } from "./customers";

const purchaseLineSchema = z.object({
  variantId: z.string().min(1, "Seleccioná una variante."),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a cero."),
  unitCost: z.coerce.number().int().min(0, "El costo no puede ser negativo."),
});

const purchaseSchema = z.object({
  supplierId: z.string().min(1, "Seleccioná un proveedor."),
  warehouseId: z.string().min(1, "Seleccioná un depósito."),
  supplierInvoiceNumber: z.string().min(1, "Ingresá el número de factura del proveedor."),
  date: z.string().min(1, "Seleccioná la fecha."),
  lines: z.array(purchaseLineSchema).min(1, "Agregá al menos una línea."),
});

async function nextNumber() {
  const count = await prisma.purchaseReceipt.count();
  return `COMP-${String(count + 1).padStart(4, "0")}`;
}

async function applyCosts(
  tx: Prisma.TransactionClient,
  lines: { variantId: string; quantity: number; unitCost: number }[]
) {
  const variants = await tx.productVariant.findMany({
    where: { id: { in: lines.map((line) => line.variantId) } },
    select: { id: true, productId: true },
  });
  const productByVariant = new Map(variants.map((variant) => [variant.id, variant.productId]));
  const grouped = new Map<string, { quantity: number; value: number }>();
  for (const line of lines) {
    const productId = productByVariant.get(line.variantId);
    if (!productId) continue;
    const current = grouped.get(productId) ?? { quantity: 0, value: 0 };
    current.quantity += line.quantity;
    current.value += line.quantity * line.unitCost;
    grouped.set(productId, current);
  }

  for (const [productId, incoming] of Array.from(grouped.entries())) {
    const product = await tx.product.findUnique({ where: { id: productId }, select: { cost: true } });
    if (!product) continue;
    const stock = await tx.stockLevel.aggregate({
      where: { variant: { productId } },
      _sum: { quantity: true },
    });
    const currentQuantity = stock._sum.quantity ?? 0;
    const totalQuantity = currentQuantity + incoming.quantity;
    const newCost =
      totalQuantity > 0
        ? Math.round((currentQuantity * product.cost + incoming.value) / totalQuantity)
        : product.cost;
    await tx.product.update({ where: { id: productId }, data: { cost: newCost } });
  }
}

export async function savePurchase(
  values: unknown,
  confirm: boolean
): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "DEPOSITO");
  } catch {
    return { ok: false, error: "No tenés permiso para registrar compras." };
  }
  const parsed = purchaseSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const data = parsed.data;

  const total = data.lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0);
  const number = await nextNumber();
  const date = new Date(`${data.date}T12:00:00-03:00`);

  try {
    const receipt = await prisma.$transaction(async (tx) => {
      const created = await tx.purchaseReceipt.create({
        data: {
          number,
          supplierId: data.supplierId,
          supplierInvoiceNumber: data.supplierInvoiceNumber,
          warehouseId: data.warehouseId,
          date,
          status: confirm ? "CONFIRMADA" : "BORRADOR",
          total,
          userId: session.user.username,
          lines: {
            create: data.lines.map((line) => ({
              variantId: line.variantId,
              quantity: line.quantity,
              unitCost: line.unitCost,
              lineTotal: line.quantity * line.unitCost,
            })),
          },
        },
      });

      if (confirm) {
        await applyCosts(tx, data.lines);
        for (const line of data.lines) {
          await applyMovement(tx, {
            type: "ENTRADA_COMPRA",
            variantId: line.variantId,
            warehouseId: data.warehouseId,
            quantity: line.quantity,
            unitCost: line.unitCost,
            originType: "PURCHASE",
            originId: created.id,
            userId: session.user.username,
            observation: `Recepción ${number} · factura proveedor ${data.supplierInvoiceNumber}`,
            date,
          });
        }
      }
      return created;
    });
    revalidatePath("/compras");
    revalidatePath("/stock");
    revalidatePath("/stock/movimientos");
    revalidatePath("/productos");
    return { ok: true, id: receipt.id };
  } catch {
    return { ok: false, error: "No pudimos registrar la compra." };
  }
}

export async function confirmPurchase(receiptId: string): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "DEPOSITO");
  } catch {
    return { ok: false, error: "No tenés permiso para confirmar compras." };
  }

  const receipt = await prisma.purchaseReceipt.findUnique({
    where: { id: receiptId },
    include: { lines: true },
  });
  if (!receipt) return { ok: false, error: "La compra no existe." };
  if (receipt.status !== "BORRADOR") return { ok: false, error: "Esta compra ya fue procesada." };

  try {
    await prisma.$transaction(async (tx) => {
      await applyCosts(tx, receipt.lines);
      for (const line of receipt.lines) {
        await applyMovement(tx, {
          type: "ENTRADA_COMPRA",
          variantId: line.variantId,
          warehouseId: receipt.warehouseId,
          quantity: line.quantity,
          unitCost: line.unitCost,
          originType: "PURCHASE",
          originId: receipt.id,
          userId: session.user.username,
          observation: `Recepción ${receipt.number} · factura proveedor ${receipt.supplierInvoiceNumber}`,
          date: receipt.date,
        });
      }
      await tx.purchaseReceipt.update({
        where: { id: receipt.id },
        data: { status: "CONFIRMADA" },
      });
    });
  } catch {
    return { ok: false, error: "No pudimos confirmar la compra." };
  }

  revalidatePath("/compras");
  revalidatePath(`/compras/${receipt.id}`);
  revalidatePath("/stock");
  revalidatePath("/stock/movimientos");
  return { ok: true, id: receipt.id };
}

export async function annulPurchase(receiptId: string): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "DEPOSITO");
  } catch {
    return { ok: false, error: "No tenés permiso para anular compras." };
  }
  const receipt = await prisma.purchaseReceipt.findUnique({ where: { id: receiptId } });
  if (!receipt) return { ok: false, error: "La compra no existe." };
  if (receipt.status === "CONFIRMADA") {
    return { ok: false, error: "Una compra confirmada no se puede anular. Registrá un ajuste de inventario." };
  }
  await prisma.purchaseReceipt.update({ where: { id: receiptId }, data: { status: "ANULADA" } });
  revalidatePath("/compras");
  revalidatePath(`/compras/${receiptId}`);
  return { ok: true, id: receiptId };
}
