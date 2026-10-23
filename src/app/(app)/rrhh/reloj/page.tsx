import type { Metadata } from "next";
import { auth } from "@/auth";
import { canWrite } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { toDateInputValue } from "@/lib/format";
import { ClockKiosk } from "./clock-kiosk";

export const metadata: Metadata = { title: "Reloj de asistencia" };

export default async function ClockPage() {
  const session = await auth();
  const todayKey = toDateInputValue(new Date());
  const day = new Date(`${todayKey}T12:00:00-03:00`);
  const marks = await prisma.attendance.findMany({
    where: { date: day },
    include: { employee: true },
    orderBy: { checkIn: "asc" },
  });
  return (
    <ClockKiosk
      todayKey={todayKey}
      canPunch={session ? canWrite(session.user.role, "rrhh") : false}
      marks={marks.map((mark) => ({
        id: mark.id,
        employee: `${mark.employee.firstName} ${mark.employee.lastName}`,
        code: mark.employee.code,
        checkIn: mark.checkIn?.toISOString() ?? null,
        checkOut: mark.checkOut?.toISOString() ?? null,
        lateMinutes: mark.lateMinutes,
        overtimeMinutes: mark.overtimeMinutes,
      }))}
    />
  );
}
