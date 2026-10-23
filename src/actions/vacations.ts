"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import { countVacationDays, vacationEntitlement } from "@/lib/payroll";
import type { ActionResult } from "./customers";

const requestSchema = z.object({
  employeeId: z.string().min(1, "Seleccioná un empleado."),
  startDate: z.string().min(1, "Seleccioná la fecha de inicio."),
  endDate: z.string().min(1, "Seleccioná la fecha de fin."),
  reason: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

async function availableDays(employeeId: string, year: number, ignoreId?: string) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return null;
  const yearStart = new Date(`${year}-01-01T00:00:00-03:00`);
  const yearEnd = new Date(`${year}-12-31T23:59:59-03:00`);
  const requests = await prisma.vacationRequest.findMany({
    where: {
      employeeId,
      status: { in: ["APROBADA", "PENDIENTE"] },
      startDate: { lte: yearEnd },
      endDate: { gte: yearStart },
      ...(ignoreId ? { id: { not: ignoreId } } : {}),
    },
  });
  const entitlement = vacationEntitlement(employee.hireDate, year, employee.vacationDaysOverride);
  const taken = requests
    .filter((request) => request.status === "APROBADA")
    .reduce((sum, request) => sum + request.days, 0);
  return { employee, entitlement, taken, available: Math.max(0, entitlement - taken) };
}

export async function createVacationRequest(values: unknown): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para registrar vacaciones." };
  }
  const parsed = requestSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const data = parsed.data;
  const start = new Date(`${data.startDate}T12:00:00-03:00`);
  const end = new Date(`${data.endDate}T12:00:00-03:00`);
  if (end < start) return { ok: false, error: "La fecha de fin debe ser posterior al inicio." };
  const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
  if (!employee) return { ok: false, error: "El empleado no existe." };
  const days = countVacationDays(start, end, employee.workDays);
  if (days <= 0) return { ok: false, error: "El rango no contiene días laborales." };
  const balance = await availableDays(employee.id, start.getFullYear());
  if (!balance) return { ok: false, error: "El empleado no existe." };
  if (days > balance.available) {
    return { ok: false, error: `Solo quedan ${balance.available} días disponibles.` };
  }

  const overlap = await prisma.vacationRequest.findFirst({
    where: {
      employeeId: employee.id,
      status: { in: ["PENDIENTE", "APROBADA"] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });
  if (overlap) return { ok: false, error: "Ya hay una solicitud en ese rango de fechas." };

  await prisma.vacationRequest.create({
    data: {
      employeeId: employee.id,
      startDate: start,
      endDate: end,
      days,
      reason: data.reason || null,
      notes: data.notes || null,
      status: "PENDIENTE",
    },
  });
  revalidatePath("/rrhh/vacaciones");
  revalidatePath("/rrhh");
  revalidatePath(`/rrhh/empleados/${employee.id}`);
  return { ok: true };
}

export async function decideVacationRequest(
  id: string,
  decision: "APROBADA" | "RECHAZADA"
): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para decidir vacaciones." };
  }
  const request = await prisma.vacationRequest.findUnique({ where: { id } });
  if (!request) return { ok: false, error: "La solicitud no existe." };
  if (request.status !== "PENDIENTE") {
    return { ok: false, error: "La solicitud ya fue decidida." };
  }

  if (decision === "APROBADA") {
    const balance = await availableDays(
      request.employeeId,
      request.startDate.getFullYear(),
      request.id
    );
    if (!balance) return { ok: false, error: "El empleado no existe." };
    if (request.days > balance.available) {
      return { ok: false, error: `Solo quedan ${balance.available} días disponibles.` };
    }
  }

  await prisma.vacationRequest.update({
    where: { id },
    data: { status: decision, decidedAt: new Date(), decidedBy: session.user.username },
  });
  revalidatePath("/rrhh/vacaciones");
  revalidatePath(`/rrhh/empleados/${request.employeeId}`);
  revalidatePath("/rrhh");
  return { ok: true, id };
}

export async function cancelVacationRequest(id: string): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para cancelar vacaciones." };
  }
  const request = await prisma.vacationRequest.findUnique({ where: { id } });
  if (!request) return { ok: false, error: "La solicitud no existe." };
  if (request.status !== "PENDIENTE") {
    return { ok: false, error: "Solo se cancelan solicitudes pendientes." };
  }
  await prisma.vacationRequest.update({
    where: { id },
    data: { status: "CANCELADA", decidedAt: new Date() },
  });
  revalidatePath("/rrhh/vacaciones");
  revalidatePath(`/rrhh/empleados/${request.employeeId}`);
  return { ok: true, id };
}
