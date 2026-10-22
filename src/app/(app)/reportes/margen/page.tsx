import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";
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
import { formatGs, formatNumber } from "@/lib/format";
import { reportRange } from "@/lib/reports";
import { ReportFilters } from "@/components/reports/report-filters";
import { CsvButton, PrintButton } from "@/components/reports/report-actions";
import { SimpleBarChart } from "@/components/reports/charts";

export const metadata: Metadata = { title: "Margen por producto" };

export default async function MarginReportPage({
  searchParams,
}: {
  searchParams: { desde?: string; hasta?: string; grupo?: string };
}) {
  const range = reportRange(searchParams);
  const groups = await prisma.productGroup.findMany({ orderBy: { sortOrder: "asc" } });
  const lines = await prisma.invoiceLine.findMany({
    where: {
      invoice: { type: "FACTURA", status: { not: "CANCELADO" }, issueDate: { gte: range.desdeDate, lte: range.hastaDate } },
      variant: { product: { ...(searchParams.grupo ? { groupId: searchParams.grupo } : {}) } },
    },
    include: { variant: { include: { product: { include: { group: true } } } } },
  });

  const map = new Map<string, { id: string; name: string; group: string; units: number; revenue: number; cost: number }>();
  for (const line of lines) {
    if (!line.variant) continue;
    const product = line.variant.product;
    const net = line.lineTotal / (1 + line.taxRate / 100);
    const current = map.get(product.id) ?? { id: product.id, name: product.name, group: product.group.name, units: 0, revenue: 0, cost: 0 };
    current.units += line.quantity;
    current.revenue += net;
    current.cost += line.quantity * product.cost;
    map.set(product.id, current);
  }
  const rows = Array.from(map.values())
    .map((row) => ({
      ...row,
      margin: row.revenue - row.cost,
      marginPct: row.revenue > 0 ? ((row.revenue - row.cost) / row.revenue) * 100 : 0,
      avgPrice: row.units > 0 ? row.revenue / row.units : 0,
    }))
    .sort((a, b) => b.margin - a.margin);
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);
  const totalMargin = totalRevenue - totalCost;
  const marginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
  const chart = rows.slice(0, 10).map((row) => ({ producto: row.name.length > 20 ? `${row.name.slice(0, 20)}…` : row.name, margen: Math.round(row.margin) }));
  const csvRows = rows.map((row) => ({
    Producto: row.name,
    Grupo: row.group,
    Unidades: row.units,
    "Venta neta": Math.round(row.revenue),
    Costo: Math.round(row.cost),
    Margen: Math.round(row.margin),
    "Margen %": row.marginPct.toFixed(1),
  }));

  return (
    <div>
      <PageHeader
        title="Margen por producto"
        description="Venta neta de IVA menos costo promedio actual. Ordenado por margen absoluto."
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="no-print"><Link href="/reportes"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Reportes</Link></Button>
            <CsvButton filename="margen-por-producto" rows={csvRows} />
            <PrintButton />
          </>
        }
      />
      <ReportFilters
        fields={[
          { type: "date", name: "desde", label: "Desde" },
          { type: "date", name: "hasta", label: "Hasta" },
          { type: "select", name: "grupo", label: "Grupo", options: [{ value: "", label: "Todos los grupos" }, ...groups.map((group) => ({ value: group.id, label: group.name }))] },
        ]}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Venta neta</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatGs(totalRevenue)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Costo</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatGs(totalCost)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Margen</p>
          <p className="mt-1 text-xl font-semibold tabular text-emerald-700">{formatGs(totalMargin)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Margen %</p>
          <p className="mt-1 text-xl font-semibold">{marginPct.toFixed(1)}%</p>
        </div>
      </div>

      <Card className="mb-4 border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Top 10 por margen</CardTitle></CardHeader>
        <CardContent className="p-4">
          {chart.length === 0 ? <EmptyState icon={BarChart3} title="Sin ventas" className="border-0 py-8" /> : <SimpleBarChart data={chart} xKey="producto" series={[{ key: "margen", label: "Margen", color: "#84cc16" }]} height={260} />}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-none">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <EmptyState icon={BarChart3} title="Sin datos" description="No hay ventas de productos en el período." className="border-0" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                    <TableHead>Producto</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead className="text-right">Unidades</TableHead>
                    <TableHead className="text-right">Precio prom. neto</TableHead>
                    <TableHead className="text-right">Venta neta</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-right">Margen</TableHead>
                    <TableHead className="text-right">Margen %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell><Link href={`/productos/${row.id}`} className="text-xs font-medium hover:text-primary hover:underline">{row.name}</Link></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.group}</TableCell>
                      <TableCell className="text-right text-xs tabular">{formatNumber(row.units)}</TableCell>
                      <TableCell className="text-right text-xs tabular">{formatGs(Math.round(row.avgPrice))}</TableCell>
                      <TableCell className="text-right text-xs tabular">{formatGs(row.revenue)}</TableCell>
                      <TableCell className="text-right text-xs tabular">{formatGs(row.cost)}</TableCell>
                      <TableCell className={`text-right text-xs font-medium tabular ${row.margin >= 0 ? "text-emerald-700" : "text-red-600"}`}>{formatGs(row.margin)}</TableCell>
                      <TableCell className={`text-right text-xs tabular ${row.marginPct >= 0 ? "" : "text-red-600"}`}>{row.marginPct.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
