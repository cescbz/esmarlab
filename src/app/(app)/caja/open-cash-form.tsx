"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, LockKeyhole, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatGs } from "@/lib/format";
import { openCashSession } from "@/actions/cash";

export function OpenCashForm({
  registerId,
  registerName,
  point,
}: {
  registerId: string;
  registerName: string;
  point: string;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(1000000);
  const [pending, startTransition] = useTransition();

  function open() {
    startTransition(async () => {
      const result = await openCashSession(registerId, amount);
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos abrir la caja.");
        return;
      }
      toast.success(`${registerName} abierta con ${formatGs(amount)}.`);
      router.refresh();
    });
  }

  return (
    <Card className="border-border/80 shadow-none">
      <CardHeader className="border-b border-border/60 px-5 py-3.5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <LockKeyhole className="h-4 w-4 text-muted-foreground" />
          Abrir {registerName}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="mb-4 rounded-lg border border-border/70 bg-secondary/30 px-3.5 py-2.5 text-xs">
          <p className="font-medium">{registerName} · punto {point}</p>
          <p className="mt-0.5 text-muted-foreground">La caja está cerrada. Ingresá el monto inicial en efectivo.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="openingAmount">Monto inicial (Gs.)</Label>
          <Input
            id="openingAmount"
            type="number"
            min={0}
            step={10000}
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
          />
          <p className="text-[11px] text-muted-foreground">Se usa como base para el arqueo de efectivo.</p>
        </div>
        <Button onClick={open} disabled={pending} className="mt-4 w-full">
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Wallet className="mr-1.5 h-4 w-4" />}
          Abrir caja
        </Button>
      </CardContent>
    </Card>
  );
}
