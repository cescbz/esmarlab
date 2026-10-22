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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supplierSchema, type SupplierFormValues } from "@/lib/validators/supplier";
import { saveSupplier } from "@/actions/suppliers";
import { calculateDV, formatRuc } from "@/lib/fiscal";

export function SupplierForm({
  supplier,
  onSaved,
  onCancel,
}: {
  onSaved?: (id?: string) => void;
  onCancel?: () => void;
  supplier?: {
    id: string;
    name: string;
    rucBase: string;
    dv: string;
    contactName: string | null;
    phone: string | null;
    email: string | null;
    origin: "LOCAL" | "IMPORTADO";
    active: boolean;
  };
}) {
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
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: supplier
      ? {
          name: supplier.name,
          ruc: formatRuc(supplier.rucBase, supplier.dv),
          contactName: supplier.contactName ?? "",
          phone: supplier.phone ?? "",
          email: supplier.email ?? "",
          origin: supplier.origin,
          active: supplier.active,
        }
      : {
          name: "",
          ruc: "",
          contactName: "",
          phone: "",
          email: "",
          origin: "LOCAL",
          active: true,
        },
  });

  function onRucBlur() {
    const value = watch("ruc").trim();
    if (!value.includes("-")) {
      const digits = value.replace(/\D/g, "");
      if (digits.length >= 5 && digits.length <= 8) {
        setValue("ruc", `${digits}-${calculateDV(digits)}`, { shouldValidate: true });
      }
    }
  }

  function onSubmit(values: SupplierFormValues) {
    startTransition(async () => {
      setServerError("");
      const result = await saveSupplier(values, supplier?.id);
      if (!result.ok) {
        setServerError(result.error ?? "No pudimos guardar el proveedor.");
        toast.error(result.error ?? "No pudimos guardar el proveedor.");
        return;
      }
      toast.success(supplier ? "Proveedor actualizado." : "Proveedor creado.");
      router.refresh();
      if (onSaved) {
        onSaved(result.id);
        return;
      }
      router.push("/proveedores");
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Card className="border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-3.5">
          <CardTitle className="text-sm font-semibold">Datos del proveedor</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Razón social</Label>
            <Input id="name" {...register("name")} placeholder="Textil Asunción SA" />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ruc">RUC</Label>
            <Input id="ruc" {...register("ruc", { onBlur: onRucBlur })} placeholder="80020000-1" className="font-mono" />
            {errors.ruc ? <p className="text-xs text-destructive">{errors.ruc.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label>Origen</Label>
            <Controller
              control={control}
              name="origin"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOCAL">Local</SelectItem>
                    <SelectItem value="IMPORTADO">Importado</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactName">Contacto</Label>
            <Input id="contactName" {...register("contactName")} placeholder="Nombre del vendedor" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" {...register("phone")} placeholder="021 555 1234" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} placeholder="ventas@proveedor.com.py" />
            {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/70 px-3.5 py-2.5 sm:col-span-2">
            <div>
              <p className="text-sm font-medium">Proveedor activo</p>
              <p className="text-xs text-muted-foreground">Disponible para recepciones de compra.</p>
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
        <Button type="button" variant="outline" onClick={() => (onCancel ? onCancel() : router.back())} disabled={pending}>
          <X className="mr-1.5 h-4 w-4" />Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
          {supplier ? "Guardar cambios" : "Crear proveedor"}
        </Button>
      </div>
    </form>
  );
}
