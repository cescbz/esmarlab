"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { FormDialog } from "@/components/shared/form-dialog";
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
import { DatePicker } from "@/components/ui/date-picker";
import { savePieceworkEntry } from "@/actions/hr";
import { toDateInputValue } from "@/lib/format";

const schema = z.object({
  date: z.string().min(1),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a cero."),
  unitRate: z.coerce.number().int().min(0),
  description: z.string().optional().default(""),
  productionOrderStageId: z.string().optional().default("none"),
});

type Values = z.infer<typeof schema>;

export type PieceworkStageOption = {
  id: string;
  label: string;
  quantity: number;
  description: string;
};

export function PieceworkFormModal({
  employeeId,
  pieceRate,
  stages,
  trigger,
}: {
  employeeId: string;
  pieceRate: number;
  stages: PieceworkStageOption[];
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: toDateInputValue(new Date()),
      quantity: 0,
      unitRate: pieceRate,
      description: "",
      productionOrderStageId: "none",
    },
  });

  return (
    <FormDialog
      title="Registrar destajo"
      description="Unidades producidas y tarifa aplicada."
      trigger={trigger}
      className="sm:max-w-lg"
    >
      {(close) => {
        function onSubmit(values: Values) {
          startTransition(async () => {
            const result = await savePieceworkEntry({
              ...values,
              employeeId,
              productionOrderStageId:
                values.productionOrderStageId === "none" ? "" : values.productionOrderStageId,
            });
            if (!result.ok) {
              toast.error(result.error ?? "No pudimos registrar el destajo.");
              return;
            }
            toast.success("Destajo registrado.");
            router.refresh();
            close();
          });
        }

        return (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {stages.length > 0 ? (
              <div className="space-y-1.5">
                <Label>Etapa de producción (opcional)</Label>
                <Controller
                  control={control}
                  name="productionOrderStageId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        const stage = stages.find((item) => item.id === value);
                        if (stage) {
                          setValue("quantity", stage.quantity);
                          setValue("description", stage.description);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Carga manual</SelectItem>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Controller
                control={control}
                name="date"
                render={({ field }) => (
                  <DatePicker value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="quantity">Cantidad</Label>
                <Input
                  id="quantity"
                  type="number"
                  {...register("quantity", { valueAsNumber: true })}
                />
                {errors.quantity ? (
                  <p className="text-xs text-destructive">{errors.quantity.message}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unitRate">Tarifa unitaria (Gs.)</Label>
                <Input
                  id="unitRate"
                  type="number"
                  {...register("unitRate", { valueAsNumber: true })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                {...register("description")}
                placeholder="Producción de octubre"
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              Guardar destajo
            </Button>
          </form>
        );
      }}
    </FormDialog>
  );
}
