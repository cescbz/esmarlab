import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Boxes } from "lucide-react";
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
import { ReportFilters } from "@/components/reports/report-filters";
import { CsvButton, PrintButton } from "@/components/reports/report-actions";
import { SimpleBarChart } from "@/components/reports/charts";

export const metadata: Metadata = { title: "Stock valorizado" };

export default async function StockReportPage({
  searchParams,
}: {
  searchParams: { deposito?: string; grupo?: string };
}) {
  const [warehouses, groups, levels] = await Promise.all([
    prisma.warehouse.findMany({ orderBy: { name: "asc" } }),
    prisma.productGroup.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.stockLevel.findMany({
      where: {
        ...(searchParams.deposito ? { warehouseId: searchParams.deposito } : {}),
        ...(searchParams.grupo ? { variant: { product: { groupId: searchParams.grupo } } } : {}),
      },
      include: { warehouse: true, variant: { include: { product: { include: { group: true } } } } },
    }),
  ]);

  const grouped = new Map<string, { group: string; warehouse: string; units: number; value: number }>();
  for (const level of levels) {
    const key = `${level.variant.product.group.name}_${level.warehouseId}`;
    const current = grouped.get(key) ?? {
      group: level.variant.product.group.name,
      warehouse: level.warehouse.name,
      units: 0,
      value: 0,
    };
    current.units += level.quantity;
    current.value += level.quantity * level.variant.product.cost;
    grouped.set(key, current);
  }
  const rows = Array.from(grouped.values()).sort((a, b) => a.group.localeCompare(b.group) || a.warehouse.localeCompare(b.warehouse));
  const totalValue = rows.reduce((sum, row) => sum + row.value, 0);
  const totalUnits = rows.reduce((sum, row) => sum + row.units, 0);
  const byGroup = new Map<string, number>();
  for (const row of rows) byGroup.set(row.group, (byGroup.get(row.group) ?? 0) + row.value);
  const chart = Array.from(byGroup.entries()).map(([grupo, valor]) => ({ grupo, valor })).sort((a, b) => b.valor - a.valor);
  const csvRows = rows.map((row) => ({ Grupo: row.group, Deposito: row.warehouse, Unidades: row.units, Valorizado: row.value }));

  return (
    <div>
      <PageHeader
        title="Stock valorizado"
        description="Existencias por grupo de producto y depósito, valorizadas a costo promedio."
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="no-print"><Link href="/reportes"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Reportes</Link></Button>
            <CsvButton filename="stock-valorizado" rows={csvRows} />
            <PrintButton />
          </>
        }
      />
      <ReportFilters
        fields={[
          { type: "select", name: "deposito", label: "Depósito", options: [{ value: "", label: "Todos los depósitos" }, ...warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))] },
          { type: "select", name: "grupo", label: "Grupo", options: [{ value: "", label: "Todos los grupos" }, ...groups.map((group) => ({ value: group.id, label: group.name }))] },
        ]}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Unidades</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatNumber(totalUnits)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Valorizado a costo</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatGs(totalValue)}</p>
        </div>
      </div>

      <Card className="mb-4 border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Valorizado por grupo</CardTitle></CardHeader>
        <CardContent className="p-4">
          {chart.length === 0 ? <EmptyState icon={Boxes} title="Sin stock" className="border-0 py-8" /> : <SimpleBarChart data={chart} xKey="grupo" series={[{ key: "valor", label: "Valorizado", color: "hsl(var(--chart-1))" }]} height={240} />}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-none">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <EmptyState icon={Boxes} title="Sin existencias" description="No hay stock para los filtros seleccionados." className="border-0" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                  <TableHead>Grupo</TableHead>
                  <TableHead>Depósito</TableHead>
                  <TableHead className="text-right">Unidades</TableHead>
                  <TableHead className="text-right">Valorizado</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`${row.group}-${row.warehouse}`}>
                    <TableCell className="text-xs font-medium">{row.group}</TableCell>
                    <TableCell className="text-xs">{row.warehouse}</TableCell>
                    <TableCell className="text-right text-xs tabular">{formatNumber(row.units)}</TableCell>
                    <TableCell className="text-right text-xs font-medium tabular">{formatGs(row.value)}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground tabular">{totalValue > 0 ? Math.round((row.value / totalValue) * 100) : 0}%</TableCell>
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
