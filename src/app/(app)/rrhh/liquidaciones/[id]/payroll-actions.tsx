"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calculator, CheckCircle2, CreditCard, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { FormDialog } from "@/components/shared/form-dialog";
import {
  annulPayroll,
  closePayroll,
  payPayroll,
  recalculatePayroll,
} from "@/actions/payroll";

export function PayrollActions({
  payrollId,
  status,
  canWrite,
  methods,
  hasOpenCash,
}: {
  payrollId: string;
  status: string;
  canWrite: boolean;
  methods: { id: string; name: string }[];
  hasOpenCash: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [closeOpen, setCloseOpen] = useState(false);
  const [annulOpen, setAnnulOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [methodId, setMethodId] = useState(methods[0]?.id ?? "pm_EFECTIVO");
  const [paidFromCash, setPaidFromCash] = useState(false);

  if (!canWrite) return null;

  function recalc() {
    startTransition(async () => {
      const result = await recalculatePayroll(payrollId);
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos recalcular.");
        return;
      }
      toast.success("Liquidación recalculada.");
      router.refresh();
    });
  }

  function close() {
    startTransition(async () => {
      const result = await closePayroll(payrollId);
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos cerrar la liquidación.");
        return;
      }
      toast.success("Liquidación cerrada.");
      setCloseOpen(false);
      router.refresh();
    });
  }

  function pay() {
    startTransition(async () => {
      const result = await payPayroll(payrollId, { paymentMethodId: methodId, paidFromCash });
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos registrar el pago.");
        return;
      }
      toast.success("Pago registrado. Gasto generado.");
      setPayOpen(false);
      router.refresh();
    });
  }

  function annul() {
    startTransition(async () => {
      const result = await annulPayroll(payrollId);
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos anular la liquidación.");
        return;
      }
      toast.success("Liquidación anulada.");
      setAnnulOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      {status === "BORRADOR" ? (
        <>
          <Button variant="outline" onClick={recalc} disabled={pending}>
            <Calculator className="mr-1.5 h-4 w-4" />
            Recalcular
          </Button>
          <Button onClick={() => setCloseOpen(true)} disabled={pending}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Cerrar
          </Button>
          <Button variant="outline" onClick={() => setAnnulOpen(true)} disabled={pending}>
            <XCircle className="mr-1.5 h-4 w-4" />
            Anular
          </Button>
        </>
      ) : null}

      {status === "CERRADA" ? (
        <>
          <Button onClick={() => setPayOpen(true)} disabled={pending}>
            <CreditCard className="mr-1.5 h-4 w-4" />
            Pagar
          </Button>
          <Button variant="outline" onClick={() => setAnnulOpen(true)} disabled={pending}>
            <XCircle className="mr-1.5 h-4 w-4" />
            Anular
          </Button>
        </>
      ) : null}

      <AlertDialog open={closeOpen} onOpenChange={setCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar la liquidación?</AlertDialogTitle>
            <AlertDialogDescription>
              Se congelan los cálculos y no se podrán editar los ítems. Si hay netos negativos, el
              cierre se rechaza.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={close} disabled={pending}>
              Cerrar liquidación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={annulOpen} onOpenChange={setAnnulOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular la liquidación?</AlertDialogTitle>
            <AlertDialogDescription>
              Quedará marcada como anulada. No se puede anular una liquidación pagada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={annul} disabled={pending}>
              Anular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FormDialog
        title="Pagar liquidación"
        description="Se registra un gasto de categoría Sueldos. Si es efectivo, impacta la caja abierta."
        open={payOpen}
        onOpenChange={setPayOpen}
        className="sm:max-w-lg"
      >
        {() => (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Medio de pago</Label>
              <Select
                value={methodId}
                onValueChange={(value) => {
                  setMethodId(value);
                  if (paidFromCash) setPaidFromCash(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {methods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 px-3.5 py-2.5">
              <div>
                <p className="text-sm font-medium">Pagado desde caja</p>
                <p className="text-xs text-muted-foreground">
                  {hasOpenCash
                    ? "Genera una salida de efectivo en la sesión abierta."
                    : "No hay una caja abierta. Se registrará como gasto bancario."}
                </p>
              </div>
              <Switch
                checked={paidFromCash}
                disabled={!hasOpenCash}
                onCheckedChange={(checked) => {
                  setPaidFromCash(checked);
                  if (checked) setMethodId("pm_EFECTIVO");
                }}
              />
            </div>
            <Button onClick={pay} className="w-full" disabled={pending}>
              {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Confirmar pago
            </Button>
          </div>
        )}
      </FormDialog>
    </>
  );
}
