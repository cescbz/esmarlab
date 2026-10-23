"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import { employeeSchema } from "@/lib/validators/employee";
import { isValidRuc, onlyDigits } from "@/lib/fiscal";
import { nextEmployeeCode } from "@/lib/codes";
import type { ActionResult } from "./customers";

function parseCi(ci: string) {
  const [base, dv] = ci.replace(/\s/g, "").split("-");
  return `${onlyDigits(base ?? "")}-${onlyDigits(dv ?? "")}`;
}

export async function saveEmployee(values: unknown, employeeId?: string): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para administrar empleados." };
  }
  const parsed = employeeSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const data = parsed.data;
  if (!isValidRuc(data.ci)) {
    return { ok: false, error: "CI inválida. Verificá el dígito verificador." };
  }
  if (!employeeId && !/^\d{4}$/.test(data.pin)) {
    return { ok: false, error: "Ingresá un PIN de 4 dígitos para el empleado." };
  }

  const ci = parseCi(data.ci);
  const duplicate = await prisma.employee.findFirst({
    where: { ci, ...(employeeId ? { id: { not: employeeId } } : {}) },
    select: { id: true, firstName: true, lastName: true },
  });
  if (duplicate) {
    return {
      ok: false,
      error: `Ya existe un empleado con esa CI: ${duplicate.firstName} ${duplicate.lastName}.`,
    };
  }

  const payload = {
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    ci,
    birthDate: data.birthDate ? new Date(`${data.birthDate}T12:00:00-03:00`) : null,
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || null,
    emergencyContact: data.emergencyContact || null,
    position: data.position.trim(),
    department: data.department.trim(),
    workshopId: data.workshopId || null,
    hireDate: new Date(`${data.hireDate}T12:00:00-03:00`),
    endDate: data.endDate ? new Date(`${data.endDate}T12:00:00-03:00`) : null,
    status: data.status,
    payType: data.payType,
    monthlySalary: data.monthlySalary,
    dailyRate: data.dailyRate,
    pieceRate: data.pieceRate,
    scheduledStart: data.scheduledStart,
    scheduledEnd: data.scheduledEnd,
    lunchMinutes: data.lunchMinutes,
    workDays: data.workDays,
    lateToleranceMinutes: data.lateToleranceMinutes,
    vacationDaysOverride: data.vacationDaysOverride,
    notes: data.notes || null,
  };

  try {
    if (employeeId) {
      await prisma.employee.update({
        where: { id: employeeId },
        data: {
          ...payload,
          ...(data.pin ? { pinHash: await bcrypt.hash(data.pin, 10) } : {}),
        },
      });
      revalidatePath("/rrhh/empleados");
      revalidatePath(`/rrhh/empleados/${employeeId}`);
      revalidatePath("/rrhh");
      return { ok: true, id: employeeId };
    }
    const employee = await prisma.employee.create({
      data: {
        ...payload,
        code: await nextEmployeeCode(),
        pinHash: await bcrypt.hash(data.pin, 10),
      },
    });
    revalidatePath("/rrhh/empleados");
    revalidatePath("/rrhh");
    return { ok: true, id: employee.id };
  } catch {
    return { ok: false, error: "No pudimos guardar el empleado. Intentá nuevamente." };
  }
}

export async function setEmployeeStatus(
  employeeId: string,
  status: "ACTIVO" | "INACTIVO" | "LICENCIA"
): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para cambiar el estado del empleado." };
  }
  await prisma.employee.update({ where: { id: employeeId }, data: { status } });
  revalidatePath("/rrhh/empleados");
  revalidatePath(`/rrhh/empleados/${employeeId}`);
  return { ok: true, id: employeeId };
}

const pieceworkSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().min(1),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a cero."),
  unitRate: z.coerce.number().int().min(0),
  description: z.string().optional().default(""),
  productionOrderStageId: z.string().optional().default(""),
});

export async function savePieceworkEntry(values: unknown): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para registrar destajo." };
  }
  const parsed = pieceworkSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const data = parsed.data;
  await prisma.pieceworkEntry.create({
    data: {
      employeeId: data.employeeId,
      date: new Date(`${data.date}T12:00:00-03:00`),
      quantity: data.quantity,
      unitRate: data.unitRate,
      description: data.description || null,
      productionOrderStageId: data.productionOrderStageId || null,
      createdById: session.user.username,
    },
  });
  revalidatePath(`/rrhh/empleados/${data.employeeId}`);
  revalidatePath("/rrhh");
  return { ok: true };
}
