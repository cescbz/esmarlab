"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
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
import { employeeSchema, type EmployeeFormValues } from "@/lib/validators/employee";
import { saveEmployee } from "@/actions/hr";
import { toDateInputValue } from "@/lib/format";

const DEPARTMENTS = ["Producción", "Ventas", "Administración", "Depósito", "Gerencia", "RRHH"];
const WORK_DAYS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
  { value: 7, label: "Dom" },
];

export type EmployeeDefaults = Partial<EmployeeFormValues> & { id?: string };

const toNullableNumber = (value: unknown) => (value === "" || value === null ? null : Number(value));
const toNumber = (value: unknown) => (value === "" || value === null ? 0 : Number(value));

export function EmployeeForm({
  employee,
  workshops,
  onSaved,
}: {
  employee?: EmployeeDefaults;
  workshops: { id: string; name: string }[];
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      firstName: employee?.firstName ?? "",
      lastName: employee?.lastName ?? "",
      ci: employee?.ci ?? "",
      birthDate: employee?.birthDate ?? "",
      phone: employee?.phone ?? "",
      email: employee?.email ?? "",
      address: employee?.address ?? "",
      emergencyContact: employee?.emergencyContact ?? "",
      position: employee?.position ?? "",
      department: employee?.department ?? "Producción",
      workshopId: employee?.workshopId ?? "",
      hireDate: employee?.hireDate ?? toDateInputValue(new Date()),
      endDate: employee?.endDate ?? "",
      status: employee?.status ?? "ACTIVO",
      payType: employee?.payType ?? "MENSUAL",
      monthlySalary: employee?.monthlySalary ?? null,
      dailyRate: employee?.dailyRate ?? null,
      pieceRate: employee?.pieceRate ?? null,
      scheduledStart: employee?.scheduledStart ?? "07:30",
      scheduledEnd: employee?.scheduledEnd ?? "17:00",
      lunchMinutes: employee?.lunchMinutes ?? 60,
      lateToleranceMinutes: employee?.lateToleranceMinutes ?? 10,
      workDays: employee?.workDays ?? [1, 2, 3, 4, 5, 6],
      pin: "",
      vacationDaysOverride: employee?.vacationDaysOverride ?? null,
      notes: employee?.notes ?? "",
    },
  });
  const payType = watch("payType");

  function onSubmit(values: EmployeeFormValues) {
    startTransition(async () => {
      const result = await saveEmployee(values, employee?.id);
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos guardar el empleado.");
        return;
      }
      toast.success(employee?.id ? "Empleado actualizado." : "Empleado creado.");
      router.refresh();
      onSaved?.();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Datos personales
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">Nombre</Label>
            <Input id="firstName" {...register("firstName")} />
            {errors.firstName ? (
              <p className="text-xs text-destructive">{errors.firstName.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Apellido</Label>
            <Input id="lastName" {...register("lastName")} />
            {errors.lastName ? (
              <p className="text-xs text-destructive">{errors.lastName.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ci">CI con DV</Label>
            <Input id="ci" {...register("ci")} placeholder="1234567-8" />
            {errors.ci ? <p className="text-xs text-destructive">{errors.ci.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label>Fecha de nacimiento</Label>
            <Controller
              control={control}
              name="birthDate"
              render={({ field }) => (
                <DatePicker value={field.value} onChange={field.onChange} />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" {...register("phone")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" {...register("email")} />
            {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" {...register("address")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="emergencyContact">Contacto de emergencia</Label>
            <Input id="emergencyContact" {...register("emergencyContact")} />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Datos laborales
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="position">Cargo</Label>
            <Input id="position" {...register("position")} />
            {errors.position ? (
              <p className="text-xs text-destructive">{errors.position.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label>Departamento</Label>
            <Controller
              control={control}
              name="department"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((department) => (
                      <SelectItem key={department} value={department}>
                        {department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Taller (opcional)</Label>
            <Controller
              control={control}
              name="workshopId"
              render={({ field }) => (
                <Select
                  value={field.value || "none"}
                  onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin taller</SelectItem>
                    {workshops.map((workshop) => (
                      <SelectItem key={workshop.id} value={workshop.id}>
                        {workshop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha de ingreso</Label>
            <Controller
              control={control}
              name="hireDate"
              render={({ field }) => (
                <DatePicker value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.hireDate ? (
              <p className="text-xs text-destructive">{errors.hireDate.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label>Fecha de egreso</Label>
            <Controller
              control={control}
              name="endDate"
              render={({ field }) => (
                <DatePicker value={field.value} onChange={field.onChange} />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVO">Activo</SelectItem>
                    <SelectItem value="LICENCIA">Licencia</SelectItem>
                    <SelectItem value="INACTIVO">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Horario
        </h3>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="scheduledStart">Entrada</Label>
            <Input id="scheduledStart" type="time" {...register("scheduledStart")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scheduledEnd">Salida</Label>
            <Input id="scheduledEnd" type="time" {...register("scheduledEnd")} />
            {errors.scheduledEnd ? (
              <p className="text-xs text-destructive">{errors.scheduledEnd.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lunchMinutes">Almuerzo (min)</Label>
            <Input
              id="lunchMinutes"
              type="number"
              {...register("lunchMinutes", { setValueAs: toNumber })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lateToleranceMinutes">Tolerancia (min)</Label>
            <Input
              id="lateToleranceMinutes"
              type="number"
              {...register("lateToleranceMinutes", { setValueAs: toNumber })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Días laborales</Label>
          <Controller
            control={control}
            name="workDays"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {WORK_DAYS.map((day) => {
                  const active = field.value.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() =>
                        field.onChange(
                          active
                            ? field.value.filter((value) => value !== day.value)
                            : [...field.value, day.value].sort()
                        )
                      }
                      className={
                        active
                          ? "rounded-md border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                          : "rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
                      }
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            )}
          />
          {errors.workDays ? (
            <p className="text-xs text-destructive">{errors.workDays.message}</p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pago</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tipo de pago</Label>
            <Controller
              control={control}
              name="payType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MENSUAL">Mensual</SelectItem>
                    <SelectItem value="JORNAL">Jornal</SelectItem>
                    <SelectItem value="DESTAJO">Destajo</SelectItem>
                    <SelectItem value="MIXTO">Mixto</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {payType === "MENSUAL" || payType === "MIXTO" ? (
            <div className="space-y-1.5">
              <Label htmlFor="monthlySalary">Sueldo mensual (Gs.)</Label>
              <Input
                id="monthlySalary"
                type="number"
                {...register("monthlySalary", { setValueAs: toNullableNumber })}
              />
              {errors.monthlySalary ? (
                <p className="text-xs text-destructive">{errors.monthlySalary.message}</p>
              ) : null}
            </div>
          ) : null}
          {payType === "JORNAL" || payType === "DESTAJO" ? (
            <div className="space-y-1.5">
              <Label htmlFor="dailyRate">
                {payType === "JORNAL" ? "Jornal diario (Gs.)" : "Jornal de referencia (Gs.)"}
              </Label>
              <Input
                id="dailyRate"
                type="number"
                {...register("dailyRate", { setValueAs: toNullableNumber })}
              />
              {errors.dailyRate ? (
                <p className="text-xs text-destructive">{errors.dailyRate.message}</p>
              ) : null}
            </div>
          ) : null}
          {payType === "DESTAJO" || payType === "MIXTO" ? (
            <div className="space-y-1.5">
              <Label htmlFor="pieceRate">Tarifa por unidad (Gs.)</Label>
              <Input
                id="pieceRate"
                type="number"
                {...register("pieceRate", { setValueAs: toNullableNumber })}
              />
              {errors.pieceRate ? (
                <p className="text-xs text-destructive">{errors.pieceRate.message}</p>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="vacationDaysOverride">Días de vacaciones (opcional)</Label>
            <Input
              id="vacationDaysOverride"
              type="number"
              placeholder="Automático por antigüedad"
              {...register("vacationDaysOverride", { setValueAs: toNullableNumber })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pin">
              PIN {employee?.id ? "(dejar vacío para mantener)" : ""}
            </Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              {...register("pin")}
            />
            {errors.pin ? <p className="text-xs text-destructive">{errors.pin.message}</p> : null}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notas</Label>
          <Textarea id="notes" rows={2} {...register("notes")} />
        </div>
      </section>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-1.5 h-4 w-4" />
        )}
        Guardar empleado
      </Button>
    </form>
  );
}
