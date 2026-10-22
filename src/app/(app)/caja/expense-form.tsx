"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Receipt, TrendingDown } from "lucide-react";
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
import { DatePicker } from "@/components/ui/date-picker";
import { toDateInputValue } from "@/lib/format";
import { createExpense } from "@/actions/cash";

const schema = z.object({
  date: z.string().min(1),
  categoryId: z.string().min(1, "Seleccioná una categoría."),
  supplierId: z.string().optional().default("none"),
  voucherNumber: z.string().optional().default(""),
  description: z.string().min(3, "Ingresá una descripción."),
  amount: z.coerce.number().int().positive("El monto debe ser mayor a cero."),
  paymentMethodId: z.string().min(1),
  paidFromCash: z.boolean().default(true),
});

type Values = z.infer<typeof schema>;

export function ExpenseForm({
  categories,
  suppliers,
  methods,
  sessionId,
  defaultPaidFromCash = false,
  redirectTo,
  compact = false,
  onSaved,
}: {
  categories: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  methods: { id: string; name: string }[];
  sessionId?: string;
  defaultPaidFromCash?: boolean;
  redirectTo?: string;
  compact?: boolean;
  onSaved?: (id?: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: toDateInputValue(new Date()),
      categoryId: categories[0]?.id ?? "",
      supplierId: "none",
      voucherNumber: "",
      description: "",
      amount: 0,
      paymentMethodId: defaultPaidFromCash ? "pm_EFECTIVO" : methods[0]?.id ?? "pm_EFECTIVO",
      paidFromCash: defaultPaidFromCash,
    },
  });
  const paidFromCash = watch("paidFromCash");

  function onSubmit(values: Values) {
    startTransition(async () => {
      const result = await createExpense({
        ...values,
        supplierId: values.supplierId === "none" ? null : values.supplierId,
        sessionId,
      });
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos registrar el gasto.");
        return;
      }
      toast.success("Gasto registrado.");
      if (onSaved) {
        onSaved(result.id);
        router.refresh();
        return;
      }
      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
        return;
      }
      reset({
        ...values,
        description: "",
        amount: 0,
        voucherNumber: "",
      });
      router.refresh();
    });
  }

  const fields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="date">Fecha</Label>
        <Controller
          control={control}
          name="date"
          render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Categoría</Label>
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Proveedor (opcional)</Label>
        <Controller
          control={control}
          name="supplierId"
          render={({ field }) => (
            <Select value={field.value || "none"} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin proveedor</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="voucherNumber">Nro. comprobante</Label>
        <Input id="voucherNumber" {...register("voucherNumber")} placeholder="FAC-0001" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" {...register("description")} rows={2} placeholder="Detalle del gasto" />
        {errors.description ? <p className="text-xs text-destructive">{errors.description.message}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="amount">Monto (Gs.)</Label>
        <Input id="amount" type="number" min={0} {...register("amount", { valueAsNumber: true })} />
        {errors.amount ? <p className="text-xs text-destructive">{errors.amount.message}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label>Medio de pago</Label>
        <Controller
          control={control}
          name="paymentMethodId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {methods.map((method) => (
                  <SelectItem key={method.id} value={method.id}>{method.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border/70 px-3.5 py-2.5 sm:col-span-2">
        <div>
          <p className="text-sm font-medium">Pagado desde caja</p>
          <p className="text-xs text-muted-foreground">
            {paidFromCash ? "Se registrará una salida de efectivo en la caja abierta." : "Se registra como gasto bancario, sin afectar el efectivo."}
          </p>
        </div>
        <Controller
          control={control}
          name="paidFromCash"
          render={({ field }) => (
            <Switch
              checked={field.value}
              onCheckedChange={(checked) => {
                field.onChange(checked);
                if (checked) setValue("paymentMethodId", "pm_EFECTIVO");
              }}
            />
          )}
        />
      </div>
    </div>
  );

  if (compact) {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {fields}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Receipt className="mr-1.5 h-4 w-4" />}
          Registrar gasto
        </Button>
      </form>
    );
  }

  return (
    <Card className="border-border/80 shadow-none">
      <CardHeader className="border-b border-border/60 px-5 py-3.5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
          Registrar gasto
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {fields}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Receipt className="mr-1.5 h-4 w-4" />}
            Registrar gasto
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
