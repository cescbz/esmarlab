import type { Metadata } from "next";
import { CalendarDays, Clock, Timer, UserX } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { currentPeriod, periodRange } from "@/lib/hr";
import { countVacationDays, expectedWorkdays, isWorkday } from "@/lib/payroll";
import { AttendancePeriodSelector } from "./attendance-period-selector";
import { AttendanceSummaryTable, type AttendanceSummaryRow } from "./attendance-summary-table";

export const metadata: Metadata = { title: "Asistencia" };

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  const fallback = currentPeriod();
  const [year, month] = (searchParams.mes ?? `${fallback.year}-${String(fallback.month).padStart(2, "0")}`)
    .split("-")
    .map(Number);
  const range = periodRange(year, month);
  const [employees, records, vacations] = await Promise.all([
    prisma.employee.findMany({
      where: { status: { in: ["ACTIVO", "LICENCIA"] } },
      orderBy: { code: "asc" },
    }),
    prisma.attendance.findMany({ where: { date: { gte: range.start, lte: range.end } } }),
    prisma.vacationRequest.findMany({
      where: { status: "APROBADA", startDate: { lte: range.end }, endDate: { gte: range.start } },
    }),
  ]);

  const rows: AttendanceSummaryRow[] = employees.map((employee) => {
    const own = records.filter((record) => record.employeeId === employee.id);
    const workedDays = own.filter(
      (record) => record.checkIn && record.checkOut && isWorkday(record.date, employee.workDays)
    ).length;
    const lateMinutes = own.reduce((sum, record) => sum + record.lateMinutes, 0);
    const lateCount = own.reduce((sum, record) => sum + record.lateCount, 0);
    const overtimeMinutes = own.reduce((sum, record) => sum + record.overtimeMinutes, 0);
    const vacationDays = vacations
      .filter((request) => request.employeeId === employee.id)
      .reduce((sum, request) => {
        const start = request.startDate > range.start ? request.startDate : range.start;
        const end = request.endDate < range.end ? request.endDate : range.end;
        return sum + countVacationDays(start, end, employee.workDays);
      }, 0);
    const isCurrent = year === fallback.year && month === fallback.month;
    const expected = expectedWorkdays({
      periodStart: range.start,
      periodEnd: range.end,
      hireDate: employee.hireDate,
      endDate: employee.endDate,
      workDays: employee.workDays,
      asOf: isCurrent ? new Date() : undefined,
    });
    const incomplete = own.filter((record) => !record.checkIn || !record.checkOut).length;
    return {
      id: employee.id,
      code: employee.code,
      name: `${employee.firstName} ${employee.lastName}`,
      workedDays,
      expected,
      lateCount,
      lateMinutes,
      overtimeMinutes,
      absentDays: Math.max(0, expected - workedDays - vacationDays),
      vacationDays,
      incomplete,
      schedule: `${employee.scheduledStart}–${employee.scheduledEnd}`,
    };
  });

  const totals = rows.reduce(
    (acc, row) => ({
      late: acc.late + row.lateMinutes,
      overtime: acc.overtime + row.overtimeMinutes,
      absent: acc.absent + row.absentDays,
      incomplete: acc.incomplete + row.incomplete,
    }),
    { late: 0, overtime: 0, absent: 0, incomplete: 0 }
  );

  return (
    <div>
      <PageHeader
        title="Asistencia"
        description="Planilla mensual, tardanzas, horas extras y ausencias."
        actions={
          <AttendancePeriodSelector value={`${year}-${String(month).padStart(2, "0")}`} />
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Minutos tarde"
          value={String(totals.late)}
          hint="Suma del período"
          icon={Clock}
          tone={totals.late ? "warning" : "success"}
        />
        <KpiCard
          label="Horas extras"
          value={`${Math.round(totals.overtime / 6) / 10}`}
          hint="Horas del período"
          icon={Timer}
        />
        <KpiCard
          label="Ausencias"
          value={String(totals.absent)}
          hint="Días sin marca"
          icon={UserX}
          tone={totals.absent ? "danger" : "success"}
        />
        <KpiCard
          label="Marcas incompletas"
          value={String(totals.incomplete)}
          hint="Requieren corrección"
          icon={CalendarDays}
          tone={totals.incomplete ? "warning" : "default"}
        />
      </div>
      <AttendanceSummaryTable data={rows} />
    </div>
  );
}
