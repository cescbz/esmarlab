import type { Metadata } from "next";
import Link from "next/link";
import { BadgeDollarSign, Gift, UsersRound, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/shared/kpi-card";
import { formatGs } from "@/lib/format";
import { aguinaldoAmount } from "@/lib/payroll";
import { AguinaldoTable, type AguinaldoRow } from "./aguinaldo-table";
import { GenerateAguinaldoButton } from "./generate-aguinaldo-button";

export const metadata: Metadata = { title: "Aguinaldo" };

export default async function AguinaldoPage() {
  const year = new Date().getFullYear();
  const [periods, existing] = await Promise.all([
    prisma.payrollPeriod.findMany({
      where: { type: "MENSUAL", year, status: { in: ["BORRADOR", "CERRADA", "PAGADA"] } },
      include: { items: { include: { employee: true } } },
      orderBy: { month: "asc" },
    }),
    prisma.payrollPeriod.findUnique({
      where: { type_year_month: { type: "AGUINALDO", year, month: 12 } },
    }),
  ]);

  const byEmployee = new Map<
    string,
    {
      id: string;
      code: string;
      employee: string;
      months: Set<number>;
      finalizedTotal: number;
      projectedTotal: number;
    }
  >();

  for (const period of periods) {
    for (const item of period.items) {
      const key = item.employeeId;
      const current =
        byEmployee.get(key) ??
        {
          id: item.employeeId,
          code: item.employee.code,
          employee: `${item.employee.firstName} ${item.employee.lastName}`,
          months: new Set<number>(),
          finalizedTotal: 0,
          projectedTotal: 0,
        };
      current.months.add(period.month);
      current.projectedTotal += item.grossAmount;
      if (period.status === "CERRADA" || period.status === "PAGADA") {
        current.finalizedTotal += item.grossAmount;
      }
      byEmployee.set(key, current);
    }
  }

  const rows: AguinaldoRow[] = Array.from(byEmployee.values()).map((row) => ({
    id: row.id,
    code: row.code,
    employee: row.employee,
    months: row.months.size,
    finalizedTotal: row.finalizedTotal,
    projectedTotal: row.projectedTotal,
    finalizedAguinaldo: aguinaldoAmount(row.finalizedTotal),
    projectedAguinaldo: aguinaldoAmount(row.projectedTotal),
  }));

  const totalFinalized = rows.reduce((sum, row) => sum + row.finalizedAguinaldo, 0);
  const totalProjected = rows.reduce((sum, row) => sum + row.projectedAguinaldo, 0);
  const hasDraft = periods.some((period) => period.status === "BORRADOR");

  return (
    <div>
      <PageHeader
        title="Aguinaldo"
        description={`Cálculo anual ${year}: 1/12 de lo ganado en liquidaciones cerradas. La proyección incluye el período en borrador.`}
        actions={
          existing ? (
            <Button asChild>
              <Link href={`/rrhh/liquidaciones/${existing.id}`}>Ver aguinaldo generado</Link>
            </Button>
          ) : (
            <GenerateAguinaldoButton year={year} disabled={rows.length === 0} />
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <BadgeDollarSign className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Cálculo simplificado para demo. El aguinaldo no lleva descuento IPS en esta etapa.
        </span>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Aguinaldo definitivo"
          value={formatGs(totalFinalized)}
          hint={`${rows.length} empleados`}
          icon={Gift}
          tone="accent"
        />
        <KpiCard
          label="Proyección"
          value={formatGs(totalProjected)}
          hint={hasDraft ? "Incluye período en borrador" : "Sin borradores"}
          icon={Wallet}
        />
        <KpiCard label="Empleados alcanzados" value={String(rows.length)} icon={UsersRound} />
        <KpiCard
          label="Períodos computados"
          value={String(periods.filter((period) => period.status !== "BORRADOR").length)}
          hint={`${periods.length} períodos en total`}
          icon={BadgeDollarSign}
        />
      </div>

      <Card className="border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-3.5">
          <CardTitle className="text-sm font-semibold">Detalle por empleado</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <AguinaldoTable data={rows} />
        </CardContent>
      </Card>

      {existing ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Ya existe la liquidación {existing.number} en estado {existing.status}.
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Al generar la liquidación, se crea un período de aguinaldo en borrador con el cálculo
          definitivo de los períodos cerrados.
        </p>
      )}
    </div>
  );
}
