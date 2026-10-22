import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Factory } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, formatGs, formatNumber } from "@/lib/format";
import { lastMonths, monthKey, reportRange } from "@/lib/reports";
import { ReportFilters } from "@/components/reports/report-filters";
import { CsvButton, PrintButton } from "@/components/reports/report-actions";
import { SimpleBarChart } from "@/components/reports/charts";

export const metadata: Metadata = { title: "Avance de producción" };

export default async function ProductionReportPage({
  searchParams,
}: {
  searchParams: { desde?: string; hasta?: string };
}) {
  const range = reportRange(searchParams);
  const orders = await prisma.productionOrder.findMany({
    where: { startDate: { gte: range.desdeDate, lte: range.hastaDate } },
    include: {
      product: true,
      order: { include: { customer: true } },
      stages: { include: { stage: true, workshop: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { startDate: "desc" },
  });
  const workshops = await prisma.workshop.findMany();
  const workshopMap = new Map(workshops.map((workshop) => [workshop.id, workshop]));
  const months = lastMonths(6);

  const statusCounts = new Map<string, number>();
  for (const order of orders) statusCounts.set(order.status, (statusCounts.get(order.status) ?? 0) + 1);
  const lateOrders = orders.filter((order) => order.dueDate < new Date() && order.status !== "TERMINADA");
  const workshopTotals = new Map<string, { name: string; ops: number; quantity: number; cost: number }>();
  const monthlyOutput = new Map<string, number>();
  for (const order of orders) {
    for (const stage of order.stages) {
      if (stage.workshopId) {
        const workshop = workshopMap.get(stage.workshopId);
        if (workshop) {
          const current = workshopTotals.get(workshop.id) ?? { name: workshop.name, ops: 0, quantity: 0, cost: 0 };
          if (stage.status === "COMPLETADA") current.quantity += stage.completedQuantity;
          current.cost += stage.externalCost;
          if (!workshopTotals.has(workshop.id)) current.ops = new Set(order.stages.map((s) => s.productionOrderId)).size;
          workshopTotals.set(workshop.id, current);
        }
      }
    }
    if (order.status === "TERMINADA") {
      monthlyOutput.set(monthKey(order.updatedAt), (monthlyOutput.get(monthKey(order.updatedAt)) ?? 0) + order.quantity);
    }
  }
  const chart = months.map((month) => ({ mes: month.label, unidades: monthlyOutput.get(month.key) ?? 0 }));
  const workshopRows = Array.from(workshopTotals.values()).sort((a, b) => b.cost - a.cost);
  const rows = orders.map((order) => {
    const completed = order.stages.filter((stage) => stage.status === "COMPLETADA").length;
    return {
      id: order.id,
      number: order.number,
      product: order.product.name,
      order: order.order?.number ?? "—",
      customer: order.order?.customer.name ?? "Stock",
      status: order.status,
      quantity: order.quantity,
      dueDate: formatDate(order.dueDate),
      progress: order.stages.length ? Math.round((completed / order.stages.length) * 100) : 0,
      late: order.dueDate < new Date() && order.status !== "TERMINADA",
      externalCost: order.stages.reduce((sum, stage) => sum + stage.externalCost, 0),
    };
  });
  const csvRows = rows.map((row) => ({
    OP: row.number,
    Producto: row.product,
    Pedido: row.order,
    Cliente: row.customer,
    Estado: row.status,
    Cantidad: row.quantity,
    Avance: row.progress,
    Compromiso: row.dueDate,
    "Costo externo": row.externalCost,
  }));
  const externalTotal = workshopRows.reduce((sum, row) => sum + row.cost, 0);

  return (
    <div>
      <PageHeader
        title="Avance de producción"
        description="OPs del período por estado, atrasos, producción por taller y unidades terminadas."
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="no-print"><Link href="/reportes"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Reportes</Link></Button>
            <CsvButton filename="avance-produccion" rows={csvRows} />
            <PrintButton />
          </>
        }
      />
      <ReportFilters fields={[{ type: "date", name: "desde", label: "Desde" }, { type: "date", name: "hasta", label: "Hasta" }]} />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">OPs en proceso</p>
          <p className="mt-1 text-xl font-semibold">{statusCounts.get("EN_PROCESO") ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Terminadas</p>
          <p className="mt-1 text-xl font-semibold">{statusCounts.get("TERMINADA") ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Atrasadas</p>
          <p className={`mt-1 text-xl font-semibold ${lateOrders.length > 0 ? "text-red-600" : ""}`}>{lateOrders.length}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Costo talleres externos</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatGs(externalTotal)}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Unidades terminadas por mes</CardTitle></CardHeader>
          <CardContent className="p-4"><SimpleBarChart data={chart} xKey="mes" series={[{ key: "unidades", label: "Unidades", color: "#0f766e" }]} height={230} /></CardContent>
        </Card>
        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Producción por taller</CardTitle></CardHeader>
          <CardContent className="p-0">
            {workshopRows.length === 0 ? (
              <EmptyState icon={Factory} title="Sin datos de talleres" className="border-0" />
            ) : (
              <Table>
                <TableHeader><TableRow className="bg-secondary/30 hover:bg-secondary/30"><TableHead>Taller</TableHead><TableHead className="text-right">Unidades</TableHead><TableHead className="text-right">Costo externo</TableHead></TableRow></TableHeader>
                <TableBody>
                  {workshopRows.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell className="text-xs">{row.name}</TableCell>
                      <TableCell className="text-right text-xs tabular">{formatNumber(row.quantity)}</TableCell>
                      <TableCell className="text-right text-xs tabular">{formatGs(row.cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Órdenes del período</CardTitle></CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <EmptyState icon={Factory} title="Sin OPs" description="No hay órdenes de producción en el período." className="border-0" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                    <TableHead>OP</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Pedido / Cliente</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Avance</TableHead>
                    <TableHead>Compromiso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Costo externo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell><Link href={`/produccion/ordenes/${row.id}`} className="font-mono text-[11px] hover:text-primary hover:underline">{row.number}</Link></TableCell>
                      <TableCell className="text-xs">{row.product}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.order} · {row.customer}</TableCell>
                      <TableCell className="text-right text-xs tabular">{row.quantity}</TableCell>
                      <TableCell className="text-right text-xs tabular">{row.progress}%</TableCell>
                      <TableCell className={`text-xs ${row.late ? "font-medium text-red-600" : ""}`}>{row.dueDate}</TableCell>
                      <TableCell><StatusBadge status={row.status} /></TableCell>
                      <TableCell className="text-right text-xs tabular">{formatGs(row.externalCost)}</TableCell>
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
