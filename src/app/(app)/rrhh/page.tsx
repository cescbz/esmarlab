import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Gift,
  Palmtree,
  Timer,
  UsersRound,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatGs } from "@/lib/format";
import { MONTH_NAMES, currentPeriod, periodRange } from "@/lib/hr";
import { SimpleBarChart } from "@/components/reports/charts";

export const metadata: Metadata = { title: "Recursos Humanos" };

const QUICK_LINKS = [
  { href: "/rrhh/empleados", title: "Empleados", description: "Fichas, horarios y formas de pago.", icon: UsersRound },
  { href: "/rrhh/reloj", title: "Reloj", description: "Marcar entrada y salida con PIN.", icon: Clock },
  { href: "/rrhh/asistencia", title: "Asistencia", description: "Tardanzas, extras y ausencias.", icon: CalendarDays },
  { href: "/rrhh/liquidaciones", title: "Liquidaciones", description: "Cerrar períodos y pagar sueldos.", icon: Wallet },
  { href: "/rrhh/vacaciones", title: "Vacaciones", description: "Saldos y solicitudes.", icon: Palmtree },
  { href: "/rrhh/aguinaldo", title: "Aguinaldo", description: "Cálculo anual y proyección.", icon: Gift },
];

export default async function HrDashboardPage() {
  const current = currentPeriod();
  const range = periodRange(current.year, current.month);

  const [employees, payrolls, attendance, pendingVacations, yearGross] = await Promise.all([
    prisma.employee.findMany({ select: { id: true, status: true } }),
    prisma.payrollPeriod.findMany({
      where: { type: "MENSUAL" },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 12,
    }),
    prisma.attendance.aggregate({
      where: { date: { gte: range.start, lte: range.end } },
      _sum: { lateMinutes: true, overtimeMinutes: true },
      _count: { _all: true },
    }),
    prisma.vacationRequest.count({ where: { status: "PENDIENTE" } }),
    prisma.payrollItem.aggregate({
      where: {
        payroll: {
          type: "MENSUAL",
          year: current.year,
          status: { in: ["BORRADOR", "CERRADA", "PAGADA"] },
        },
      },
      _sum: { grossAmount: true },
    }),
  ]);

  const active = employees.filter((employee) => employee.status === "ACTIVO").length;
  const currentPayroll =
    payrolls.find((payroll) => payroll.year === current.year && payroll.month === current.month) ??
    payrolls[0];
  const pendingIncomplete = await prisma.attendance.count({
    where: {
      date: { gte: range.start, lte: range.end },
      OR: [{ checkIn: null }, { checkOut: null }],
    },
  });
  const chartData = [...payrolls]
    .slice(0, 6)
    .reverse()
    .map((payroll) => ({
      mes: `${MONTH_NAMES[payroll.month - 1].slice(0, 3)} ${payroll.year}`,
      neto: payroll.netTotal,
    }));
  const projectedAguinaldo = Math.round((yearGross._sum.grossAmount ?? 0) / 12);

  return (
    <div>
      <PageHeader
        title="Recursos Humanos"
        description="Empleados, asistencia, liquidaciones y vacaciones en un solo lugar."
        actions={
          <Link
            href="/rrhh/empleados"
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Gestionar empleados <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />

      {employees.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="Todavía no hay empleados"
          description="Creá la primera ficha para empezar a registrar asistencia y liquidaciones."
          action={
            <Link
              href="/rrhh/empleados"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Crear empleado
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              label="Empleados activos"
              value={String(active)}
              hint={`${employees.length} en total`}
              icon={UsersRound}
              tone="accent"
            />
            <KpiCard
              label="Planilla del mes"
              value={currentPayroll ? formatGs(currentPayroll.netTotal) : "—"}
              hint={
                currentPayroll
                  ? `${currentPayroll.number} · ${currentPayroll.status}`
                  : "Sin liquidaciones"
              }
              icon={Wallet}
            />
            <KpiCard
              label="Horas extras del mes"
              value={`${Math.round((attendance._sum.overtimeMinutes ?? 0) / 6) / 10} h`}
              hint={`${attendance._count._all} marcas registradas`}
              icon={Timer}
            />
            <KpiCard
              label="Tardanzas del mes"
              value={`${attendance._sum.lateMinutes ?? 0} min`}
              hint={`${pendingIncomplete} marcas incompletas`}
              icon={Clock}
              tone={attendance._sum.lateMinutes ? "warning" : "success"}
            />
            <KpiCard
              label="Vacaciones pendientes"
              value={String(pendingVacations)}
              hint="Solicitudes por decidir"
              icon={Palmtree}
              tone={pendingVacations ? "warning" : "success"}
            />
            <KpiCard
              label="Aguinaldo proyectado"
              value={formatGs(projectedAguinaldo)}
              hint={`1/12 de ${formatGs(yearGross._sum.grossAmount ?? 0)}`}
              icon={Gift}
            />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <Card className="border-border/80 shadow-none xl:col-span-2">
              <CardHeader className="flex-row items-center justify-between border-b border-border/60 px-5 py-3.5">
                <CardTitle className="text-sm font-semibold">Neto liquidado por período</CardTitle>
                <Link
                  href="/rrhh/liquidaciones"
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  Ver liquidaciones <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="p-4">
                <SimpleBarChart
                  data={chartData}
                  xKey="mes"
                  series={[{ key: "neto", label: "Neto", color: "hsl(var(--chart-1))" }]}
                  height={250}
                />
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-none">
              <CardHeader className="border-b border-border/60 px-5 py-3.5">
                <CardTitle className="text-sm font-semibold">Accesos rápidos</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 p-4">
                {QUICK_LINKS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2 transition-colors hover:border-primary/30 hover:bg-secondary/30"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold">{item.title}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {item.description}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
