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
import { DatePicker } from "@/components/ui/date-picker";
import { saveAttendance } from "@/actions/attendance";
import { formatDate, toDateInputValue } from "@/lib/format";

const schema = z.object({
  date: z.string().min(1),
  checkIn: z.string().optional().default(""),
  checkOut: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

type Values = z.infer<typeof schema>;

export type AttendanceRecordDefaults = {
  date: string;
  checkIn: string;
  checkOut: string;
  notes: string;
};

export function AttendanceCorrectionDialog({
  employeeId,
  record,
  trigger,
}: {
  employeeId: string;
  record?: AttendanceRecordDefaults;
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
      date: record?.date ?? toDateInputValue(new Date()),
      checkIn: record?.checkIn ?? "",
      checkOut: record?.checkOut ?? "",
      notes: record?.notes ?? "",
    },
  });

  return (
    <FormDialog
      title={record ? "Corregir marca" : "Agregar marca"}
      description="Entrada y salida del empleado para el día seleccionado."
      trigger={trigger}
      className="sm:max-w-lg"
    >
      {(close) => {
        function onSubmit(values: Values) {
          startTransition(async () => {
            const result = await saveAttendance({ ...values, employeeId });
            if (!result.ok) {
              toast.error(result.error ?? "No pudimos guardar la marca.");
              return;
            }
            toast.success(record ? "Marca corregida." : "Marca agregada.");
            router.refresh();
            close();
          });
        }

        return (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              {record ? (
                <p className="flex h-9 items-center rounded-md border border-border bg-secondary/40 px-3 text-xs">
                  {formatDate(new Date(`${record.date}T12:00:00-03:00`))}
                </p>
              ) : (
                <Controller
                  control={control}
                  name="date"
                  render={({ field }) => (
                    <DatePicker value={field.value} onChange={field.onChange} />
                  )}
                />
              )}
              {errors.date ? (
                <p className="text-xs text-destructive">{errors.date.message}</p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="checkIn">Entrada</Label>
                <Input id="checkIn" type="time" {...register("checkIn")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="checkOut">Salida</Label>
                <Input id="checkOut" type="time" {...register("checkOut")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" rows={2} {...register("notes")} />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              Guardar marca
            </Button>
          </form>
        );
      }}
    </FormDialog>
  );
}
