"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDownToLine, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatGs } from "@/lib/format";
import { withdrawCash } from "@/actions/cash";

export function WithdrawalForm({ sessionId, cashExpected }: { sessionId: string; cashExpected: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("Retiro de efectivo");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await withdrawCash({ sessionId, amount, description });
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos registrar el retiro.");
        return;
      }
      toast.success("Retiro registrado.");
      setAmount(0);
      router.refresh();
    });
  }

  return (
    <Card className="border-border/80 shadow-none">
      <CardHeader className="border-b border-border/60 px-5 py-3.5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
          Retiro de efectivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        <div className="rounded-lg border border-border/70 bg-secondary/30 px-3.5 py-2.5 text-xs">
          <p className="text-muted-foreground">Efectivo esperado en caja</p>
          <p className="mt-0.5 text-base font-semibold tabular">{formatGs(cashExpected)}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="withdrawalAmount">Monto a retirar</Label>
          <Input id="withdrawalAmount" type="number" min={0} value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="withdrawalDescription">Motivo</Label>
          <Input id="withdrawalDescription" value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>
        <Button onClick={submit} disabled={pending || amount <= 0 || amount > cashExpected} className="w-full">
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ArrowDownToLine className="mr-1.5 h-4 w-4" />}
          Registrar retiro
        </Button>
      </CardContent>
    </Card>
  );
}
