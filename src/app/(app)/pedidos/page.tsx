import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Columns3, List, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { FilterSelect } from "@/components/shared/filter-select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatGs, relativeDays } from "@/lib/format";
import { cn } from "@/lib/utils";
import { OrdersTable, type OrderRow } from "./orders-table";

export const metadata: Metadata = { title: "Pedidos" };

const KANBAN_STATUSES = ["PENDIENTE", "EN_PRODUCCION", "LISTO", "DESPACHADO_PARCIAL", "DESPACHADO"];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { estado?: string; vista?: string };
}) {
  const orders = await prisma.salesOrder.findMany({
    where: searchParams.estado ? { status: searchParams.estado as never } : undefined,
    include: { customer: true, lines: true },
    orderBy: { date: "desc" },
  });

  const rows: OrderRow[] = orders.map((order) => ({
    id: order.id,
    number: order.number,
    customer: order.customer.name,
    date: formatDate(order.date),
    deliveryDate: formatDate(order.deliveryDate),
    status: order.status,
    total: order.total,
    shipped: order.lines.reduce((sum, line) => sum + line.quantityShipped, 0),
    units: order.lines.reduce((sum, line) => sum + line.quantity, 0),
  }));

  const active = orders.filter((order) => !["ANULADO", "FACTURADO"].includes(order.status));
  const overdue = active.filter((order) => order.deliveryDate < new Date());
  const next7 = active.filter((order) => {
    const days = relativeDays(order.deliveryDate);
    return days >= 0 && days <= 7;
  });
  const isKanban = searchParams.vista === "kanban";

  return (
    <div>
      <PageHeader
        title="Pedidos"
        description="Pedidos generados por presupuestos aprobados. Controlá entregas parciales, producción y facturación."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={isKanban ? "/pedidos" : "/pedidos?vista=kanban"}>
                {isKanban ? <List className="mr-1.5 h-4 w-4" /> : <Columns3 className="mr-1.5 h-4 w-4" />}
                {isKanban ? "Vista tabla" : "Vista kanban"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/presupuestos/nuevo"><Plus className="mr-1.5 h-4 w-4" />Nuevo desde presupuesto</Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Pedidos activos</p>
          <p className="mt-1 text-xl font-semibold">{active.length}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Entregan en 7 días</p>
          <p className="mt-1 text-xl font-semibold">{next7.length}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Atrasados</p>
          <p className={`mt-1 text-xl font-semibold ${overdue.length > 0 ? "text-red-600" : ""}`}>{overdue.length}</p>
        </div>
      </div>

      {isKanban ? (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {KANBAN_STATUSES.map((status) => {
            const statusOrders = orders.filter((order) => order.status === status);
            return (
              <div key={status} className="w-[260px] shrink-0 rounded-xl border border-border/80 bg-secondary/30 p-2.5">
                <div className="mb-2 flex items-center justify-between px-1">
                  <StatusBadge status={status} />
                  <span className="text-[10px] text-muted-foreground">{statusOrders.length}</span>
                </div>
                <div className="space-y-2">
                  {statusOrders.length === 0 ? (
                    <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">Sin pedidos</p>
                  ) : (
                    statusOrders.map((order) => {
                      const late = order.deliveryDate < new Date() && !["DESPACHADO", "FACTURADO"].includes(order.status);
                      return (
                        <Link key={order.id} href={`/pedidos/${order.id}`}>
                          <Card className={cn("border-border/80 p-3 shadow-none transition-colors hover:border-primary/30", late && "border-red-200 bg-red-50/40")}>
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[11px] font-semibold">{order.number}</span>
                              <span className="text-[10px] text-muted-foreground">{formatDate(order.date)}</span>
                            </div>
                            <p className="mt-2 line-clamp-2 text-xs font-medium">{order.customer.name}</p>
                            <div className="mt-2 flex items-center justify-between">
                              <span className={cn("flex items-center gap-1 text-[10px]", late ? "font-medium text-red-600" : "text-muted-foreground")}>
                                <CalendarClock className="h-3 w-3" />{formatDate(order.deliveryDate)}
                              </span>
                              <span className="text-[10px] font-semibold tabular">{formatGs(order.total)}</span>
                            </div>
                          </Card>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <OrdersTable
          data={rows}
          toolbar={
            <FilterSelect
              name="estado"
              label="Estado"
              options={[
                { value: "todos", label: "Todos" },
                { value: "PENDIENTE", label: "Pendiente" },
                { value: "EN_PRODUCCION", label: "En producción" },
                { value: "LISTO", label: "Listo" },
                { value: "DESPACHADO_PARCIAL", label: "Despacho parcial" },
                { value: "DESPACHADO", label: "Despachado" },
                { value: "FACTURADO", label: "Facturado" },
                { value: "ANULADO", label: "Anulado" },
              ]}
            />
          }
        />
      )}
    </div>
  );
}
