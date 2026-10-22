"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertCircle, Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { priceListSchema, type PriceListFormValues } from "@/lib/validators/price-list";
import { savePriceList } from "@/actions/price-lists";

export function PriceListForm({
  list,
}: {
  list?: {
    id: string;
    name: string;
    description: string | null;
    discountPercent: number;
    isDefault: boolean;
    active: boolean;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, control, formState: { errors } } = useForm<PriceListFormValues>({
    resolver: zodResolver(priceListSchema),
    defaultValues: list
      ? {
          name: list.name,
          description: list.description ?? "",
          discountPercent: list.discountPercent,
          isDefault: list.isDefault,
          active: list.active,
        }
      : { name: "", description: "", discountPercent: 0, isDefault: false, active: true },
  });

  function onSubmit(values: PriceListFormValues) {
    startTransition(async () => {
      setServerError("");
      const result = await savePriceList(values, list?.id);
      if (!result.ok) {
        setServerError(result.error ?? "No pudimos guardar la lista.");
        toast.error(result.error ?? "No pudimos guardar la lista.");
        return;
      }
      toast.success(list ? "Lista actualizada." : "Lista creada.");
      router.push(`/listas-de-precios/${result.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Card className="border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-3.5">
          <CardTitle className="text-sm font-semibold">Datos de la lista</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" {...register("name")} placeholder="Frigoríficos" />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="discountPercent">Descuento (%)</Label>
            <Input id="discountPercent" type="number" min={0} max={60} {...register("discountPercent", { valueAsNumber: true })} />
            {errors.discountPercent ? <p className="text-xs text-destructive">{errors.discountPercent.message}</p> : null}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Input id="description" {...register("description")} placeholder="Precios para clientes del rubro frigorífico" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/70 px-3.5 py-2.5">
            <div>
              <p className="text-sm font-medium">Predeterminada</p>
              <p className="text-xs text-muted-foreground">Se asigna a nuevos clientes.</p>
            </div>
            <Controller
              control={control}
              name="isDefault"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/70 px-3.5 py-2.5">
            <div>
              <p className="text-sm font-medium">Lista activa</p>
              <p className="text-xs text-muted-foreground">Disponible para asignar a clientes.</p>
            </div>
            <Controller
              control={control}
              name="active"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>
        </CardContent>
      </Card>

      {serverError ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{serverError}</span>
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          <X className="mr-1.5 h-4 w-4" />Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
          {list ? "Guardar cambios" : "Crear lista"}
        </Button>
      </div>
    </form>
  );
}
