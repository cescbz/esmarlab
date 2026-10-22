"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertCircle, Loader2, PackagePlus, Plus, Save, Trash2 } from "lucide-react";
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
import { formatGs, toDateInputValue } from "@/lib/format";
import { savePurchase } from "@/actions/purchases";

type ProductOption = {
  id: string;
  name: string;
  variants: { id: string; sku: string; size: string; color: string; cost: number }[];
};

const lineSchema = z.object({
  variantId: z.string().min(1, "Seleccioná una variante."),
  quantity: z.coerce.number().int().positive("Cantidad inválida."),
  unitCost: z.coerce.number().int().min(0, "Costo inválido."),
});

const schema = z.object({
  supplierId: z.string().min(1, "Seleccioná un proveedor."),
  warehouseId: z.string().min(1, "Seleccioná un depósito."),
  supplierInvoiceNumber: z.string().min(1, "Ingresá el número de factura."),
  date: z.string().min(1, "Seleccioná la fecha."),
  lines: z.array(lineSchema).min(1, "Agregá al menos una línea."),
});

type Values = z.infer<typeof schema>;

export function PurchaseForm({
  suppliers,
  warehouses,
  products,
}: {
  suppliers: { id: string; name: string }[];
  warehouses: { id: string; name: string }[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState("");
  const [productIds, setProductIds] = useState<string[]>(() => [products[0]?.id ?? ""]);
  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      supplierId: suppliers[0]?.id ?? "",
      warehouseId: "wh_central",
      supplierInvoiceNumber: "",
      date: toDateInputValue(new Date()),
      lines: [
        {
          variantId: products[0]?.variants[0]?.id ?? "",
          quantity: 1,
          unitCost: products[0]?.variants[0]?.cost ?? 0,
        },
      ],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const watchedLines = watch("lines");
  const total = useMemo(
    () =>
      (watchedLines ?? []).reduce(
        (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitCost) || 0),
        0
      ),
    [watchedLines]
  );

  function variantsFor(index: number) {
    return products.find((product) => product.id === productIds[index])?.variants ?? [];
  }

  function addLine() {
    const product = products[0];
    setProductIds((current) => [...current, product?.id ?? ""]);
    append({
      variantId: product?.variants[0]?.id ?? "",
      quantity: 1,
      unitCost: product?.variants[0]?.cost ?? 0,
    });
  }

  function removeLine(index: number) {
    setProductIds((current) => current.filter((_, i) => i !== index));
    remove(index);
  }

  function onSubmit(values: Values, confirm: boolean) {
    startTransition(async () => {
      setServerError("");
      const result = await savePurchase(values, confirm);
      if (!result.ok) {
        setServerError(result.error ?? "No pudimos guardar la compra.");
        toast.error(result.error ?? "No pudimos guardar la compra.");
        return;
      }
      toast.success(confirm ? "Recepción confirmada y stock actualizado." : "Compra guardada como borrador.");
      router.push(`/compras/${result.id}`);
      router.refresh();
    });
  }

  return (
    <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
      <Card className="border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-3.5">
          <CardTitle className="text-sm font-semibold">Datos de la compra</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 lg:col-span-2">
            <Label>Proveedor</Label>
            <Controller
              control={control}
              name="supplierId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supplierInvoiceNumber">Factura proveedor</Label>
            <Input id="supplierInvoiceNumber" {...register("supplierInvoiceNumber")} placeholder="001-001-0001234" className="font-mono" />
            {errors.supplierInvoiceNumber ? <p className="text-xs text-destructive">{errors.supplierInvoiceNumber.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date">Fecha</Label>
            <Controller
              control={control}
              name="date"
              render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Depósito destino</Label>
            <Controller
              control={control}
              name="warehouseId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-none">
        <CardHeader className="flex-row items-center justify-between border-b border-border/60 px-5 py-3.5">
          <CardTitle className="text-sm font-semibold">Mercadería recibida</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus className="mr-1 h-3.5 w-3.5" />Agregar línea
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {fields.map((field, index) => {
            const variants = variantsFor(index);
            return (
              <div key={field.id} className="grid gap-3 rounded-lg border border-border/70 bg-secondary/20 p-3 sm:grid-cols-[1.4fr_1fr_100px_140px_36px] sm:items-end">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Producto</Label>
                  <Select
                    value={productIds[index] ?? ""}
                    onValueChange={(value) => {
                      const product = products.find((item) => item.id === value);
                      setProductIds((current) => current.map((id, i) => (i === index ? value : id)));
                      if (product?.variants[0]) {
                        setValue(`lines.${index}.variantId`, product.variants[0].id);
                        setValue(`lines.${index}.unitCost`, product.variants[0].cost);
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 bg-white text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Variante</Label>
                  <Controller
                    control={control}
                    name={`lines.${index}.variantId`}
                    render={({ field: variantField }) => (
                      <Select
                        value={variantField.value}
                        onValueChange={(value) => {
                          variantField.onChange(value);
                          const variant = variants.find((item) => item.id === value);
                          if (variant) setValue(`lines.${index}.unitCost`, variant.cost);
                        }}
                      >
                        <SelectTrigger className="h-9 bg-white text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {variants.map((variant) => (
                            <SelectItem key={variant.id} value={variant.id}>
                              {variant.size} · {variant.color}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Cantidad</Label>
                  <Input type="number" min={1} className="h-9 bg-white text-xs" {...register(`lines.${index}.quantity`, { valueAsNumber: true })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Costo unit. (Gs.)</Label>
                  <Input type="number" min={0} className="h-9 bg-white text-xs" {...register(`lines.${index}.unitCost`, { valueAsNumber: true })} />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  onClick={() => (fields.length > 1 ? removeLine(index) : toast.error("La compra debe tener al menos una línea."))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          {errors.lines?.message ? <p className="text-xs text-destructive">{errors.lines.message}</p> : null}
        </CardContent>
      </Card>

      {serverError ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{serverError}</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total de la compra</p>
          <p className="mt-0.5 text-2xl font-semibold tabular">{formatGs(total)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>Cancelar</Button>
          <Button type="button" variant="outline" onClick={handleSubmit((values) => onSubmit(values, false))} disabled={pending}>
            {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Guardar borrador
          </Button>
          <Button type="button" onClick={handleSubmit((values) => onSubmit(values, true))} disabled={pending}>
            {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <PackagePlus className="mr-1.5 h-4 w-4" />}
            Confirmar recepción
          </Button>
        </div>
      </div>
    </form>
  );
}
