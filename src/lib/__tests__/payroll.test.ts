import { describe, expect, it } from "vitest";
import {
  aguinaldoAmount,
  buildPayrollItem,
  computeAttendance,
  countWorkdays,
  expectedWorkdays,
  isoWeekday,
  payrollTotals,
  vacationEntitlement,
  type PayrollEmployeeInput,
} from "@/lib/payroll";

const schedule = {
  scheduledStart: "07:30",
  scheduledEnd: "17:00",
  lunchMinutes: 60,
  workDays: [1, 2, 3, 4, 5],
  lateToleranceMinutes: 10,
};

const baseEmployee: PayrollEmployeeInput = {
  id: "emp_1",
  payType: "MENSUAL",
  monthlySalary: 5_500_000,
  dailyRate: null,
  pieceRate: null,
  hireDate: new Date("2016-03-12T12:00:00-03:00"),
  endDate: null,
  ...schedule,
};

function at(day: number, hour: number, minute = 0) {
  return new Date(
    `2026-10-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(
      minute
    ).padStart(2, "0")}:00-03:00`
  );
}

function attendance(
  day: number,
  checkIn: Date | null,
  checkOut: Date | null,
  lateMinutes = 0,
  overtimeMinutes = 0
) {
  return { date: at(day, 12), checkIn, checkOut, lateMinutes, overtimeMinutes };
}

describe("jornada y asistencia", () => {
  it("calcula el día de la semana ISO", () => {
    expect(isoWeekday(at(19, 12))).toBe(1);
    expect(isoWeekday(at(25, 12))).toBe(7);
  });

  it("no marca tardanza dentro de la tolerancia", () => {
    const result = computeAttendance({
      date: at(19, 12),
      checkIn: at(19, 7, 35),
      checkOut: at(19, 17, 5),
      schedule,
    });
    expect(result.lateMinutes).toBe(0);
    expect(result.workedMinutes).toBe(510);
    expect(result.overtimeMinutes).toBe(0);
  });

  it("marca tardanza y horas extras", () => {
    const result = computeAttendance({
      date: at(19, 12),
      checkIn: at(19, 7, 45),
      checkOut: at(19, 17, 30),
      schedule,
    });
    expect(result.lateMinutes).toBe(5);
    expect(result.lateCount).toBe(1);
    expect(result.workedMinutes).toBe(525);
    expect(result.overtimeMinutes).toBe(15);
  });

  it("considera día no laboral y paga todo como extra", () => {
    const result = computeAttendance({
      date: at(25, 12),
      checkIn: at(25, 8),
      checkOut: at(25, 12),
      schedule,
    });
    expect(result.isWorkday).toBe(false);
    expect(result.overtimeMinutes).toBe(240);
  });

  it("marca incompleta si falta la salida", () => {
    const result = computeAttendance({
      date: at(19, 12),
      checkIn: at(19, 8),
      checkOut: null,
      schedule,
    });
    expect(result.incomplete).toBe(true);
    expect(result.workedMinutes).toBe(0);
    expect(result.lateMinutes).toBe(20);
  });

  it("cuenta días laborales y días esperados", () => {
    expect(
      countWorkdays(
        new Date("2026-10-01T12:00:00-03:00"),
        new Date("2026-10-31T12:00:00-03:00"),
        [1, 2, 3, 4, 5, 6]
      )
    ).toBe(27);
    expect(
      expectedWorkdays({
        periodStart: new Date("2026-10-01T12:00:00-03:00"),
        periodEnd: new Date("2026-10-31T12:00:00-03:00"),
        hireDate: new Date("2026-10-15T12:00:00-03:00"),
        endDate: null,
        workDays: [1, 2, 3, 4, 5, 6],
        asOf: new Date("2026-10-31T12:00:00-03:00"),
      })
    ).toBe(15);
  });
});

describe("vacaciones", () => {
  it("calcula días por antigüedad", () => {
    expect(vacationEntitlement(new Date("2016-03-12T12:00:00-03:00"), 2026)).toBe(30);
    expect(vacationEntitlement(new Date("2019-01-15T12:00:00-03:00"), 2026)).toBe(18);
    expect(vacationEntitlement(new Date("2024-08-01T12:00:00-03:00"), 2026)).toBe(12);
    expect(vacationEntitlement(new Date("2026-03-01T12:00:00-03:00"), 2026)).toBe(9);
  });

  it("respeta el override", () => {
    expect(vacationEntitlement(new Date("2024-08-01T12:00:00-03:00"), 2026, 20)).toBe(20);
  });
});

describe("liquidación mensual", () => {
  it("calcula sueldo, tardanza, ausencia, extra e IPS", () => {
    const item = buildPayrollItem({
      employee: baseEmployee,
      periodStart: new Date("2026-10-19T12:00:00-03:00"),
      periodEnd: new Date("2026-10-23T23:59:59-03:00"),
      asOf: new Date("2026-10-23T23:59:59-03:00"),
      attendance: [
        attendance(19, at(19, 7, 45), at(19, 18, 15), 5, 60),
        attendance(20, at(20, 7, 30), at(20, 17), 0, 0),
        attendance(21, at(21, 7, 30), at(21, 17), 0, 0),
        attendance(22, at(22, 7, 30), at(22, 17), 0, 0),
      ],
      pieces: [],
      vacationDays: 0,
    });
    expect(item.workedDays).toBe(4);
    expect(item.absenceDays).toBe(1);
    expect(item.baseAmount).toBe(5_500_000);
    expect(item.extraAmount).toBe(32_353);
    expect(item.lateDeduction).toBe(1_797);
    expect(item.absenceDeduction).toBe(183_333);
    expect(item.grossAmount).toBe(5_532_353);
    expect(item.ipsEmployee).toBe(497_912);
    expect(item.netAmount).toBe(4_849_311);
  });

  it("calcula jornal y vacaciones pagas", () => {
    const item = buildPayrollItem({
      employee: { ...baseEmployee, payType: "JORNAL", monthlySalary: null, dailyRate: 150_000 },
      periodStart: new Date("2026-10-19T12:00:00-03:00"),
      periodEnd: new Date("2026-10-23T23:59:59-03:00"),
      asOf: new Date("2026-10-23T23:59:59-03:00"),
      attendance: [19, 20, 21, 22].map((day) =>
        attendance(day, at(day, 7, 30), at(day, 17), 0, 0)
      ),
      pieces: [],
      vacationDays: 1,
    });
    expect(item.baseAmount).toBe(600_000);
    expect(item.vacationAmount).toBe(150_000);
    expect(item.grossAmount).toBe(750_000);
    expect(item.ipsEmployee).toBe(67_500);
    expect(item.netAmount).toBe(682_500);
  });

  it("calcula destajo por unidades", () => {
    const item = buildPayrollItem({
      employee: {
        ...baseEmployee,
        payType: "DESTAJO",
        monthlySalary: null,
        dailyRate: 150_000,
        pieceRate: 12_000,
      },
      periodStart: new Date("2026-10-19T12:00:00-03:00"),
      periodEnd: new Date("2026-10-23T23:59:59-03:00"),
      asOf: new Date("2026-10-23T23:59:59-03:00"),
      attendance: [19, 20, 21, 22, 23].map((day) =>
        attendance(day, at(day, 7, 30), at(day, 17), 0, 0)
      ),
      pieces: [{ quantity: 500, unitRate: 12_000 }],
      vacationDays: 0,
    });
    expect(item.baseAmount).toBe(6_000_000);
    expect(item.grossAmount).toBe(6_000_000);
    expect(item.ipsEmployee).toBe(540_000);
    expect(item.netAmount).toBe(5_460_000);
  });

  it("calcula mixto con sueldo y destajo", () => {
    const item = buildPayrollItem({
      employee: { ...baseEmployee, payType: "MIXTO", monthlySalary: 3_200_000, pieceRate: 6_000 },
      periodStart: new Date("2026-10-19T12:00:00-03:00"),
      periodEnd: new Date("2026-10-23T23:59:59-03:00"),
      asOf: new Date("2026-10-23T23:59:59-03:00"),
      attendance: [19, 20, 21, 22, 23].map((day) =>
        attendance(day, at(day, 7, 30), at(day, 17), 0, 0)
      ),
      pieces: [{ quantity: 400, unitRate: 6_000 }],
      vacationDays: 0,
    });
    expect(item.baseAmount).toBe(5_600_000);
    expect(item.grossAmount).toBe(5_600_000);
    expect(item.ipsEmployee).toBe(504_000);
    expect(item.netAmount).toBe(5_096_000);
  });

  it("paga al 100% las horas en día no laboral", () => {
    const item = buildPayrollItem({
      employee: { ...baseEmployee, payType: "JORNAL", monthlySalary: null, dailyRate: 150_000 },
      periodStart: new Date("2026-10-19T12:00:00-03:00"),
      periodEnd: new Date("2026-10-25T23:59:59-03:00"),
      asOf: new Date("2026-10-25T23:59:59-03:00"),
      attendance: [
        ...[19, 20, 21, 22, 23].map((day) =>
          attendance(day, at(day, 7, 30), at(day, 17), 0, 0)
        ),
        attendance(25, at(25, 8), at(25, 12), 0, 240),
      ],
      pieces: [],
      vacationDays: 0,
    });
    expect(item.extraMinutes).toBe(240);
    expect(item.extraAmount).toBe(141_176);
    expect(item.grossAmount).toBe(891_176);
    expect(item.netAmount).toBe(810_970);
  });

  it("topa el descuento por tardanza a un día", () => {
    const item = buildPayrollItem({
      employee: baseEmployee,
      periodStart: new Date("2026-10-19T12:00:00-03:00"),
      periodEnd: new Date("2026-10-23T23:59:59-03:00"),
      asOf: new Date("2026-10-23T23:59:59-03:00"),
      attendance: [
        attendance(19, at(19, 7, 30), at(19, 17), 1_000, 0),
        attendance(20, at(20, 7, 30), at(20, 17), 0, 0),
        attendance(21, at(21, 7, 30), at(21, 17), 0, 0),
        attendance(22, at(22, 7, 30), at(22, 17), 0, 0),
        attendance(23, at(23, 7, 30), at(23, 17), 0, 0),
      ],
      pieces: [],
      vacationDays: 0,
    });
    expect(item.lateDeduction).toBe(183_333);
  });

  it("permite detectar un neto negativo", () => {
    const item = buildPayrollItem({
      employee: baseEmployee,
      periodStart: new Date("2026-10-19T12:00:00-03:00"),
      periodEnd: new Date("2026-10-23T23:59:59-03:00"),
      asOf: new Date("2026-10-23T23:59:59-03:00"),
      attendance: [19, 20, 21, 22, 23].map((day) =>
        attendance(day, at(day, 7, 30), at(day, 17), 0, 0)
      ),
      pieces: [],
      vacationDays: 0,
      otherDeductions: 9_000_000,
    });
    expect(item.netAmount).toBeLessThan(0);
  });

  it("suma totales del período", () => {
    const item = buildPayrollItem({
      employee: baseEmployee,
      periodStart: new Date("2026-10-19T12:00:00-03:00"),
      periodEnd: new Date("2026-10-23T23:59:59-03:00"),
      asOf: new Date("2026-10-23T23:59:59-03:00"),
      attendance: [19, 20, 21, 22, 23].map((day) =>
        attendance(day, at(day, 7, 30), at(day, 17), 0, 0)
      ),
      pieces: [],
      vacationDays: 0,
    });
    expect(payrollTotals([item]).netTotal).toBe(item.netAmount);
  });
});

describe("aguinaldo", () => {
  it("calcula 1/12 de lo ganado", () => {
    expect(aguinaldoAmount(60_000_000)).toBe(5_000_000);
  });
});
