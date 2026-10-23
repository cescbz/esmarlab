const TZ = "America/Asuncion";

const gsFormatter = new Intl.NumberFormat("es-PY", {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("es-PY", {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function formatGs(value: number | string | bigint | null | undefined): string {
  const n = toNumber(value);
  return `Gs. ${gsFormatter.format(n)}`;
}

export function formatGsCompact(value: number | string | bigint | null | undefined): string {
  const n = toNumber(value);
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) {
    return `Gs. ${(n / 1_000_000_000).toLocaleString("es-PY", {
      maximumFractionDigits: 1,
    })} mil M`;
  }
  if (abs >= 1_000_000) {
    return `Gs. ${(n / 1_000_000).toLocaleString("es-PY", {
      maximumFractionDigits: 1,
    })} M`;
  }
  if (abs >= 100_000) {
    return `Gs. ${(n / 1000).toLocaleString("es-PY", {
      maximumFractionDigits: 0,
    })} mil`;
  }
  return formatGs(n);
}

export function formatNumber(value: number | string | bigint | null | undefined): string {
  return numberFormatter.format(toNumber(value));
}

export function parseGs(value: string): number {
  const clean = value.replace(/[^\d-]/g, "");
  return clean ? Number(clean) : 0;
}

export function toNumber(value: number | string | bigint | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "bigint") return Number(value);
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-PY", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-PY", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-PY", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function toDateInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function todayInAsuncion(): Date {
  return new Date(`${toDateInputValue(new Date())}T12:00:00-03:00`);
}

export function addDays(value: Date, days: number): Date {
  const d = new Date(value);
  d.setDate(d.getDate() + days);
  return d;
}

export function monthName(monthIndex: number): string {
  return [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ][monthIndex] ?? "";
}

export function relativeDays(value: Date | string): number {
  const date = typeof value === "string" ? new Date(value) : value;
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function pct(value: number, total: number): number {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}
