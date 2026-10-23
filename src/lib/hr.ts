import { countVacationDays, vacationEntitlement } from "@/lib/payroll";

export const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function periodRange(year: number, month: number) {
  const padded = String(month).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: new Date(`${year}-${padded}-01T00:00:00-03:00`),
    end: new Date(`${year}-${padded}-${String(lastDay).padStart(2, "0")}T23:59:59-03:00`),
    label: `${MONTH_NAMES[month - 1]} ${year}`,
    number: `LIQ-${year}-${padded}`,
  };
}

export function currentPeriod() {
  const now = new Date();
  const year = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Asuncion", year: "numeric" }).format(now)
  );
  const month = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Asuncion", month: "2-digit" }).format(now)
  );
  return { year, month };
}

function overlapsYear(request: { startDate: Date; endDate: Date }, year: number) {
  const start = new Date(`${year}-01-01T00:00:00-03:00`);
  const end = new Date(`${year}-12-31T23:59:59-03:00`);
  return request.startDate <= end && request.endDate >= start;
}

export function vacationBalance(input: {
  hireDate: Date;
  year: number;
  override?: number | null;
  requests: { days: number; status: string; startDate: Date; endDate: Date }[];
}) {
  const entitlement = vacationEntitlement(input.hireDate, input.year, input.override);
  const taken = input.requests
    .filter((request) => request.status === "APROBADA" && overlapsYear(request, input.year))
    .reduce((sum, request) => sum + request.days, 0);
  const pending = input.requests
    .filter((request) => request.status === "PENDIENTE" && overlapsYear(request, input.year))
    .reduce((sum, request) => sum + request.days, 0);
  return { entitlement, taken, pending, available: Math.max(0, entitlement - taken) };
}

export { countVacationDays };
