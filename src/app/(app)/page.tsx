import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarClock,
  Factory,
  PackageX,
  ReceiptText,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatGs, formatNumber, toDateInputValue } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/roles";
import { lastMonths, monthKey } from "@/lib/reports";
import { SimpleBarChart, SimplePieChart } from "@/components/reports/charts";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] ?? "";
  const today = toDateInputValue(new Date());
  const todayStart = new Date(`${today}T00:00:00-03:00`);
  const todayEnd = new Date(`${today}T23:59:59-03:00`);
  const monthStart = new Date(`${today.slice(0, 8)}01T00:00:00-03:00`);
  const months = lastMonths(12);
  const next7 = new Date(Date.now() + 7 * 86_400_000);

  const [
    salesDay,
    salesMonth,
    receiptsToday,
    contadoToday,
    receivables,
    overdue,
    productionOrders,
    stockLevels,
    variants,
    monthlyInvoices,
    monthInvoices,
    monthLines,
    topCustomers,
    upcomingOrders,
    overdueInvoices,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      where: { type: "FACTURA", status: { not: "CANCELADO" }, issueDate: { gte: todayStart, lte: todayEnd } },
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: { type: "FACTURA", status: { not: "CANCELADO" }, issueDate: { gte: monthStart, lte: todayEnd } },
      _sum: { total: true },
    }),
    prisma.receipt.aggregate({ where: { date: { gte: todayStart, lte: todayEnd } }, _sum: { total: true } }),
    prisma.invoice.aggregate({
      where: { type: "FACTURA", condition: "CONTADO", status: { not: "CANCELADO" }, issueDate: { gte: todayStart, lte: todayEnd } },
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: { type: "FACTURA", status: { not: "CANCELADO" }, balance: { gt: 0 } },
      _sum: { balance: true },
    }),
    prisma.invoice.aggregate({
      where: { type: "FACTURA", status: { not: "CANCELADO" }, balance: { gt: 0 }, dueDate: { lt: new Date() } },
      _sum: { balance: true },
    }),
    prisma.productionOrder.count({ where: { status: "EN_PROCESO" } }),
    prisma.stockLevel.groupBy({ by: ["variantId"], _sum: { quantity: true } }),
    prisma.productVariant.findMany({ include: { product: { select: { id: true, minStock: true } } } }),
    prisma.invoice.findMany({
      where: { type: "FACTURA", status: { not: "CANCELADO" }, issueDate: { gte: months[0].start } },
      select: { issueDate: true, total: true },
    }),
    prisma.invoice.findMany({
      where: { type: "FACTURA", status: { not: "CANCELADO" }, issueDate: { gte: monthStart } },
      select: { id: true },
    }),
    prisma.invoiceLine.findMany({
      where: { invoice: { type: "FACTURA", status: { not: "CANCELADO" }, issueDate: { gte: monthStart } } },
      include: { variant: { include: { product: { include: { group: true } } } } },
    }),
    prisma.invoice.groupBy({
      by: ["customerId"],
      where: { type: "FACTURA", status: { not: "CANCELADO" }, issueDate: { gte: monthStart } },
      _sum: { total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 10,
    }),
    prisma.salesOrder.findMany({
      where: {
        status: { in: ["PENDIENTE", "EN_PRODUCCION", "LISTO", "DESPACHADO_PARCIAL"] },
        deliveryDate: { gte: new Date(), lte: next7 },
      },
      include: { customer: { select: { name: true } } },
      orderBy: { deliveryDate: "asc" },
      take: 8,
    }),
    prisma.invoice.findMany({
      where: { type: "FACTURA", status: { not: "CANCELADO" }, balance: { gt: 0 }, dueDate: { lt: new Date() } },
      include: { customer: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
  ]);

  const stockMap = new Map(stockLevels.map((row) => [row.variantId, row._sum.quantity ?? 0]));
  const lowProducts = new Set(
    variants
      .filter((variant) => (stockMap.get(variant.id) ?? 0) < variant.product.minStock)
      .map((variant) => variant.product.id)
  );

  const monthlyMap = new Map<string, number>();
  for (const invoice of monthlyInvoices) {
    const key = monthKey(invoice.issueDate);
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + invoice.total);
  }
  const monthlySales = months.map((month) => ({ mes: month.label, ventas: monthlyMap.get(month.key) ?? 0 }));

  const groupMap = new Map<string, number>();
  for (const line of monthLines) {
    const group = line.variant?.product.group.name ?? "Sin grupo";
    groupMap.set(group, (groupMap.get(group) ?? 0) + line.lineTotal);
  }
  const groupSales = Array.from(groupMap.entries())
    .map(([grupo, total]) => ({ grupo, total }))
    .sort((a, b) => b.total - a.total);
  const topCustomerNames = await prisma.customer.findMany({
    where: { id: { in: topCustomers.map((row) => row.customerId) } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(topCustomerNames.map((customer) => [customer.id, customer.name]));
  const topCustomerRows = topCustomers.map((row) => ({
    id: row.customerId,
    name: nameMap.get(row.customerId) ?? "Cliente",
    total: row._sum.total ?? 0,
  }));
  const topMax = topCustomerRows[0]?.total ?? 0;
  const totalGroupSales = groupSales.reduce((sum, row) => sum + row.total, 0);
  const collectedToday = (receiptsToday._sum.total ?? 0) + (contadoToday._sum.total ?? 0);
  const monthLabel = new Intl.DateTimeFormat("es-PY", { month: "long", year: "numeric", timeZone: "America/Asuncion" }).format(new Date());

  return (
    <div>
      <PageHeader
        title={`Hola, ${firstName}`}
        description={`Resumen de ${monthLabel}. Ventas, cobranzas, producción y stock en un solo lugar.`}
        actions={
          <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-white px-3 py-2 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            <span className="capitalize">{new Intl.DateTimeFormat("es-PY", { timeZone: "America/Asuncion", weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span>
            <Badge variant="outline" className="ml-1 border-amber-200 bg-amber-50 text-[9px] uppercase text-amber-700">
              {session ? ROLE_LABELS[session.user.role] : ""}
            </Badge>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Ventas de hoy" value={formatGs(salesDay._sum.total ?? 0)} icon={TrendingUp} tone="accent" />
        <KpiCard label="Ventas del mes" value={formatGs(salesMonth._sum.total ?? 0)} icon={ReceiptText} />
        <KpiCard label="Cobrado hoy" value={formatGs(collectedToday)} icon={Banknote} tone="success" />
        <KpiCard label="Por cobrar" value={formatGs(receivables._sum.balance ?? 0)} hint={`Vencido ${formatGs(overdue._sum.balance ?? 0)}`} icon={Wallet} tone={overdue._sum.balance ? "warning" : "default"} />
        <KpiCard label="OPs en proceso" value={String(productionOrders)} icon={Factory} />
        <KpiCard label="Bajo stock mínimo" value={`${lowProducts.size} productos`} hint="Requiere reposición" icon={PackageX} tone={lowProducts.size > 0 ? "danger" : "success"} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <Card className="border-border/80 shadow-none xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between border-b border-border/60 px-5 py-3.5">
            <CardTitle className="text-sm font-semibold">Ventas últimos 12 meses</CardTitle>
            <Link href="/reportes/ventas" className="flex items-center gap-1 text-[11px] text-primary hover:underline">
              Ver reporte <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-4">
            <SimpleBarChart data={monthlySales} xKey="mes" series={[{ key: "ventas", label: "Ventas", color: "#0f766e" }]} height={250} />
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5">
            <CardTitle className="text-sm font-semibold">Ventas por grupo · mes</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {groupSales.length === 0 ? (
              <EmptyState icon={PackageX} title="Sin ventas este mes" className="border-0 py-8" />
            ) : (
              <>
                <SimplePieChart data={groupSales} nameKey="grupo" valueKey="total" height={210} />
                <div className="mt-2 space-y-1">
                  {groupSales.slice(0, 4).map((row) => (
                    <div key={row.grupo} className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">{row.grupo}</span>
                      <span className="tabular">{Math.round((row.total / totalGroupSales) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5">
            <CardTitle className="text-sm font-semibold">Top 10 clientes del mes</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {topCustomerRows.length === 0 ? (
              <EmptyState icon={TrendingUp} title="Sin ventas" className="border-0 py-6" />
            ) : (
              <div className="space-y-2.5">
                {topCustomerRows.map((customer, index) => (
                  <div key={customer.id}>
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{index + 1}.</span>
                        <Link href={`/clientes/${customer.id}`} className="truncate hover:text-primary hover:underline">{customer.name}</Link>
                      </span>
                      <span className="shrink-0 font-medium tabular">{formatGs(customer.total)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${topMax > 0 ? (customer.total / topMax) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none">
          <CardHeader className="flex-row items-center justify-between border-b border-border/60 px-5 py-3.5">
            <CardTitle className="text-sm font-semibold">Próximas entregas</CardTitle>
            <Link href="/pedidos" className="text-[11px] text-primary hover:underline">Ver pedidos</Link>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingOrders.length === 0 ? (
              <EmptyState icon={CalendarClock} title="Sin entregas próximas" description="No hay pedidos con entrega en los próximos 7 días." className="border-0" />
            ) : (
              <div className="divide-y divide-border/60">
                {upcomingOrders.map((order) => (
                  <Link key={order.id} href={`/pedidos/${order.id}`} className="flex items-center justify-between gap-2 px-5 py-2.5 hover:bg-secondary/30">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] font-medium">{order.number}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{order.customer.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-medium">{formatDate(order.deliveryDate)}</p>
                      <StatusBadge status={order.status} className="mt-0.5" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none">
          <CardHeader className="flex-row items-center justify-between border-b border-border/60 px-5 py-3.5">
            <CardTitle className="text-sm font-semibold">Facturas vencidas</CardTitle>
            <Link href="/reportes/cuentas-por-cobrar" className="text-[11px] text-primary hover:underline">Cobranzas</Link>
          </CardHeader>
          <CardContent className="p-0">
            {overdueInvoices.length === 0 ? (
              <EmptyState icon={AlertTriangle} title="Sin facturas vencidas" className="border-0" />
            ) : (
              <div className="divide-y divide-border/60">
                {overdueInvoices.map((invoice) => (
                  <Link key={invoice.id} href={`/facturas/${invoice.id}`} className="flex items-center justify-between gap-2 px-5 py-2.5 hover:bg-secondary/30">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] font-medium">{invoice.number}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{invoice.customer.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold text-amber-700 tabular">{formatGs(invoice.balance)}</p>
                      <p className="text-[9px] text-muted-foreground">Vencía {formatDate(invoice.dueDate)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="mt-5 text-[10px] text-muted-foreground">
        Datos de demostración · {formatNumber(monthInvoices.length)} facturas emitidas este mes · Esmar SRL
      </p>
    </div>
  );
}
