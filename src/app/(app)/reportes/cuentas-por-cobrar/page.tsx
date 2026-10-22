import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
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
import { ReportFilters } from "@/components/reports/report-filters";
import { CsvButton, PrintButton } from "@/components/reports/report-actions";
import { SimpleBarChart } from "@/components/reports/charts";

export const metadata: Metadata = { title: "Cuentas por cobrar" };

export default async function ReceivablesReportPage({
  searchParams,
}: {
  searchParams: { cliente?: string };
}) {
  const [invoices, customers] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        type: "FACTURA",
        status: { not: "CANCELADO" },
        balance: { gt: 0 },
        ...(searchParams.cliente ? { customerId: searchParams.cliente } : {}),
      },
      include: { customer: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
  ]);

  const today = new Date();
  const map = new Map<string, { id: string; name: string; corriente: number; d30: number; d60: number; d90: number; mas90: number; total: number }>();
  for (const invoice of invoices) {
    const row = map.get(invoice.customerId) ?? {
      id: invoice.customerId,
      name: invoice.customer.name,
      corriente: 0,
      d30: 0,
      d60: 0,
      d90: 0,
      mas90: 0,
      total: 0,
    };
    const days = Math.floor((today.getTime() - invoice.dueDate.getTime()) / 86_400_000);
    if (days <= 0) row.corriente += invoice.balance;
    else if (days <= 30) row.d30 += invoice.balance;
    else if (days <= 60) row.d60 += invoice.balance;
    else if (days <= 90) row.d90 += invoice.balance;
    else row.mas90 += invoice.balance;
    row.total += invoice.balance;
    map.set(invoice.customerId, row);
  }
  const rows = Array.from(map.values()).sort((a, b) => b.total - a.total);
  const totals = rows.reduce(
    (acc, row) => ({
      corriente: acc.corriente + row.corriente,
      d30: acc.d30 + row.d30,
      d60: acc.d60 + row.d60,
      d90: acc.d90 + row.d90,
      mas90: acc.mas90 + row.mas90,
      total: acc.total + row.total,
    }),
    { corriente: 0, d30: 0, d60: 0, d90: 0, mas90: 0, total: 0 }
  );
  const chart = [
    { tramo: "Corriente", total: totals.corriente },
    { tramo: "1-30 días", total: totals.d30 },
    { tramo: "31-60 días", total: totals.d60 },
    { tramo: "61-90 días", total: totals.d90 },
    { tramo: "+90 días", total: totals.mas90 },
  ];
  const csvRows = rows.map((row) => ({
    Cliente: row.name,
    Corriente: row.corriente,
    "1-30": row.d30,
    "31-60": row.d60,
    "61-90": row.d90,
    "+90": row.mas90,
    Total: row.total,
  }));

  return (
    <div>
      <PageHeader
        title="Cuentas por cobrar"
        description="Antigüedad de saldos por cliente, calculada sobre el vencimiento de cada factura."
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="no-print"><Link href="/reportes"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Reportes</Link></Button>
            <CsvButton filename="cuentas-por-cobrar" rows={csvRows} />
            <PrintButton />
          </>
        }
      />
      <ReportFilters fields={[{ type: "select", name: "cliente", label: "Cliente", options: [{ value: "", label: "Todos los clientes" }, ...customers.map((customer) => ({ value: customer.id, label: customer.name }))] }]} />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total por cobrar</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatGs(totals.total)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Vencido 1-30</p>
          <p className="mt-1 text-lg font-semibold tabular">{formatGs(totals.d30)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Vencido 31-90</p>
          <p className="mt-1 text-lg font-semibold tabular">{formatGs(totals.d60 + totals.d90)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Más de 90</p>
          <p className="mt-1 text-lg font-semibold tabular text-red-600">{formatGs(totals.mas90)}</p>
        </div>
      </div>

      <Card className="mb-4 border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Distribución por antigüedad</CardTitle></CardHeader>
        <CardContent className="p-4">
          <SimpleBarChart data={chart} xKey="tramo" series={[{ key: "total", label: "Saldo", color: "hsl(var(--chart-2))" }]} height={220} />
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-none">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <EmptyState icon={Users} title="Sin cuentas por cobrar" description="No hay saldos pendientes para los filtros." className="border-0" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Corriente</TableHead>
                    <TableHead className="text-right">1-30</TableHead>
                    <TableHead className="text-right">31-60</TableHead>
                    <TableHead className="text-right">61-90</TableHead>
                    <TableHead className="text-right">+90</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs"><Link href={`/clientes/${row.id}`} className="font-medium hover:text-primary hover:underline">{row.name}</Link></TableCell>
                      <TableCell className="text-right text-xs tabular">{formatGs(row.corriente)}</TableCell>
                      <TableCell className="text-right text-xs tabular">{formatGs(row.d30)}</TableCell>
                      <TableCell className="text-right text-xs tabular">{formatGs(row.d60)}</TableCell>
                      <TableCell className="text-right text-xs tabular">{formatGs(row.d90)}</TableCell>
                      <TableCell className={`text-right text-xs tabular ${row.mas90 > 0 ? "font-medium text-red-600" : ""}`}>{formatGs(row.mas90)}</TableCell>
                      <TableCell className="text-right text-xs font-semibold tabular">{formatGs(row.total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-secondary/40 font-semibold">
                    <TableCell className="text-xs">TOTAL</TableCell>
                    <TableCell className="text-right text-xs tabular">{formatGs(totals.corriente)}</TableCell>
                    <TableCell className="text-right text-xs tabular">{formatGs(totals.d30)}</TableCell>
                    <TableCell className="text-right text-xs tabular">{formatGs(totals.d60)}</TableCell>
                    <TableCell className="text-right text-xs tabular">{formatGs(totals.d90)}</TableCell>
                    <TableCell className="text-right text-xs tabular">{formatGs(totals.mas90)}</TableCell>
                    <TableCell className="text-right text-xs tabular">{formatGs(totals.total)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
