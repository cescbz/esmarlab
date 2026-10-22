import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CreditCard } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { formatGs } from "@/lib/format";
import { reportRange } from "@/lib/reports";
import { ReportFilters } from "@/components/reports/report-filters";
import { CsvButton, PrintButton } from "@/components/reports/report-actions";
import { SimpleBarChart } from "@/components/reports/charts";

export const metadata: Metadata = { title: "Ventas por terminal POS" };

export default async function PosReportPage({
  searchParams,
}: {
  searchParams: { desde?: string; hasta?: string; terminal?: string };
}) {
  const range = reportRange(searchParams);
  const terminals = await prisma.posTerminal.findMany({ orderBy: { name: "asc" } });
  const payments = await prisma.receiptPayment.findMany({
    where: {
      posTerminalId: { not: null, ...(searchParams.terminal ? { equals: searchParams.terminal } : {}) },
      receipt: { date: { gte: range.desdeDate, lte: range.hastaDate } },
    },
    include: { posTerminal: true, paymentMethod: true, receipt: true },
  });

  const grouped = new Map<string, { terminal: string; method: string; count: number; total: number }>();
  for (const payment of payments) {
    const key = `${payment.posTerminalId}_${payment.paymentMethodId}`;
    const current = grouped.get(key) ?? { terminal: payment.posTerminal?.name ?? "—", method: payment.paymentMethod.name, count: 0, total: 0 };
    current.count += 1;
    current.total += payment.amount;
    grouped.set(key, current);
  }
  const rows = Array.from(grouped.values()).sort((a, b) => b.total - a.total);
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const terminalTotals = new Map<string, number>();
  for (const row of rows) terminalTotals.set(row.terminal, (terminalTotals.get(row.terminal) ?? 0) + row.total);
  const chart = Array.from(terminalTotals.entries()).map(([terminal, total]) => ({ terminal, total }));
  const csvRows = rows.map((row) => ({ Terminal: row.terminal, Medio: row.method, Operaciones: row.count, Total: row.total }));

  return (
    <div>
      <PageHeader
        title="Ventas por terminal POS"
        description="Cobros con tarjeta procesados por terminal, según los recibos de caja."
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="no-print"><Link href="/reportes"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Reportes</Link></Button>
            <CsvButton filename="reporte-pos" rows={csvRows} />
            <PrintButton />
          </>
        }
      />
      <ReportFilters
        fields={[
          { type: "date", name: "desde", label: "Desde" },
          { type: "date", name: "hasta", label: "Hasta" },
          { type: "select", name: "terminal", label: "Terminal", options: [{ value: "", label: "Todas las terminales" }, ...terminals.map((terminal) => ({ value: terminal.id, label: terminal.name }))] },
        ]}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total POS</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatGs(total)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Operaciones</p>
          <p className="mt-1 text-xl font-semibold">{rows.reduce((sum, row) => sum + row.count, 0)}</p>
        </div>
      </div>

      <Card className="mb-4 border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Total por terminal</CardTitle></CardHeader>
        <CardContent className="p-4">
          {chart.length === 0 ? (
            <EmptyState icon={CreditCard} title="Sin operaciones POS" className="border-0 py-8" />
          ) : (
            <SimpleBarChart data={chart} xKey="terminal" series={[{ key: "total", label: "Total", color: "hsl(var(--chart-3))" }]} height={230} />
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-none">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <EmptyState icon={CreditCard} title="Sin cobros con tarjeta" description="No hay pagos POS en el período." className="border-0" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                  <TableHead>Terminal</TableHead>
                  <TableHead>Medio de pago</TableHead>
                  <TableHead className="text-right">Operaciones</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`${row.terminal}-${row.method}`}>
                    <TableCell className="text-xs font-medium">{row.terminal}</TableCell>
                    <TableCell className="text-xs">{row.method}</TableCell>
                    <TableCell className="text-right text-xs tabular">{row.count}</TableCell>
                    <TableCell className="text-right text-xs font-medium tabular">{formatGs(row.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
