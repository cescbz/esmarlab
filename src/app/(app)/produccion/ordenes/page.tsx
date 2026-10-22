import type { Metadata } from "next";
import Link from "next/link";
import { KanbanSquare, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { FilterSelect } from "@/components/shared/filter-select";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { ProductionOrdersTable, type ProductionOrderRow } from "./production-orders-table";

export const metadata: Metadata = { title: "Órdenes de producción" };

export default async function ProductionOrdersPage({
  searchParams,
}: {
  searchParams: { estado?: string };
}) {
  const orders = await prisma.productionOrder.findMany({
    where: searchParams.estado ? { status: searchParams.estado as never } : undefined,
    include: {
      product: true,
      order: { include: { customer: true } },
      lines: true,
      stages: { orderBy: { sortOrder: "asc" }, include: { stage: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows: ProductionOrderRow[] = orders.map((order) => {
    const completed = order.stages.filter((stage) => stage.status === "COMPLETADA").length;
    const current = order.stages.find((stage) => stage.status === "EN_CURSO");
    return {
      id: order.id,
      number: order.number,
      product: order.product.name,
      order: order.order?.number ?? "—",
      customer: order.order?.customer.name ?? "—",
      quantity: order.quantity,
      dueDate: formatDate(order.dueDate),
      status: order.status,
      currentStage: current?.stage.name ?? (order.status === "PLANIFICADA" ? "Sin iniciar" : "—"),
      progress: order.stages.length > 0 ? Math.round((completed / order.stages.length) * 100) : 0,
      priority: order.priority,
      late: order.dueDate < new Date() && order.status !== "TERMINADA",
    };
  });

  const inProcess = orders.filter((order) => order.status === "EN_PROCESO").length;
  const planned = orders.filter((order) => order.status === "PLANIFICADA").length;
  const late = orders.filter((order) => order.dueDate < new Date() && order.status !== "TERMINADA").length;

  return (
    <div>
      <PageHeader
        title="Órdenes de producción"
        description="Consumo de materia prima, avance por etapas e ingreso de producto terminado."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/produccion/tablero"><KanbanSquare className="mr-1.5 h-4 w-4" />Tablero</Link>
            </Button>
            <Button asChild>
              <Link href="/produccion/ordenes/nueva"><Plus className="mr-1.5 h-4 w-4" />Nueva OP</Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">En proceso</p>
          <p className="mt-1 text-xl font-semibold">{inProcess}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Planificadas</p>
          <p className="mt-1 text-xl font-semibold">{planned}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Atrasadas</p>
          <p className={`mt-1 text-xl font-semibold ${late > 0 ? "text-red-600" : ""}`}>{late}</p>
        </div>
      </div>

      <ProductionOrdersTable
        data={rows}
        toolbar={
          <FilterSelect
            name="estado"
            label="Estado"
            options={[
              { value: "todos", label: "Todos" },
              { value: "PLANIFICADA", label: "Planificada" },
              { value: "EN_PROCESO", label: "En proceso" },
              { value: "TERMINADA", label: "Terminada" },
              { value: "ANULADA", label: "Anulada" },
            ]}
          />
        }
      />
    </div>
  );
}
