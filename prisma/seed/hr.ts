import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { calculateDV } from "../../src/lib/fiscal";
import {
  buildPayrollItem,
  computeAttendance,
  countVacationDays,
  isWorkday,
  payrollTotals,
} from "../../src/lib/payroll";
import { chance, randInt } from "./helpers";

const prisma = new PrismaClient();

const MONTH_NAMES = [
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

type EmployeeSeed = {
  code: string;
  firstName: string;
  lastName: string;
  ciBase: string;
  position: string;
  department: string;
  workshopId: string | null;
  hireDate: string;
  payType: "MENSUAL" | "JORNAL" | "DESTAJO" | "MIXTO";
  monthlySalary: number | null;
  dailyRate: number | null;
  pieceRate: number | null;
  scheduledStart: string;
  scheduledEnd: string;
};

const EMPLOYEES: EmployeeSeed[] = [
  {
    code: "EMP-0001",
    firstName: "Ramona",
    lastName: "Cáceres",
    ciBase: "3456789",
    position: "Costurera",
    department: "Producción",
    workshopId: "taller_2",
    hireDate: "2018-03-12",
    payType: "JORNAL",
    monthlySalary: null,
    dailyRate: 150_000,
    pieceRate: null,
    scheduledStart: "07:00",
    scheduledEnd: "16:00",
  },
  {
    code: "EMP-0002",
    firstName: "Derlis",
    lastName: "Aquino",
    ciBase: "4123456",
    position: "Cortador",
    department: "Producción",
    workshopId: "taller_1",
    hireDate: "2020-06-01",
    payType: "DESTAJO",
    monthlySalary: null,
    dailyRate: 150_000,
    pieceRate: 12_000,
    scheduledStart: "07:00",
    scheduledEnd: "16:00",
  },
  {
    code: "EMP-0003",
    firstName: "Gloria",
    lastName: "Medina",
    ciBase: "5234567",
    position: "Costurera",
    department: "Producción",
    workshopId: "taller_2",
    hireDate: "2022-02-15",
    payType: "DESTAJO",
    monthlySalary: null,
    dailyRate: 140_000,
    pieceRate: 10_000,
    scheduledStart: "07:00",
    scheduledEnd: "16:00",
  },
  {
    code: "EMP-0004",
    firstName: "Osvaldo",
    lastName: "Rojas",
    ciBase: "2345678",
    position: "Encargado de taller",
    department: "Producción",
    workshopId: "taller_2",
    hireDate: "2016-09-05",
    payType: "MENSUAL",
    monthlySalary: 5_500_000,
    dailyRate: null,
    pieceRate: null,
    scheduledStart: "07:30",
    scheduledEnd: "17:00",
  },
  {
    code: "EMP-0005",
    firstName: "Liz",
    lastName: "Sánchez",
    ciBase: "6345678",
    position: "Vendedora",
    department: "Ventas",
    workshopId: null,
    hireDate: "2021-04-19",
    payType: "MENSUAL",
    monthlySalary: 4_200_000,
    dailyRate: null,
    pieceRate: null,
    scheduledStart: "08:00",
    scheduledEnd: "18:00",
  },
  {
    code: "EMP-0006",
    firstName: "Jorge",
    lastName: "Fleitas",
    ciBase: "7456789",
    position: "Cajero",
    department: "Administración",
    workshopId: null,
    hireDate: "2023-07-10",
    payType: "MENSUAL",
    monthlySalary: 4_000_000,
    dailyRate: null,
    pieceRate: null,
    scheduledStart: "08:00",
    scheduledEnd: "18:00",
  },
  {
    code: "EMP-0007",
    firstName: "Nidia",
    lastName: "Benítez",
    ciBase: "8567890",
    position: "Auxiliar de depósito",
    department: "Depósito",
    workshopId: null,
    hireDate: "2019-11-04",
    payType: "JORNAL",
    monthlySalary: null,
    dailyRate: 130_000,
    pieceRate: null,
    scheduledStart: "07:30",
    scheduledEnd: "17:00",
  },
  {
    code: "EMP-0008",
    firstName: "Rodrigo",
    lastName: "Villalba",
    ciBase: "9678901",
    position: "Ayudante",
    department: "Producción",
    workshopId: "taller_1",
    hireDate: "2024-03-18",
    payType: "JORNAL",
    monthlySalary: null,
    dailyRate: 120_000,
    pieceRate: null,
    scheduledStart: "07:00",
    scheduledEnd: "16:00",
  },
  {
    code: "EMP-0009",
    firstName: "Celia",
    lastName: "Giménez",
    ciBase: "1789012",
    position: "Administrativa",
    department: "Administración",
    workshopId: null,
    hireDate: "2017-01-23",
    payType: "MENSUAL",
    monthlySalary: 4_800_000,
    dailyRate: null,
    pieceRate: null,
    scheduledStart: "08:00",
    scheduledEnd: "18:00",
  },
  {
    code: "EMP-0010",
    firstName: "Marcelo",
    lastName: "Ayala",
    ciBase: "2890123",
    position: "Costurero",
    department: "Producción",
    workshopId: "taller_2",
    hireDate: "2025-05-12",
    payType: "MIXTO",
    monthlySalary: 3_200_000,
    dailyRate: null,
    pieceRate: 6_000,
    scheduledStart: "07:00",
    scheduledEnd: "16:00",
  },
];

const VACATIONS = [
  {
    id: "vac_1",
    employeeCode: "EMP-0002",
    startDate: "2026-01-12",
    endDate: "2026-01-16",
    status: "APROBADA" as const,
    reason: "Vacaciones de verano",
  },
  {
    id: "vac_2",
    employeeCode: "EMP-0005",
    startDate: "2026-07-06",
    endDate: "2026-07-10",
    status: "APROBADA" as const,
    reason: "Vacaciones familiares",
  },
  {
    id: "vac_3",
    employeeCode: "EMP-0001",
    startDate: "2026-11-02",
    endDate: "2026-11-06",
    status: "PENDIENTE" as const,
    reason: "Viaje familiar",
  },
  {
    id: "vac_4",
    employeeCode: "EMP-0008",
    startDate: "2026-12-14",
    endDate: "2026-12-18",
    status: "PENDIENTE" as const,
    reason: "Vacaciones de fin de año",
  },
  {
    id: "vac_5",
    employeeCode: "EMP-0007",
    startDate: "2026-08-03",
    endDate: "2026-08-07",
    status: "RECHAZADA" as const,
    reason: "Cobertura de depósito",
  },
];

type AttendanceSeed = {
  id: string;
  employeeId: string;
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  breakMinutes: number;
  lateMinutes: number;
  lateCount: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  workedMinutes: number;
  source: "RELOJ";
};

type PieceworkSeed = {
  id: string;
  employeeId: string;
  date: Date;
  quantity: number;
  unitRate: number;
  description: string;
  productionOrderStageId: string | null;
  createdById: string;
};

function dayKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dateAt(year: number, month: number, day: number, hour = 12, minute = 0) {
  return new Date(
    `${dayKey(year, month, day)}T${String(hour).padStart(2, "0")}:${String(minute).padStart(
      2,
      "0"
    )}:00-03:00`
  );
}

function monthRange(year: number, month: number) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start: dateAt(year, month, 1, 0, 0), end: dateAt(year, month, lastDay, 23, 59) };
}

function minutes(value: string) {
  const [hours, mins] = value.split(":").map(Number);
  return (hours || 0) * 60 + (mins || 0);
}

function buildTimestamp(base: Date, totalMinutes: number) {
  return new Date(base.getTime() + totalMinutes * 60_000);
}

export async function seedHR() {
  const pinHash = await bcrypt.hash("1234", 10);
  const employees = EMPLOYEES.map((employee) => {
    const { ciBase, ...rest } = employee;
    return {
      ...rest,
      ci: `${ciBase}-${calculateDV(ciBase)}`,
      hireDate: new Date(`${rest.hireDate}T12:00:00-03:00`),
      endDate: null,
      id: `emp_${employee.code.slice(4)}`,
      pinHash,
      workDays: [1, 2, 3, 4, 5, 6],
      lunchMinutes: 60,
      lateToleranceMinutes: 10,
      status: "ACTIVO" as const,
    };
  });

  await prisma.employee.createMany({ data: employees });
  const employeeByCode = new Map(employees.map((employee) => [employee.code, employee]));

  const vacationRows = VACATIONS.map((vacation) => {
    const employee = employeeByCode.get(vacation.employeeCode);
    if (!employee) throw new Error(`Empleado inexistente: ${vacation.employeeCode}`);
    const start = new Date(`${vacation.startDate}T12:00:00-03:00`);
    const end = new Date(`${vacation.endDate}T12:00:00-03:00`);
    return {
      id: vacation.id,
      employeeId: employee.id,
      startDate: start,
      endDate: end,
      days: countVacationDays(start, end, employee.workDays),
      status: vacation.status,
      reason: vacation.reason,
      requestedAt: new Date(`${vacation.startDate}T09:00:00-03:00`),
      decidedAt:
        vacation.status === "PENDIENTE"
          ? null
          : new Date(`${vacation.startDate}T10:00:00-03:00`),
      decidedBy: vacation.status === "PENDIENTE" ? null : "rrhh",
    };
  });
  await prisma.vacationRequest.createMany({ data: vacationRows });

  const approvedVacations = vacationRows.filter((vacation) => vacation.status === "APROBADA");
  const vacationDaysFor = (employeeId: string, start: Date, end: Date, workDays: number[]) =>
    approvedVacations
      .filter(
        (vacation) =>
          vacation.employeeId === employeeId &&
          vacation.startDate <= end &&
          vacation.endDate >= start
      )
      .reduce((sum, vacation) => {
        const from = vacation.startDate > start ? vacation.startDate : start;
        const to = vacation.endDate < end ? vacation.endDate : end;
        return sum + countVacationDays(from, to, workDays);
      }, 0);

  const attendance: AttendanceSeed[] = [];
  let attendanceId = 0;
  const today = dateAt(2026, 10, 23, 23, 59);

  for (const employee of employees) {
    for (let month = 1; month <= 10; month++) {
      const lastDay = new Date(Date.UTC(2026, month, 0)).getUTCDate();
      for (let day = 1; day <= lastDay; day++) {
        const date = dateAt(2026, month, day);
        const dayStart = dateAt(2026, month, day, 0, 0);
        if (date > today) continue;
        if (!isWorkday(date, employee.workDays)) continue;
        if (
          approvedVacations.some(
            (vacation) =>
              vacation.employeeId === employee.id &&
              vacation.startDate <= date &&
              vacation.endDate >= date
          )
        ) {
          continue;
        }
        if (chance(0.05)) continue;
        if (employee.code === "EMP-0008" && month === 10 && day === 15) {
          const checkIn = buildTimestamp(dayStart, minutes(employee.scheduledStart) + 12);
          const computation = computeAttendance({
            date,
            checkIn,
            checkOut: null,
            schedule: employee,
          });
          attendance.push({
            id: `att_${++attendanceId}`,
            employeeId: employee.id,
            date,
            checkIn,
            checkOut: null,
            breakMinutes: computation.breakMinutes,
            lateMinutes: computation.lateMinutes,
            lateCount: computation.lateCount,
            earlyLeaveMinutes: computation.earlyLeaveMinutes,
            overtimeMinutes: computation.overtimeMinutes,
            workedMinutes: computation.workedMinutes,
            source: "RELOJ",
          });
          continue;
        }
        const late = chance(0.1) ? randInt(5, 25) : 0;
        const overtime = chance(0.15) ? randInt(30, 90) : 0;
        const checkIn = buildTimestamp(dayStart, minutes(employee.scheduledStart) + late);
        const checkOut = buildTimestamp(dayStart, minutes(employee.scheduledEnd) + overtime);
        const computation = computeAttendance({
          date,
          checkIn,
          checkOut,
          schedule: employee,
        });
        attendance.push({
          id: `att_${++attendanceId}`,
          employeeId: employee.id,
          date,
          checkIn,
          checkOut,
          breakMinutes: computation.breakMinutes,
          lateMinutes: computation.lateMinutes,
          lateCount: computation.lateCount,
          earlyLeaveMinutes: computation.earlyLeaveMinutes,
          overtimeMinutes: computation.overtimeMinutes,
          workedMinutes: computation.workedMinutes,
          source: "RELOJ",
        });
      }
    }
  }
  await prisma.attendance.createMany({ data: attendance });

  const stages = await prisma.productionOrderStage.findMany({
    where: { status: "COMPLETADA" },
    take: 12,
    orderBy: { endDate: "desc" },
  });
  const piecework: PieceworkSeed[] = [];
  const pieceworkCodes = ["EMP-0002", "EMP-0003", "EMP-0010"];
  for (let month = 1; month <= 10; month++) {
    for (const code of pieceworkCodes) {
      const employee = employeeByCode.get(code);
      if (!employee) continue;
      piecework.push({
        id: `piece_${month}_${code.slice(4)}`,
        employeeId: employee.id,
        date: dateAt(2026, month, 15),
        quantity: randInt(300, 700),
        unitRate: employee.pieceRate ?? 0,
        description: `Producción ${MONTH_NAMES[month - 1]}`,
        productionOrderStageId:
          chance(0.3) && stages.length
            ? stages[(month + Number(code.slice(-1))) % stages.length].id
            : null,
        createdById: "rrhh",
      });
    }
  }
  await prisma.pieceworkEntry.createMany({ data: piecework });

  for (let month = 1; month <= 9; month++) {
    const range = monthRange(2026, month);
    const status: "PAGADA" | "CERRADA" = month <= 8 ? "PAGADA" : "CERRADA";
    const periodId = `pay_2026_${String(month).padStart(2, "0")}`;
    const number = `LIQ-2026-${String(month).padStart(2, "0")}`;
    const rows = employees.map((employee) => {
      const employeeAttendance = attendance.filter(
        (record) =>
          record.employeeId === employee.id && record.date >= range.start && record.date <= range.end
      );
      const employeePieces = piecework.filter(
        (record) =>
          record.employeeId === employee.id && record.date >= range.start && record.date <= range.end
      );
      const vacationDays = vacationDaysFor(
        employee.id,
        range.start,
        range.end,
        employee.workDays
      );
      const item = buildPayrollItem({
        employee,
        periodStart: range.start,
        periodEnd: range.end,
        asOf: range.end,
        attendance: employeeAttendance,
        pieces: employeePieces,
        vacationDays,
      });
      return { employeeId: employee.id, item };
    });
    const totals = payrollTotals(rows.map((row) => row.item));
    let expenseId: string | null = null;
    if (status === "PAGADA") {
      const expense = await prisma.expense.create({
        data: {
          id: `exp_pay_2026_${String(month).padStart(2, "0")}`,
          date: range.end,
          categoryId: "cat_5",
          voucherNumber: number,
          description: `Liquidación de sueldos ${String(month).padStart(2, "0")}/2026`,
          amount: totals.netTotal,
          taxRate: 0,
          paymentMethodId: "pm_TRANSFERENCIA",
          paidFromCash: false,
          userId: "rrhh",
        },
      });
      expenseId = expense.id;
    }
    await prisma.payrollPeriod.create({
      data: {
        id: periodId,
        number,
        type: "MENSUAL",
        year: 2026,
        month,
        startDate: range.start,
        endDate: range.end,
        status,
        ...totals,
        closedAt: range.end,
        paidAt: status === "PAGADA" ? range.end : null,
        paymentMethodId: status === "PAGADA" ? "pm_TRANSFERENCIA" : null,
        paidFromCash: false,
        expenseId,
        userId: "rrhh",
      },
    });
    await prisma.payrollItem.createMany({
      data: rows.map(({ employeeId, item }) => ({
        payrollId: periodId,
        employeeId,
        ...item,
        concepts: item.concepts as Prisma.InputJsonValue,
      })),
    });
  }

  const october = monthRange(2026, 10);
  const octoberId = "pay_2026_10";
  const octoberRows = employees.map((employee) => {
    const employeeAttendance = attendance.filter(
      (record) =>
        record.employeeId === employee.id &&
        record.date >= october.start &&
        record.date <= today
    );
    const employeePieces = piecework.filter(
      (record) =>
        record.employeeId === employee.id &&
        record.date >= october.start &&
        record.date <= today
    );
    const vacationDays = vacationDaysFor(
      employee.id,
      october.start,
      october.end,
      employee.workDays
    );
    const item = buildPayrollItem({
      employee,
      periodStart: october.start,
      periodEnd: october.end,
      asOf: today,
      attendance: employeeAttendance,
      pieces: employeePieces,
      vacationDays,
    });
    return { employeeId: employee.id, item };
  });
  const octoberTotals = payrollTotals(octoberRows.map((row) => row.item));
  await prisma.payrollPeriod.create({
    data: {
      id: octoberId,
      number: "LIQ-2026-10",
      type: "MENSUAL",
      year: 2026,
      month: 10,
      startDate: october.start,
      endDate: october.end,
      status: "BORRADOR",
      ...octoberTotals,
      userId: "rrhh",
    },
  });
  await prisma.payrollItem.createMany({
    data: octoberRows.map(({ employeeId, item }) => ({
      payrollId: octoberId,
      employeeId,
      ...item,
      concepts: item.concepts as Prisma.InputJsonValue,
    })),
  });

  console.log(
    `RRHH: ${employees.length} empleados · ${attendance.length} marcas · ${piecework.length} destajos · 10 liquidaciones`
  );
}
