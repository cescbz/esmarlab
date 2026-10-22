import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Boxes, CalendarClock, Factory, Link2, Scissors, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, formatGs } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ProductionActions } from "./production-actions";

export const metadata: Metadata = { title: "Orden de producción" };

export default async function ProductionOrderDetailPage({ params }: { params: { id: string } }) {
  const order = await prisma.productionOrder.findUnique({
    where: { id: params.id },
    include: {
      product: { include: { bom: { include: { lines: { include: { materialVariant: { include: { product: true } } } } } } } },
      order: { include: { customer: true } },
      lines: { include: { variant: true } },
      stages: { include: { stage: true, workshop: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!order) notFound();

  const movements = await prisma.stockMovement.findMany({
    where: { originType: "PRODUCTION_ORDER", originId: order.id },
    include: { variant: { include: { product: true } }, warehouse: true },
    orderBy: { date: "asc" },
  });
  const consumed = movements.filter((movement) => movement.type === "CONSUMO_PRODUCCION");
  const ingress = movements.filter((movement) => movement.type === "INGRESO_PRODUCCION");
  const completedStages = order.stages.filter((stage) => stage.status === "COMPLETADA").length;
  const current = order.stages.find((stage) => stage.status === "EN_CURSO") ?? order.stages.find((stage) => stage.status === "PENDIENTE");
  const next = current ? order.stages[order.stages.findIndex((stage) => stage.id === current.id) + 1] : undefined;
  const progress = order.stages.length ? Math.round((completedStages / order.stages.length) * 100) : 0;
  const late = order.dueDate < new Date() && order.status !== "TERMINADA";
  const materialCost = order.product.bom?.lines.reduce(
    (sum, line) => sum + line.quantity * (1 + line.wastePercent / 100) * line.materialVariant.product.cost * order.quantity,
    0
  ) ?? 0;
  const consumedCost = consumed.reduce((sum, movement) => sum + movement.quantity * movement.unitCost, 0);
  const externalCost = order.stages.reduce((sum, stage) => sum + stage.externalCost, 0);

  return (
    <div>
      <PageHeader
        title={`OP ${order.number}`}
        description={`${order.product.name} · ${order.quantity} unidades${order.order ? ` · pedido ${order.order.number}` : " · para stock"}`}
        actions={
          <>
            <Button asChild variant="outline"><Link href="/produccion/ordenes"><ArrowLeft className="mr-1.5 h-4 w-4" />Volver</Link></Button>
            <ProductionActions
              productionOrderId={order.id}
              status={order.status}
              quantity={order.quantity}
              currentStageName={current?.stage.name ?? null}
              nextStageName={next?.stage.name ?? null}
              isLastStage={Boolean(current && !next)}
            />
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={order.status} />
        <Badge variant="outline" className={order.priority === "ALTA" ? "border-red-200 bg-red-50 text-[9px] uppercase text-red-600" : "text-[9px] uppercase"}>
          Prioridad {order.priority.toLowerCase()}
        </Badge>
        <span className={cn("flex items-center gap-1 text-xs", late ? "font-medium text-red-600" : "text-muted-foreground")}>
          <CalendarClock className="h-3.5 w-3.5" />Compromiso {formatDate(order.dueDate)}
        </span>
        {order.order ? (
          <Link href={`/pedidos/${order.order.id}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
            <Link2 className="h-3.5 w-3.5" />Pedido {order.order.number} · {order.order.customer.name}
          </Link>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/80 p-4 shadow-none">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Avance</p>
          <p className="mt-1.5 text-lg font-semibold">{progress}%</p>
          <Progress value={progress} className="mt-2 h-1.5" />
          <p className="mt-1 text-[10px] text-muted-foreground">{completedStages} de {order.stages.length} etapas</p>
        </Card>
        <Card className="border-border/80 p-4 shadow-none">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Materia prima consumida</p>
          <p className="mt-1.5 text-lg font-semibold tabular">{formatGs(consumedCost)}</p>
          <p className="text-[10px] text-muted-foreground">Estimado {formatGs(Math.round(materialCost))}</p>
        </Card>
        <Card className="border-border/80 p-4 shadow-none">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Talleres externos</p>
          <p className="mt-1.5 text-lg font-semibold tabular">{formatGs(externalCost)}</p>
          <p className="text-[10px] text-muted-foreground">Costo acumulado</p>
        </Card>
        <Card className="border-border/80 p-4 shadow-none">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ingreso a stock</p>
          <p className="mt-1.5 text-lg font-semibold">{ingress.reduce((sum, movement) => sum + movement.quantity, 0)}</p>
          <p className="text-[10px] text-muted-foreground">{order.status === "TERMINADA" ? "Producto terminado ingresado" : "Pendiente de terminación"}</p>
        </Card>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold"><Factory className="h-4 w-4 text-muted-foreground" />Etapas</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-3">
                {order.stages.map((stage, index) => {
                  const isCurrent = current?.id === stage.id;
                  return (
                    <div key={stage.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold",
                          stage.status === "COMPLETADA" ? "bg-emerald-100 text-emerald-700" : isCurrent ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                        )}>
                          {index + 1}
                        </span>
                        {index < order.stages.length - 1 ? <span className="my-1 h-8 w-px bg-border" /> : null}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold">{stage.stage.name}</p>
                            <p className="text-[10px] text-muted-foreground">{stage.workshop?.name ?? "Sin taller"}</p>
                          </div>
                          <StatusBadge status={stage.status} />
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                          <span>{stage.completedQuantity} / {order.quantity} unidades</span>
                          {stage.startDate ? <span>Inicio {formatDate(stage.startDate)}</span> : null}
                          {stage.endDate ? <span>Fin {formatDate(stage.endDate)}</span> : null}
                          {stage.externalCost > 0 ? <span>Costo externo {formatGs(stage.externalCost)}</span> : null}
                          {stage.responsible ? <span>Resp. {stage.responsible}</span> : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold"><Boxes className="h-4 w-4 text-muted-foreground" />Materia prima consumida</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {consumed.length === 0 ? (
                <EmptyState icon={Boxes} title="Sin consumo registrado" description="Iniciá la OP para consumir materia prima según la ficha técnica." className="border-0" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                      <TableHead>Material</TableHead>
                      <TableHead>Depósito</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consumed.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell>
                          <p className="text-xs font-medium">{movement.variant.product.name}</p>
                          <p className="text-[10px] text-muted-foreground">{movement.variant.color} · {movement.variant.sku}</p>
                        </TableCell>
                        <TableCell className="text-xs">{movement.warehouse.name}</TableCell>
                        <TableCell className="text-right text-xs tabular">{movement.quantity}</TableCell>
                        <TableCell className="text-right text-xs tabular">{formatGs(movement.quantity * movement.unitCost)}</TableCell>
                        <TableCell className="text-xs">{formatDate(movement.date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Variantes</CardTitle></CardHeader>
            <CardContent className="space-y-2 p-5">
              {order.lines.map((line) => (
                <div key={line.id} className="flex items-center justify-between text-xs">
                  <span>{line.variant.size} · {line.variant.color}</span>
                  <span className="font-medium tabular">{line.quantity}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="flex items-center gap-2 text-sm font-semibold"><Wallet className="h-4 w-4 text-muted-foreground" />Costo estimado</CardTitle></CardHeader>
            <CardContent className="space-y-2 p-5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Materiales</span><span className="tabular">{formatGs(Math.round(materialCost))}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Talleres externos</span><span className="tabular">{formatGs(externalCost)}</span></div>
              <div className="flex justify-between border-t border-border/60 pt-2 font-semibold"><span>Total estimado</span><span className="tabular">{formatGs(Math.round(materialCost) + externalCost)}</span></div>
            </CardContent>
          </Card>

          {order.product.bom ? (
            <Card className="border-border/80 shadow-none">
              <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="flex items-center gap-2 text-sm font-semibold"><Scissors className="h-4 w-4 text-muted-foreground" />Ficha técnica</CardTitle></CardHeader>
              <CardContent className="space-y-1.5 p-5 text-xs">
                {order.product.bom.lines.map((line) => (
                  <div key={line.id} className="flex justify-between">
                    <span className="text-muted-foreground">{line.materialVariant.product.name}</span>
                    <span className="tabular">{line.quantity * order.quantity} {line.materialVariant.product.unit}</span>
                  </div>
                ))}
                <Button asChild variant="outline" size="sm" className="mt-2 h-7 text-xs">
                  <Link href={`/produccion/fichas/${order.productId}`}>Ver ficha completa</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
