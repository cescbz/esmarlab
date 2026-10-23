"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import { calculateDV, onlyDigits } from "@/lib/fiscal";
import { computeAttendance, type ScheduleInput } from "@/lib/payroll";
import { toDateInputValue } from "@/lib/format";
import { getClientIp, isIpAllowed } from "@/lib/ip";
import { isValidPhotoDataUrl } from "@/lib/photo";
import type { ActionResult } from "./customers";

export async function saveKioskSettings(values: unknown): Promise<ActionResult> {
  try {
    await requireRole("ADMIN");
  } catch {
    return { ok: false, error: "Solo administración puede configurar el reloj." };
  }
  const parsed = z
    .object({
      enabled: z.boolean().default(false),
      restrictIp: z.boolean().default(true),
      allowedIps: z.string().optional().default(""),
      requirePhoto: z.boolean().default(true),
      title: z.string().optional().default(""),
    })
    .safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const data = parsed.data;
  const allowedIps = data.allowedIps
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");

  await prisma.kioskSettings.upsert({
    where: { id: "default" },
    update: {
      enabled: data.enabled,
      restrictIp: data.restrictIp,
      allowedIps,
      requirePhoto: data.requirePhoto,
      title: data.title || null,
    },
    create: {
      id: "default",
      enabled: data.enabled,
      restrictIp: data.restrictIp,
      allowedIps,
      requirePhoto: data.requirePhoto,
      title: data.title || null,
    },
  });
  revalidatePath("/configuracion");
  revalidatePath("/kiosco");
  return { ok: true };
}

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

export type PublicClockPunchResult = {
  ok: boolean;
  error?: string;
  employeeName?: string;
  mark?: "ENTRADA" | "SALIDA";
  time?: string;
  lateMinutes?: number;
  overtimeMinutes?: number;
};

export async function publicClockPunch(values: unknown): Promise<PublicClockPunchResult> {
  const headerList = headers();
  const ip = getClientIp({
    forwardedFor: headerList.get("x-forwarded-for"),
    realIp: headerList.get("x-real-ip"),
    cfConnectingIp: headerList.get("cf-connecting-ip"),
    trustCloudflare: process.env.TRUST_CLOUDFLARE === "1",
  });
  const settings = await prisma.kioskSettings.findUnique({ where: { id: "default" } });
  if (!settings?.enabled) return { ok: false, error: "El reloj público está desactivado." };
  if (settings.restrictIp && !isIpAllowed(ip, settings.allowedIps)) {
    return { ok: false, error: "Este reloj solo funciona desde la red autorizada." };
  }

  const parsed = z
    .object({
      ci: z.string().min(1, "Ingresá la CI."),
      pin: z.string().min(1, "Ingresá el PIN."),
      photo: z.string().optional().nullable(),
    })
    .safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const data = parsed.data;
  if (settings.requirePhoto && !isValidPhotoDataUrl(data.photo)) {
    return { ok: false, error: "La foto es obligatoria." };
  }
  if (data.photo && !isValidPhotoDataUrl(data.photo)) {
    return { ok: false, error: "La foto no es válida o supera los 300 KB." };
  }

  const ci = normalizeCi(data.ci);
  const employee = await prisma.employee.findUnique({ where: { ci } });
  if (!employee || employee.status !== "ACTIVO") {
    return { ok: false, error: "CI o PIN incorrecto." };
  }
  const valid = await bcrypt.compare(data.pin, employee.pinHash);
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
    return {
      ok: false,
      error: "Ya registraste entrada y salida hoy. Pedí una corrección a RRHH.",
    };
  }

  const now = new Date();
  const markType = existing ? "SALIDA" : "ENTRADA";
  const computation = computeAttendance({
    date: day,
    checkIn: existing?.checkIn ?? now,
    checkOut: existing ? now : null,
    schedule: scheduleOf(employee),
  });

  try {
    await prisma.$transaction(async (tx) => {
      let attendance;
      if (!existing) {
        attendance = await tx.attendance.create({
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
      } else {
        attendance = await tx.attendance.update({
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
      }
      if (isValidPhotoDataUrl(data.photo)) {
        const mimeType = data.photo.startsWith("data:image/png") ? "image/png" : "image/jpeg";
        await tx.attendancePhoto.upsert({
          where: { attendanceId_type: { attendanceId: attendance.id, type: markType } },
          update: { data: data.photo, mimeType },
          create: { attendanceId: attendance.id, type: markType, data: data.photo, mimeType },
        });
      }
    });
  } catch {
    return { ok: false, error: "No pudimos guardar la marca." };
  }

  revalidatePath("/rrhh/asistencia");
  revalidatePath(`/rrhh/asistencia/${employee.id}`);
  revalidatePath("/rrhh/reloj");
  revalidatePath("/rrhh");
  return {
    ok: true,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    mark: markType,
    time: now.toISOString(),
    lateMinutes: computation.lateMinutes,
    overtimeMinutes: computation.overtimeMinutes,
  };
}
