import { toDateInputValue } from "./format";

export function reportRange(searchParams: { desde?: string; hasta?: string }) {
  const today = toDateInputValue(new Date());
  const defaultFrom = `${today.slice(0, 8)}01`;
  const desde = searchParams.desde || defaultFrom;
  const hasta = searchParams.hasta || today;
  return {
    desde,
    hasta,
    desdeDate: new Date(`${desde}T00:00:00-03:00`),
    hastaDate: new Date(`${hasta}T23:59:59-03:00`),
  };
}

export function lastMonths(count = 12): { key: string; label: string; start: Date; end: Date }[] {
  const now = new Date();
  const months: { key: string; label: string; start: Date; end: Date }[] = [];
  const names = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  for (let offset = count - 1; offset >= 0; offset--) {
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0, 23, 59, 59);
    months.push({
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      label: `${names[start.getMonth()]} ${String(start.getFullYear()).slice(2)}`,
      start,
      end,
    });
  }
  return months;
}

export function monthKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}
