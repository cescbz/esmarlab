"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import { customerSchema } from "@/lib/validators/customer";
import { isValidRuc, onlyDigits } from "@/lib/fiscal";

export type ActionResult = {
  ok: boolean;
  error?: string;
  id?: string;
};

function parseRuc(ruc: string) {
  const [base, dv] = ruc.replace(/\s/g, "").split("-");
  return { rucBase: onlyDigits(base ?? ""), dv: onlyDigits(dv ?? "") };
}

export async function saveCustomer(
  values: unknown,
  customerId?: string
): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "VENTAS", "CAJA");
  } catch {
    return { ok: false, error: "No tenés permiso para administrar clientes." };
  }

  const parsed = customerSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const data = parsed.data;
  if (!isValidRuc(data.ruc)) {
    return { ok: false, error: "RUC o CI inválido. Verificá el dígito verificador." };
  }
  const { rucBase, dv } = parseRuc(data.ruc);
  if (!rucBase || !dv) {
    return { ok: false, error: "El RUC debe incluir el dígito verificador (ej. 80012345-6)." };
  }

  const duplicate = await prisma.customer.findFirst({
    where: { rucBase, dv, ...(customerId ? { id: { not: customerId } } : {}) },
    select: { id: true, name: true },
  });
  if (duplicate) {
    return { ok: false, error: `Ya existe un cliente con ese RUC: ${duplicate.name}.` };
  }

  const payload = {
    type: data.type,
    name: data.name.trim(),
    rucBase,
    dv,
    address: data.address || null,
    city: data.city,
    phone: data.phone || null,
    email: data.email || null,
    priceListId: data.priceListId,
    creditLimit: data.creditLimit,
    termDays: data.termDays,
    active: data.active,
  };

  try {
    if (customerId) {
      await prisma.customer.update({ where: { id: customerId }, data: payload });
      revalidatePath("/clientes");
      revalidatePath(`/clientes/${customerId}`);
      return { ok: true, id: customerId };
    }
    const customer = await prisma.customer.create({ data: payload });
    revalidatePath("/clientes");
    return { ok: true, id: customer.id };
  } catch {
    return { ok: false, error: "No pudimos guardar el cliente. Intentá nuevamente." };
  }
}

export async function setCustomerActive(
  customerId: string,
  active: boolean
): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "VENTAS", "CAJA");
  } catch {
    return { ok: false, error: "No tenés permiso para modificar clientes." };
  }
  await prisma.customer.update({ where: { id: customerId }, data: { active } });
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${customerId}`);
  return { ok: true, id: customerId };
}
