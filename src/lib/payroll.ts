export const PAYROLL_TZ = "America/Asuncion";

export type PayTypeValue = "MENSUAL" | "JORNAL" | "DESTAJO" | "MIXTO";

export type ScheduleInput = {
  scheduledStart: string;
  scheduledEnd: string;
  lunchMinutes: number;
  workDays: number[];
  lateToleranceMinutes: number;
};

export type AttendanceLike = {
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  lateMinutes: number;
  overtimeMinutes: number;
};

export type PieceworkLike = {
  quantity: number;
  unitRate: number;
};

export type PayrollEmployeeInput = {
  id: string;
  payType: PayTypeValue;
  monthlySalary: number | null;
  dailyRate: number | null;
  pieceRate: number | null;
  hireDate: Date;
  endDate: Date | null;
  scheduledStart: string;
  scheduledEnd: string;
  lunchMinutes: number;
  workDays: number[];
  lateToleranceMinutes: number;
};

export type BuildPayrollItemInput = {
  employee: PayrollEmployeeInput;
  periodStart: Date;
  periodEnd: Date;
  asOf?: Date;
  attendance: AttendanceLike[];
  pieces: PieceworkLike[];
  vacationDays: number;
  otherEarnings?: number;
  otherDeductions?: number;
  notes?: string | null;
};

export type PayrollItemComputation = {
  payType: PayTypeValue;
  baseAmount: number;
  workedDays: number;
  pieceUnits: number;
  pieceAmount: number;
  extraMinutes: number;
  extraAmount: number;
  lateMinutes: number;
  lateDeduction: number;
  absenceDays: number;
  absenceDeduction: number;
  vacationDays: number;
  vacationAmount: number;
  otherEarnings: number;
  otherDeductions: number;
  grossAmount: number;
  ipsBase: number;
  ipsEmployee: number;
  ipsEmployer: number;
  netAmount: number;
  concepts: Record<string, unknown>;
  notes: string | null;
};

function dateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PAYROLL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dateFromKey(key: string): Date {
  return new Date(`${key}T12:00:00-03:00`);
}

function addDaysToKey(key: string, days: number): string {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function weekdayFromKey(key: string): number {
  const day = new Date(`${key}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

function dateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PAYROLL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  return { year: get("year"), month: get("month"), day: get("day") };
}

function fullMonthsBetween(from: Date, to: Date): number {
  const a = dateParts(from);
  const b = dateParts(to);
  let months = (b.year - a.year) * 12 + (b.month - a.month);
  if (b.day < a.day) months -= 1;
  return Math.max(0, months);
}

export function minutesOfDay(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: PAYROLL_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function isoWeekday(date: Date): number {
  return weekdayFromKey(dateKey(date));
}

export function isWorkday(date: Date, workDays: number[]): boolean {
  return workDays.includes(isoWeekday(date));
}

export function scheduledMinutes(
  schedule: Pick<ScheduleInput, "scheduledStart" | "scheduledEnd" | "lunchMinutes">
): number {
  return Math.max(
    0,
    parseTimeToMinutes(schedule.scheduledEnd) -
      parseTimeToMinutes(schedule.scheduledStart) -
      schedule.lunchMinutes
  );
}

export type AttendanceComputation = {
  isWorkday: boolean;
  lateMinutes: number;
  lateCount: number;
  earlyLeaveMinutes: number;
  breakMinutes: number;
  workedMinutes: number;
  overtimeMinutes: number;
  incomplete: boolean;
};

export function computeAttendance(input: {
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  schedule: ScheduleInput;
}): AttendanceComputation {
  const { date, checkIn, checkOut, schedule } = input;
  const workday = isWorkday(date, schedule.workDays);
  const start = parseTimeToMinutes(schedule.scheduledStart);
  const end = parseTimeToMinutes(schedule.scheduledEnd);
  const scheduled = scheduledMinutes(schedule);

  if (!checkIn) {
    return {
      isWorkday: workday,
      lateMinutes: 0,
      lateCount: 0,
      earlyLeaveMinutes: 0,
      breakMinutes: 0,
      workedMinutes: 0,
      overtimeMinutes: 0,
      incomplete: true,
    };
  }

  const inMinutes = minutesOfDay(checkIn);
  const lateMinutes = workday ? Math.max(0, inMinutes - (start + schedule.lateToleranceMinutes)) : 0;

  if (!checkOut) {
    return {
      isWorkday: workday,
      lateMinutes,
      lateCount: lateMinutes > 0 ? 1 : 0,
      earlyLeaveMinutes: 0,
      breakMinutes: 0,
      workedMinutes: 0,
      overtimeMinutes: 0,
      incomplete: true,
    };
  }

  const outMinutes = minutesOfDay(checkOut);
  const span = Math.max(0, outMinutes - inMinutes);
  const breakMinutes = span > 360 ? schedule.lunchMinutes : 0;
  const workedMinutes = Math.max(0, span - breakMinutes);
  const earlyLeaveMinutes = workday ? Math.max(0, end - outMinutes) : 0;
  const overtimeMinutes = workday ? Math.max(0, workedMinutes - scheduled) : workedMinutes;

  return {
    isWorkday: workday,
    lateMinutes,
    lateCount: lateMinutes > 0 ? 1 : 0,
    earlyLeaveMinutes,
    breakMinutes,
    workedMinutes,
    overtimeMinutes,
    incomplete: false,
  };
}

export function countWorkdays(start: Date, end: Date, workDays: number[]): number {
  const from = dateKey(start);
  const to = dateKey(end);
  if (from > to) return 0;
  let count = 0;
  let cursor = from;
  while (cursor <= to) {
    if (workDays.includes(weekdayFromKey(cursor))) count += 1;
    cursor = addDaysToKey(cursor, 1);
  }
  return count;
}

export function expectedWorkdays(input: {
  periodStart: Date;
  periodEnd: Date;
  hireDate: Date;
  endDate: Date | null;
  workDays: number[];
  asOf?: Date;
}): number {
  const from = [dateKey(input.periodStart), dateKey(input.hireDate)].sort().at(-1) as string;
  const candidates = [dateKey(input.periodEnd)];
  if (input.endDate) candidates.push(dateKey(input.endDate));
  if (input.asOf) candidates.push(dateKey(input.asOf));
  const to = candidates.sort()[0];
  if (from > to) return 0;
  return countWorkdays(dateFromKey(from), dateFromKey(to), input.workDays);
}

export function vacationEntitlement(hireDate: Date, year: number, override?: number | null): number {
  if (override !== null && override !== undefined) return Math.max(0, override);
  const end = dateFromKey(`${year}-12-31`);
  if (dateKey(hireDate) > dateKey(end)) return 0;
  const months = fullMonthsBetween(hireDate, end);
  const years = Math.floor(months / 12);
  if (years >= 10) return 30;
  if (years >= 5) return 18;
  if (years >= 1) return 12;
  return Math.min(12, months);
}

export function countVacationDays(start: Date, end: Date, workDays: number[]): number {
  return countWorkdays(start, end, workDays);
}

export function buildPayrollItem(input: BuildPayrollItemInput): PayrollItemComputation {
  const { employee } = input;
  const schedule: ScheduleInput = {
    scheduledStart: employee.scheduledStart,
    scheduledEnd: employee.scheduledEnd,
    lunchMinutes: employee.lunchMinutes,
    workDays: employee.workDays,
    lateToleranceMinutes: employee.lateToleranceMinutes,
  };
  const scheduleMins = scheduledMinutes(schedule);
  const expected = expectedWorkdays({
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    hireDate: employee.hireDate,
    endDate: employee.endDate,
    workDays: employee.workDays,
    asOf: input.asOf,
  });

  const complete = input.attendance.filter((record) => record.checkIn && record.checkOut);
  const workedDays = complete.filter((record) => isWorkday(record.date, employee.workDays)).length;
  const lateMinutes = input.attendance.reduce((sum, record) => sum + record.lateMinutes, 0);
  const workdayExtraMinutes = input.attendance
    .filter((record) => isWorkday(record.date, employee.workDays))
    .reduce((sum, record) => sum + record.overtimeMinutes, 0);
  const nonWorkdayExtraMinutes = input.attendance
    .filter((record) => !isWorkday(record.date, employee.workDays))
    .reduce((sum, record) => sum + record.overtimeMinutes, 0);
  const extraMinutes = workdayExtraMinutes + nonWorkdayExtraMinutes;
  const pieceUnits = input.pieces.reduce((sum, piece) => sum + piece.quantity, 0);
  const pieceAmount = input.pieces.reduce((sum, piece) => sum + piece.quantity * piece.unitRate, 0);
  const vacationDays = Math.max(0, input.vacationDays);
  const absenceDays = Math.max(0, expected - workedDays - vacationDays);

  const monthly = employee.monthlySalary ?? 0;
  const daily = employee.dailyRate ?? 0;
  const dailyForDeduction =
    employee.payType === "MENSUAL" || employee.payType === "MIXTO" ? monthly / 30 : daily;
  const hourly =
    scheduleMins > 0
      ? employee.payType === "MENSUAL" || employee.payType === "MIXTO"
        ? monthly / 30 / (scheduleMins / 60)
        : daily / (scheduleMins / 60)
      : 0;

  let baseAmount = 0;
  let vacationAmount = 0;

  if (employee.payType === "MENSUAL") {
    baseAmount = monthly;
  } else if (employee.payType === "JORNAL") {
    baseAmount = daily * workedDays;
    vacationAmount = daily * vacationDays;
  } else if (employee.payType === "DESTAJO") {
    baseAmount = pieceAmount;
    vacationAmount = daily * vacationDays;
  } else {
    baseAmount = monthly + pieceAmount;
  }

  const extraAmount = Math.round((hourly * (workdayExtraMinutes * 1.5 + nonWorkdayExtraMinutes * 2)) / 60);
  const lateDeduction =
    scheduleMins > 0 && dailyForDeduction > 0
      ? Math.min(
          Math.round(dailyForDeduction),
          Math.round((dailyForDeduction / scheduleMins) * lateMinutes)
        )
      : 0;
  const absenceDeduction =
    employee.payType === "MENSUAL" || employee.payType === "MIXTO"
      ? Math.round((monthly / 30) * absenceDays)
      : employee.payType === "JORNAL"
        ? daily * absenceDays
        : 0;

  const otherEarnings = Math.max(0, input.otherEarnings ?? 0);
  const otherDeductions = Math.max(0, input.otherDeductions ?? 0);
  const grossAmount = baseAmount + vacationAmount + extraAmount + otherEarnings;
  const ipsBase = grossAmount;
  const ipsEmployee = Math.round(ipsBase * 0.09);
  const ipsEmployer = Math.round(ipsBase * 0.165);
  const netAmount = grossAmount - lateDeduction - absenceDeduction - ipsEmployee - otherDeductions;

  return {
    payType: employee.payType,
    baseAmount,
    workedDays,
    pieceUnits,
    pieceAmount,
    extraMinutes,
    extraAmount,
    lateMinutes,
    lateDeduction,
    absenceDays,
    absenceDeduction,
    vacationDays,
    vacationAmount,
    otherEarnings,
    otherDeductions,
    grossAmount,
    ipsBase,
    ipsEmployee,
    ipsEmployer,
    netAmount,
    concepts: {
      scheduledMinutes: scheduleMins,
      hourlyRate: Math.round(hourly),
      dailyRateForDeduction: Math.round(dailyForDeduction),
      workdayExtraMinutes,
      nonWorkdayExtraMinutes,
      expectedWorkdays: expected,
    },
    notes: input.notes ?? null,
  };
}

export function aguinaldoAmount(totalEarned: number): number {
  return Math.round(Math.max(0, totalEarned) / 12);
}

export function payrollTotals(items: PayrollItemComputation[]) {
  return items.reduce(
    (acc, item) => ({
      grossTotal: acc.grossTotal + item.grossAmount,
      ipsEmployeeTotal: acc.ipsEmployeeTotal + item.ipsEmployee,
      ipsEmployerTotal: acc.ipsEmployerTotal + item.ipsEmployer,
      deductionsTotal:
        acc.deductionsTotal +
        item.lateDeduction +
        item.absenceDeduction +
        item.ipsEmployee +
        item.otherDeductions,
      netTotal: acc.netTotal + item.netAmount,
      extraTotal: acc.extraTotal + item.extraAmount,
      pieceTotal: acc.pieceTotal + item.pieceAmount,
      lateTotal: acc.lateTotal + item.lateDeduction,
      absenceTotal: acc.absenceTotal + item.absenceDeduction,
      vacationTotal: acc.vacationTotal + item.vacationAmount,
    }),
    {
      grossTotal: 0,
      ipsEmployeeTotal: 0,
      ipsEmployerTotal: 0,
      deductionsTotal: 0,
      netTotal: 0,
      extraTotal: 0,
      pieceTotal: 0,
      lateTotal: 0,
      absenceTotal: 0,
      vacationTotal: 0,
    }
  );
}
