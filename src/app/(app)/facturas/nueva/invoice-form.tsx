"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { AlertCircle, Loader2, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { calcInvoiceTotals } from "@/lib/fiscal";
import { formatGs, toDateInputValue } from "@/lib/format";
import { createInvoiceFromOrder } from "@/actions/invoices";

type InvoiceLine = {
  orderLineId: string;
  description: string;
  sku: string;
  ordered: number;
  invoiced: number;
  pending: number;
  unitPrice: number;
  discountPercent: number;
  taxRate: number;
};

type Values = {
  expeditionPointId: string;
  condition: "CONTADO" | "CREDITO";
  termDays: number;
  date: string;
  quantities: Record<string, number>;
};

export function InvoiceForm({
  orderId,
  orderNumber,
  customer,
  lines,
  points,
  defaultCondition,
  defaultTermDays,
}: {
  orderId: string;
  orderNumber: string;
  customer: string;
  lines: InvoiceLine[];
  points: { id: string; label: string }[];
  defaultCondition: "CONTADO" | "CREDITO";
  defaultTermDays: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const defaultQuantities = useMemo(
    () => Object.fromEntries(lines.map((line) => [line.orderLineId, line.pending])),
    [lines]
  );

  const { register, handleSubmit, control, watch, setValue } = useForm<Values>({
    defaultValues: {
      expeditionPointId: points[0]?.id ?? "",
      condition: defaultCondition,
      termDays: defaultTermDays,
      date: toDateInputValue(new Date()),
      quantities: defaultQuantities,
    },
  });

  const condition = watch("condition");
  const quantities = watch("quantities");
  const totals = useMemo(() => {
    return calcInvoiceTotals(
      lines.map((line) => ({
        total:
          (Number(quantities?.[line.orderLineId]) || 0) *
          line.unitPrice *
          (1 - line.discountPercent / 100),
        rate: line.taxRate as 10 | 5 | 0,
      }))
    );
  }, [lines, quantities]);

  function fillAll() {
    for (const line of lines) setValue(`quantities.${line.orderLineId}`, line.pending);
  }

  function clearAll() {
    for (const line of lines) setValue(`quantities.${line.orderLineId}`, 0);
  }

  function onSubmit(values: Values) {
    startTransition(async () => {
      const result = await createInvoiceFromOrder({
        orderId,
        expeditionPointId: values.expeditionPointId,
        condition: values.condition,
        termDays: values.termDays,
        date: values.date,
        lines: lines.map((line) => ({
          orderLineId: line.orderLineId,
          quantity: Number(values.quantities[line.orderLineId] ?? 0),
        })),
      });
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos emitir la factura.");
        return;
      }
      toast.success("Factura emitida. Enviando a SIFEN simulado…");
      router.push(`/facturas/${result.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 xl:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5">
            <CardTitle className="text-sm font-semibold">Datos de la factura</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Punto de expedición / caja</Label>
              <Controller
                control={control}
                name="expeditionPointId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {points.map((point) => (
                        <SelectItem key={point.id} value={point.id}>{point.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Fecha de emisión</Label>
              <Controller
                control={control}
                name="date"
                render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Condición de venta</Label>
              <Controller
                control={control}
                name="condition"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONTADO">Contado</SelectItem>
                      <SelectItem value="CREDITO">Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {condition === "CREDITO" ? (
              <div className="space-y-1.5">
                <Label>Plazo</Label>
                <Controller
                  control={control}
                  name="termDays"
                  render={({ field }) => (
                    <Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 días</SelectItem>
                        <SelectItem value="30">30 días</SelectItem>
                        <SelectItem value="60">60 días</SelectItem>
                        <SelectItem value="90">90 días</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-border/70 bg-secondary/30 px-3.5 py-2.5 text-xs text-muted-foreground">
                Venta de contado. Si la caja está abierta, se registrará el ingreso correspondiente.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none">
          <CardHeader className="flex-row items-center justify-between border-b border-border/60 px-5 py-3.5">
            <div>
              <CardTitle className="text-sm font-semibold">Líneas pendientes · {orderNumber}</CardTitle>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{customer}</p>
            </div>
            <div className="flex gap-1">
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={fillAll}>Facturar todo</Button>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll}>Limpiar</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {lines.map((line) => (
              <div key={line.orderLineId} className="grid gap-3 border-b border-border/60 p-4 last:border-0 sm:grid-cols-[1.8fr_repeat(3,80px)_110px] sm:items-end">
                <div>
                  <p className="text-xs font-medium">{line.description}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{line.sku}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] uppercase text-muted-foreground">Pedido</p>
                  <p className="text-xs tabular">{line.ordered}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] uppercase text-muted-foreground">Facturado</p>
                  <p className="text-xs tabular">{line.invoiced}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] uppercase text-muted-foreground">Pendiente</p>
                  <p className="text-xs font-medium tabular">{line.pending}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase text-muted-foreground">Cantidad</Label>
                  <Input
                    type="number"
                    min={0}
                    max={line.pending}
                    className="h-8 bg-white text-xs"
                    {...register(`quantities.${line.orderLineId}`, { valueAsNumber: true })}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5">
            <CardTitle className="text-sm font-semibold">Liquidación de IVA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 p-5 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Gravada 10%</span><span className="tabular">{formatGs(totals.gravada10)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">IVA 10%</span><span className="tabular">{formatGs(totals.iva10)}</span></div>
            {totals.gravada5 > 0 ? (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Gravada 5%</span><span className="tabular">{formatGs(totals.gravada5)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">IVA 5%</span><span className="tabular">{formatGs(totals.iva5)}</span></div>
              </>
            ) : null}
            {totals.exenta > 0 ? (
              <div className="flex justify-between"><span className="text-muted-foreground">Exenta</span><span className="tabular">{formatGs(totals.exenta)}</span></div>
            ) : null}
            <div className="flex justify-between border-t border-border/60 pt-3 text-base font-semibold">
              <span>Total</span><span className="tabular">{formatGs(totals.total)}</span>
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Precios con IVA incluido. La factura se enviará al SIFEN simulado y se aprobará a los pocos segundos.
            </p>
          </CardContent>
        </Card>

        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-[11px] leading-relaxed text-amber-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span><strong>DEMO:</strong> el CDC, XML y KuDE son simulados. Este comprobante no tiene validez fiscal.</span>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={pending || totals.total <= 0}>
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ReceiptText className="mr-1.5 h-4 w-4" />}
          Emitir factura electrónica
        </Button>
      </div>
    </form>
  );
}
