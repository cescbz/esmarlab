"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import { applyMovement, StockError } from "@/lib/stock";
import type { ActionResult } from "./customers";

const transferSchema = z.object({
  variantId: z.string().min(1, "Seleccioná un producto."),
  fromWarehouseId: z.string().min(1, "Seleccioná el depósito de origen."),
  toWarehouseId: z.string().min(1, "Seleccioná el depósito de destino."),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a cero."),
  observation: z.string().optional().default(""),
});

export async function transferStock(values: unknown): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "DEPOSITO");
  } catch {
    return { ok: false, error: "No tenés permiso para mover stock." };
  }
  const parsed = transferSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const data = parsed.data;
  if (data.fromWarehouseId === data.toWarehouseId) {
    return { ok: false, error: "El depósito de origen y destino deben ser distintos." };
  }

  const variant = await prisma.productVariant.findUnique({
    where: { id: data.variantId },
    include: { product: true },
  });
  if (!variant) return { ok: false, error: "El producto no existe." };

  try {
    await prisma.$transaction(async (tx) => {
      const reference = `TRF-${Date.now()}`;
      await applyMovement(tx, {
        type: "TRANSFERENCIA_SALIDA",
        variantId: data.variantId,
        warehouseId: data.fromWarehouseId,
        quantity: data.quantity,
        unitCost: variant.product.cost,
        originType: "TRANSFER",
        originId: reference,
        userId: session.user.username,
        observation: data.observation || "Transferencia entre depósitos",
      });
      await applyMovement(tx, {
        type: "TRANSFERENCIA_ENTRADA",
        variantId: data.variantId,
        warehouseId: data.toWarehouseId,
        quantity: data.quantity,
        unitCost: variant.product.cost,
        originType: "TRANSFER",
        originId: reference,
        userId: session.user.username,
        observation: data.observation || "Transferencia entre depósitos",
      });
    });
  } catch (error) {
    return { ok: false, error: error instanceof StockError ? error.message : "No pudimos transferir el stock." };
  }

  revalidatePath("/stock");
  revalidatePath("/stock/transferencias");
  revalidatePath("/stock/movimientos");
  return { ok: true };
}

const adjustmentSchema = z.object({
  variantId: z.string().min(1, "Seleccioná un producto."),
  warehouseId: z.string().min(1, "Seleccioná un depósito."),
  direction: z.enum(["POSITIVO", "NEGATIVO"]),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a cero."),
  reason: z.string().min(1, "Seleccioná un motivo."),
  observation: z.string().optional().default(""),
});

export async function adjustStock(values: unknown): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "DEPOSITO");
  } catch {
    return { ok: false, error: "No tenés permiso para ajustar stock." };
  }
  const parsed = adjustmentSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const data = parsed.data;

  const variant = await prisma.productVariant.findUnique({
    where: { id: data.variantId },
    include: { product: true },
  });
  if (!variant) return { ok: false, error: "El producto no existe." };

  try {
    await prisma.$transaction(async (tx) => {
      await applyMovement(tx, {
        type: data.direction === "POSITIVO" ? "AJUSTE_POSITIVO" : "AJUSTE_NEGATIVO",
        variantId: data.variantId,
        warehouseId: data.warehouseId,
        quantity: data.quantity,
        unitCost: variant.product.cost,
        originType: "ADJUSTMENT",
        originId: data.reason,
        userId: session.user.username,
        observation: data.observation || data.reason,
      });
    });
  } catch (error) {
    return { ok: false, error: error instanceof StockError ? error.message : "No pudimos registrar el ajuste." };
  }

  revalidatePath("/stock");
  revalidatePath("/stock/ajustes");
  revalidatePath("/stock/movimientos");
  return { ok: true };
}
