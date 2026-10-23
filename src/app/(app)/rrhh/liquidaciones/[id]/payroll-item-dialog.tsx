"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updatePayrollItem } from "@/actions/payroll";

export function PayrollItemDialog({
  itemId,
  employeeName,
  otherEarnings,
  otherDeductions,
  notes,
  trigger,
}: {
  itemId: string;
  employeeName: string;
  otherEarnings: number;
  otherDeductions: number;
  notes: string;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [earnings, setEarnings] = useState(String(otherEarnings));
  const [deductions, setDeductions] = useState(String(otherDeductions));
  const [note, setNote] = useState(notes);

  return (
    <FormDialog
      title="Ajustar ítem"
      description={`${employeeName}. Bonificaciones y otros descuentos del período.`}
      trigger={trigger}
      className="sm:max-w-lg"
    >
      {(close) => {
        function submit() {
          startTransition(async () => {
            const result = await updatePayrollItem(itemId, {
              otherEarnings: Number(earnings || 0),
              otherDeductions: Number(deductions || 0),
              notes: note,
            });
            if (!result.ok) {
              toast.error(result.error ?? "No pudimos ajustar el ítem.");
              return;
            }
            toast.success("Ítem ajustado.");
            router.refresh();
            close();
          });
        }

        return (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="otherEarnings">Otros ingresos (Gs.)</Label>
                <Input
                  id="otherEarnings"
                  type="number"
                  value={earnings}
                  onChange={(event) => setEarnings(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="otherDeductions">Otros descuentos (Gs.)</Label>
                <Input
                  id="otherDeductions"
                  type="number"
                  value={deductions}
                  onChange={(event) => setDeductions(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
            <Button onClick={submit} className="w-full" disabled={pending}>
              Guardar ajuste
            </Button>
          </div>
        );
      }}
    </FormDialog>
  );
}
