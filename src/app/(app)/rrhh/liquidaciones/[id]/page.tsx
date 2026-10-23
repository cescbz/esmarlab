import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeDollarSign, ReceiptText, TrendingDown, Wallet } from "lucide-react";
import { auth } from "@/auth";
import { canWrite } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/shared/kpi-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatGs } from "@/lib/format";
import { MONTH_NAMES } from "@/lib/hr";
import { PayrollActions } from "./payroll-actions";
import { PayrollItemsTable, type PayrollItemRow } from "./payroll-items-table";

export const metadata: Metadata = { title: "Liquidación" };

export default async function PayrollDetailPage({ params }: { params: { id: string } }) {
  const [session, payroll, methods, openCash] = await Promise.all([
    auth(),
    prisma.payrollPeriod.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { employee: true }, orderBy: { employee: { code: "asc" } } },
        paymentMethod: true,
      },
    }),
    prisma.paymentMethod.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.cashSession.findFirst({ where: { status: "ABIERTA" }, orderBy: { openedAt: "desc" } }),
  ]);
  if (!payroll) notFound();

  const writable = session ? canWrite(session.user.role, "rrhh") : false;
  const periodLabel =
    payroll.type === "AGUINALDO"
      ? `Aguinaldo ${payroll.year}`
      : `${MONTH_NAMES[payroll.month - 1]} ${payroll.year}`;
  const rows: PayrollItemRow[] = payroll.items.map((item) => ({
    id: item.id,
    employeeId: item.employeeId,
    code: item.employee.code,
    employee: `${item.employee.firstName} ${item.employee.lastName}`,
    payType: item.payType,
    workedDays: item.workedDays,
    pieceUnits: item.pieceUnits,
    extraMinutes: item.extraMinutes,
    lateMinutes: item.lateMinutes,
    grossAmount: item.grossAmount,
    ipsEmployee: item.ipsEmployee,
    netAmount: item.netAmount,
    otherEarnings: item.otherEarnings,
    otherDeductions: item.otherDeductions,
    notes: item.notes ?? "",
  }));

  return (
    <div>
      <PageHeader
        title={`Liquidación ${payroll.number}`}
        description={`${periodLabel} · ${payroll.items.length} empleados · ${formatDate(payroll.startDate)} al ${formatDate(payroll.endDate)}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/rrhh/liquidaciones">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Volver
              </Link>
            </Button>
            <PayrollActions
              payrollId={payroll.id}
              status={payroll.status}
              canWrite={writable}
              methods={methods}
              hasOpenCash={Boolean(openCash)}
            />
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={payroll.status} />
        <Badge variant="outline" className="font-mono text-[10px]">
          {payroll.number}
        </Badge>
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[9px] uppercase text-amber-700">
          DEMO — SIN VALIDEZ FISCAL
        </Badge>
        {payroll.paymentMethod ? (
          <span className="text-xs text-muted-foreground">
            Pago: {payroll.paymentMethod.name}
            {payroll.paidFromCash ? " · Caja" : ""}
          </span>
        ) : null}
        {payroll.notes ? <span className="text-xs text-amber-700">{payroll.notes}</span> : null}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Haberes"
          value={formatGs(payroll.grossTotal)}
          hint={`Extras ${formatGs(payroll.extraTotal)}`}
          icon={BadgeDollarSign}
          tone="accent"
        />
        <KpiCard
          label="IPS empleado"
          value={formatGs(payroll.ipsEmployeeTotal)}
          hint={`Patronal ${formatGs(payroll.ipsEmployerTotal)}`}
          icon={ReceiptText}
        />
        <KpiCard
          label="Descuentos"
          value={formatGs(payroll.deductionsTotal)}
          hint={`Tardanzas ${formatGs(payroll.lateTotal)} · Ausencias ${formatGs(payroll.absenceTotal)}`}
          icon={TrendingDown}
          tone="warning"
        />
        <KpiCard
          label="Neto a pagar"
          value={formatGs(payroll.netTotal)}
          hint={`${payroll.items.length} recibos`}
          icon={Wallet}
          tone="success"
        />
      </div>

      <Card className="border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-3.5">
          <CardTitle className="text-sm font-semibold">Detalle por empleado</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <PayrollItemsTable
            data={rows}
            canEdit={writable && payroll.status === "BORRADOR"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
