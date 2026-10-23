"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, Fingerprint, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clockPunch } from "@/actions/attendance";
import { formatTime } from "@/lib/format";

export function ClockKiosk({
  todayKey,
  canPunch,
  marks,
}: {
  todayKey: string;
  canPunch: boolean;
  marks: {
    id: string;
    employee: string;
    code: string;
    checkIn: string | null;
    checkOut: string | null;
    lateMinutes: number;
    overtimeMinutes: number;
  }[];
}) {
  const router = useRouter();
  const [now, setNow] = useState(new Date());
  const [ci, setCi] = useState("");
  const [pin, setPin] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await clockPunch({ ci, pin });
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos registrar la marca.");
        return;
      }
      const time = new Date(result.time ?? Date.now()).toLocaleTimeString("es-PY", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Asuncion",
      });
      toast.success(
        `${result.employeeName}: ${result.mark === "ENTRADA" ? "entrada" : "salida"} registrada a las ${time}` +
          (result.lateMinutes ? ` · ${result.lateMinutes} min tarde` : "") +
          (result.overtimeMinutes ? ` · ${result.overtimeMinutes} min extra` : "")
      );
      setCi("");
      setPin("");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Reloj de asistencia · {todayKey.split("-").reverse().join("/")}
        </p>
        <p className="mt-2 font-mono text-5xl font-semibold tabular sm:text-6xl">
          {now.toLocaleTimeString("es-PY", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZone: "America/Asuncion",
          })}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Marcá tu entrada o salida con CI y PIN.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Fingerprint className="h-4 w-4" />
              Registrar marca
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ci">CI con DV</Label>
                <Input
                  id="ci"
                  value={ci}
                  onChange={(event) => setCi(event.target.value)}
                  placeholder="1234567-8"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pin">PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                />
              </div>
              <Button
                type="submit"
                className="h-12 w-full text-base"
                disabled={!canPunch || pending || !ci || pin.length !== 4}
              >
                {pending ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Clock className="mr-2 h-5 w-5" />
                )}
                Marcar entrada / salida
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                {canPunch
                  ? "Demo: PIN 1234 para todos los empleados."
                  : "Solo RRHH puede registrar marcas. Gerencia puede consultar."}
              </p>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5">
            <CardTitle className="text-sm font-semibold">Marcas de hoy</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {marks.length === 0 ? (
              <p className="p-5 text-xs text-muted-foreground">Todavía no hay marcas hoy.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {marks.map((mark) => (
                  <div
                    key={mark.id}
                    className="flex items-center justify-between gap-2 px-5 py-2.5 text-xs"
                  >
                    <div>
                      <p className="font-medium">{mark.employee}</p>
                      <p className="text-[10px] text-muted-foreground">{mark.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="tabular">
                        {mark.checkIn ? formatTime(mark.checkIn) : "—"} →{" "}
                        {mark.checkOut ? formatTime(mark.checkOut) : "—"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {mark.lateMinutes ? `${mark.lateMinutes} min tarde` : ""}
                        {mark.overtimeMinutes ? ` · ${mark.overtimeMinutes} min extra` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
