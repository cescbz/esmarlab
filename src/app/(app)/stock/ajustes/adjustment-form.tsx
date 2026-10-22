"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, SlidersHorizontal } from "lucide-react";
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
import { VariantPicker, type PickerProduct } from "@/components/shared/variant-picker";
import { adjustStock } from "@/actions/stock";

const schema = z.object({
  variantId: z.string().min(1, "Seleccioná un producto."),
  warehouseId: z.string().min(1, "Seleccioná un depósito."),
  direction: z.enum(["POSITIVO", "NEGATIVO"]),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a cero."),
  reason: z.string().min(1, "Seleccioná un motivo."),
  observation: z.string().optional().default(""),
});

type Values = z.infer<typeof schema>;

const REASONS = [
  "Inventario físico",
  "Rotura",
  "Pérdida",
  "Vencimiento",
  "Corrección de carga",
  "Otro",
];

export function AdjustmentForm({
  products,
  warehouses,
}: {
  products: PickerProduct[];
  warehouses: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { handleSubmit, control, register, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      variantId: products[0]?.variants[0]?.id ?? "",
      warehouseId: "wh_central",
      direction: "POSITIVO",
      quantity: 1,
      reason: "Inventario físico",
      observation: "",
    },
  });

  function onSubmit(values: Values) {
    startTransition(async () => {
      const result = await adjustStock(values);
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos registrar el ajuste.");
        return;
      }
      toast.success("Ajuste registrado.");
      reset({ ...values, quantity: 1, observation: "" });
      router.refresh();
    });
  }

  return (
    <Card className="border-border/80 shadow-none">
      <CardHeader className="border-b border-border/60 px-5 py-3.5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          Nuevo ajuste de inventario
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            control={control}
            name="variantId"
            render={({ field }) => <VariantPicker products={products} value={field.value} onChange={field.onChange} />}
          />
          {errors.variantId ? <p className="text-xs text-destructive">{errors.variantId.message}</p> : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Depósito</Label>
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
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Controller
                control={control}
                name="direction"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POSITIVO">Ajuste positivo (+)</SelectItem>
                      <SelectItem value="NEGATIVO">Ajuste negativo (−)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input id="quantity" type="number" min={1} {...register("quantity", { valueAsNumber: true })} />
              {errors.quantity ? <p className="text-xs text-destructive">{errors.quantity.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Motivo</Label>
              <Controller
                control={control}
                name="reason"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REASONS.map((reason) => (
                        <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observation">Observación</Label>
            <Textarea id="observation" {...register("observation")} rows={2} placeholder="Detalle del ajuste" />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <SlidersHorizontal className="mr-1.5 h-4 w-4" />}
              Registrar ajuste
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
