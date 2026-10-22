"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertCircle, Factory, Loader2 } from "lucide-react";
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
import { createProductionOrder } from "@/actions/production";
import { addDays, formatDate, toDateInputValue } from "@/lib/format";

type ProductOption = {
  id: string;
  name: string;
  code: string;
  variants: { id: string; sku: string; size: string; color: string }[];
};

type OrderOption = {
  id: string;
  number: string;
  customer: string;
  lines: { productId: string; variantId: string; quantity: number }[];
};

const schema = z.object({
  productId: z.string().min(1, "Seleccioná un producto."),
  orderId: z.string().optional().default(""),
  dueDate: z.string().min(1, "Seleccioná la fecha compromiso."),
  priority: z.enum(["BAJA", "MEDIA", "ALTA"]),
  consumptionWarehouseId: z.string().min(1),
  outputWarehouseId: z.string().min(1),
  notes: z.string().optional().default(""),
  lines: z
    .array(z.object({ variantId: z.string(), quantity: z.coerce.number().int().min(0) }))
    .refine((lines) => lines.some((line) => line.quantity > 0), "Ingresá cantidades para al menos una variante."),
});

type Values = z.infer<typeof schema>;

export function ProductionForm({
  products,
  orders,
  warehouses,
  defaultOrderId,
  defaultProductId,
}: {
  products: ProductOption[];
  orders: OrderOption[];
  warehouses: { id: string; name: string }[];
  defaultOrderId?: string;
  defaultProductId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState("");

  const initialOrder = orders.find((order) => order.id === defaultOrderId);
  const initialProductId =
    defaultProductId ??
    initialOrder?.lines[0]?.productId ??
    products[0]?.id ??
    "";
  const initialProduct = products.find((product) => product.id === initialProductId);

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      productId: initialProductId,
      orderId: defaultOrderId ?? "",
      dueDate: toDateInputValue(addDays(new Date(), 14)),
      priority: "MEDIA",
      consumptionWarehouseId: "wh_mp",
      outputWarehouseId: "wh_pt",
      notes: "",
      lines: (initialProduct?.variants ?? []).map((variant) => ({
        variantId: variant.id,
        quantity:
          initialOrder?.lines.find((line) => line.variantId === variant.id)?.quantity ?? 0,
      })),
    },
  });

  const { fields, replace } = useFieldArray({ control, name: "lines" });
  const productId = watch("productId");
  const orderId = watch("orderId");
  const lines = watch("lines");
  const product = products.find((item) => item.id === productId);
  const total = (lines ?? []).reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);

  function applyProduct(nextProductId: string, order?: OrderOption) {
    const nextProduct = products.find((item) => item.id === nextProductId);
    replace(
      (nextProduct?.variants ?? []).map((variant) => ({
        variantId: variant.id,
        quantity: order?.lines.find((line) => line.variantId === variant.id)?.quantity ?? 0,
      }))
    );
  }

  function onOrderChange(nextOrderId: string) {
    setValue("orderId", nextOrderId);
    const order = orders.find((item) => item.id === nextOrderId);
    const firstLine = order?.lines[0];
    if (firstLine) {
      setValue("productId", firstLine.productId);
      applyProduct(firstLine.productId, order);
    }
  }

  function onSubmit(values: Values) {
    startTransition(async () => {
      setServerError("");
      const result = await createProductionOrder(values);
      if (!result.ok) {
        setServerError(result.error ?? "No pudimos crear la orden.");
        toast.error(result.error ?? "No pudimos crear la orden.");
        return;
      }
      toast.success("Orden de producción creada.");
      router.push(`/produccion/ordenes/${result.id}`);
      router.refresh();
    });
  }

  const selectedOrder = orders.find((order) => order.id === orderId);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5">
            <CardTitle className="text-sm font-semibold">Datos de la orden</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Pedido de venta (opcional)</Label>
              <Controller
                control={control}
                name="orderId"
                render={({ field }) => (
                  <Select value={field.value || "none"} onValueChange={(value) => {
                      const next = value === "none" ? "" : value;
                      field.onChange(next);
                      onOrderChange(next);
                    }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin pedido · producir para stock</SelectItem>
                      {orders.map((order) => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.number} · {order.customer}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-[11px] text-muted-foreground">Si elegís un pedido, se precargan las cantidades de sus líneas fabricadas.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Producto fabricado</Label>
              <Controller
                control={control}
                name="productId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      applyProduct(value, selectedOrder);
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {products.map((item) => (
                        <SelectItem key={item.id} value={item.id}>{item.code} · {item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Fecha compromiso</Label>
              <Input id="dueDate" type="date" {...register("dueDate")} />
            </div>
            <div className="space-y-1.5">
              <Label>Prioridad</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BAJA">Baja</SelectItem>
                      <SelectItem value="MEDIA">Media</SelectItem>
                      <SelectItem value="ALTA">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Depósito de materia prima</Label>
              <Controller
                control={control}
                name="consumptionWarehouseId"
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
            <div className="space-y-1.5">
              <Label>Depósito de producto terminado</Label>
              <Controller
                control={control}
                name="outputWarehouseId"
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
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">Observaciones</Label>
              <Textarea id="notes" {...register("notes")} rows={2} placeholder="Detalles de confección, prioridad, entregas…" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none">
          <CardHeader className="flex-row items-center justify-between border-b border-border/60 px-5 py-3.5">
            <CardTitle className="text-sm font-semibold">Variantes a producir</CardTitle>
            <span className="text-xs text-muted-foreground">Total {total} unidades</span>
          </CardHeader>
          <CardContent className="space-y-2 p-4">
            {fields.map((field, index) => {
              const variant = product?.variants.find((item) => item.id === field.variantId);
              return (
                <div key={field.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2">
                  <div>
                    <p className="text-xs font-medium">Talle {variant?.size} · {variant?.color}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{variant?.sku}</p>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    className="h-8 w-28 bg-white text-right text-xs"
                    {...register(`lines.${index}.quantity`, { valueAsNumber: true })}
                  />
                </div>
              );
            })}
            {errors.lines?.message ? <p className="text-xs text-destructive">{errors.lines.message}</p> : null}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Resumen</CardTitle></CardHeader>
          <CardContent className="space-y-2 p-5 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Producto</span><span className="max-w-[180px] truncate text-right font-medium">{product?.name ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pedido</span><span>{selectedOrder?.number ?? "Stock"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Compromiso</span><span>{watch("dueDate") ? formatDate(new Date(`${watch("dueDate")}T12:00:00`)) : "—"}</span></div>
            <div className="flex justify-between border-t border-border/60 pt-2"><span className="text-muted-foreground">Cantidad</span><span className="text-base font-semibold tabular">{total}</span></div>
          </CardContent>
        </Card>

        {serverError ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{serverError}</span>
          </div>
        ) : null}

        <Button type="submit" className="w-full" disabled={pending || total <= 0}>
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Factory className="mr-1.5 h-4 w-4" />}
          Crear orden de producción
        </Button>
        <p className="text-center text-[10px] text-muted-foreground">
          Al iniciar la OP se consumirá materia prima según la ficha técnica.
        </p>
      </div>
    </form>
  );
}
