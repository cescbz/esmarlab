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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { saveWarehouse } from "@/actions/warehouses";

const schema = z.object({
  name: z.string().min(2, "Ingresá el nombre."),
  type: z.string().min(1),
  active: z.boolean().default(true),
});

type Values = z.infer<typeof schema>;

export function WarehouseDialog({
  warehouse,
}: {
  warehouse?: { id: string; name: string; type: string; active: boolean };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, control, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: warehouse ?? { name: "", type: "CENTRAL", active: true },
  });

  function onSubmit(values: Values) {
    startTransition(async () => {
      const result = await saveWarehouse(values, warehouse?.id);
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos guardar el depósito.");
        return;
      }
      toast.success(warehouse ? "Depósito actualizado." : "Depósito creado.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {warehouse ? (
          <Button variant="ghost" size="sm" className="h-7 text-xs">Editar</Button>
        ) : (
          <Button><Plus className="mr-1.5 h-4 w-4" />Nuevo depósito</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{warehouse ? "Editar depósito" : "Nuevo depósito"}</DialogTitle>
          <DialogDescription>Los depósitos se usan para stock, transferencias, envíos y producción.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="warehouse-name">Nombre</Label>
            <Input id="warehouse-name" {...register("name")} placeholder="Depósito Central" />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CENTRAL">Depósito central</SelectItem>
                    <SelectItem value="MATERIA_PRIMA">Materia prima</SelectItem>
                    <SelectItem value="TERMINADO">Producto terminado</SelectItem>
                    <SelectItem value="SHOWROOM">Showroom</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/70 px-3.5 py-2.5">
            <div>
              <p className="text-sm font-medium">Depósito activo</p>
              <p className="text-xs text-muted-foreground">Permite movimientos de stock.</p>
            </div>
            <Controller
              control={control}
              name="active"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancelar</Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
