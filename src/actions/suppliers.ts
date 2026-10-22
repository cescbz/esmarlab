"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import { supplierSchema } from "@/lib/validators/supplier";
import { isValidRuc, onlyDigits } from "@/lib/fiscal";
import type { ActionResult } from "./customers";

export async function saveSupplier(values: unknown, supplierId?: string): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "DEPOSITO");
  } catch {
    return { ok: false, error: "No tenés permiso para administrar proveedores." };
  }

  const parsed = supplierSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const data = parsed.data;
  if (!isValidRuc(data.ruc)) return { ok: false, error: "RUC inválido." };
  const [base, dv] = data.ruc.split("-");
  const rucBase = onlyDigits(base ?? "");
  const digito = onlyDigits(dv ?? "");
  if (!rucBase || !digito) return { ok: false, error: "El RUC debe incluir el dígito verificador." };

  const duplicate = await prisma.supplier.findFirst({
    where: { rucBase, dv: digito, ...(supplierId ? { id: { not: supplierId } } : {}) },
    select: { name: true },
  });
  if (duplicate) return { ok: false, error: `Ya existe un proveedor con ese RUC: ${duplicate.name}.` };

  const payload = {
    name: data.name.trim(),
    rucBase,
    dv: digito,
    contactName: data.contactName || null,
    phone: data.phone || null,
    email: data.email || null,
    origin: data.origin,
    active: data.active,
  };

  try {
    if (supplierId) {
      await prisma.supplier.update({ where: { id: supplierId }, data: payload });
      revalidatePath("/proveedores");
      return { ok: true, id: supplierId };
    }
    const supplier = await prisma.supplier.create({ data: payload });
    revalidatePath("/proveedores");
    return { ok: true, id: supplier.id };
  } catch {
    return { ok: false, error: "No pudimos guardar el proveedor." };
  }
}

export async function setSupplierActive(supplierId: string, active: boolean): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "DEPOSITO");
  } catch {
    return { ok: false, error: "No tenés permiso para modificar proveedores." };
  }
  await prisma.supplier.update({ where: { id: supplierId }, data: { active } });
  revalidatePath("/proveedores");
  return { ok: true, id: supplierId };
}
