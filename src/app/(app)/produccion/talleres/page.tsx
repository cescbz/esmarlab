import type { Metadata } from "next";
import Link from "next/link";
import { Scissors } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatGs } from "@/lib/format";

export const metadata: Metadata = { title: "Talleres" };

export default async function WorkshopsPage() {
  const [workshops, stageRows] = await Promise.all([
    prisma.workshop.findMany({ orderBy: { name: "asc" } }),
    prisma.productionOrderStage.findMany({
      include: {
        productionOrder: { include: { product: true } },
        stage: true,
      },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const byWorkshop = new Map<string, typeof stageRows>();
  for (const row of stageRows) {
    if (!row.workshopId) continue;
    const list = byWorkshop.get(row.workshopId) ?? [];
    list.push(row);
    byWorkshop.set(row.workshopId, list);
  }

  const externalCost = stageRows.reduce((sum, row) => sum + row.externalCost, 0);
  const activeOps = new Set(
    stageRows.filter((row) => row.productionOrder.status === "EN_PROCESO").map((row) => row.productionOrderId)
  ).size;

  return (
    <div>
      <PageHeader
        title="Talleres"
        description="Talleres propios y externos, órdenes asignadas y costo acumulado de talleres externos."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Talleres</p>
          <p className="mt-1 text-xl font-semibold">{workshops.length}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">OPs en proceso</p>
          <p className="mt-1 text-xl font-semibold">{activeOps}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Costo externo acumulado</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatGs(externalCost)}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {workshops.map((workshop) => {
          const stages = byWorkshop.get(workshop.id) ?? [];
          const orderIds = new Set(stages.map((stage) => stage.productionOrderId));
          const active = stages.filter((stage) => stage.productionOrder.status === "EN_PROCESO");
          const cost = stages.reduce((sum, stage) => sum + stage.externalCost, 0);
          return (
            <Card key={workshop.id} className="border-border/80 shadow-none">
              <CardHeader className="flex-row items-start justify-between border-b border-border/60 px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${workshop.type === "EXTERNO" ? "bg-violet-50 text-violet-700" : "bg-primary/10 text-primary"}`}>
                    <Scissors className="h-4 w-4" />
                  </span>
                  <div>
                    <CardTitle className="text-sm font-semibold">{workshop.name}</CardTitle>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{workshop.contact ?? "Sin contacto"}{workshop.phone ? ` · ${workshop.phone}` : ""}</p>
                  </div>
                </div>
                <Badge className={workshop.type === "EXTERNO" ? "border-violet-200 bg-violet-50 text-violet-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
                  {workshop.type === "EXTERNO" ? "Externo" : "Propio"}
                </Badge>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-secondary/40 px-2 py-2">
                    <p className="text-[9px] uppercase text-muted-foreground">OPs</p>
                    <p className="text-lg font-semibold">{orderIds.size}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/40 px-2 py-2">
                    <p className="text-[9px] uppercase text-muted-foreground">Etapas activas</p>
                    <p className="text-lg font-semibold">{active.length}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/40 px-2 py-2">
                    <p className="text-[9px] uppercase text-muted-foreground">Costo</p>
                    <p className="text-[11px] font-semibold tabular">{formatGs(cost)}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {Array.from(
                    new Map(stages.map((stage) => [stage.productionOrderId, stage.productionOrder])).values()
                  ).slice(0, 4).map((order) => (
                    <div key={order.id} className="flex items-center justify-between text-xs">
                      <Link href={`/produccion/ordenes/${order.id}`} className="font-mono text-primary hover:underline">{order.number}</Link>
                      <span className="max-w-[170px] truncate text-muted-foreground">{order.product.name}</span>
                      <span className="text-[10px] text-muted-foreground">{order.status}</span>
                    </div>
                  ))}
                  {stages.length === 0 ? <p className="text-xs text-muted-foreground">Sin OPs asignadas.</p> : null}
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground">Costo de referencia: {formatGs(workshop.referenceCost)} / unidad</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
