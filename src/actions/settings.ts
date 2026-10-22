"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import { isValidRuc } from "@/lib/fiscal";
import type { ActionResult } from "./customers";

const companySchema = z.object({
  razonSocial: z.string().min(2),
  nombreFantasia: z.string().optional().default(""),
  ruc: z.string().min(1).refine((value) => isValidRuc(value), "RUC inválido."),
  address: z.string().min(2),
  city: z.string().min(2),
  phone: z.string().min(3),
  email: z.string().email("Email inválido."),
  actividadEconomica: z.string().min(3),
});

export async function saveCompany(values: unknown): Promise<ActionResult> {
  try {
    await requireRole("ADMIN");
  } catch {
    return { ok: false, error: "Solo administración puede modificar la empresa." };
  }
  const parsed = companySchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const data = parsed.data;
  const company = await prisma.company.findFirst();
  if (!company) return { ok: false, error: "No hay empresa configurada." };
  const [base, dv] = data.ruc.split("-");
  await prisma.company.update({
    where: { id: company.id },
    data: {
      razonSocial: data.razonSocial,
      nombreFantasia: data.nombreFantasia || null,
      ruc: base,
      dv,
      address: data.address,
      city: data.city,
      phone: data.phone,
      email: data.email,
      actividadEconomica: data.actividadEconomica,
    },
  });
  revalidatePath("/configuracion");
  revalidatePath("/");
  return { ok: true };
}

const timbradoSchema = z.object({
  numero: z.string().regex(/^\d{8}$/, "El timbrado debe tener 8 dígitos."),
  vigenciaDesde: z.string().min(1),
  vigenciaHasta: z.string().min(1),
  activo: z.boolean().default(true),
});

export async function saveTimbrado(values: unknown): Promise<ActionResult> {
  try {
    await requireRole("ADMIN");
  } catch {
    return { ok: false, error: "Solo administración puede modificar el timbrado." };
  }
  const parsed = timbradoSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const data = parsed.data;
  const timbrado = await prisma.timbrado.findFirst();
  const payload = {
    numero: data.numero,
    vigenciaDesde: new Date(`${data.vigenciaDesde}T00:00:00-03:00`),
    vigenciaHasta: new Date(`${data.vigenciaHasta}T23:59:59-03:00`),
    activo: data.activo,
  };
  if (timbrado) {
    await prisma.timbrado.update({ where: { id: timbrado.id }, data: payload });
  } else {
    const company = await prisma.company.findFirst();
    if (!company) return { ok: false, error: "Falta la empresa." };
    await prisma.timbrado.create({ data: { ...payload, companyId: company.id } });
  }
  revalidatePath("/configuracion");
  return { ok: true };
}

export async function togglePaymentMethod(id: string, active: boolean): Promise<ActionResult> {
  try {
    await requireRole("ADMIN");
  } catch {
    return { ok: false, error: "Solo administración." };
  }
  await prisma.paymentMethod.update({ where: { id }, data: { active } });
  revalidatePath("/configuracion");
  return { ok: true };
}

export async function saveProductionStage(values: unknown): Promise<ActionResult> {
  try {
    await requireRole("ADMIN");
  } catch {
    return { ok: false, error: "Solo administración." };
  }
  const parsed = z.object({ name: z.string().min(2), sortOrder: z.coerce.number().int().min(1) }).safeParse(values);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  const duplicate = await prisma.productionStage.findUnique({ where: { name: parsed.data.name } });
  if (duplicate) return { ok: false, error: "Ya existe una etapa con ese nombre." };
  await prisma.productionStage.create({ data: parsed.data });
  revalidatePath("/configuracion");
  revalidatePath("/produccion/tablero");
  return { ok: true };
}

export async function saveExpenseCategory(values: unknown): Promise<ActionResult> {
  try {
    await requireRole("ADMIN");
  } catch {
    return { ok: false, error: "Solo administración." };
  }
  const parsed = z.object({ name: z.string().min(2) }).safeParse(values);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  const duplicate = await prisma.expenseCategory.findUnique({ where: { name: parsed.data.name } });
  if (duplicate) return { ok: false, error: "Ya existe una categoría con ese nombre." };
  await prisma.expenseCategory.create({ data: parsed.data });
  revalidatePath("/configuracion");
  revalidatePath("/gastos");
  return { ok: true };
}

const userSchema = z.object({
  userId: z.string(),
  role: z.enum(["ADMIN", "GERENCIA", "VENTAS", "CAJA", "DEPOSITO", "PRODUCCION"]),
  active: z.boolean(),
});

export async function updateUser(values: unknown): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN");
  } catch {
    return { ok: false, error: "Solo administración." };
  }
  const parsed = userSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  if (parsed.data.userId === session.user.id && (!parsed.data.active || parsed.data.role !== "ADMIN")) {
    return { ok: false, error: "No podés quitarte el rol de administrador ni desactivar tu propio usuario." };
  }
  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { role: parsed.data.role, active: parsed.data.active },
  });
  revalidatePath("/configuracion");
  return { ok: true };
}
