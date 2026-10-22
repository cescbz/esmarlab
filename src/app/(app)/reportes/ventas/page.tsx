import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { monthKey, reportRange } from "@/lib/reports";
import { ReportFilters } from "@/components/reports/report-filters";
import { CsvButton, PrintButton } from "@/components/reports/report-actions";
import { SimpleBarChart } from "@/components/reports/charts";

export const metadata: Metadata = { title: "Ventas" };

const SELLERS: Record<string, string> = { admin: "Administración", ventas: "Ventas", caja: "Caja" };

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: { desde?: string; hasta?: string };
}) {
  const range = reportRange(searchParams);
  const invoices = await prisma.invoice.findMany({
    where: { type: "FACTURA", status: { not: "CANCELADO" }, issueDate: { gte: range.desdeDate, lte: range.hastaDate } },
    include: { customer: true, lines: { include: { variant: { include: { product: { include: { group: true } } } } } } },
    orderBy: { issueDate: "asc" },
  });

  const monthMap = new Map<string, { label: string; count: number; total: number }>();
  const customerMap = new Map<string, { name: string; count: number; total: number }>();
  const sellerMap = new Map<string, { name: string; count: number; total: number }>();
  const groupMap = new Map<string, { name: string; count: number; total: number }>();

  for (const invoice of invoices) {
    const key = monthKey(invoice.issueDate);
    const label = new Intl.DateTimeFormat("es-PY", { month: "short", year: "numeric", timeZone: "America/Asuncion" }).format(invoice.issueDate);
    const month = monthMap.get(key) ?? { label, count: 0, total: 0 };
    month.count += 1;
    month.total += invoice.total;
    monthMap.set(key, month);

    const customer = customerMap.get(invoice.customerId) ?? { name: invoice.customer.name, count: 0, total: 0 };
    customer.count += 1;
    customer.total += invoice.total;
    customerMap.set(invoice.customerId, customer);

    const sellerKey = invoice.userId ?? "ventas";
    const seller = sellerMap.get(sellerKey) ?? { name: SELLERS[sellerKey] ?? sellerKey, count: 0, total: 0 };
    seller.count += 1;
    seller.total += invoice.total;
    sellerMap.set(sellerKey, seller);

    for (const line of invoice.lines) {
      const groupName = line.variant?.product.group.name ?? "Sin grupo";
      const group = groupMap.get(groupName) ?? { name: groupName, count: 0, total: 0 };
      group.count += line.quantity;
      group.total += line.lineTotal;
      groupMap.set(groupName, group);
    }
  }

  const monthRows = Array.from(monthMap.entries()).map(([key, value]) => ({ key, ...value })).sort((a, b) => a.key.localeCompare(b.key));
  const customerRows = Array.from(customerMap.values()).sort((a, b) => b.total - a.total);
  const sellerRows = Array.from(sellerMap.values()).sort((a, b) => b.total - a.total);
  const groupRows = Array.from(groupMap.values()).sort((a, b) => b.total - a.total);
  const total = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const ticket = invoices.length ? Math.round(total / invoices.length) : 0;
  const chart = monthRows.map((row) => ({ periodo: row.label, total: row.total }));

  return (
    <div>
      <PageHeader
        title="Ventas"
        description="Ventas por período, cliente, vendedor y grupo de producto, sin comprobantes cancelados."
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="no-print"><Link href="/reportes"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Reportes</Link></Button>
            <PrintButton />
          </>
        }
      />
      <ReportFilters fields={[{ type: "date", name: "desde", label: "Desde" }, { type: "date", name: "hasta", label: "Hasta" }]} />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total vendido</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatGs(total)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Facturas</p>
          <p className="mt-1 text-xl font-semibold">{invoices.length}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ticket promedio</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatGs(ticket)}</p>
        </div>
      </div>

      <Card className="mb-4 border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Ventas por período</CardTitle></CardHeader>
        <CardContent className="p-4">
          {chart.length === 0 ? <EmptyState icon={TrendingUp} title="Sin ventas" className="border-0 py-8" /> : <SimpleBarChart data={chart} xKey="periodo" series={[{ key: "total", label: "Ventas", color: "hsl(var(--chart-1))" }]} height={240} />}
        </CardContent>
      </Card>

      <Tabs defaultValue="clientes">
        <TabsList className="h-9 bg-secondary/60">
          <TabsTrigger value="clientes" className="text-xs">Por cliente</TabsTrigger>
          <TabsTrigger value="vendedores" className="text-xs">Por vendedor</TabsTrigger>
          <TabsTrigger value="grupos" className="text-xs">Por grupo</TabsTrigger>
          <TabsTrigger value="periodo" className="text-xs">Por período</TabsTrigger>
        </TabsList>

        <TabsContent value="clientes" className="mt-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="flex-row items-center justify-between border-b border-border/60 px-5 py-3.5">
              <CardTitle className="text-sm font-semibold">Ventas por cliente</CardTitle>
              <CsvButton filename="ventas-por-cliente" rows={customerRows.map((row) => ({ Cliente: row.name, Facturas: row.count, Total: row.total }))} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-secondary/30 hover:bg-secondary/30"><TableHead>Cliente</TableHead><TableHead className="text-right">Facturas</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {customerRows.map((row) => (
                    <TableRow key={row.name}><TableCell className="text-xs">{row.name}</TableCell><TableCell className="text-right text-xs tabular">{row.count}</TableCell><TableCell className="text-right text-xs font-medium tabular">{formatGs(row.total)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendedores" className="mt-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="flex-row items-center justify-between border-border/60 px-5 py-3.5">
              <CardTitle className="text-sm font-semibold">Ventas por vendedor</CardTitle>
              <CsvButton filename="ventas-por-vendedor" rows={sellerRows.map((row) => ({ Vendedor: row.name, Facturas: row.count, Total: row.total }))} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-secondary/30 hover:bg-secondary/30"><TableHead>Vendedor</TableHead><TableHead className="text-right">Facturas</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {sellerRows.map((row) => (
                    <TableRow key={row.name}><TableCell className="text-xs">{row.name}</TableCell><TableCell className="text-right text-xs tabular">{row.count}</TableCell><TableCell className="text-right text-xs font-medium tabular">{formatGs(row.total)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grupos" className="mt-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="flex-row items-center justify-between border-b border-border/60 px-5 py-3.5">
              <CardTitle className="text-sm font-semibold">Ventas por grupo de producto</CardTitle>
              <CsvButton filename="ventas-por-grupo" rows={groupRows.map((row) => ({ Grupo: row.name, Unidades: row.count, Total: row.total }))} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-secondary/30 hover:bg-secondary/30"><TableHead>Grupo</TableHead><TableHead className="text-right">Unidades</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {groupRows.map((row) => (
                    <TableRow key={row.name}><TableCell className="text-xs">{row.name}</TableCell><TableCell className="text-right text-xs tabular">{row.count}</TableCell><TableCell className="text-right text-xs font-medium tabular">{formatGs(row.total)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="periodo" className="mt-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="flex-row items-center justify-between border-border/60 px-5 py-3.5">
              <CardTitle className="text-sm font-semibold">Ventas por mes</CardTitle>
              <CsvButton filename="ventas-por-periodo" rows={monthRows.map((row) => ({ Periodo: row.label, Facturas: row.count, Total: row.total }))} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-secondary/30 hover:bg-secondary/30"><TableHead>Período</TableHead><TableHead className="text-right">Facturas</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {monthRows.map((row) => (
                    <TableRow key={row.key}><TableCell className="text-xs capitalize">{row.label}</TableCell><TableCell className="text-right text-xs tabular">{row.count}</TableCell><TableCell className="text-right text-xs font-medium tabular">{formatGs(row.total)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
