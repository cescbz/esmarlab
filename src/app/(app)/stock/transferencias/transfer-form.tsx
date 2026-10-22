"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, Loader2, Repeat2 } from "lucide-react";
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
import { transferStock } from "@/actions/stock";

const schema = z.object({
  variantId: z.string().min(1, "Seleccioná un producto."),
  fromWarehouseId: z.string().min(1, "Seleccioná el origen."),
  toWarehouseId: z.string().min(1, "Seleccioná el destino."),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a cero."),
  observation: z.string().optional().default(""),
});

type Values = z.infer<typeof schema>;

export function TransferForm({
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
      fromWarehouseId: "wh_central",
      toWarehouseId: "wh_showroom",
      quantity: 1,
      observation: "",
    },
  });

  function onSubmit(values: Values) {
    startTransition(async () => {
      const result = await transferStock(values);
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos transferir el stock.");
        return;
      }
      toast.success("Transferencia registrada.");
      reset({ ...values, quantity: 1, observation: "" });
      router.refresh();
    });
  }

  return (
    <Card className="border-border/80 shadow-none">
      <CardHeader className="border-b border-border/60 px-5 py-3.5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Repeat2 className="h-4 w-4 text-muted-foreground" />
          Nueva transferencia
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            control={control}
            name="variantId"
            render={({ field }) => (
              <VariantPicker products={products} value={field.value} onChange={field.onChange} />
            )}
          />
          {errors.variantId ? <p className="text-xs text-destructive">{errors.variantId.message}</p> : null}

          <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr_140px]">
            <div className="space-y-1.5">
              <Label>Desde</Label>
              <Controller
                control={control}
                name="fromWarehouseId"
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
            <ArrowRight className="mb-2.5 hidden h-4 w-4 text-muted-foreground sm:block" />
            <div className="space-y-1.5">
              <Label>Hacia</Label>
              <Controller
                control={control}
                name="toWarehouseId"
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
              <Label htmlFor="quantity">Cantidad</Label>
              <Input id="quantity" type="number" min={1} {...register("quantity", { valueAsNumber: true })} />
              {errors.quantity ? <p className="text-xs text-destructive">{errors.quantity.message}</p> : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observation">Observación</Label>
            <Textarea id="observation" {...register("observation")} rows={2} placeholder="Motivo o detalle de la transferencia" />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Repeat2 className="mr-1.5 h-4 w-4" />}
              Registrar transferencia
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
