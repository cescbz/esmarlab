import type { Metadata } from "next";
import Link from "next/link";
import { List, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { ProductionKanban, type KanbanCard } from "./production-kanban";

export const metadata: Metadata = { title: "Tablero de producción" };

export default async function ProductionKanbanPage() {
  const [stages, orders] = await Promise.all([
    prisma.productionStage.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.productionOrder.findMany({
      where: { status: { in: ["PLANIFICADA", "EN_PROCESO"] } },
      include: {
        product: true,
        order: { include: { customer: true } },
        stages: { include: { stage: true, workshop: true }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const cards: KanbanCard[] = orders.map((order) => {
    const current = order.stages.find((stage) => stage.status === "EN_CURSO");
    const fallback = order.stages.find((stage) => stage.status === "PENDIENTE");
    const stage = current ?? fallback;
    return {
      id: order.id,
      number: order.number,
      product: order.product.name,
      customer: order.order?.customer.name ?? "Producción para stock",
      quantity: order.quantity,
      dueDate: formatDate(order.dueDate),
      late: order.dueDate < new Date(),
      status: order.status,
      currentStageId: order.status === "PLANIFICADA" ? stages[0]?.id ?? null : stage?.stageId ?? null,
      currentStageName: order.status === "PLANIFICADA" ? "Sin iniciar" : stage?.stage.name ?? null,
      priority: order.priority,
      workshop: stage?.workshop?.name ?? null,
    };
  });

  return (
    <div>
      <PageHeader
        title="Tablero de producción"
        description="Arrastrá una tarjeta a la etapa siguiente para avanzar la OP. Al completar la última etapa se ingresa el producto terminado."
        actions={
          <>
            <Button asChild variant="outline"><Link href="/produccion/ordenes"><List className="mr-1.5 h-4 w-4" />Ver listado</Link></Button>
            <Button asChild><Link href="/produccion/ordenes/nueva"><Plus className="mr-1.5 h-4 w-4" />Nueva OP</Link></Button>
          </>
        }
      />

      <ProductionKanban
        stages={stages.map((stage) => ({ id: stage.id, name: stage.name }))}
        cards={cards}
      />
    </div>
  );
}
