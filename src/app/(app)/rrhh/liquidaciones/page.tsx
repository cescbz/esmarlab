import type { Metadata } from "next";
import { Plus, ReceiptText, Timer, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/shared/kpi-card";
import { formatGs } from "@/lib/format";
import { MONTH_NAMES } from "@/lib/hr";
import { NewPayrollDialog } from "./new-payroll-dialog";
import { PayrollsTable, type PayrollRow } from "./payrolls-table";

export const metadata: Metadata = { title: "Liquidaciones" };

export default async function PayrollsPage() {
  const payrolls = await prisma.payrollPeriod.findMany({
    include: { _count: { select: { items: true } } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  const rows: PayrollRow[] = payrolls.map((payroll) => ({
    id: payroll.id,
    number: payroll.number,
    type: payroll.type,
    period:
      payroll.type === "AGUINALDO"
        ? `Aguinaldo ${payroll.year}`
        : `${MONTH_NAMES[payroll.month - 1]} ${payroll.year}`,
    status: payroll.status,
    employees: payroll._count.items,
    grossTotal: payroll.grossTotal,
    ipsEmployeeTotal: payroll.ipsEmployeeTotal,
    netTotal: payroll.netTotal,
  }));

  const latest = payrolls.find((payroll) => payroll.type === "MENSUAL");
  const totalNet = payrolls.reduce((sum, payroll) => sum + payroll.netTotal, 0);

  return (
    <div>
      <PageHeader
        title="Liquidaciones"
        description="Liquidaciones mensuales y aguinaldos. El pago genera el gasto y afecta caja si corresponde."
        actions={
          <NewPayrollDialog
            trigger={
              <Button>
                <Plus className="mr-1.5 h-4 w-4" />
                Nueva liquidación
              </Button>
            }
          />
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Último neto"
          value={latest ? formatGs(latest.netTotal) : "—"}
          hint={latest ? latest.number : "Sin liquidaciones"}
          icon={Wallet}
          tone="accent"
        />
        <KpiCard
          label="IPS del último período"
          value={latest ? formatGs(latest.ipsEmployeeTotal) : "—"}
          hint="Aporte del empleado"
          icon={ReceiptText}
        />
        <KpiCard
          label="Horas extras del último período"
          value={latest ? `${Math.round(latest.extraTotal / 6) / 10} h` : "—"}
          hint={latest ? formatGs(latest.extraTotal) : "—"}
          icon={Timer}
        />
        <KpiCard
          label="Total histórico"
          value={formatGs(totalNet)}
          hint={`${payrolls.length} períodos`}
          icon={Wallet}
        />
      </div>
      <PayrollsTable data={rows} />
    </div>
  );
}
