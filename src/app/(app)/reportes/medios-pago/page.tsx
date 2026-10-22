import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";
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
import { SimplePieChart } from "@/components/reports/charts";

export const metadata: Metadata = { title: "Ingresos por medio de pago" };

export default async function PaymentMethodsReportPage({
  searchParams,
}: {
  searchParams: { desde?: string; hasta?: string };
}) {
  const range = reportRange(searchParams);
  const movements = await prisma.cashMovement.findMany({
    where: {
      date: { gte: range.desdeDate, lte: range.hastaDate },
      type: { in: ["INGRESO_VENTA", "INGRESO_COBRO"] },
    },
    include: { paymentMethod: true },
  });

  const grouped = new Map<string, { method: string; type: string; count: number; total: number }>();
  for (const movement of movements) {
    const key = `${movement.paymentMethodId}_${movement.type}`;
    const current = grouped.get(key) ?? { method: movement.paymentMethod.name, type: movement.type, count: 0, total: 0 };
    current.count += 1;
    current.total += movement.amount;
    grouped.set(key, current);
  }
  const rows = Array.from(grouped.values()).sort((a, b) => b.total - a.total);
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const pie = rows.map((row) => ({ medio: `${row.method}${row.type === "INGRESO_VENTA" ? " · venta" : " · cobro"}`, total: row.total }));
  const csvRows = rows.map((row) => ({ Medio: row.method, Tipo: row.type === "INGRESO_VENTA" ? "Venta" : "Cobro", Operaciones: row.count, Total: row.total }));

  return (
    <div>
      <PageHeader
        title="Ingresos por medio de pago"
        description="Ingresos registrados en caja por ventas de contado y cobros de facturas."
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="no-print"><Link href="/reportes"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Reportes</Link></Button>
            <CsvButton filename="reporte-medios-pago" rows={csvRows} />
            <PrintButton />
          </>
        }
      />
      <ReportFilters fields={[{ type: "date", name: "desde", label: "Desde" }, { type: "date", name: "hasta", label: "Hasta" }]} />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total ingresos</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatGs(total)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Movimientos</p>
          <p className="mt-1 text-xl font-semibold">{rows.reduce((sum, row) => sum + row.count, 0)}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card className="border-border/80 shadow-none">
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <EmptyState icon={Wallet} title="Sin ingresos" description="No hay ingresos en el período." className="border-0" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                    <TableHead>Medio de pago</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Operaciones</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={`${row.method}-${row.type}`}>
                      <TableCell className="text-xs font-medium">{row.method}</TableCell>
                      <TableCell className="text-xs">{row.type === "INGRESO_VENTA" ? "Venta" : "Cobro"}</TableCell>
                      <TableCell className="text-right text-xs tabular">{row.count}</TableCell>
                      <TableCell className="text-right text-xs font-medium tabular">{formatGs(row.total)}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground tabular">{total > 0 ? Math.round((row.total / total) * 100) : 0}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Distribución</CardTitle></CardHeader>
          <CardContent className="p-4">
            {pie.length === 0 ? <EmptyState icon={Wallet} title="Sin datos" className="border-0 py-8" /> : <SimplePieChart data={pie} nameKey="medio" valueKey="total" height={280} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
