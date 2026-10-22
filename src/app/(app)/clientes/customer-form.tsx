"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertCircle, Loader2, Save, X } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { customerSchema, type CustomerFormValues } from "@/lib/validators/customer";
import { calculateDV, formatRuc } from "@/lib/fiscal";
import { saveCustomer } from "@/actions/customers";

type Props = {
  priceLists: { id: string; name: string }[];
  customer?: {
    id: string;
    type: "PERSONA_FISICA" | "PERSONA_JURIDICA";
    name: string;
    rucBase: string;
    dv: string;
    address: string | null;
    city: string;
    phone: string | null;
    email: string | null;
    priceListId: string;
    creditLimit: number;
    termDays: number;
    active: boolean;
  };
};

export function CustomerForm({ priceLists, customer }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer
      ? {
          type: customer.type,
          name: customer.name,
          ruc: formatRuc(customer.rucBase, customer.dv),
          address: customer.address ?? "",
          city: customer.city,
          phone: customer.phone ?? "",
          email: customer.email ?? "",
          priceListId: customer.priceListId,
          creditLimit: customer.creditLimit,
          termDays: customer.termDays,
          active: customer.active,
        }
      : {
          type: "PERSONA_JURIDICA",
          name: "",
          ruc: "",
          address: "",
          city: "Asunción",
          phone: "",
          email: "",
          priceListId: priceLists[0]?.id ?? "",
          creditLimit: 0,
          termDays: 30,
          active: true,
        },
  });

  const rucValue = watch("ruc");
  const active = watch("active");

  function onRucBlur() {
    const cleaned = rucValue.trim();
    if (!cleaned.includes("-")) {
      const digits = cleaned.replace(/\D/g, "");
      if (digits.length >= 5 && digits.length <= 8) {
        setValue("ruc", `${digits}-${calculateDV(digits)}`, { shouldValidate: true });
      }
    }
  }

  function onSubmit(values: CustomerFormValues) {
    startTransition(async () => {
      setServerError("");
      const result = await saveCustomer(values, customer?.id);
      if (!result.ok) {
        setServerError(result.error ?? "No pudimos guardar el cliente.");
        toast.error(result.error ?? "No pudimos guardar el cliente.");
        return;
      }
      toast.success(customer ? "Cliente actualizado." : "Cliente creado.");
      router.push(`/clientes/${result.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Card className="border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-3.5">
          <CardTitle className="text-sm font-semibold">Datos generales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tipo de cliente</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERSONA_JURIDICA">Persona jurídica</SelectItem>
                    <SelectItem value="PERSONA_FISICA">Persona física</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Razón social / Nombre</Label>
            <Input id="name" {...register("name")} placeholder="Frigorífico San Lorenzo SA" />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ruc">RUC / CI</Label>
            <Input
              id="ruc"
              {...register("ruc", { onBlur: onRucBlur })}
              placeholder="80012345-6"
              className="font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Ingresá número y dígito verificador. Si escribís solo el número, lo calculamos al salir del campo.
            </p>
            {errors.ruc ? <p className="text-xs text-destructive">{errors.ruc.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="city">Ciudad</Label>
            <Input id="city" {...register("city")} placeholder="Ñemby" />
            {errors.city ? <p className="text-xs text-destructive">{errors.city.message}</p> : null}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" {...register("address")} placeholder="Calle, número, barrio" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" {...register("phone")} placeholder="0981 123 456" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} placeholder="compras@empresa.com.py" />
            {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-3.5">
          <CardTitle className="text-sm font-semibold">Condiciones comerciales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Lista de precios</Label>
            <Controller
              control={control}
              name="priceListId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {priceLists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.priceListId ? (
              <p className="text-xs text-destructive">{errors.priceListId.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="creditLimit">Límite de crédito (Gs.)</Label>
            <Input
              id="creditLimit"
              type="number"
              min={0}
              step={1000}
              {...register("creditLimit", { valueAsNumber: true })}
            />
            {errors.creditLimit ? (
              <p className="text-xs text-destructive">{errors.creditLimit.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>Plazo de crédito por defecto</Label>
            <Controller
              control={control}
              name="termDays"
              render={({ field }) => (
                <Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Contado</SelectItem>
                    <SelectItem value="15">15 días</SelectItem>
                    <SelectItem value="30">30 días</SelectItem>
                    <SelectItem value="60">60 días</SelectItem>
                    <SelectItem value="90">90 días</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/70 px-3.5 py-2.5">
            <div>
              <p className="text-sm font-medium">Cliente activo</p>
              <p className="text-xs text-muted-foreground">Permite operar en ventas y cobranzas.</p>
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
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          <X className="mr-1.5 h-4 w-4" />
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
          {customer ? "Guardar cambios" : "Crear cliente"}
        </Button>
      </div>
      <p className="text-right text-[11px] text-muted-foreground">
        Estado actual: {active ? "activo" : "inactivo"} · RUC validado con módulo 11
      </p>
    </form>
  );
}
