"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import { calculateDV, onlyDigits } from "@/lib/fiscal";
import { computeAttendance, type ScheduleInput } from "@/lib/payroll";
import { toDateInputValue } from "@/lib/format";
import type { ActionResult } from "./customers";

function normalizeCi(value: string) {
  const clean = value.replace(/\s/g, "");
  if (clean.includes("-")) {
    const [base, dv] = clean.split("-");
    return `${onlyDigits(base ?? "")}-${onlyDigits(dv ?? "")}`;
  }
  const digits = onlyDigits(clean);
  return `${digits}-${calculateDV(digits)}`;
}

function scheduleOf(employee: {
  scheduledStart: string;
  scheduledEnd: string;
  lunchMinutes: number;
  workDays: number[];
  lateToleranceMinutes: number;
}): ScheduleInput {
  return {
    scheduledStart: employee.scheduledStart,
    scheduledEnd: employee.scheduledEnd,
    lunchMinutes: employee.lunchMinutes,
    workDays: employee.workDays,
    lateToleranceMinutes: employee.lateToleranceMinutes,
  };
}

export type ClockPunchResult = ActionResult & {
  employeeName?: string;
  mark?: "ENTRADA" | "SALIDA";
  time?: string;
  lateMinutes?: number;
  overtimeMinutes?: number;
};

export async function clockPunch(values: unknown): Promise<ClockPunchResult> {
  try {
    await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "Solo RRHH puede registrar marcas en el reloj." };
  }
  const parsed = z
    .object({ ci: z.string().min(1, "Ingresá la CI."), pin: z.string().min(1, "Ingresá el PIN.") })
    .safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const ci = normalizeCi(parsed.data.ci);
  const employee = await prisma.employee.findUnique({ where: { ci } });
  if (!employee || employee.status !== "ACTIVO") {
    return { ok: false, error: "CI o PIN incorrecto." };
  }
  const valid = await bcrypt.compare(parsed.data.pin, employee.pinHash);
  if (!valid) return { ok: false, error: "CI o PIN incorrecto." };

  const today = toDateInputValue(new Date());
  const day = new Date(`${today}T12:00:00-03:00`);
  const vacation = await prisma.vacationRequest.findFirst({
    where: {
      employeeId: employee.id,
      status: "APROBADA",
      startDate: { lte: day },
      endDate: { gte: day },
    },
  });
  if (vacation) return { ok: false, error: "El empleado está de vacaciones hoy." };

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: day } },
  });
  if (existing?.checkIn && existing.checkOut) {
    return { ok: false, error: "Ya registraste entrada y salida hoy. Pedí una corrección a RRHH." };
  }

  const now = new Date();
  if (!existing) {
    const computation = computeAttendance({
      date: day,
      checkIn: now,
      checkOut: null,
      schedule: scheduleOf(employee),
    });
    await prisma.attendance.create({
      data: {
        employeeId: employee.id,
        date: day,
        checkIn: now,
        breakMinutes: computation.breakMinutes,
        lateMinutes: computation.lateMinutes,
        lateCount: computation.lateCount,
        earlyLeaveMinutes: computation.earlyLeaveMinutes,
        overtimeMinutes: computation.overtimeMinutes,
        workedMinutes: computation.workedMinutes,
        source: "RELOJ",
      },
    });
    revalidatePath("/rrhh/reloj");
    revalidatePath("/rrhh/asistencia");
    return {
      ok: true,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      mark: "ENTRADA",
      time: now.toISOString(),
      lateMinutes: computation.lateMinutes,
    };
  }

  const computation = computeAttendance({
    date: day,
    checkIn: existing.checkIn,
    checkOut: now,
    schedule: scheduleOf(employee),
  });
  await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      checkOut: now,
      breakMinutes: computation.breakMinutes,
      lateMinutes: computation.lateMinutes,
      lateCount: computation.lateCount,
      earlyLeaveMinutes: computation.earlyLeaveMinutes,
      overtimeMinutes: computation.overtimeMinutes,
      workedMinutes: computation.workedMinutes,
    },
  });
  revalidatePath("/rrhh/reloj");
  revalidatePath("/rrhh/asistencia");
  return {
    ok: true,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    mark: "SALIDA",
    time: now.toISOString(),
    lateMinutes: computation.lateMinutes,
    overtimeMinutes: computation.overtimeMinutes,
  };
}

const attendanceSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().min(1),
  checkIn: z.string().optional().default(""),
  checkOut: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export async function saveAttendance(values: unknown): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para corregir asistencias." };
  }
  const parsed = attendanceSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const data = parsed.data;
  const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
  if (!employee) return { ok: false, error: "El empleado no existe." };

  const day = new Date(`${data.date}T12:00:00-03:00`);
  const checkIn = data.checkIn ? new Date(`${data.date}T${data.checkIn}:00-03:00`) : null;
  const checkOut = data.checkOut ? new Date(`${data.date}T${data.checkOut}:00-03:00`) : null;
  if (checkIn && checkOut && checkOut <= checkIn) {
    return { ok: false, error: "La salida debe ser posterior a la entrada." };
  }
  const computation = computeAttendance({
    date: day,
    checkIn,
    checkOut,
    schedule: scheduleOf(employee),
  });
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: day } },
  });

  await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId: employee.id, date: day } },
    update: {
      checkIn,
      checkOut,
      breakMinutes: computation.breakMinutes,
      lateMinutes: computation.lateMinutes,
      lateCount: computation.lateCount,
      earlyLeaveMinutes: computation.earlyLeaveMinutes,
      overtimeMinutes: computation.overtimeMinutes,
      workedMinutes: computation.workedMinutes,
      notes: data.notes || null,
      source: existing ? "CORRECCION" : "MANUAL",
      correctedById: session.user.username,
    },
    create: {
      employeeId: employee.id,
      date: day,
      checkIn,
      checkOut,
      breakMinutes: computation.breakMinutes,
      lateMinutes: computation.lateMinutes,
      lateCount: computation.lateCount,
      earlyLeaveMinutes: computation.earlyLeaveMinutes,
      overtimeMinutes: computation.overtimeMinutes,
      workedMinutes: computation.workedMinutes,
      notes: data.notes || null,
      source: "MANUAL",
      correctedById: session.user.username,
    },
  });
  revalidatePath("/rrhh/asistencia");
  revalidatePath(`/rrhh/asistencia/${employee.id}`);
  revalidatePath("/rrhh");
  return { ok: true };
}
