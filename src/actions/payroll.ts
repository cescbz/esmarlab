"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import {
  aguinaldoAmount,
  buildPayrollItem,
  countVacationDays,
  type PayrollItemComputation,
} from "@/lib/payroll";
import { currentPeriod, periodRange } from "@/lib/hr";
import type { ActionResult } from "./customers";

type PeriodInput = { id: string; startDate: Date; endDate: Date; status: string };

async function collectItems(
  tx: Prisma.TransactionClient,
  period: PeriodInput,
  adjustments?: Map<
    string,
    { otherEarnings: number; otherDeductions: number; notes: string | null }
  >
) {
  const employees = await tx.employee.findMany({
    where: { status: { in: ["ACTIVO", "LICENCIA"] } },
    orderBy: { code: "asc" },
  });
  const [attendance, pieces, vacations] = await Promise.all([
    tx.attendance.findMany({
      where: { date: { gte: period.startDate, lte: period.endDate } },
    }),
    tx.pieceworkEntry.findMany({
      where: { date: { gte: period.startDate, lte: period.endDate } },
    }),
    tx.vacationRequest.findMany({
      where: {
        status: "APROBADA",
        startDate: { lte: period.endDate },
        endDate: { gte: period.startDate },
      },
    }),
  ]);
  const asOf = period.status === "BORRADOR" ? new Date() : undefined;

  return employees.map((employee) => {
    const vacationDays = vacations
      .filter((request) => request.employeeId === employee.id)
      .reduce((sum, request) => {
        const start = request.startDate > period.startDate ? request.startDate : period.startDate;
        const end = request.endDate < period.endDate ? request.endDate : period.endDate;
        return sum + countVacationDays(start, end, employee.workDays);
      }, 0);
    const adjustment = adjustments?.get(employee.id);
    const item = buildPayrollItem({
      employee,
      periodStart: period.startDate,
      periodEnd: period.endDate,
      asOf,
      attendance: attendance.filter((record) => record.employeeId === employee.id),
      pieces: pieces.filter((piece) => piece.employeeId === employee.id),
      vacationDays,
      otherEarnings: adjustment?.otherEarnings ?? 0,
      otherDeductions: adjustment?.otherDeductions ?? 0,
      notes: adjustment?.notes ?? null,
    });
    return { employeeId: employee.id, item };
  });
}

function itemData(payrollId: string, employeeId: string, item: PayrollItemComputation) {
  return {
    payrollId,
    employeeId,
    ...item,
    concepts: item.concepts as Prisma.InputJsonValue,
  };
}

async function syncTotals(tx: Prisma.TransactionClient, payrollId: string) {
  const items = await tx.payrollItem.findMany({ where: { payrollId } });
  const totals = items.reduce(
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
  await tx.payrollPeriod.update({ where: { id: payrollId }, data: totals });
  return totals;
}

export async function createPayroll(values: unknown): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para crear liquidaciones." };
  }
  const parsed = z
    .object({
      year: z.coerce.number().int().min(2020).max(2100),
      month: z.coerce.number().int().min(1).max(12),
    })
    .safeParse(values);
  if (!parsed.success) return { ok: false, error: "Período inválido." };
  const { year, month } = parsed.data;
  const existing = await prisma.payrollPeriod.findUnique({
    where: { type_year_month: { type: "MENSUAL", year, month } },
  });
  if (existing) return { ok: false, error: `Ya existe la liquidación ${existing.number}.` };
  const range = periodRange(year, month);

  try {
    const payroll = await prisma.$transaction(async (tx) => {
      const period = await tx.payrollPeriod.create({
        data: {
          number: range.number,
          type: "MENSUAL",
          year,
          month,
          startDate: range.start,
          endDate: range.end,
          status: "BORRADOR",
          userId: session.user.username,
        },
      });
      const rows = await collectItems(tx, period);
      if (rows.length === 0) throw new Error("Sin empleados activos.");
      await tx.payrollItem.createMany({
        data: rows.map(({ employeeId, item }) => itemData(period.id, employeeId, item)),
      });
      await syncTotals(tx, period.id);
      return period;
    });
    revalidatePath("/rrhh/liquidaciones");
    revalidatePath("/rrhh");
    return { ok: true, id: payroll.id };
  } catch {
    return { ok: false, error: "No pudimos crear la liquidación." };
  }
}

export async function recalculatePayroll(payrollId: string): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para recalcular liquidaciones." };
  }
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: payrollId },
    include: { items: true },
  });
  if (!period) return { ok: false, error: "La liquidación no existe." };
  if (period.status !== "BORRADOR") {
    return { ok: false, error: "Solo se pueden recalcular borradores." };
  }
  const adjustments = new Map(
    period.items.map((item) => [
      item.employeeId,
      {
        otherEarnings: item.otherEarnings,
        otherDeductions: item.otherDeductions,
        notes: item.notes,
      },
    ])
  );

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payrollItem.deleteMany({ where: { payrollId } });
      const rows = await collectItems(tx, period, adjustments);
      await tx.payrollItem.createMany({
        data: rows.map(({ employeeId, item }) => itemData(period.id, employeeId, item)),
      });
      await syncTotals(tx, period.id);
    });
    revalidatePath(`/rrhh/liquidaciones/${payrollId}`);
    return { ok: true, id: payrollId };
  } catch {
    return { ok: false, error: "No pudimos recalcular la liquidación." };
  }
}

export async function updatePayrollItem(itemId: string, values: unknown): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para ajustar la liquidación." };
  }
  const parsed = z
    .object({
      otherEarnings: z.coerce.number().int().min(0).default(0),
      otherDeductions: z.coerce.number().int().min(0).default(0),
      notes: z.string().optional().default(""),
    })
    .safeParse(values);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  const item = await prisma.payrollItem.findUnique({
    where: { id: itemId },
    include: { payroll: true },
  });
  if (!item) return { ok: false, error: "El ítem no existe." };
  if (item.payroll.status !== "BORRADOR") {
    return { ok: false, error: "La liquidación ya está cerrada." };
  }
  const { otherEarnings, otherDeductions, notes } = parsed.data;
  const grossAmount = item.baseAmount + item.vacationAmount + item.extraAmount + otherEarnings;
  const ipsEmployee = Math.round(grossAmount * 0.09);
  const ipsEmployer = Math.round(grossAmount * 0.165);
  const netAmount =
    grossAmount - item.lateDeduction - item.absenceDeduction - ipsEmployee - otherDeductions;

  await prisma.$transaction(async (tx) => {
    await tx.payrollItem.update({
      where: { id: itemId },
      data: {
        otherEarnings,
        otherDeductions,
        grossAmount,
        ipsBase: grossAmount,
        ipsEmployee,
        ipsEmployer,
        netAmount,
        notes: notes || null,
      },
    });
    await syncTotals(tx, item.payrollId);
  });
  revalidatePath(`/rrhh/liquidaciones/${item.payrollId}`);
  return { ok: true, id: itemId };
}

export async function closePayroll(payrollId: string): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para cerrar liquidaciones." };
  }
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: payrollId },
    include: { items: true },
  });
  if (!period) return { ok: false, error: "La liquidación no existe." };
  if (period.status !== "BORRADOR") {
    return { ok: false, error: "Solo se cierran borradores." };
  }
  if (period.items.some((item) => item.netAmount < 0)) {
    return {
      ok: false,
      error: "Hay ítems con neto negativo. Ajustá los descuentos antes de cerrar.",
    };
  }
  await prisma.$transaction(async (tx) => {
    await syncTotals(tx, payrollId);
    await tx.payrollPeriod.update({
      where: { id: payrollId },
      data: { status: "CERRADA", closedAt: new Date() },
    });
  });
  revalidatePath(`/rrhh/liquidaciones/${payrollId}`);
  revalidatePath("/rrhh/liquidaciones");
  revalidatePath("/rrhh");
  return { ok: true, id: payrollId };
}

export async function payPayroll(payrollId: string, values: unknown): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para pagar liquidaciones." };
  }
  const parsed = z
    .object({
      paymentMethodId: z.string().min(1),
      paidFromCash: z.boolean().default(false),
    })
    .safeParse(values);
  if (!parsed.success) return { ok: false, error: "Datos de pago inválidos." };
  const period = await prisma.payrollPeriod.findUnique({ where: { id: payrollId } });
  if (!period) return { ok: false, error: "La liquidación no existe." };
  if (period.status !== "CERRADA") {
    return { ok: false, error: "Solo se pagan liquidaciones cerradas." };
  }
  if (period.netTotal <= 0) {
    return { ok: false, error: "La liquidación no tiene monto a pagar." };
  }

  const category = await prisma.expenseCategory.findFirst({ where: { name: "Sueldos" } });
  if (!category) return { ok: false, error: "Falta la categoría de gasto Sueldos." };

  let cashSessionId: string | null = null;
  if (parsed.data.paidFromCash) {
    const cashSession = await prisma.cashSession.findFirst({
      where: { status: "ABIERTA" },
      orderBy: { openedAt: "desc" },
    });
    if (!cashSession) {
      return { ok: false, error: "No hay una caja abierta para pagar desde efectivo." };
    }
    cashSessionId = cashSession.id;
  }

  const isAguinaldo = period.type === "AGUINALDO";
  const description = isAguinaldo
    ? `Aguinaldo ${period.year}`
    : `Liquidación de sueldos ${String(period.month).padStart(2, "0")}/${period.year}`;

  try {
    await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          date: new Date(),
          categoryId: category.id,
          voucherNumber: period.number,
          description,
          amount: period.netTotal,
          taxRate: 0,
          paymentMethodId: parsed.data.paymentMethodId,
          cashSessionId,
          paidFromCash: parsed.data.paidFromCash,
          userId: session.user.username,
        },
      });
      if (cashSessionId) {
        await tx.cashMovement.create({
          data: {
            cashSessionId,
            type: "EGRESO_GASTO",
            paymentMethodId: parsed.data.paymentMethodId,
            amount: period.netTotal,
            reference: period.number,
            description,
            date: new Date(),
          },
        });
      }
      await tx.payrollPeriod.update({
        where: { id: payrollId },
        data: {
          status: "PAGADA",
          paidAt: new Date(),
          paymentMethodId: parsed.data.paymentMethodId,
          paidFromCash: parsed.data.paidFromCash,
          expenseId: expense.id,
        },
      });
    });
    revalidatePath(`/rrhh/liquidaciones/${payrollId}`);
    revalidatePath("/rrhh/liquidaciones");
    revalidatePath("/gastos");
    revalidatePath("/caja");
    return { ok: true, id: payrollId };
  } catch {
    return { ok: false, error: "No pudimos registrar el pago." };
  }
}

export async function annulPayroll(payrollId: string): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para anular liquidaciones." };
  }
  const period = await prisma.payrollPeriod.findUnique({ where: { id: payrollId } });
  if (!period) return { ok: false, error: "La liquidación no existe." };
  if (period.status === "PAGADA") {
    return { ok: false, error: "No se puede anular una liquidación pagada." };
  }
  await prisma.payrollPeriod.update({
    where: { id: payrollId },
    data: { status: "ANULADA" },
  });
  revalidatePath(`/rrhh/liquidaciones/${payrollId}`);
  revalidatePath("/rrhh/liquidaciones");
  return { ok: true, id: payrollId };
}

export async function generateAguinaldo(year: number): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para generar aguinaldos." };
  }
  const existing = await prisma.payrollPeriod.findUnique({
    where: { type_year_month: { type: "AGUINALDO", year, month: 12 } },
  });
  if (existing) return { ok: false, error: `Ya existe el aguinaldo ${existing.number}.` };
  const periods = await prisma.payrollPeriod.findMany({
    where: { type: "MENSUAL", year, status: { in: ["CERRADA", "PAGADA"] } },
    include: { items: true },
  });
  const byEmployee = new Map<string, number>();
  for (const period of periods) {
    for (const item of period.items) {
      byEmployee.set(item.employeeId, (byEmployee.get(item.employeeId) ?? 0) + item.grossAmount);
    }
  }
  if (byEmployee.size === 0) {
    return { ok: false, error: "No hay liquidaciones cerradas en el año." };
  }
  const current = currentPeriod();
  const range = periodRange(year, 12);

  try {
    const payroll = await prisma.$transaction(async (tx) => {
      const period = await tx.payrollPeriod.create({
        data: {
          number: `AGU-${year}`,
          type: "AGUINALDO",
          year,
          month: 12,
          startDate: new Date(`${year}-01-01T00:00:00-03:00`),
          endDate: range.end,
          status: "BORRADOR",
          notes: year >= current.year ? "Provisorio: el año aún no terminó." : null,
          userId: session.user.username,
        },
      });
      for (const [employeeId, total] of byEmployee) {
        const amount = aguinaldoAmount(total);
        await tx.payrollItem.create({
          data: {
            payrollId: period.id,
            employeeId,
            payType: "MENSUAL",
            baseAmount: total,
            grossAmount: amount,
            ipsBase: 0,
            ipsEmployee: 0,
            ipsEmployer: 0,
            netAmount: amount,
            concepts: { aguinaldo: true, totalGanado: total },
          },
        });
      }
      await syncTotals(tx, period.id);
      return period;
    });
    revalidatePath("/rrhh/liquidaciones");
    revalidatePath("/rrhh/aguinaldo");
    return { ok: true, id: payroll.id };
  } catch {
    return { ok: false, error: "No pudimos generar el aguinaldo." };
  }
}
