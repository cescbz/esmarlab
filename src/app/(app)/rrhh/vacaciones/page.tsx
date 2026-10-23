import type { Metadata } from "next";
import { CalendarDays, Clock, Palmtree, UsersRound } from "lucide-react";
import { auth } from "@/auth";
import { canWrite } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { vacationBalance } from "@/lib/hr";
import { VacationFormModal } from "./vacation-form-modal";
import {
  VacationRequestsTable,
  type VacationRequestRow,
} from "./vacation-requests-table";
import { VacationBalancesTable, type VacationBalanceRow } from "./vacation-balances-table";

export const metadata: Metadata = { title: "Vacaciones" };

export default async function VacationsPage() {
  const session = await auth();
  const writable = session ? canWrite(session.user.role, "rrhh") : false;
  const year = new Date().getFullYear();
  const yearStart = new Date(`${year}-01-01T00:00:00-03:00`);
  const yearEnd = new Date(`${year}-12-31T23:59:59-03:00`);

  const [employees, requests] = await Promise.all([
    prisma.employee.findMany({
      where: { status: { in: ["ACTIVO", "LICENCIA"] } },
      orderBy: { code: "asc" },
    }),
    prisma.vacationRequest.findMany({
      where: { startDate: { lte: yearEnd }, endDate: { gte: yearStart } },
      include: { employee: true },
      orderBy: { startDate: "desc" },
    }),
  ]);

  const requestRows: VacationRequestRow[] = requests.map((request) => ({
    id: request.id,
    code: request.employee.code,
    employee: `${request.employee.firstName} ${request.employee.lastName}`,
    startDate: formatDate(request.startDate),
    endDate: formatDate(request.endDate),
    days: request.days,
    status: request.status,
    decidedBy: request.decidedBy ?? "",
  }));

  const balanceRows: VacationBalanceRow[] = employees.map((employee) => {
    const ownRequests = requests.filter((request) => request.employeeId === employee.id);
    const balance = vacationBalance({
      hireDate: employee.hireDate,
      year,
      override: employee.vacationDaysOverride,
      requests: ownRequests,
    });
    const seniority = Math.max(0, year - employee.hireDate.getFullYear());
    return {
      id: employee.id,
      code: employee.code,
      employee: `${employee.firstName} ${employee.lastName}`,
      hireDate: formatDate(employee.hireDate),
      seniority: `${seniority} años`,
      entitlement: balance.entitlement,
      taken: balance.taken,
      pending: balance.pending,
      available: balance.available,
    };
  });

  const totalAvailable = balanceRows.reduce((sum, row) => sum + row.available, 0);
  const pending = requestRows.filter((row) => row.status === "PENDIENTE").length;
  const approvedDays = requestRows
    .filter((row) => row.status === "APROBADA")
    .reduce((sum, row) => sum + row.days, 0);
  const lowBalance = balanceRows.filter((row) => row.available <= 5).length;

  return (
    <div>
      <PageHeader
        title="Vacaciones"
        description={`Saldos y solicitudes del año ${year}. La aprobación descuenta días disponibles.`}
        actions={
          <VacationFormModal
            employees={employees.map((employee) => ({
              id: employee.id,
              name: `${employee.firstName} ${employee.lastName}`,
            }))}
            trigger={<Button>Nueva solicitud</Button>}
          />
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Días disponibles" value={`${totalAvailable} d`} icon={Palmtree} tone="accent" />
        <KpiCard label="Solicitudes pendientes" value={String(pending)} icon={Clock} tone={pending ? "warning" : "success"} />
        <KpiCard label="Días aprobados" value={`${approvedDays} d`} icon={CalendarDays} />
        <KpiCard label="Saldo bajo (≤ 5 días)" value={String(lowBalance)} icon={UsersRound} tone={lowBalance ? "warning" : "default"} />
      </div>

      <div className="space-y-4">
        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5">
            <CardTitle className="text-sm font-semibold">Solicitudes</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <VacationRequestsTable data={requestRows} canWrite={writable} />
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5">
            <CardTitle className="text-sm font-semibold">Saldos por empleado</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <VacationBalancesTable data={balanceRows} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
