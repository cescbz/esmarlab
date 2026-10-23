"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateAguinaldo } from "@/actions/payroll";

export function GenerateAguinaldoButton({
  year,
  disabled,
}: {
  year: number;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      const result = await generateAguinaldo(year);
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos generar el aguinaldo.");
        return;
      }
      toast.success("Aguinaldo generado.");
      router.push(`/rrhh/liquidaciones/${result.id}`);
      router.refresh();
    });
  }

  return (
    <Button onClick={generate} disabled={pending || disabled}>
      Generar liquidación de aguinaldo
    </Button>
  );
}
