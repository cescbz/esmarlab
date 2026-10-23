"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { publicClockPunch, type PublicClockPunchResult } from "@/actions/kiosk";
import { KioskCamera } from "./kiosk-camera";

export function PublicKiosk({
  title,
  companyName,
  requirePhoto,
}: {
  title: string;
  companyName: string;
  requirePhoto: boolean;
}) {
  const [now, setNow] = useState(new Date());
  const [ci, setCi] = useState("");
  const [pin, setPin] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraKey, setCameraKey] = useState(0);
  const [result, setResult] = useState<PublicClockPunchResult | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const response = await publicClockPunch({ ci, pin, photo });
      if (!response.ok) {
        toast.error(response.error ?? "No pudimos registrar la marca.");
        return;
      }
      setResult(response);
      setCi("");
      setPin("");
      setPhoto(null);
      setCameraKey((value) => value + 1);
    });
  }

  function reset() {
    setResult(null);
  }

  if (result) {
    const time = result.time
      ? new Date(result.time).toLocaleTimeString("es-PY", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "America/Asuncion",
        })
      : "";
    return (
      <main className="flex min-h-svh items-center justify-center bg-brand px-6 text-white">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-2xl">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
          <h1 className="mt-4 text-2xl font-semibold text-foreground">
            {result.mark === "ENTRADA" ? "Entrada registrada" : "Salida registrada"}
          </h1>
          <p className="mt-2 text-lg font-medium text-foreground">{result.employeeName}</p>
          <p className="mt-1 font-mono text-4xl font-semibold tabular text-brand">{time}</p>
          <div className="mt-2 text-sm text-muted-foreground">
            {result.lateMinutes ? <span>{result.lateMinutes} min tarde</span> : null}
            {result.lateMinutes && result.overtimeMinutes ? <span> · </span> : null}
            {result.overtimeMinutes ? <span>{result.overtimeMinutes} min extra</span> : null}
          </div>
          <Button onClick={reset} className="mt-6 w-full" size="lg">
            Listo
          </Button>
        </div>
      </main>
    );
  }

  const canSubmit =
    ci.trim().length > 0 && pin.length === 4 && (!requirePhoto || Boolean(photo));

  return (
    <main className="min-h-svh bg-brand px-4 py-8 text-white">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col justify-center text-center lg:text-left">
          <p className="text-[11px] uppercase tracking-[0.25em] text-white/50">{companyName}</p>
          <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
          <p className="mt-6 font-mono text-6xl font-semibold tabular sm:text-7xl">
            {now.toLocaleTimeString("es-PY", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
              timeZone: "America/Asuncion",
            })}
          </p>
          <p className="mt-2 text-sm text-white/60">
            {now.toLocaleDateString("es-PY", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "America/Asuncion",
            })}
          </p>
          <p className="mt-6 max-w-sm text-sm text-white/70">
            Marcá tu entrada o salida con tu CI y PIN. La foto es obligatoria.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ci" className="text-foreground">CI con DV</Label>
              <Input
                id="ci"
                value={ci}
                onChange={(event) => setCi(event.target.value)}
                placeholder="1234567-8"
                autoComplete="off"
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pin" className="text-foreground">PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                className="h-11 text-base"
              />
            </div>
            <KioskCamera
              key={cameraKey}
              required={requirePhoto}
              onChange={setPhoto}
            />
            <Button
              type="submit"
              className="h-12 w-full text-base"
              disabled={!canSubmit || pending}
            >
              {pending ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Clock className="mr-2 h-5 w-5" />
              )}
              Marcar entrada / salida
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
