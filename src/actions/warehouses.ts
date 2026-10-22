"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import type { ActionResult } from "./customers";

const warehouseSchema = z.object({
  name: z.string().min(2, "Ingresá el nombre del depósito."),
  type: z.string().min(1, "Seleccioná el tipo."),
  active: z.boolean().default(true),
});

export async function saveWarehouse(values: unknown, warehouseId?: string): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "DEPOSITO");
  } catch {
    return { ok: false, error: "No tenés permiso para administrar depósitos." };
  }
  const parsed = warehouseSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  const duplicate = await prisma.warehouse.findFirst({
    where: { name: parsed.data.name, ...(warehouseId ? { id: { not: warehouseId } } : {}) },
  });
  if (duplicate) return { ok: false, error: "Ya existe un depósito con ese nombre." };

  if (warehouseId) {
    await prisma.warehouse.update({ where: { id: warehouseId }, data: parsed.data });
    revalidatePath("/depositos");
    return { ok: true, id: warehouseId };
  }
  const warehouse = await prisma.warehouse.create({ data: parsed.data });
  revalidatePath("/depositos");
  return { ok: true, id: warehouse.id };
}

export async function setWarehouseActive(warehouseId: string, active: boolean): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "DEPOSITO");
  } catch {
    return { ok: false, error: "No tenés permiso para modificar depósitos." };
  }
  await prisma.warehouse.update({ where: { id: warehouseId }, data: { active } });
  revalidatePath("/depositos");
  return { ok: true, id: warehouseId };
}
