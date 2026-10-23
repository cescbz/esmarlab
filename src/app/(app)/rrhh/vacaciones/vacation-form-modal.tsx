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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { createVacationRequest } from "@/actions/vacations";
import { toDateInputValue } from "@/lib/format";

const schema = z.object({
  employeeId: z.string().min(1, "Seleccioná un empleado."),
  startDate: z.string().min(1, "Seleccioná la fecha de inicio."),
  endDate: z.string().min(1, "Seleccioná la fecha de fin."),
  reason: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

type Values = z.infer<typeof schema>;

export function VacationFormModal({
  employees,
  trigger,
}: {
  employees: { id: string; name: string }[];
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeId: employees[0]?.id ?? "",
      startDate: toDateInputValue(new Date()),
      endDate: toDateInputValue(new Date()),
      reason: "",
      notes: "",
    },
  });

  return (
    <FormDialog
      title="Nueva solicitud de vacaciones"
      description="Los días se calculan con los días laborales del empleado."
      trigger={trigger}
      className="sm:max-w-lg"
    >
      {(close) => {
        function onSubmit(values: Values) {
          startTransition(async () => {
            const result = await createVacationRequest(values);
            if (!result.ok) {
              toast.error(result.error ?? "No pudimos registrar la solicitud.");
              return;
            }
            toast.success("Solicitud registrada.");
            router.refresh();
            close();
          });
        }

        return (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Empleado</Label>
              <Controller
                control={control}
                name="employeeId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.employeeId ? (
                <p className="text-xs text-destructive">{errors.employeeId.message}</p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Desde</Label>
                <Controller
                  control={control}
                  name="startDate"
                  render={({ field }) => (
                    <DatePicker value={field.value} onChange={field.onChange} />
                  )}
                />
                {errors.startDate ? (
                  <p className="text-xs text-destructive">{errors.startDate.message}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label>Hasta</Label>
                <Controller
                  control={control}
                  name="endDate"
                  render={({ field }) => (
                    <DatePicker value={field.value} onChange={field.onChange} />
                  )}
                />
                {errors.endDate ? (
                  <p className="text-xs text-destructive">{errors.endDate.message}</p>
                ) : null}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reason">Motivo</Label>
              <Input id="reason" {...register("reason")} placeholder="Vacaciones familiares" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" rows={2} {...register("notes")} />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              Registrar solicitud
            </Button>
          </form>
        );
      }}
    </FormDialog>
  );
}
