"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatGs } from "@/lib/format";
import { closeCashSession } from "@/actions/cash";

export function CloseCashForm({
  sessionId,
  rows,
}: {
  sessionId: string;
  rows: { methodId: string; name: string; expected: number }[];
}) {
  const router = useRouter();
  const [counted, setCounted] = useState<Record<string, number>>(
    Object.fromEntries(rows.map((row) => [row.methodId, row.expected]))
  );
  const [observations, setObservations] = useState("");
  const [pending, startTransition] = useTransition();
  const totalExpected = rows.reduce((sum, row) => sum + row.expected, 0);
  const totalCounted = rows.reduce((sum, row) => sum + (Number(counted[row.methodId]) || 0), 0);
  const difference = totalCounted - totalExpected;

  function submit() {
    startTransition(async () => {
      const result = await closeCashSession({ sessionId, counted, observations });
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos cerrar la caja.");
        return;
      }
      toast.success("Caja cerrada. Descargando arqueo…");
      window.open(`/ver/arqueo/${sessionId}`, "_blank");
      router.refresh();
    });
  }

  return (
    <Card className="border-border/80 shadow-none">
      <CardHeader className="border-b border-border/60 px-5 py-3.5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <LockKeyhole className="h-4 w-4 text-muted-foreground" />
          Cierre de caja y arqueo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        <div className="space-y-2">
          {rows.map((row) => {
            const countedValue = Number(counted[row.methodId]) || 0;
            const diff = countedValue - row.expected;
            return (
              <div key={row.methodId} className="grid items-center gap-2 rounded-lg border border-border/70 px-3 py-2 sm:grid-cols-[1fr_130px_130px_100px]">
                <p className="text-xs font-medium">{row.name}</p>
                <div>
                  <p className="text-[9px] uppercase text-muted-foreground">Esperado</p>
                  <p className="text-xs tabular">{formatGs(row.expected)}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase text-muted-foreground">Contado</p>
                  <Input
                    type="number"
                    min={0}
                    value={counted[row.methodId] ?? 0}
                    onChange={(event) => setCounted((current) => ({ ...current, [row.methodId]: Number(event.target.value) }))}
                    className="mt-0.5 h-7 bg-white text-right text-xs"
                  />
                </div>
                <div className="text-right">
                  <p className="text-[9px] uppercase text-muted-foreground">Diferencia</p>
                  <p className={`text-xs font-medium tabular ${diff === 0 ? "text-muted-foreground" : diff > 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {formatGs(diff)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-3 rounded-lg border border-border/70 bg-secondary/30 p-3 sm:grid-cols-3">
          <div>
            <p className="text-[9px] uppercase text-muted-foreground">Esperado</p>
            <p className="text-sm font-semibold tabular">{formatGs(totalExpected)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase text-muted-foreground">Contado</p>
            <p className="text-sm font-semibold tabular">{formatGs(totalCounted)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase text-muted-foreground">Diferencia</p>
            <p className={`text-sm font-semibold tabular ${difference === 0 ? "" : difference > 0 ? "text-emerald-700" : "text-red-600"}`}>
              {formatGs(difference)}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="closeObservations">Observaciones del cierre</Label>
          <Textarea id="closeObservations" value={observations} onChange={(event) => setObservations(event.target.value)} rows={2} placeholder="Diferencias, incidentes, billetes retirados…" />
        </div>

        <Button onClick={submit} disabled={pending} className="w-full">
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileText className="mr-1.5 h-4 w-4" />}
          Cerrar caja y generar arqueo
        </Button>
      </CardContent>
    </Card>
  );
}
