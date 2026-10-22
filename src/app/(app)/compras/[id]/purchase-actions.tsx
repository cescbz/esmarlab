"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { confirmPurchase, annulPurchase } from "@/actions/purchases";

export function PurchaseActions({ receiptId, status }: { receiptId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [annulOpen, setAnnulOpen] = useState(false);
  if (status !== "BORRADOR") return null;

  function confirm() {
    startTransition(async () => {
      const result = await confirmPurchase(receiptId);
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos confirmar la compra.");
        return;
      }
      toast.success("Recepción confirmada. Stock actualizado.");
      router.refresh();
    });
  }

  function annul() {
    startTransition(async () => {
      const result = await annulPurchase(receiptId);
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos anular la compra.");
        return;
      }
      toast.success("Recepción anulada.");
      setAnnulOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setAnnulOpen(true)} disabled={pending}>
        <XCircle className="mr-1.5 h-4 w-4" />Anular
      </Button>
      <Button onClick={confirm} disabled={pending}>
        {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
        Confirmar recepción
      </Button>

      <AlertDialog open={annulOpen} onOpenChange={setAnnulOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular esta recepción?</AlertDialogTitle>
            <AlertDialogDescription>El borrador quedará marcado como anulado y no afectará el stock.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={annul} disabled={pending}>Anular recepción</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
