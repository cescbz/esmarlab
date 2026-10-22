"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Play, Square } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { advanceProductionStage, finishProductionOrder, startProductionOrder } from "@/actions/production";

export function ProductionActions({
  productionOrderId,
  status,
  quantity,
  currentStageName,
  nextStageName,
  isLastStage,
}: {
  productionOrderId: string;
  status: string;
  quantity: number;
  currentStageName: string | null;
  nextStageName: string | null;
  isLastStage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [completed, setCompleted] = useState(quantity);

  function start() {
    startTransition(async () => {
      const result = await startProductionOrder(productionOrderId);
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos iniciar la producción.");
        return;
      }
      toast.success("Producción iniciada. Materia prima consumida.");
      router.refresh();
    });
  }

  function advance() {
    startTransition(async () => {
      const result = await advanceProductionStage({
        productionOrderId,
        completedQuantity: completed,
      });
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos avanzar la etapa.");
        return;
      }
      toast.success(
        isLastStage
          ? "OP terminada. Producto terminado ingresado al stock."
          : `Etapa completada.${nextStageName ? ` Ahora: ${nextStageName}.` : ""}`
      );
      setAdvanceOpen(false);
      router.refresh();
    });
  }

  function finish() {
    startTransition(async () => {
      const result = await finishProductionOrder(productionOrderId);
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos terminar la orden.");
        return;
      }
      toast.success("Orden terminada. Stock actualizado y pedido listo.");
      setFinishOpen(false);
      router.refresh();
    });
  }

  if (!["PLANIFICADA", "EN_PROCESO"].includes(status)) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "PLANIFICADA" ? (
        <Button onClick={start} disabled={pending}>
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />}
          Iniciar producción
        </Button>
      ) : (
        <>
          <Button variant="outline" onClick={() => setFinishOpen(true)} disabled={pending}>
            <Square className="mr-1.5 h-4 w-4" />Terminar OP
          </Button>
          <Button onClick={() => setAdvanceOpen(true)} disabled={pending || !currentStageName}>
            {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
            Completar {currentStageName ?? "etapa"}
          </Button>
        </>
      )}

      <Dialog open={advanceOpen} onOpenChange={setAdvanceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completar etapa · {currentStageName}</DialogTitle>
            <DialogDescription>
              {isLastStage
                ? "Al completar la última etapa se ingresará el producto terminado al depósito y el pedido quedará listo."
                : `Se avanzará a la etapa ${nextStageName ?? "siguiente"}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="completedQuantity">Cantidad completada</Label>
              <Input id="completedQuantity" type="number" min={1} max={quantity} value={completed} onChange={(event) => setCompleted(Number(event.target.value))} />
              <p className="text-[11px] text-muted-foreground">Cantidad total de la OP: {quantity}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAdvanceOpen(false)} disabled={pending}>Cancelar</Button>
              <Button onClick={advance} disabled={pending || completed <= 0}>
                {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
                Confirmar avance
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={finishOpen} onOpenChange={setFinishOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Terminar la OP?</AlertDialogTitle>
            <AlertDialogDescription>
              Se completarán las etapas pendientes, se ingresará el producto terminado al stock y el pedido vinculado quedará LISTO.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={finish} disabled={pending}>Terminar OP</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
