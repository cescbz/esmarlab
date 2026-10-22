"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Ban,
  FileDown,
  FileMinus2,
  Loader2,
  Printer,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createCreditNote, cancelInvoice } from "@/actions/invoices";
import { formatGs } from "@/lib/format";

export function InvoiceActions({
  invoiceId,
  invoiceNumber,
  type,
  status,
  balance,
  total,
  issueDate,
}: {
  invoiceId: string;
  invoiceNumber: string;
  type: string;
  status: string;
  balance: number;
  total: number;
  issueDate: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creditOpen, setCreditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [amount, setAmount] = useState(String(Math.min(balance > 0 ? balance : total, total)));
  const [reason, setReason] = useState("Devolución de mercadería");
  const canCancel = type === "FACTURA" && status !== "CANCELADO" && Date.now() - new Date(issueDate).getTime() <= 48 * 3_600_000;

  function credit() {
    startTransition(async () => {
      const result = await createCreditNote({
        invoiceId,
        amount: Number(amount),
        reason,
      });
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos emitir la nota de crédito.");
        return;
      }
      toast.success("Nota de crédito emitida. Enviando a SIFEN simulado…");
      setCreditOpen(false);
      router.push(`/facturas/${result.id}`);
      router.refresh();
    });
  }

  function cancel() {
    startTransition(async () => {
      const result = await cancelInvoice(invoiceId);
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos cancelar la factura.");
        return;
      }
      toast.success("Factura cancelada.");
      setCancelOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {balance > 0 && type === "FACTURA" && status !== "CANCELADO" ? (
        <Button asChild variant="outline">
          <Link href={`/caja?factura=${invoiceId}`}><Wallet className="mr-1.5 h-4 w-4" />Cobrar</Link>
        </Button>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline"><FileDown className="mr-1.5 h-4 w-4" />KuDE</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a href={`/ver/kude/${invoiceId}?formato=a4`} target="_blank" rel="noreferrer">
              <FileDown className="mr-2 h-4 w-4" />Abrir KuDE A4
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`/ver/kude/${invoiceId}?formato=ticket`} target="_blank" rel="noreferrer">
              <Printer className="mr-2 h-4 w-4" />Abrir ticket 80 mm
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {type === "FACTURA" ? (
        <Button variant="outline" onClick={() => setCreditOpen(true)}>
          <FileMinus2 className="mr-1.5 h-4 w-4" />Nota de crédito
        </Button>
      ) : null}
      {canCancel ? (
        <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setCancelOpen(true)}>
          <Ban className="mr-1.5 h-4 w-4" />Cancelar
        </Button>
      ) : null}

      <Dialog open={creditOpen} onOpenChange={setCreditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nota de crédito · {invoiceNumber}</DialogTitle>
            <DialogDescription>
              Se emitirá una nota de crédito electrónica simulada por devolución o anulación parcial.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Monto (Gs.)</Label>
              <Input id="amount" type="number" min={1} max={total} value={amount} onChange={(event) => setAmount(event.target.value)} />
              <p className="text-[11px] text-muted-foreground">Saldo actual: {formatGs(balance)} · Total factura: {formatGs(total)}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reason">Motivo</Label>
              <Textarea id="reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreditOpen(false)} disabled={pending}>Cancelar</Button>
              <Button onClick={credit} disabled={pending || Number(amount) <= 0}>
                {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileMinus2 className="mr-1.5 h-4 w-4" />}
                Emitir nota de crédito
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar la factura {invoiceNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se registrará un evento de cancelación SIFEN simulado. Solo es posible dentro de las 48 horas de emisión.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={cancel} disabled={pending}>Cancelar factura</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
