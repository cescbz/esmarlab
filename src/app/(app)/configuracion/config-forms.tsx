"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Plus, Save } from "lucide-react";
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
import { DatePicker } from "@/components/ui/date-picker";
import { saveCompany, saveExpenseCategory, saveProductionStage, saveTimbrado, togglePaymentMethod, updateUser } from "@/actions/settings";
import { calculateDV } from "@/lib/fiscal";

const companySchema = z.object({
  razonSocial: z.string().min(2),
  nombreFantasia: z.string().optional().default(""),
  ruc: z.string().min(1),
  address: z.string().min(2),
  city: z.string().min(2),
  phone: z.string().min(3),
  email: z.string().email("Email inválido."),
  actividadEconomica: z.string().min(3),
});
type CompanyValues = z.infer<typeof companySchema>;

export function CompanyForm({
  company,
}: {
  company: CompanyValues;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CompanyValues>({
    resolver: zodResolver(companySchema),
    defaultValues: company,
  });

  function onSubmit(values: CompanyValues) {
    startTransition(async () => {
      const result = await saveCompany(values);
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos guardar la empresa.");
        return;
      }
      toast.success("Datos de la empresa actualizados.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="razonSocial">Razón social</Label>
        <Input id="razonSocial" {...register("razonSocial")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="nombreFantasia">Nombre de fantasía</Label>
        <Input id="nombreFantasia" {...register("nombreFantasia")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ruc">RUC</Label>
        <Input
          id="ruc"
          {...register("ruc", {
            onBlur: (event) => {
              const digits = event.target.value.replace(/\D/g, "");
              if (digits.length >= 5 && digits.length <= 8) {
                setValue("ruc", `${digits}-${calculateDV(digits)}`, { shouldValidate: true });
              }
            },
          })}
          className="font-mono"
        />
        {errors.ruc ? <p className="text-xs text-destructive">{errors.ruc.message}</p> : null}
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="address">Dirección</Label>
        <Input id="address" {...register("address")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="city">Ciudad</Label>
        <Input id="city" {...register("city")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Teléfono</Label>
        <Input id="phone" {...register("phone")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register("email")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="actividadEconomica">Actividad económica</Label>
        <Input id="actividadEconomica" {...register("actividadEconomica")} />
      </div>
      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
          Guardar empresa
        </Button>
      </div>
    </form>
  );
}

const timbradoSchema = z.object({
  numero: z.string().regex(/^\d{8}$/, "8 dígitos"),
  vigenciaDesde: z.string().min(1),
  vigenciaHasta: z.string().min(1),
  activo: z.boolean(),
});
type TimbradoValues = z.infer<typeof timbradoSchema>;

export function TimbradoForm({ timbrado }: { timbrado: TimbradoValues }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, control, formState: { errors } } = useForm<TimbradoValues>({
    resolver: zodResolver(timbradoSchema),
    defaultValues: timbrado,
  });

  function onSubmit(values: TimbradoValues) {
    startTransition(async () => {
      const result = await saveTimbrado(values);
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos guardar el timbrado.");
        return;
      }
      toast.success("Timbrado actualizado.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="numero">Número de timbrado</Label>
        <Input id="numero" {...register("numero")} className="font-mono" />
        {errors.numero ? <p className="text-xs text-destructive">{errors.numero.message}</p> : null}
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border/70 px-3.5 py-2.5">
        <div>
          <p className="text-sm font-medium">Timbrado activo</p>
          <p className="text-xs text-muted-foreground">Se usa para nuevos comprobantes.</p>
        </div>
        <Controller control={control} name="activo" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="vigenciaDesde">Vigencia desde</Label>
        <Controller
          control={control}
          name="vigenciaDesde"
          render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="vigenciaHasta">Vigencia hasta</Label>
        <Controller
          control={control}
          name="vigenciaHasta"
          render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
        />
      </div>
      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
          Guardar timbrado
        </Button>
      </div>
    </form>
  );
}

export function PaymentMethodSwitch({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Switch
      checked={active}
      disabled={pending}
      onCheckedChange={(checked) =>
        startTransition(async () => {
          const result = await togglePaymentMethod(id, checked);
          if (!result.ok) toast.error(result.error ?? "No pudimos actualizar.");
          else {
            toast.success("Medio de pago actualizado.");
            router.refresh();
          }
        })
      }
    />
  );
}

export function CreateStageForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [order, setOrder] = useState(99);
  const [pending, startTransition] = useTransition();
  function submit() {
    startTransition(async () => {
      const result = await saveProductionStage({ name, sortOrder: order });
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos crear la etapa.");
        return;
      }
      toast.success("Etapa creada.");
      setName("");
      router.refresh();
    });
  }
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1 space-y-1">
        <Label className="text-[10px] uppercase text-muted-foreground">Nueva etapa</Label>
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre de la etapa" className="h-8 text-xs" />
      </div>
      <Input type="number" value={order} onChange={(event) => setOrder(Number(event.target.value))} className="h-8 w-20 text-xs" />
      <Button type="button" size="sm" className="h-8" onClick={submit} disabled={pending || name.trim().length < 2}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function CreateCategoryForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  function submit() {
    startTransition(async () => {
      const result = await saveExpenseCategory({ name });
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos crear la categoría.");
        return;
      }
      toast.success("Categoría creada.");
      setName("");
      router.refresh();
    });
  }
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1 space-y-1">
        <Label className="text-[10px] uppercase text-muted-foreground">Nueva categoría</Label>
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre de la categoría" className="h-8 text-xs" />
      </div>
      <Button type="button" size="sm" className="h-8" onClick={submit} disabled={pending || name.trim().length < 2}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

const ROLE_OPTIONS = [
  ["ADMIN", "Administrador"],
  ["GERENCIA", "Gerencia"],
  ["VENTAS", "Ventas"],
  ["CAJA", "Caja"],
  ["DEPOSITO", "Depósito"],
  ["PRODUCCION", "Producción"],
] as const;

export function UserRoleRow({
  user,
}: {
  user: { id: string; name: string; username: string; role: string; active: boolean };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState(user.role);
  const [active, setActive] = useState(user.active);

  function save(nextRole: string, nextActive: boolean) {
    startTransition(async () => {
      const result = await updateUser({
        userId: user.id,
        role: nextRole as (typeof ROLE_OPTIONS)[number][0],
        active: nextActive,
      });
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos actualizar el usuario.");
        return;
      }
      toast.success("Usuario actualizado.");
      router.refresh();
    });
  }

  return (
    <div className="grid items-center gap-3 border-b border-border/60 py-3 last:border-0 sm:grid-cols-[1fr_180px_90px]">
      <div>
        <p className="text-xs font-medium">{user.name}</p>
        <p className="text-[10px] text-muted-foreground">@{user.username}</p>
      </div>
      <Select
        value={role}
        onValueChange={(value) => {
          setRole(value);
          save(value, active);
        }}
        disabled={pending}
      >
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {ROLE_OPTIONS.map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center justify-end gap-2">
        <span className="text-[10px] text-muted-foreground">{active ? "Activo" : "Inactivo"}</span>
        <Switch
          checked={active}
          disabled={pending}
          onCheckedChange={(checked) => {
            setActive(checked);
            save(role, checked);
          }}
        />
      </div>
    </div>
  );
}

