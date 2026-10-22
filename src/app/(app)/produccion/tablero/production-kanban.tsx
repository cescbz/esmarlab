"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Factory, GripVertical, Loader2, Play, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { advanceProductionStage, startProductionOrder } from "@/actions/production";

export type KanbanCard = {
  id: string;
  number: string;
  product: string;
  customer: string;
  quantity: number;
  dueDate: string;
  late: boolean;
  status: string;
  currentStageId: string | null;
  currentStageName: string | null;
  priority: string;
  workshop: string | null;
};

export function ProductionKanban({
  stages,
  cards,
}: {
  stages: { id: string; name: string }[];
  cards: KanbanCard[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dragging, setDragging] = useState<string | null>(null);
  const [targetStage, setTargetStage] = useState<string | null>(null);
  const [advanceCard, setAdvanceCard] = useState<KanbanCard | null>(null);
  const [completed, setCompleted] = useState(0);

  const stageIndex = new Map(stages.map((stage, index) => [stage.id, index]));

  function tryDrop(cardId: string, stageId: string) {
    const card = cards.find((item) => item.id === cardId);
    if (!card) return;
    if (card.status === "PLANIFICADA") {
      toast.error("Primero iniciá la producción de esta OP.");
      return;
    }
    if (card.currentStageId === stageId) return;
    const currentIndex = card.currentStageId ? stageIndex.get(card.currentStageId) ?? -1 : -1;
    const targetIndex = stageIndex.get(stageId) ?? -1;
    if (targetIndex !== currentIndex + 1) {
      toast.error("Solo podés avanzar la OP a la etapa siguiente.");
      return;
    }
    setAdvanceCard(card);
    setTargetStage(stageId);
    setCompleted(card.quantity);
  }

  function start(cardId: string) {
    startTransition(async () => {
      const result = await startProductionOrder(cardId);
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos iniciar la OP.");
        return;
      }
      toast.success("Producción iniciada.");
      router.refresh();
    });
  }

  function confirmAdvance() {
    if (!advanceCard) return;
    startTransition(async () => {
      const result = await advanceProductionStage({
        productionOrderId: advanceCard.id,
        completedQuantity: completed,
      });
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos avanzar la etapa.");
        return;
      }
      toast.success("Etapa completada.");
      setAdvanceCard(null);
      setTargetStage(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-3">
        {stages.map((stage) => {
          const stageCards = cards.filter((card) => card.currentStageId === stage.id);
          return (
            <div
              key={stage.id}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                event.preventDefault();
                const cardId = event.dataTransfer.getData("text/plain");
                if (cardId) tryDrop(cardId, stage.id);
                setDragging(null);
              }}
              className={cn(
                "w-[270px] shrink-0 rounded-xl border border-border/80 bg-secondary/30 p-2.5 transition-colors",
                targetStage === stage.id && "border-primary/40 bg-primary/[0.04]"
              )}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-xs font-semibold">{stage.name}</p>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[10px] text-muted-foreground">{stageCards.length}</span>
              </div>
              <div className="space-y-2">
                {stageCards.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/80 px-3 py-8 text-center text-[10px] text-muted-foreground">
                    Sin OPs en esta etapa
                  </div>
                ) : (
                  stageCards.map((card) => (
                    <div
                      key={card.id}
                      draggable={card.status === "EN_PROCESO"}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", card.id);
                        setDragging(card.id);
                      }}
                      onDragEnd={() => setDragging(null)}
                      className={cn(
                        "rounded-lg border border-border/80 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
                        card.status === "EN_PROCESO" && "cursor-grab active:cursor-grabbing",
                        dragging === card.id && "opacity-50",
                        card.late && "border-red-200"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {card.status === "EN_PROCESO" ? <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" /> : <Factory className="h-3.5 w-3.5 text-muted-foreground/50" />}
                          <Link href={`/produccion/ordenes/${card.id}`} className="font-mono text-[11px] font-semibold hover:text-primary hover:underline">
                            {card.number}
                          </Link>
                        </div>
                        <Badge variant="outline" className={card.priority === "ALTA" ? "border-red-200 bg-red-50 text-[8px] uppercase text-red-600" : "text-[8px] uppercase"}>
                          {card.priority}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs font-medium">{card.product}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <UserRound className="h-3 w-3" />{card.customer}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[10px]">
                        <span className="tabular">{card.quantity} u.</span>
                        <span className={cn("flex items-center gap-1", card.late ? "font-medium text-red-600" : "text-muted-foreground")}>
                          <CalendarClock className="h-3 w-3" />{card.dueDate}
                        </span>
                      </div>
                      {card.workshop ? <p className="mt-1.5 text-[9px] text-muted-foreground">{card.workshop}</p> : null}
                      {card.status === "PLANIFICADA" ? (
                        <Button size="sm" variant="outline" className="mt-2 h-7 w-full text-[10px]" onClick={() => start(card.id)} disabled={pending}>
                          {pending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}
                          Iniciar producción
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 h-7 w-full text-[10px]"
                          onClick={() => {
                            setAdvanceCard(card);
                            setTargetStage(null);
                            setCompleted(card.quantity);
                          }}
                          disabled={pending}
                        >
                          Completar etapa
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={Boolean(advanceCard)} onOpenChange={(open) => !open && setAdvanceCard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completar etapa · {advanceCard?.currentStageName}</DialogTitle>
            <DialogDescription>
              {advanceCard?.number} · {advanceCard?.product}. La tarjeta avanzará a la etapa siguiente; si es la última, la OP se terminará e ingresará stock.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="kanbanQuantity">Cantidad completada</Label>
              <Input id="kanbanQuantity" type="number" min={1} max={advanceCard?.quantity ?? 1} value={completed} onChange={(event) => setCompleted(Number(event.target.value))} />
              <p className="text-[11px] text-muted-foreground">Total de la OP: {advanceCard?.quantity}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAdvanceCard(null)} disabled={pending}>Cancelar</Button>
              <Button onClick={confirmAdvance} disabled={pending || completed <= 0}>
                {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Confirmar avance
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
