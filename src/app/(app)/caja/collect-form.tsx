"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { HandCoins, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentEditor, type PaymentRow } from "@/components/shared/payment-editor";
import { EmptyState } from "@/components/shared/empty-state";
import { formatGs } from "@/lib/format";
import { createReceipt } from "@/actions/cash";

type OpenInvoice = {
  id: string;
  number: string;
  customerId: string;
  customer: string;
  dueDate: string;
  balance: number;
  total: number;
};

export function CollectForm({
  sessionId,
  invoices,
  customers,
  methods,
}: {
  sessionId: string;
  invoices: OpenInvoice[];
  customers: { id: string; name: string; saldo: number }[];
  methods: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [payments, setPayments] = useState<PaymentRow[]>([{ paymentMethodId: "pm_EFECTIVO", amount: 0 }]);
  const [observations, setObservations] = useState("");
  const [lastReceiptId, setLastReceiptId] = useState<string | null>(null);

  const customerInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.customerId === customerId),
    [invoices, customerId]
  );

  useEffect(() => {
    setAllocations(Object.fromEntries(customerInvoices.map((invoice) => [invoice.id, invoice.balance])));
  }, [customerInvoices]);

  const total = Object.values(allocations).reduce((sum, amount) => sum + (Number(amount) || 0), 0);

  useEffect(() => {
    if (payments.length === 1) setPayments([{ ...payments[0], amount: total }]);
  }, [total]); // eslint-disable-line react-hooks/exhaustive-deps

  function submit() {
    const selected = Object.entries(allocations)
      .filter(([, amount]) => Number(amount) > 0)
      .map(([invoiceId, amount]) => ({ invoiceId, amount: Number(amount) }));
    if (selected.length === 0) {
      toast.error("Seleccioná al menos una factura a cobrar.");
      return;
    }
    if (payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) !== total) {
      toast.error("La suma de los medios de pago debe coincidir con el total.");
      return;
    }
    startTransition(async () => {
      const result = await createReceipt({
        customerId,
        sessionId,
        date: new Date().toLocaleDateString("en-CA", { timeZone: "America/Asuncion" }),
        observations,
        invoices: selected,
        payments,
      });
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos registrar el cobro.");
        return;
      }
      toast.success("Recibo de cobro registrado.");
      setLastReceiptId(result.id ?? null);
      setObservations("");
      setPayments([{ paymentMethodId: "pm_EFECTIVO", amount: 0 }]);
      router.refresh();
    });
  }

  return (
    <Card className="border-border/80 shadow-none">
      <CardHeader className="border-b border-border/60 px-5 py-3.5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <HandCoins className="h-4 w-4 text-muted-foreground" />
          Cobrar facturas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        {lastReceiptId ? (
          <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
            <span>Recibo emitido correctamente.</span>
            <Button asChild size="sm" variant="outline" className="h-7 text-xs">
              <Link href={`/recibos/${lastReceiptId}`}>Ver recibo</Link>
            </Button>
          </div>
        ) : null}

        {customers.length === 0 ? (
          <EmptyState icon={HandCoins} title="No hay facturas pendientes" description="No hay clientes con saldo a cobrar." />
        ) : (
          <>
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} · {formatGs(customer.saldo)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {customerInvoices.map((invoice) => (
                <div key={invoice.id} className="grid items-center gap-2 rounded-lg border border-border/70 px-3 py-2 sm:grid-cols-[1fr_100px_130px]">
                  <div>
                    <p className="font-mono text-xs font-medium">{invoice.number}</p>
                    <p className="text-[10px] text-muted-foreground">Vence {invoice.dueDate} · Total {formatGs(invoice.total)}</p>
                  </div>
                  <p className="text-right text-xs text-muted-foreground tabular">Saldo {formatGs(invoice.balance)}</p>
                  <Input
                    type="number"
                    min={0}
                    max={invoice.balance}
                    value={allocations[invoice.id] ?? 0}
                    onChange={(event) =>
                      setAllocations((current) => ({
                        ...current,
                        [invoice.id]: Math.min(invoice.balance, Math.max(0, Number(event.target.value))),
                      }))
                    }
                    className="h-8 bg-white text-right text-xs tabular"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="observations">Observaciones</Label>
              <Textarea id="observations" value={observations} onChange={(event) => setObservations(event.target.value)} rows={2} placeholder="Detalle del cobro" />
            </div>

            <div className="rounded-lg border border-border/70 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold">Medios de pago</p>
                <p className="text-sm font-semibold tabular">{formatGs(total)}</p>
              </div>
              <PaymentEditor methods={methods} payments={payments} onChange={setPayments} total={total} />
            </div>

            <Button onClick={submit} disabled={pending || total <= 0} className="w-full">
              {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <HandCoins className="mr-1.5 h-4 w-4" />}
              Emitir recibo de cobro
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
