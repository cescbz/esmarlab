"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { saveKioskSettings } from "@/actions/kiosk";

export function KioskForm({
  settings,
  currentIp,
}: {
  settings: { enabled: boolean; allowedIps: string; requirePhoto: boolean; title: string };
  currentIp: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [allowedIps, setAllowedIps] = useState(settings.allowedIps);
  const [requirePhoto, setRequirePhoto] = useState(settings.requirePhoto);
  const [title, setTitle] = useState(settings.title);
  const [publicUrl, setPublicUrl] = useState("/kiosco");

  useEffect(() => {
    setPublicUrl(`${window.location.origin}/kiosco`);
  }, []);

  function save() {
    startTransition(async () => {
      const result = await saveKioskSettings({ enabled, allowedIps, requirePhoto, title });
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos guardar la configuración.");
        return;
      }
      toast.success("Configuración del reloj guardada.");
      router.refresh();
    });
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("URL copiada.");
    } catch {
      toast.error("No pudimos copiar la URL.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-lg border border-border/70 px-3.5 py-2.5">
        <div>
          <p className="text-sm font-medium">Reloj público activo</p>
          <p className="text-xs text-muted-foreground">
            Permite marcar desde la red autorizada sin iniciar sesión.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="allowedIps">IP o rango permitido</Label>
        <Input
          id="allowedIps"
          value={allowedIps}
          onChange={(event) => setAllowedIps(event.target.value)}
          placeholder="190.1.2.3, 190.1.2.0/24"
        />
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            IP detectada: <span className="font-mono text-foreground">{currentIp}</span>
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setAllowedIps(currentIp)}
          >
            Usar mi IP actual
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Es la IP pública del local/router. Los celulares deben estar en la misma red Wi-Fi.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="kioskTitle">Título del kiosco</Label>
          <Input
            id="kioskTitle"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Reloj de asistencia"
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border/70 px-3.5 py-2.5">
          <div>
            <p className="text-sm font-medium">Exigir foto</p>
            <p className="text-xs text-muted-foreground">Entrada y salida.</p>
          </div>
          <Switch checked={requirePhoto} onCheckedChange={setRequirePhoto} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>URL pública</Label>
        <div className="flex gap-2">
          <Input readOnly value={publicUrl} className="font-mono text-xs" />
          <Button type="button" variant="outline" onClick={copyUrl}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Button onClick={save} disabled={pending} className="w-full">
        <Save className="mr-1.5 h-4 w-4" />
        Guardar configuración
      </Button>
    </div>
  );
}
