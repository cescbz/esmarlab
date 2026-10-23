"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPayroll } from "@/actions/payroll";
import { currentPeriod, MONTH_NAMES } from "@/lib/hr";

export function NewPayrollDialog({ trigger }: { trigger: React.ReactNode }) {
  const router = useRouter();
  const now = currentPeriod();
  const [month, setMonth] = useState(String(now.month));
  const [year, setYear] = useState(String(now.year));
  const [pending, startTransition] = useTransition();

  return (
    <FormDialog
      title="Nueva liquidación"
      description="Calcula el período con los empleados activos, asistencias y destajo."
      trigger={trigger}
      className="sm:max-w-lg"
    >
      {(close) => {
        function submit() {
          startTransition(async () => {
            const result = await createPayroll({ year: Number(year), month: Number(month) });
            if (!result.ok) {
              toast.error(result.error ?? "No pudimos crear la liquidación.");
              return;
            }
            toast.success("Liquidación creada.");
            close();
            router.push(`/rrhh/liquidaciones/${result.id}`);
            router.refresh();
          });
        }

        return (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Mes</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, index) => (
                      <SelectItem key={name} value={String(index + 1)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Año</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[now.year - 1, now.year, now.year + 1].map((item) => (
                      <SelectItem key={item} value={String(item)}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={submit} className="w-full" disabled={pending}>
              Crear liquidación
            </Button>
          </div>
        );
      }}
    </FormDialog>
  );
}
