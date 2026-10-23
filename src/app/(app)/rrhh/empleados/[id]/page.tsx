import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Pencil, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { KpiCard } from "@/components/shared/kpi-card";
import { formatDate, formatGs, formatTime, toDateInputValue } from "@/lib/format";
import { vacationBalance } from "@/lib/hr";
import { EmployeeFormModal } from "../employee-form-modal";
import { PieceworkFormModal } from "./piecework-form-modal";

export const metadata: Metadata = { title: "Ficha de empleado" };

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: {
      workshop: true,
      attendance: { orderBy: { date: "desc" }, take: 10 },
      vacationRequests: { orderBy: { startDate: "desc" } },
      payrollItems: { include: { payroll: true }, orderBy: { payroll: { createdAt: "desc" } }, take: 6 },
      pieceworkEntries: { orderBy: { date: "desc" }, take: 10 },
    },
  });
  if (!employee) notFound();

  const [workshops, stages] = await Promise.all([
    prisma.workshop.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.productionOrderStage.findMany({
      where: { status: "COMPLETADA", completedQuantity: { gt: 0 } },
      include: { stage: true, productionOrder: true },
      orderBy: { endDate: "desc" },
      take: 20,
    }),
  ]);

  const balance = vacationBalance({
    hireDate: employee.hireDate,
    year: new Date().getFullYear(),
    override: employee.vacationDaysOverride,
    requests: employee.vacationRequests,
  });
  const lastPayroll = employee.payrollItems[0];
  const name = `${employee.firstName} ${employee.lastName}`;
  const pieces = employee.pieceworkEntries.reduce((sum, entry) => sum + entry.quantity, 0);

  return (
    <div>
      <PageHeader
        title={name}
        description={`${employee.code} · ${employee.position} · ${employee.department}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/rrhh/empleados">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Volver
              </Link>
            </Button>
            <EmployeeFormModal
              employee={{
                id: employee.id,
                firstName: employee.firstName,
                lastName: employee.lastName,
                ci: employee.ci,
                birthDate: toDateInputValue(employee.birthDate),
                phone: employee.phone ?? "",
                email: employee.email ?? "",
                address: employee.address ?? "",
                emergencyContact: employee.emergencyContact ?? "",
                position: employee.position,
                department: employee.department,
                workshopId: employee.workshopId ?? "",
                hireDate: toDateInputValue(employee.hireDate),
                endDate: toDateInputValue(employee.endDate),
                status: employee.status,
                payType: employee.payType,
                monthlySalary: employee.monthlySalary,
                dailyRate: employee.dailyRate,
                pieceRate: employee.pieceRate,
                scheduledStart: employee.scheduledStart,
                scheduledEnd: employee.scheduledEnd,
                lunchMinutes: employee.lunchMinutes,
                lateToleranceMinutes: employee.lateToleranceMinutes,
                workDays: employee.workDays,
                vacationDaysOverride: employee.vacationDaysOverride,
                notes: employee.notes ?? "",
              }}
              workshops={workshops}
              trigger={
                <Button>
                  <Pencil className="mr-1.5 h-4 w-4" />
                  Editar
                </Button>
              }
            />
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={employee.status} />
        <Badge variant="outline" className="font-mono text-[10px]">
          {employee.code}
        </Badge>
        <span className="text-xs text-muted-foreground">CI {employee.ci}</span>
        {employee.workshop ? (
          <span className="text-xs text-muted-foreground">Taller {employee.workshop.name}</span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Ingreso" value={formatDate(employee.hireDate)} icon={CalendarDays} />
        <KpiCard
          label="Vacaciones disponibles"
          value={`${balance.available} días`}
          hint={`${balance.taken} tomados · ${balance.pending} pendientes`}
          icon={CalendarDays}
          tone="accent"
        />
        <KpiCard
          label="Último neto"
          value={lastPayroll ? formatGs(lastPayroll.netAmount) : "—"}
          hint={lastPayroll ? lastPayroll.payroll.number : "Sin liquidaciones"}
          icon={Wallet}
        />
        <KpiCard
          label="Destajo reciente"
          value={employee.pieceRate ? `${formatGs(employee.pieceRate)}/unidad` : "—"}
          hint={`${pieces} unidades recientes`}
          icon={Wallet}
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5">
            <CardTitle className="text-sm font-semibold">Datos y horario</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-5 text-xs sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Teléfono:</span> {employee.phone ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Email:</span> {employee.email ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Dirección:</span> {employee.address ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Emergencia:</span>{" "}
              {employee.emergencyContact ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Horario:</span>{" "}
              {employee.scheduledStart}–{employee.scheduledEnd}
            </p>
            <p>
              <span className="text-muted-foreground">Almuerzo:</span> {employee.lunchMinutes} min
            </p>
            <p>
              <span className="text-muted-foreground">Días:</span> {employee.workDays.join(", ")}
            </p>
            <p>
              <span className="text-muted-foreground">PIN:</span> definido
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5">
            <CardTitle className="text-sm font-semibold">Asistencia reciente</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {employee.attendance.length === 0 ? (
              <p className="p-5 text-xs text-muted-foreground">Sin marcas registradas.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {employee.attendance.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between px-5 py-2 text-xs"
                  >
                    <span>{formatDate(record.date)}</span>
                    <span>
                      {record.checkIn ? formatTime(record.checkIn) : "—"} →{" "}
                      {record.checkOut ? formatTime(record.checkOut) : "—"}
                    </span>
                    <span className="text-muted-foreground">
                      {record.lateMinutes
                        ? `${record.lateMinutes} min tarde`
                        : record.overtimeMinutes
                          ? `${record.overtimeMinutes} min extra`
                          : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none">
          <CardHeader className="flex-row items-center justify-between border-b border-border/60 px-5 py-3.5">
            <CardTitle className="text-sm font-semibold">Destajo</CardTitle>
            <PieceworkFormModal
              employeeId={employee.id}
              pieceRate={employee.pieceRate ?? 0}
              stages={stages.map((stage) => ({
                id: stage.id,
                label: `${stage.productionOrder.number} · ${stage.stage.name}`,
                quantity: stage.completedQuantity,
                description: `${stage.stage.name} · ${stage.productionOrder.number}`,
              }))}
              trigger={
                <Button variant="outline" size="sm">
                  Registrar unidades
                </Button>
              }
            />
          </CardHeader>
          <CardContent className="p-0">
            {employee.pieceworkEntries.length === 0 ? (
              <p className="p-5 text-xs text-muted-foreground">Sin registros de destajo.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {employee.pieceworkEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between px-5 py-2 text-xs"
                  >
                    <span>{formatDate(entry.date)}</span>
                    <span>
                      {entry.quantity} u × {formatGs(entry.unitRate)}
                    </span>
                    <span className="font-medium tabular">
                      {formatGs(entry.quantity * entry.unitRate)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5">
            <CardTitle className="text-sm font-semibold">Vacaciones y liquidaciones</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {employee.vacationRequests.length === 0 && employee.payrollItems.length === 0 ? (
              <p className="p-5 text-xs text-muted-foreground">Sin movimientos.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {employee.vacationRequests.slice(0, 4).map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between px-5 py-2 text-xs"
                  >
                    <span>
                      {formatDate(request.startDate)} – {formatDate(request.endDate)}
                    </span>
                    <StatusBadge status={request.status} />
                  </div>
                ))}
                {employee.payrollItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-5 py-2 text-xs"
                  >
                    <Link
                      href={`/rrhh/liquidaciones/${item.payrollId}`}
                      className="font-mono text-[11px] hover:text-primary hover:underline"
                    >
                      {item.payroll.number}
                    </Link>
                    <span className="font-medium tabular">{formatGs(item.netAmount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
