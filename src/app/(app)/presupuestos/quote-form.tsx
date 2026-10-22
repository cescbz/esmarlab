"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  AlertCircle,
  FileText,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VariantPicker, type PickerProduct } from "@/components/shared/variant-picker";
import { quoteSchema, type QuoteFormValues } from "@/lib/validators/quote";
import { saveQuote } from "@/actions/quotes";
import { calcInvoiceTotals, formatRuc } from "@/lib/fiscal";
import { formatGs, toDateInputValue } from "@/lib/format";

export type QuoteProduct = {
  id: string;
  name: string;
  code: string;
  taxRate: number;
  variants: { id: string; sku: string; size: string; color: string; price: number }[];
};

type CustomerOption = {
  id: string;
  name: string;
  rucBase: string;
  dv: string;
  priceListId: string;
  priceListName: string;
};

type QuoteForForm = {
  id: string;
  status: string;
  customerId: string;
  date: Date;
  validityDays: number;
  observations: string | null;
  lines: {
    variantId: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    isCustomized: boolean;
    customizationDetail: string | null;
  }[];
};

export function QuoteForm({
  customers,
  products,
  listDiscount,
  quote,
}: {
  customers: CustomerOption[];
  products: QuoteProduct[];
  listDiscount: Record<string, number>;
  quote?: QuoteForForm;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [saveMode, setSaveMode] = useState<"draft" | "send">("draft");
  const readOnly = Boolean(quote && (quote.status === "APROBADO" || quote.status === "RECHAZADO"));

  const variantIndex = useMemo(() => {
    const map = new Map<
      string,
      { product: QuoteProduct; variant: QuoteProduct["variants"][number] }
    >();
    for (const product of products) {
      for (const variant of product.variants) {
        map.set(variant.id, { product, variant });
      }
    }
    return map;
  }, [products]);

  const defaultCustomer = quote?.customerId ?? customers[0]?.id ?? "";
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: quote
      ? {
          customerId: quote.customerId,
          date: toDateInputValue(quote.date),
          validityDays: quote.validityDays,
          observations: quote.observations ?? "",
          lines: quote.lines.map((line) => ({
            variantId: line.variantId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent,
            isCustomized: line.isCustomized,
            customizationDetail: line.customizationDetail ?? "",
          })),
        }
      : {
          customerId: defaultCustomer,
          date: toDateInputValue(new Date()),
          validityDays: 15,
          observations: "",
          lines: [],
        },
  });

  const { fields, append, remove, update } = useFieldArray({ control, name: "lines" });
  const customerId = watch("customerId");
  const lines = watch("lines");
  const customer = customers.find((item) => item.id === customerId);

  const totals = useMemo(() => {
    return calcInvoiceTotals(
      (lines ?? []).map((line) => {
        const info = variantIndex.get(line.variantId);
        const lineTotal = Math.round(
          (Number(line.unitPrice) || 0) *
            (Number(line.quantity) || 0) *
            (1 - (Number(line.discountPercent) || 0) / 100)
        );
        return { total: lineTotal, rate: (info?.product.taxRate ?? 10) as 10 | 5 | 0 };
      })
    );
  }, [lines, variantIndex]);

  function priceFor(variantId: string) {
    const info = variantIndex.get(variantId);
    if (!info || !customer) return info?.variant.price ?? 0;
    const discount = listDiscount[customer.priceListId] ?? 0;
    return Math.round(info.variant.price * (1 - discount / 100));
  }

  function onCustomerChange(nextCustomerId: string) {
    const nextCustomer = customers.find((item) => item.id === nextCustomerId);
    if (nextCustomer) {
      const discount = listDiscount[nextCustomer.priceListId] ?? 0;
      (lines ?? []).forEach((line, index) => {
        const info = variantIndex.get(line.variantId);
        if (info) {
          update(index, {
            ...line,
            unitPrice: Math.round(info.variant.price * (1 - discount / 100)),
          });
        }
      });
    }
  }

  function addLine() {
    if (!selectedVariantId) {
      toast.error("Seleccioná un producto y una variante.");
      return;
    }
    const existingIndex = (lines ?? []).findIndex((line) => line.variantId === selectedVariantId);
    if (existingIndex >= 0) {
      const existing = lines[existingIndex];
      update(existingIndex, {
        ...existing,
        quantity: Number(existing.quantity) + 1,
      });
      toast.success("Se sumó una unidad a la línea existente.");
      return;
    }
    append({
      variantId: selectedVariantId,
      quantity: 1,
      unitPrice: priceFor(selectedVariantId),
      discountPercent: 0,
      isCustomized: false,
      customizationDetail: "",
    });
  }

  function onSubmit(values: QuoteFormValues) {
    startTransition(async () => {
      setServerError("");
      const result = await saveQuote(values, quote?.id, saveMode === "send");
      if (!result.ok) {
        setServerError(result.error ?? "No pudimos guardar el presupuesto.");
        toast.error(result.error ?? "No pudimos guardar el presupuesto.");
        return;
      }
      toast.success(saveMode === "send" ? "Presupuesto guardado y marcado como enviado." : "Presupuesto guardado.");
      router.push(`/presupuestos/${result.id}`);
      router.refresh();
    });
  }

  const pickerProducts: PickerProduct[] = products.map((product) => ({
    id: product.id,
    name: `${product.code} · ${product.name}`,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
    })),
  }));

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
      <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
        {readOnly ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            Este presupuesto está {quote?.status === "APROBADO" ? "aprobado" : "rechazado"} y ya no puede editarse.
          </div>
        ) : null}

        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5">
            <CardTitle className="text-sm font-semibold">Datos del presupuesto</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Cliente</Label>
              <Controller
                control={control}
                name="customerId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      onCustomerChange(value);
                    }}
                    disabled={readOnly}
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                    <SelectContent>
                      {customers.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} · {item.priceListName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {customer ? (
                <p className="text-[11px] text-muted-foreground">
                  RUC {formatRuc(customer.rucBase, customer.dv)} · Lista {customer.priceListName}
                </p>
              ) : null}
              {errors.customerId ? <p className="text-xs text-destructive">{errors.customerId.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" type="date" {...register("date")} disabled={readOnly} />
            </div>
            <div className="space-y-1.5">
              <Label>Validez</Label>
              <Controller
                control={control}
                name="validityDays"
                render={({ field }) => (
                  <Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))} disabled={readOnly}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 días</SelectItem>
                      <SelectItem value="15">15 días</SelectItem>
                      <SelectItem value="30">30 días</SelectItem>
                      <SelectItem value="60">60 días</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="observations">Observaciones</Label>
              <Textarea id="observations" {...register("observations")} rows={2} disabled={readOnly} placeholder="Condiciones, tiempos de entrega, detalles de personalización…" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5">
            <CardTitle className="text-sm font-semibold">Productos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {!readOnly ? (
              <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-3">
                <VariantPicker products={pickerProducts} value={selectedVariantId} onChange={setSelectedVariantId} />
                <div className="mt-3 flex justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={addLine}>
                    <Plus className="mr-1 h-3.5 w-3.5" />Agregar al presupuesto
                  </Button>
                </div>
              </div>
            ) : null}

            {fields.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
                <FileText className="mx-auto h-5 w-5 text-muted-foreground" />
                <p className="mt-2 text-xs text-muted-foreground">Agregá productos al presupuesto.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {fields.map((field, index) => {
                  const info = variantIndex.get(lines?.[index]?.variantId ?? "");
                  const quantity = Number(lines?.[index]?.quantity) || 0;
                  const unitPrice = Number(lines?.[index]?.unitPrice) || 0;
                  const discount = Number(lines?.[index]?.discountPercent) || 0;
                  const lineTotal = Math.round(unitPrice * quantity * (1 - discount / 100));
                  return (
                    <div key={field.id} className="rounded-lg border border-border/70 bg-white p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{info?.product.name ?? "Producto"}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {info ? `${info.variant.size} · ${info.variant.color} · ${info.variant.sku}` : "Variante"}
                          </p>
                        </div>
                        {!readOnly ? (
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(index)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-[80px_130px_80px_1fr_120px] sm:items-end">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground">Cantidad</Label>
                          <Input type="number" min={1} className="h-8 bg-white text-xs" {...register(`lines.${index}.quantity`, { valueAsNumber: true })} disabled={readOnly} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground">Precio unit.</Label>
                          <Input type="number" min={0} className="h-8 bg-white text-xs" {...register(`lines.${index}.unitPrice`, { valueAsNumber: true })} disabled={readOnly} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground">Desc. %</Label>
                          <Input type="number" min={0} max={100} className="h-8 bg-white text-xs" {...register(`lines.${index}.discountPercent`, { valueAsNumber: true })} disabled={readOnly} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground">Personalización</Label>
                          <div className="flex h-8 items-center gap-2">
                            <Controller
                              control={control}
                              name={`lines.${index}.isCustomized`}
                              render={({ field: customField }) => (
                                <Switch checked={customField.value} onCheckedChange={customField.onChange} disabled={readOnly} />
                              )}
                            />
                            <span className="text-[11px] text-muted-foreground">Con logo</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase text-muted-foreground">Subtotal</p>
                          <p className="mt-1 text-sm font-semibold tabular">{formatGs(lineTotal)}</p>
                        </div>
                      </div>
                      {lines?.[index]?.isCustomized ? (
                        <div className="mt-2">
                          <Input
                            {...register(`lines.${index}.customizationDetail`)}
                            placeholder="Detalle de personalización (ej. bordado de logo en pecho)"
                            className="h-8 bg-white text-xs"
                            disabled={readOnly}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
            {errors.lines?.message ? <p className="text-xs text-destructive">{errors.lines.message}</p> : null}
          </CardContent>
        </Card>

        {serverError ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{serverError}</span>
          </div>
        ) : null}

        {!readOnly ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
              <X className="mr-1.5 h-4 w-4" />Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={handleSubmit((values) => {
                setSaveMode("draft");
                onSubmit(values);
              })}
            >
              {pending && saveMode === "draft" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Guardar borrador
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={handleSubmit((values) => {
                setSaveMode("send");
                onSubmit(values);
              })}
            >
              {pending && saveMode === "send" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
              Guardar y enviar
            </Button>
          </div>
        ) : null}
      </form>

      <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5">
            <CardTitle className="text-sm font-semibold">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 p-5">
            <SummaryRow label="Gravada 10%" value={formatGs(totals.gravada10)} />
            <SummaryRow label="IVA 10%" value={formatGs(totals.iva10)} />
            {totals.gravada5 > 0 ? <SummaryRow label="Gravada 5%" value={formatGs(totals.gravada5)} /> : null}
            {totals.iva5 > 0 ? <SummaryRow label="IVA 5%" value={formatGs(totals.iva5)} /> : null}
            {totals.exenta > 0 ? <SummaryRow label="Exenta" value={formatGs(totals.exenta)} /> : null}
            <div className="flex items-center justify-between border-t border-border/60 pt-3">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-lg font-bold tabular">{formatGs(totals.total)}</span>
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Precios con IVA incluido. Presupuesto válido por {watch("validityDays")} días.
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/60 shadow-none">
          <CardContent className="p-4 text-[11px] leading-relaxed text-amber-800">
            <strong>Demo:</strong> este presupuesto no tiene validez fiscal. La aprobación genera un pedido de venta.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}
