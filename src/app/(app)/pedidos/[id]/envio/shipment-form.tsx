"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { AlertCircle, Loader2, PackageCheck, Truck } from "lucide-react";
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
import { createShipment } from "@/actions/orders";
import { toDateInputValue } from "@/lib/format";

type ShipmentLine = {
  orderLineId: string;
  description: string;
  sku: string;
  ordered: number;
  shipped: number;
  remaining: number;
  available: number;
};

type Values = {
  carrier: string;
  date: string;
  warehouseId: string;
  observations: string;
  quantities: Record<string, number>;
};

export function ShipmentForm({
  orderId,
  orderNumber,
  lines,
  warehouses,
}: {
  orderId: string;
  orderNumber: string;
  lines: ShipmentLine[];
  warehouses: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const defaultQuantities = useMemo(
    () => Object.fromEntries(lines.map((line) => [line.orderLineId, 0])),
    [lines]
  );

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<Values>({
    defaultValues: {
      carrier: "Retiro del cliente",
      date: toDateInputValue(new Date()),
      warehouseId: "wh_pt",
      observations: "",
      quantities: defaultQuantities,
    },
  });

  const quantities = watch("quantities");
  const totalUnits = Object.values(quantities ?? {}).reduce((sum, value) => sum + (Number(value) || 0), 0);

  function fillAll() {
    for (const line of lines) {
      setValue(`quantities.${line.orderLineId}`, Math.min(line.remaining, line.available));
    }
  }

  function onSubmit(values: Values) {
    startTransition(async () => {
      const result = await createShipment({
        orderId,
        date: values.date,
        carrier: values.carrier,
        warehouseId: values.warehouseId,
        observations: values.observations,
        lines: lines.map((line) => ({
          orderLineId: line.orderLineId,
          quantity: Number(values.quantities[line.orderLineId] ?? 0),
        })),
      });
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos crear el envío.");
        return;
      }
      toast.success("Envío creado y stock actualizado.");
      router.push(`/pedidos/${orderId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Card className="border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-3.5">
          <CardTitle className="text-sm font-semibold">Datos del envío</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="carrier">Transportista</Label>
            <Input id="carrier" {...register("carrier")} placeholder="Transporte Guaraní" />
            {errors.carrier ? <p className="text-xs text-destructive">{errors.carrier.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date">Fecha</Label>
            <Input id="date" type="date" {...register("date")} />
          </div>
          <div className="space-y-1.5">
            <Label>Depósito de salida (referencia)</Label>
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
            <p className="text-[10px] text-muted-foreground">
              El stock se descuenta del depósito natural de cada producto: Producto Terminado o Depósito Central.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="observations">Observaciones</Label>
            <Textarea id="observations" {...register("observations")} rows={2} placeholder="Entrega parcial, horario, contacto…" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-none">
        <CardHeader className="flex-row items-center justify-between border-b border-border/60 px-5 py-3.5">
          <CardTitle className="text-sm font-semibold">Cantidades a despachar · {orderNumber}</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={fillAll}>Despachar todo lo disponible</Button>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {lines.map((line) => (
            <div key={line.orderLineId} className="grid gap-3 rounded-lg border border-border/70 bg-secondary/20 p-3 sm:grid-cols-[1.7fr_repeat(4,80px)_110px] sm:items-end">
              <div>
                <p className="text-xs font-medium">{line.description}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{line.sku}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] uppercase text-muted-foreground">Pedido</p>
                <p className="text-xs font-medium tabular">{line.ordered}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] uppercase text-muted-foreground">Despachado</p>
                <p className="text-xs tabular">{line.shipped}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] uppercase text-muted-foreground">Pendiente</p>
                <p className="text-xs font-medium tabular">{line.remaining}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] uppercase text-muted-foreground">Stock</p>
                <p className={`text-xs tabular ${line.available < line.remaining ? "text-amber-700" : ""}`}>{line.available}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] uppercase text-muted-foreground">Despachar</Label>
                <Input
                  type="number"
                  min={0}
                  max={Math.min(line.remaining, line.available)}
                  className="h-8 bg-white text-xs"
                  {...register(`quantities.${line.orderLineId}`, { valueAsNumber: true })}
                />
              </div>
            </div>
          ))}
          {lines.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">No hay cantidades pendientes de despacho.</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <PackageCheck className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Unidades a despachar:</span>
          <span className="text-lg font-semibold tabular">{totalUnits}</span>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>Cancelar</Button>
          <Button type="submit" disabled={pending || lines.length === 0}>
            {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Truck className="mr-1.5 h-4 w-4" />}
            Confirmar envío
          </Button>
        </div>
      </div>
      {Object.keys(errors).length > 0 ? (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4" />Revisá los datos del envío.
        </div>
      ) : null}
    </form>
  );
}
