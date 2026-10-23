import type { Metadata } from "next";
import { Plus, UsersRound } from "lucide-react";
import { auth } from "@/auth";
import { canWrite } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/shared/kpi-card";
import { formatDate, formatGs } from "@/lib/format";
import { EmployeeFormModal } from "./employee-form-modal";
import { EmployeesTable, type EmployeeRow } from "./employees-table";

export const metadata: Metadata = { title: "Empleados" };

function payDetail(employee: {
  payType: string;
  monthlySalary: number | null;
  dailyRate: number | null;
  pieceRate: number | null;
}) {
  if (employee.payType === "MENSUAL") return formatGs(employee.monthlySalary ?? 0);
  if (employee.payType === "JORNAL") return `${formatGs(employee.dailyRate ?? 0)}/día`;
  if (employee.payType === "DESTAJO") return `${formatGs(employee.pieceRate ?? 0)}/unidad`;
  return `${formatGs(employee.monthlySalary ?? 0)} + ${formatGs(employee.pieceRate ?? 0)}/unidad`;
}

export default async function EmployeesPage() {
  const session = await auth();
  const writable = session ? canWrite(session.user.role, "rrhh") : false;
  const [employees, workshops] = await Promise.all([
    prisma.employee.findMany({ orderBy: { code: "asc" } }),
    prisma.workshop.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  const rows: EmployeeRow[] = employees.map((employee) => ({
    id: employee.id,
    code: employee.code,
    name: `${employee.firstName} ${employee.lastName}`,
    ci: employee.ci,
    position: employee.position,
    department: employee.department,
    payType: employee.payType,
    payDetail: payDetail(employee),
    hireDate: formatDate(employee.hireDate),
    status: employee.status,
  }));
  const active = employees.filter((employee) => employee.status === "ACTIVO").length;
  const monthly = employees.filter((employee) => employee.payType === "MENSUAL").length;
  const byHour = employees.filter((employee) => employee.payType === "JORNAL").length;
  const piece = employees.filter(
    (employee) => employee.payType === "DESTAJO" || employee.payType === "MIXTO"
  ).length;

  return (
    <div>
      <PageHeader
        title="Empleados"
        description="Fichas, horarios, formas de pago y PIN del reloj."
        actions={
          writable ? (
            <EmployeeFormModal
              workshops={workshops}
              trigger={
                <Button>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Nuevo empleado
                </Button>
              }
            />
          ) : null
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Empleados activos" value={String(active)} icon={UsersRound} tone="accent" />
        <KpiCard label="Mensuales" value={String(monthly)} icon={UsersRound} />
        <KpiCard label="Jornaleros" value={String(byHour)} icon={UsersRound} />
        <KpiCard label="Destajo / mixto" value={String(piece)} icon={UsersRound} />
      </div>
      <EmployeesTable data={rows} />
    </div>
  );
}
