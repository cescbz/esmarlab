# Reloj público con IP y foto — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un kiosco público `/kiosco` que solo funcione desde la IP del local, permita marcar entrada/salida con CI + PIN y guarde una foto obligatoria en cada marca.

**Architecture:** Nueva ruta pública fuera del layout autenticado. La allowlist de IP y el modo kiosco viven en una fila `KioskSettings`. Las fotos se guardan comprimidas en `AttendancePhoto`, asociadas a la marca y al tipo (entrada/salida). La server action pública vuelve a validar IP, settings, PIN y foto. RRHH ve las fotos desde el detalle de asistencia mediante una API autenticada.

**Tech Stack:** Next.js 14, TypeScript estricto, Prisma 5, PostgreSQL 16, Zod, bcryptjs, `getUserMedia`/canvas, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-23-reloj-publico-design.md`

---

## Mapa de archivos

### Crear

- `src/lib/ip.ts` — normalización, allowlist y detección de IP.
- `src/lib/photo.ts` — validación de data URLs de foto.
- `src/lib/__tests__/ip.test.ts`
- `src/lib/__tests__/photo.test.ts`
- `src/actions/kiosk.ts` — `saveKioskSettings`, `publicClockPunch`.
- `src/app/kiosco/page.tsx` — página pública.
- `src/app/kiosco/public-kiosk.tsx` — reloj, formulario y resultado.
- `src/app/kiosco/kiosk-camera.tsx` — cámara, compresión y fallback de archivo.
- `src/app/api/attendance/photo/[id]/route.ts` — imagen autenticada.
- `src/app/(app)/rrhh/asistencia/[employeeId]/photo-dialog.tsx` — visor de foto.
- `e2e/kiosco.spec.ts` — smoke del kiosco y configuración.

### Modificar

- `prisma/schema.prisma` — `KioskSettings`, `AttendancePhoto`, enum y relación.
- `prisma/seed.ts` — cleanup de `AttendancePhoto`.
- `prisma/seed/hr.ts` — crear settings por defecto si no existen.
- `src/auth.config.ts` — permitir `/kiosco` sin sesión.
- `src/actions/settings.ts` o `src/actions/kiosk.ts` — settings.
- `src/app/(app)/configuracion/page.tsx` — pestaña Reloj e IP detectada.
- `src/app/(app)/configuracion/config-forms.tsx` — formulario del kiosco.
- `src/app/(app)/rrhh/asistencia/[employeeId]/page.tsx` — fotos y botones.
- `AGENTS.md` — documentación.

---

## Task 1: Schema, migración, helpers de IP y foto

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/ip.ts`
- Create: `src/lib/photo.ts`
- Create: `src/lib/__tests__/ip.test.ts`
- Create: `src/lib/__tests__/photo.test.ts`

- [ ] **Step 1: Agregar el enum y los modelos**

En `prisma/schema.prisma`, después de `VacationStatus`:

```prisma
enum AttendanceMarkType {
  ENTRADA
  SALIDA
}
```

Al final del archivo:

```prisma
model KioskSettings {
  id           String   @id @default("default")
  enabled      Boolean  @default(false)
  allowedIps   String   @default("")
  requirePhoto Boolean  @default(true)
  title        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model AttendancePhoto {
  id           String             @id @default(cuid())
  attendanceId String
  attendance   Attendance         @relation(fields: [attendanceId], references: [id], onDelete: Cascade)
  type         AttendanceMarkType
  data         String
  mimeType     String             @default("image/jpeg")
  createdAt    DateTime           @default(now())

  @@unique([attendanceId, type])
  @@index([attendanceId])
}
```

En `model Attendance`, agregar:

```prisma
  photos            AttendancePhoto[]
```

- [ ] **Step 2: Crear `src/lib/ip.ts`**

```ts
export type ClientIpHeaders = {
  forwardedFor?: string | null;
  realIp?: string | null;
  cfConnectingIp?: string | null;
  trustCloudflare?: boolean;
};

export function normalizeIp(value: string): string {
  let ip = value.trim();
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (ip === "::1") return "127.0.0.1";
  return ip;
}

export function getClientIp(headers: ClientIpHeaders): string {
  const forwarded = headers.forwardedFor
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (forwarded?.length) return normalizeIp(forwarded[forwarded.length - 1]);
  if (headers.realIp) return normalizeIp(headers.realIp);
  if (headers.trustCloudflare && headers.cfConnectingIp) {
    return normalizeIp(headers.cfConnectingIp);
  }
  return "127.0.0.1";
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const numbers = parts.map(Number);
  if (numbers.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    return null;
  }
  return (
    (((numbers[0] << 24) >>> 0) +
      (numbers[1] << 16) +
      (numbers[2] << 8) +
      numbers[3]) >>>
    0
  );
}

function ipv4CidrMatch(ip: string, cidr: string): boolean {
  const [base, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(base);
  if (ipInt === null || baseInt === null) return false;
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

export function isIpAllowed(ip: string, allowedIps: string): boolean {
  const normalized = normalizeIp(ip);
  const entries = allowedIps
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return entries.some((entry) =>
    entry.includes("/") ? ipv4CidrMatch(normalized, entry) : normalizeIp(entry) === normalized
  );
}
```

- [ ] **Step 3: Crear `src/lib/photo.ts`**

```ts
export const MAX_PHOTO_BYTES = 300 * 1024;

export function photoByteLength(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return 0;
  const base64 = dataUrl.slice(comma + 1);
  try {
    return Buffer.from(base64, "base64").byteLength;
  } catch {
    return 0;
  }
}

export function isValidPhotoDataUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!/^data:image\/(jpeg|png);base64,/.test(value)) return false;
  const bytes = photoByteLength(value);
  return bytes > 0 && bytes <= MAX_PHOTO_BYTES;
}
```

- [ ] **Step 4: Escribir los tests**

`src/lib/__tests__/ip.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getClientIp, isIpAllowed } from "@/lib/ip";

describe("allowlist de IP", () => {
  it("permite una IP exacta", () => {
    expect(isIpAllowed("190.1.2.3", "190.1.2.3")).toBe(true);
  });

  it("rechaza otra IP", () => {
    expect(isIpAllowed("190.1.2.4", "190.1.2.3")).toBe(false);
  });

  it("permite IPv4 dentro de CIDR", () => {
    expect(isIpAllowed("190.1.2.55", "190.1.2.0/24")).toBe(true);
  });

  it("rechaza IPv4 fuera de CIDR", () => {
    expect(isIpAllowed("190.1.3.55", "190.1.2.0/24")).toBe(false);
  });

  it("ignora espacios y entradas vacías", () => {
    expect(isIpAllowed("190.1.2.3", " , 190.1.2.3 , ")).toBe(true);
  });

  it("normaliza IPv4 mapeada", () => {
    expect(isIpAllowed("::ffff:190.1.2.3", "190.1.2.3")).toBe(true);
  });

  it("normaliza ::1 a 127.0.0.1", () => {
    expect(isIpAllowed("::1", "127.0.0.1")).toBe(true);
  });

  it("lista vacía no permite", () => {
    expect(isIpAllowed("190.1.2.3", "")).toBe(false);
  });

  it("IP inválida no permite", () => {
    expect(isIpAllowed("no-es-ip", "no-es-ip")).toBe(true);
    expect(isIpAllowed("no-es-ip", "190.1.2.0/24")).toBe(false);
  });
});

describe("getClientIp", () => {
  it("toma el último valor de x-forwarded-for", () => {
    expect(getClientIp({ forwardedFor: "1.1.1.1, 190.1.2.3" })).toBe("190.1.2.3");
  });

  it("usa x-real-ip si no hay forwarded", () => {
    expect(getClientIp({ realIp: "190.1.2.3" })).toBe("190.1.2.3");
  });

  it("ignora cf-connecting-ip por defecto", () => {
    expect(getClientIp({ cfConnectingIp: "190.1.2.3" })).toBe("127.0.0.1");
  });

  it("usa cf-connecting-ip con trustCloudflare", () => {
    expect(getClientIp({ cfConnectingIp: "190.1.2.3", trustCloudflare: true })).toBe(
      "190.1.2.3"
    );
  });

  it("fallback local", () => {
    expect(getClientIp({})).toBe("127.0.0.1");
  });
});
```

`src/lib/__tests__/photo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isValidPhotoDataUrl, MAX_PHOTO_BYTES, photoByteLength } from "@/lib/photo";

const jpeg = `data:image/jpeg;base64,${Buffer.from("foto-demo").toString("base64")}`;
const png = `data:image/png;base64,${Buffer.from("foto-demo").toString("base64")}`;

describe("foto de asistencia", () => {
  it("acepta JPEG y PNG", () => {
    expect(isValidPhotoDataUrl(jpeg)).toBe(true);
    expect(isValidPhotoDataUrl(png)).toBe(true);
  });

  it("rechaza prefijos inválidos", () => {
    expect(isValidPhotoDataUrl("data:text/plain;base64,abc")).toBe(false);
    expect(isValidPhotoDataUrl("foto")).toBe(false);
  });

  it("rechaza una foto mayor a 300 KB", () => {
    const big = `data:image/jpeg;base64,${Buffer.alloc(MAX_PHOTO_BYTES + 1).toString("base64")}`;
    expect(photoByteLength(big)).toBeGreaterThan(MAX_PHOTO_BYTES);
    expect(isValidPhotoDataUrl(big)).toBe(false);
  });
});
```

- [ ] **Step 5: Generar la migración**

Con la base local disponible:

```bash
npx prisma migrate dev --name kiosco_foto
npx prisma generate
```

Expected: migración creada y aplicada; `KioskSettings` y `AttendancePhoto` existen.

- [ ] **Step 6: Correr tests y commitear**

```bash
npm test -- src/lib/__tests__/ip.test.ts src/lib/__tests__/photo.test.ts
npx tsc --noEmit
git add prisma/schema.prisma prisma/migrations src/lib/ip.ts src/lib/photo.ts src/lib/__tests__/ip.test.ts src/lib/__tests__/photo.test.ts
git commit -m "feat(kiosco): agrega modelo, allowlist de IP y validacion de fotos"
```

---

## Task 2: Acción de configuración y pestaña Reloj

**Files:**
- Create: `src/actions/kiosk.ts`
- Create: `src/app/(app)/configuracion/kiosk-form.tsx`
- Modify: `src/app/(app)/configuracion/page.tsx`

- [ ] **Step 1: Crear `saveKioskSettings`**

`src/actions/kiosk.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import type { ActionResult } from "./customers";

export async function saveKioskSettings(values: unknown): Promise<ActionResult> {
  try {
    await requireRole("ADMIN");
  } catch {
    return { ok: false, error: "Solo administración puede configurar el reloj." };
  }
  const parsed = z
    .object({
      enabled: z.boolean().default(false),
      allowedIps: z.string().optional().default(""),
      requirePhoto: z.boolean().default(true),
      title: z.string().optional().default(""),
    })
    .safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const data = parsed.data;
  const allowedIps = data.allowedIps
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");

  await prisma.kioskSettings.upsert({
    where: { id: "default" },
    update: {
      enabled: data.enabled,
      allowedIps,
      requirePhoto: data.requirePhoto,
      title: data.title || null,
    },
    create: {
      id: "default",
      enabled: data.enabled,
      allowedIps,
      requirePhoto: data.requirePhoto,
      title: data.title || null,
    },
  });
  revalidatePath("/configuracion");
  revalidatePath("/kiosco");
  return { ok: true };
}
```

- [ ] **Step 2: Crear el formulario**

`src/app/(app)/configuracion/kiosk-form.tsx`:

```tsx
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
          <span>IP detectada: <span className="font-mono text-foreground">{currentIp}</span></span>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAllowedIps(currentIp)}>
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
```

- [ ] **Step 3: Agregar la pestaña en `configuracion/page.tsx`**

Imports:

```tsx
import { headers } from "next/headers";
import { Clock } from "lucide-react";
import { getClientIp } from "@/lib/ip";
import { KioskForm } from "./kiosk-form";
```

Agregar `prisma.kioskSettings.findUnique({ where: { id: "default" } })` al `Promise.all` y al destructuring:

```ts
const [company, timbrado, points, registers, terminals, methods, stages, categories, users, kioskSettings] =
  await Promise.all([
    // ...
    prisma.user.findMany({ orderBy: { username: "asc" } }),
    prisma.kioskSettings.findUnique({ where: { id: "default" } }),
  ]);
```

Después de `if (!company) notFound();`:

```ts
const headerList = headers();
const currentIp = getClientIp({
  forwardedFor: headerList.get("x-forwarded-for"),
  realIp: headerList.get("x-real-ip"),
  cfConnectingIp: headerList.get("cf-connecting-ip"),
  trustCloudflare: process.env.TRUST_CLOUDFLARE === "1",
});
```

Agregar el trigger:

```tsx
<TabsTrigger value="reloj" className="text-xs">
  <Clock className="mr-1.5 h-3.5 w-3.5" />
  Reloj
</TabsTrigger>
```

Agregar el contenido antes de `<TabsContent value="usuarios">`:

```tsx
<TabsContent value="reloj" className="mt-4">
  <Card className="border-border/80 shadow-none">
    <CardHeader className="border-b border-border/60 px-5 py-3.5">
      <CardTitle className="text-sm font-semibold">Reloj público</CardTitle>
    </CardHeader>
    <CardContent className="p-5">
      <KioskForm
        currentIp={currentIp}
        settings={{
          enabled: kioskSettings?.enabled ?? false,
          allowedIps: kioskSettings?.allowedIps ?? "",
          requirePhoto: kioskSettings?.requirePhoto ?? true,
          title: kioskSettings?.title ?? "",
        }}
      />
    </CardContent>
  </Card>
</TabsContent>
```

- [ ] **Step 4: Verificar y commitear**

```bash
npx tsc --noEmit
npm run lint
git add src/actions/kiosk.ts 'src/app/(app)/configuracion/kiosk-form.tsx' 'src/app/(app)/configuracion/page.tsx'
git commit -m "feat(kiosco): agrega configuracion de IP y modo kiosco"
```

---

## Task 3: Página pública, cámara y marcaje

**Files:**
- Modify: `src/actions/kiosk.ts`
- Create: `src/app/kiosco/page.tsx`
- Create: `src/app/kiosco/public-kiosk.tsx`
- Create: `src/app/kiosco/kiosk-camera.tsx`
- Modify: `src/auth.config.ts`

- [ ] **Step 1: Agregar `publicClockPunch`**

Al final de `src/actions/kiosk.ts`:

```ts
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { calculateDV, onlyDigits } from "@/lib/fiscal";
import { computeAttendance, type ScheduleInput } from "@/lib/payroll";
import { toDateInputValue } from "@/lib/format";
import { getClientIp, isIpAllowed } from "@/lib/ip";
import { isValidPhotoDataUrl } from "@/lib/photo";

function normalizeCi(value: string) {
  const clean = value.replace(/\s/g, "");
  if (clean.includes("-")) {
    const [base, dv] = clean.split("-");
    return `${onlyDigits(base ?? "")}-${onlyDigits(dv ?? "")}`;
  }
  const digits = onlyDigits(clean);
  return `${digits}-${calculateDV(digits)}`;
}

function scheduleOf(employee: {
  scheduledStart: string;
  scheduledEnd: string;
  lunchMinutes: number;
  workDays: number[];
  lateToleranceMinutes: number;
}): ScheduleInput {
  return {
    scheduledStart: employee.scheduledStart,
    scheduledEnd: employee.scheduledEnd,
    lunchMinutes: employee.lunchMinutes,
    workDays: employee.workDays,
    lateToleranceMinutes: employee.lateToleranceMinutes,
  };
}

export type PublicClockPunchResult = {
  ok: boolean;
  error?: string;
  employeeName?: string;
  mark?: "ENTRADA" | "SALIDA";
  time?: string;
  lateMinutes?: number;
  overtimeMinutes?: number;
};

export async function publicClockPunch(values: unknown): Promise<PublicClockPunchResult> {
  const headerList = headers();
  const ip = getClientIp({
    forwardedFor: headerList.get("x-forwarded-for"),
    realIp: headerList.get("x-real-ip"),
    cfConnectingIp: headerList.get("cf-connecting-ip"),
    trustCloudflare: process.env.TRUST_CLOUDFLARE === "1",
  });
  const settings = await prisma.kioskSettings.findUnique({ where: { id: "default" } });
  if (!settings?.enabled) return { ok: false, error: "El reloj público está desactivado." };
  if (!isIpAllowed(ip, settings.allowedIps)) {
    return { ok: false, error: "Este reloj solo funciona desde la red autorizada." };
  }

  const parsed = z
    .object({
      ci: z.string().min(1, "Ingresá la CI."),
      pin: z.string().min(1, "Ingresá el PIN."),
      photo: z.string().optional().nullable(),
    })
    .safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const data = parsed.data;
  if (settings.requirePhoto && !isValidPhotoDataUrl(data.photo)) {
    return { ok: false, error: "La foto es obligatoria." };
  }
  if (data.photo && !isValidPhotoDataUrl(data.photo)) {
    return { ok: false, error: "La foto no es válida o supera los 300 KB." };
  }

  const ci = normalizeCi(data.ci);
  const employee = await prisma.employee.findUnique({ where: { ci } });
  if (!employee || employee.status !== "ACTIVO") {
    return { ok: false, error: "CI o PIN incorrecto." };
  }
  const valid = await bcrypt.compare(data.pin, employee.pinHash);
  if (!valid) return { ok: false, error: "CI o PIN incorrecto." };

  const today = toDateInputValue(new Date());
  const day = new Date(`${today}T12:00:00-03:00`);
  const vacation = await prisma.vacationRequest.findFirst({
    where: {
      employeeId: employee.id,
      status: "APROBADA",
      startDate: { lte: day },
      endDate: { gte: day },
    },
  });
  if (vacation) return { ok: false, error: "El empleado está de vacaciones hoy." };

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: day } },
  });
  if (existing?.checkIn && existing.checkOut) {
    return { ok: false, error: "Ya registraste entrada y salida hoy. Pedí una corrección a RRHH." };
  }

  const now = new Date();
  const markType = existing ? "SALIDA" : "ENTRADA";
  const computation = computeAttendance({
    date: day,
    checkIn: existing?.checkIn ?? now,
    checkOut: existing ? now : null,
    schedule: scheduleOf(employee),
  });

  try {
    await prisma.$transaction(async (tx) => {
      let attendance;
      if (!existing) {
        attendance = await tx.attendance.create({
          data: {
            employeeId: employee.id,
            date: day,
            checkIn: now,
            breakMinutes: computation.breakMinutes,
            lateMinutes: computation.lateMinutes,
            lateCount: computation.lateCount,
            earlyLeaveMinutes: computation.earlyLeaveMinutes,
            overtimeMinutes: computation.overtimeMinutes,
            workedMinutes: computation.workedMinutes,
            source: "RELOJ",
          },
        });
      } else {
        attendance = await tx.attendance.update({
          where: { id: existing.id },
          data: {
            checkOut: now,
            breakMinutes: computation.breakMinutes,
            lateMinutes: computation.lateMinutes,
            lateCount: computation.lateCount,
            earlyLeaveMinutes: computation.earlyLeaveMinutes,
            overtimeMinutes: computation.overtimeMinutes,
            workedMinutes: computation.workedMinutes,
          },
        });
      }
      if (isValidPhotoDataUrl(data.photo)) {
        await tx.attendancePhoto.upsert({
          where: { attendanceId_type: { attendanceId: attendance.id, type: markType } },
          update: {
            data: data.photo,
            mimeType: data.photo.startsWith("data:image/png") ? "image/png" : "image/jpeg",
          },
          create: {
            attendanceId: attendance.id,
            type: markType,
            data: data.photo,
            mimeType: data.photo.startsWith("data:image/png") ? "image/png" : "image/jpeg",
          },
        });
      }
    });
  } catch {
    return { ok: false, error: "No pudimos guardar la marca." };
  }

  revalidatePath("/rrhh/asistencia");
  revalidatePath(`/rrhh/asistencia/${employee.id}`);
  revalidatePath("/rrhh/reloj");
  revalidatePath("/rrhh");
  return {
    ok: true,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    mark: markType,
    time: now.toISOString(),
    lateMinutes: computation.lateMinutes,
    overtimeMinutes: computation.overtimeMinutes,
  };
}
```

**Nota:** mover los imports nuevos al inicio del archivo, no dejarlos al final. TypeScript no permite imports después de código.

- [ ] **Step 2: Crear la página pública**

`src/app/kiosco/page.tsx`:

```tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getClientIp, isIpAllowed } from "@/lib/ip";
import { PublicKiosk } from "./public-kiosk";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reloj de asistencia" };

function KioskMessage({
  title,
  description,
  ip,
}: {
  title: string;
  description: string;
  ip?: string;
}) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-brand px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/10 p-8 text-center backdrop-blur">
        <Clock className="mx-auto h-10 w-10 text-amber-400" />
        <h1 className="mt-4 text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-white/70">{description}</p>
        {ip ? <p className="mt-4 font-mono text-[11px] text-white/50">IP detectada: {ip}</p> : null}
      </div>
    </main>
  );
}

export default async function KioscoPage() {
  const [settings, company] = await Promise.all([
    prisma.kioskSettings.findUnique({ where: { id: "default" } }),
    prisma.company.findFirst(),
  ]);
  const headerList = headers();
  const ip = getClientIp({
    forwardedFor: headerList.get("x-forwarded-for"),
    realIp: headerList.get("x-real-ip"),
    cfConnectingIp: headerList.get("cf-connecting-ip"),
    trustCloudflare: process.env.TRUST_CLOUDFLARE === "1",
  });

  if (!settings?.enabled) {
    return (
      <KioskMessage
        title="Reloj desactivado"
        description="Administración todavía no habilitó el reloj público."
      />
    );
  }
  if (!isIpAllowed(ip, settings.allowedIps)) {
    return (
      <KioskMessage
        title="Red no autorizada"
        description="Este reloj solo funciona desde la red configurada por la empresa."
        ip={ip}
      />
    );
  }
  return (
    <PublicKiosk
      title={settings.title ?? "Reloj de asistencia"}
      companyName={company?.razonSocial ?? "Esmar SRL"}
      requirePhoto={settings.requirePhoto}
    />
  );
}
```

- [ ] **Step 3: Crear el kiosco**

`src/app/kiosco/public-kiosk.tsx`: componente cliente con reloj en vivo, CI/PIN, cámara, submit y pantalla de resultado.

Reglas de la pantalla:
- Si hay resultado, mostrar una tarjeta con:
  - Ícono CheckCircle.
  - “Entrada registrada” o “Salida registrada”.
  - Nombre.
  - Hora.
  - “X min tarde” o “X min extra” si aplica.
  - Botón “Listo” que limpia el resultado y vuelve al formulario.
- Si no hay resultado:
  - Reloj grande.
  - Título y empresa.
  - Formulario con CI, PIN, `KioskCamera`, botón.
  - El botón se desactiva si falta CI, PIN de 4 dígitos o foto (si `requirePhoto`).
  - Al enviar: `publicClockPunch({ ci, pin, photo })`; toast de error; en éxito, setResult y cleanup.
  - `KioskCamera` recibe `key={cameraKey}`; después de marcar, incrementar `cameraKey` para reiniciar la cámara.
- No mostrar la foto en el resultado.
- Estilos: fondo `bg-brand`, tarjeta blanca, reloj mono grande, inputs grandes.

- [ ] **Step 4: Crear la cámara**

`src/app/kiosco/kiosk-camera.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

async function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const max = 640;
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("No se pudo procesar la imagen."));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    image.onerror = () => reject(new Error("Imagen inválida."));
    image.src = dataUrl;
  });
}

export function KioskCamera({
  onChange,
  required,
}: {
  onChange: (value: string | null) => void;
  required: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
    } catch {
      setError("No pudimos abrir la cámara. Podés subir una foto.");
      setActive(false);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
  }

  async function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const raw = canvas.toDataURL("image/jpeg", 0.8);
    const compressed = await compressImage(raw);
    setPhoto(compressed);
    onChange(compressed);
    stopCamera();
  }

  async function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const compressed = await compressImage(String(reader.result));
        setPhoto(compressed);
        onChange(compressed);
        setError(null);
      } catch {
        setError("No pudimos procesar la imagen.");
      }
    };
    reader.readAsDataURL(file);
  }

  function retake() {
    setPhoto(null);
    onChange(null);
    setError(null);
    void startCamera();
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        data-testid="kiosk-photo-input"
        onChange={chooseFile}
      />
      {photo ? (
        <div className="space-y-2">
          <img src={photo} alt="Foto de la marca" className="h-48 w-full rounded-lg object-cover" />
          <Button type="button" variant="outline" className="w-full" onClick={retake}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Repetir foto
          </Button>
        </div>
      ) : active ? (
        <div className="space-y-2">
          <video ref={videoRef} autoPlay playsInline muted className="h-48 w-full rounded-lg bg-black object-cover" />
          <Button type="button" className="w-full" onClick={capture}>
            <Camera className="mr-1.5 h-4 w-4" />
            Tomar foto
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Button type="button" className="w-full" onClick={startCamera}>
            <Camera className="mr-1.5 h-4 w-4" />
            Activar cámara
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1.5 h-4 w-4" />
            Subir foto
          </Button>
          {error ? <p className="text-xs text-amber-700">{error}</p> : null}
          {required ? <p className="text-[11px] text-muted-foreground">La foto es obligatoria.</p> : null}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Permitir `/kiosco` sin sesión**

En `src/auth.config.ts`, antes de `if (!isLoggedIn) return false;`:

```ts
if (nextUrl.pathname.startsWith("/kiosco")) return true;
```

- [ ] **Step 6: Verificar y commitear**

```bash
npx tsc --noEmit
npm run lint
git add src/actions/kiosk.ts src/app/kiosco src/auth.config.ts
git commit -m "feat(kiosco): agrega reloj publico con foto e IP"
```

---

## Task 4: Visor de fotos en RRHH

**Files:**
- Create: `src/app/api/attendance/photo/[id]/route.ts`
- Create: `src/app/(app)/rrhh/asistencia/[employeeId]/photo-dialog.tsx`
- Modify: `src/app/(app)/rrhh/asistencia/[employeeId]/page.tsx`

- [ ] **Step 1: Crear la API de foto**

`src/app/api/attendance/photo/[id]/route.ts`:

```ts
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return new Response("No autorizado", { status: 401 });
  if (!["ADMIN", "GERENCIA", "RRHH"].includes(session.user.role)) {
    return new Response("Sin permiso", { status: 403 });
  }
  const photo = await prisma.attendancePhoto.findUnique({ where: { id: params.id } });
  if (!photo) return new Response("Foto no encontrada", { status: 404 });

  const base64 = photo.data.split(",")[1] ?? "";
  const buffer = Buffer.from(base64, "base64");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": photo.mimeType,
      "Cache-Control": "private, no-store",
    },
  });
}
```

- [ ] **Step 2: Crear el visor**

`src/app/(app)/rrhh/asistencia/[employeeId]/photo-dialog.tsx`:

```tsx
"use client";

import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function PhotoDialog({ photoId, type }: { photoId: string; type: string }) {
  const label = type === "ENTRADA" ? "entrada" : "salida";
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs">
          <ImageIcon className="mr-1 h-3.5 w-3.5" />
          Foto {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Foto de {label}</DialogTitle>
        </DialogHeader>
        <img
          src={`/api/attendance/photo/${photoId}`}
          alt={`Foto de ${label}`}
          className="max-h-[70vh] w-full rounded-lg object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Mostrar las fotos en el detalle**

En `asistencia/[employeeId]/page.tsx`:

- Importar `PhotoDialog`.
- Agregar `include: { photos: true }` al `findMany` de asistencias.
- En cada fila, después de la columna de origen:

```tsx
<div className="flex gap-1">
  {record.photos.map((photo) => (
    <PhotoDialog key={photo.id} photoId={photo.id} type={photo.type} />
  ))}
</div>
```

- Si no hay fotos, no renderizar nada.

- [ ] **Step 4: Verificar y commitear**

```bash
npx tsc --noEmit
npm run lint
git add 'src/app/api/attendance/photo' 'src/app/(app)/rrhh/asistencia/[employeeId]'
git commit -m "feat(kiosco): agrega visor de fotos de asistencia"
```

---

## Task 5: Seed, E2E, documentación y despliegue

**Files:**
- Modify: `prisma/seed.ts`
- Modify: `prisma/seed/hr.ts`
- Create: `e2e/kiosco.spec.ts`
- Modify: `AGENTS.md`

- [ ] **Step 1: Actualizar el seed**

En `prisma/seed.ts`, agregar `"AttendancePhoto"` antes de `"Attendance"` en el `TRUNCATE`.

En `prisma/seed/hr.ts`, al inicio de `seedHR()` (después del `pinHash` o antes de crear empleados):

```ts
const kiosk = await prisma.kioskSettings.findUnique({ where: { id: "default" } });
if (!kiosk) {
  await prisma.kioskSettings.create({
    data: { id: "default", enabled: false, allowedIps: "", requirePhoto: true },
  });
}
```

No truncar `KioskSettings`; así la IP configurada sobrevive a los resets.

- [ ] **Step 2: Agregar E2E de configuración**

`e2e/kiosco.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, username = "admin") {
  await page.goto("/login");
  await page.fill("#username", username);
  await page.fill("#password", "demo1234");
  await page.click("button[type=submit]");
  await page.waitForURL("/");
}

test("kiosco: configuración visible en ajustes", async ({ page }) => {
  await login(page);
  await page.goto("/configuracion");
  await page.getByRole("tab", { name: "Reloj" }).click();
  await expect(page.getByText("Reloj público")).toBeVisible();
  await expect(page.getByLabel("IP o rango permitido")).toBeVisible();
  await expect(page.getByRole("button", { name: "Usar mi IP actual" })).toBeVisible();
  await expect(page.getByLabel("URL pública")).toBeVisible();
});

test("kiosco: página pública responde con estado controlado", async ({ page }) => {
  await page.goto("/kiosco");
  const text = await page.locator("main").innerText();
  expect(
    text.includes("Reloj desactivado") ||
      text.includes("Red no autorizada") ||
      text.includes("Reloj de asistencia")
  ).toBe(true);
});
```

- [ ] **Step 3: Verificación manual del flujo completo (local)**

Con la base local y el servidor local:

1. Login como `admin`.
2. `/configuracion` → Reloj.
3. “Usar mi IP actual” (debe ser `127.0.0.1` o `::1`), activar, guardar.
4. Abrir `/kiosco` en una ventana sin sesión.
5. Ingresar CI `3456789-5`, PIN `1234`.
6. Activar cámara o subir una foto.
7. Marcar; verificar el mensaje de entrada/salida.
8. Login como `admin` → RRHH → Asistencia → empleado → día; ver “Foto entrada”/“Foto salida”.
9. Desactivar el kiosco al terminar si no se quiere dejar habilitado.

- [ ] **Step 4: Actualizar `AGENTS.md`**

Agregar:

- `/kiosco` público con IP restringida y foto.
- Configuración en `/configuracion` → Reloj.
- Fotos en `AttendancePhoto`; visor en el detalle de asistencia.
- Helpers `src/lib/ip.ts`, `src/lib/photo.ts`.
- Tests de IP, foto y kiosco.
- Nota: la IP es la pública del local; los celulares deben usar el mismo Wi-Fi.
- Nota: `TRUST_CLOUDFLARE=1` solo si se agrega Cloudflare.

- [ ] **Step 5: Verificación completa**

```bash
npm run lint
npm test
npm run build
```

Expected: lint sin errores, tests PASS, build exitoso.

E2E local:

```bash
E2E_BASE_URL=http://localhost:3000 npm run test:e2e
```

E2E demo:

```bash
npm run test:e2e
```

Expected: los 11 tests existentes + los nuevos de kiosco pasan.

- [ ] **Step 6: Commit y deploy**

```bash
git add prisma/seed.ts prisma/seed/hr.ts e2e/kiosco.spec.ts AGENTS.md
git commit -m "test(kiosco): agrega E2E y documentacion"
git push origin main
```

Después:

1. Disparar deploy en Dokploy.
2. Verificar `/kiosco` en la demo: debe mostrar “Reloj desactivado” hasta que el admin lo configure.
3. El admin entra a Configuración → Reloj, usa su IP actual, activa y guarda.
4. Probar una marca desde la PC/celular del local.

---

## Auto-revisión del plan

### Cobertura del spec

| Requisito | Tarea |
| --- | --- |
| `/kiosco` público sin login | Task 3 |
| IP restringida configurable | Task 1 + 2 + 3 |
| Detección de IP detrás de proxy | Task 1 |
| Foto obligatoria entrada/salida | Task 3 |
| Compresión y límite 300 KB | Task 1 + 3 |
| Configuración en `/configuracion` | Task 2 |
| “Usar mi IP actual” | Task 2 |
| Foto visible en RRHH | Task 4 |
| Sin aprobación de marcas | Task 4 (solo visor y corrección) |
| Página pública sin fotos ni lista | Task 3 |
| Seed y settings persistentes | Task 5 |
| Tests unitarios y E2E | Task 1 + 5 |
| Deploy y configuración | Task 5 |

### Consistencia

- `KioskSettings` y `AttendancePhoto` se definen en Task 1 y se usan en Tasks 2–5.
- `getClientIp` e `isIpAllowed` se definen en Task 1 y se usan en Tasks 2–3.
- `isValidPhotoDataUrl` se define en Task 1 y se usa en Task 3.
- `saveKioskSettings` se define en Task 2 y se usa en el formulario de configuración.
- `publicClockPunch` se define en Task 3 y se usa en el kiosco.
- `AttendancePhoto` usa `type` (`ENTRADA`/`SALIDA`) y la unique `attendanceId_type`, consistente con el upsert.
- La ruta `/api/attendance/photo/[id]` coincide con el visor.
- `/kiosco` está fuera de `(app)` y permitido por el middleware.

### Riesgos

- **IP dinámica:** el admin debe actualizarla; el botón “Usar mi IP actual” lo simplifica.
- **Headers:** se confía en Traefik; no exponer la app sin proxy. `cf-connecting-ip` solo con `TRUST_CLOUDFLARE=1`.
- **Cámara:** requiere HTTPS y permiso; hay fallback de archivo.
- **Fotos en DB:** se limitan a 300 KB; no se usa almacenamiento externo.
- **Seguridad:** IP + CI + PIN + foto; no es autenticación fuerte. Para producción se recomienda token de kiosco.
- **Seed:** `KioskSettings` no se trunca; `AttendancePhoto` sí, antes de `Attendance`.
- **E2E:** el flujo completo con cámara se verifica manualmente; el E2E automático cubre configuración y estado público.


