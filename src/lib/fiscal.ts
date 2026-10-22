import { toDateInputValue } from "./format";

export type IvaRate = 10 | 5 | 0;

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function calculateDV(input: string, baseMax = 11): number {
  if (!input) return 0;
  const normalized = input
    .toUpperCase()
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      return code >= 48 && code <= 57 ? char : String(code);
    })
    .join("");

  let k = 2;
  let total = 0;

  for (let i = normalized.length - 1; i >= 0; i--) {
    if (k > baseMax) k = 2;
    total += Number(normalized[i]) * k;
    k += 1;
  }

  const rest = total % 11;
  return rest > 1 ? 11 - rest : 0;
}

export function withDV(ruc: string): string {
  const base = onlyDigits(ruc);
  if (!base) return "";
  return `${base}-${calculateDV(base)}`;
}

export function isValidRuc(ruc: string): boolean {
  const cleaned = ruc.replace(/\./g, "").replace(/\s/g, "");
  const [base, dv] = cleaned.split("-");
  if (!base || dv === undefined) return false;
  if (!/^\d{5,8}$/.test(base)) return false;
  if (!/^\d$/.test(dv)) return false;
  return calculateDV(base) === Number(dv);
}

export function formatRuc(base: string, dv?: string | null): string {
  if (!base) return "—";
  if (dv === undefined || dv === null) {
    return withDV(base);
  }
  return `${onlyDigits(base)}-${dv}`;
}

export function calcTax(total: number, rate: IvaRate): { gravada: number; iva: number; exenta: number } {
  const amount = Math.round(total);
  if (rate === 0) return { gravada: 0, iva: 0, exenta: amount };
  const divisor = rate === 10 ? 11 : 21;
  const gravada = Math.round(amount / (1 + rate / 100));
  const iva = Math.round(amount / divisor);
  return { gravada, iva, exenta: 0 };
}

export function calcInvoiceTotals(
  lines: { total: number; rate: IvaRate }[]
): {
  gravada10: number;
  iva10: number;
  gravada5: number;
  iva5: number;
  exenta: number;
  total: number;
} {
  let gravada10 = 0;
  let iva10 = 0;
  let gravada5 = 0;
  let iva5 = 0;
  let exenta = 0;
  let total = 0;

  for (const line of lines) {
    const calc = calcTax(line.total, line.rate);
    total += Math.round(line.total);
    if (line.rate === 10) {
      gravada10 += calc.gravada;
      iva10 += calc.iva;
    } else if (line.rate === 5) {
      gravada5 += calc.gravada;
      iva5 += calc.iva;
    } else {
      exenta += calc.exenta;
    }
  }

  return {
    gravada10,
    iva10,
    gravada5,
    iva5,
    exenta,
    total: Math.round(total),
  };
}

export function pad(value: number | string, length: number): string {
  return String(value).padStart(length, "0");
}

export function formatDocNumber(establecimiento: string, punto: string, numero: number | string): string {
  return `${pad(onlyDigits(establecimiento), 3)}-${pad(onlyDigits(punto), 3)}-${pad(numero, 7)}`;
}

export type CdcInput = {
  tipoDocumento: string;
  ruc: string;
  dv: string;
  establecimiento: string;
  punto: string;
  numero: number | string;
  tipoContribuyente?: string;
  fecha: Date;
  tipoEmision?: string;
  codigoSeguridad?: string;
};

export function buildCdc(input: CdcInput): string {
  const tipoDocumento = pad(onlyDigits(input.tipoDocumento), 2);
  const ruc = pad(onlyDigits(input.ruc), 8).slice(-8);
  const dv = pad(onlyDigits(input.dv), 1);
  const establecimiento = pad(onlyDigits(input.establecimiento), 3);
  const punto = pad(onlyDigits(input.punto), 3);
  const numero = pad(onlyDigits(String(input.numero)), 7);
  const tipoContribuyente = pad(onlyDigits(input.tipoContribuyente ?? "1"), 1);
  const fecha = toDateInputValue(input.fecha).replace(/-/g, "");
  const tipoEmision = pad(onlyDigits(input.tipoEmision ?? "1"), 1);
  const seguridad =
    input.codigoSeguridad ??
    String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, "0");

  const first43 = `${tipoDocumento}${ruc}${dv}${establecimiento}${punto}${numero}${tipoContribuyente}${fecha}${tipoEmision}${seguridad}`;
  const check = calculateDV(first43);
  return `${first43}${check}`;
}

export function formatCdc(cdc: string | null | undefined): string {
  if (!cdc) return "—";
  return cdc.match(/.{1,4}/g)?.join(" ") ?? cdc;
}

export function nextDocumentNumber(lastNumber: number): number {
  return lastNumber + 1;
}

export function ivaLabel(rate: number): string {
  if (rate === 10) return "Gravada 10%";
  if (rate === 5) return "Gravada 5%";
  return "Exenta";
}

export const IVA_OPTIONS: { value: IvaRate; label: string }[] = [
  { value: 10, label: "IVA 10%" },
  { value: 5, label: "IVA 5%" },
  { value: 0, label: "Exento" },
];

export function validityDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
