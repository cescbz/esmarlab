"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Download, Loader2, Send, XCircle } from "lucide-react";
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
import { approveQuote, markQuoteSent, rejectQuote } from "@/actions/quotes";

export function QuoteActions({
  quoteId,
  status,
  hasOrder,
  orderId,
}: {
  quoteId: string;
  status: string;
  hasOrder: boolean;
  orderId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const canApprove = !["APROBADO", "RECHAZADO"].includes(status);

  function approve() {
    startTransition(async () => {
      const result = await approveQuote(quoteId);
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos aprobar el presupuesto.");
        return;
      }
      toast.success(hasOrder ? "Pedido existente." : "Presupuesto aprobado y pedido generado.");
      setApproveOpen(false);
      router.push(`/pedidos/${result.id}`);
      router.refresh();
    });
  }

  function reject() {
    startTransition(async () => {
      const result = await rejectQuote(quoteId);
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos rechazar el presupuesto.");
        return;
      }
      toast.success("Presupuesto marcado como rechazado.");
      setRejectOpen(false);
      router.refresh();
    });
  }

  function send() {
    startTransition(async () => {
      const result = await markQuoteSent(quoteId);
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos actualizar el presupuesto.");
        return;
      }
      toast.success("Presupuesto marcado como enviado.");
      router.refresh();
    });
  }

  return (
    <>
      {status === "BORRADOR" ? (
        <Button variant="outline" onClick={send} disabled={pending}>
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
          Marcar enviado
        </Button>
      ) : null}
      <Button asChild variant="outline">
        <a href={`/ver/presupuesto/${quoteId}`} target="_blank" rel="noreferrer">
          <Download className="mr-1.5 h-4 w-4" />Ver PDF
        </a>
      </Button>
      {canApprove ? (
        <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setRejectOpen(true)} disabled={pending}>
          <XCircle className="mr-1.5 h-4 w-4" />Rechazar
        </Button>
      ) : null}
      {canApprove || hasOrder ? (
        <Button onClick={() => (canApprove ? setApproveOpen(true) : orderId ? router.push(`/pedidos/${orderId}`) : undefined)} disabled={pending}>
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
          {hasOrder ? "Ver pedido" : "Aprobar y generar pedido"}
        </Button>
      ) : null}

      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aprobar este presupuesto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se generará un pedido de venta con las mismas líneas y precios. Después podrás crear envíos y órdenes de producción.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={approve} disabled={pending}>Aprobar y generar pedido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Rechazar el presupuesto?</AlertDialogTitle>
            <AlertDialogDescription>El presupuesto quedará cerrado y no podrá editarse.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={reject} disabled={pending}>Rechazar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
