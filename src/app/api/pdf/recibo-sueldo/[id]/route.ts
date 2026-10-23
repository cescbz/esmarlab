import React from "react";
import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { canViewPdf } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { PayrollReceiptPdf } from "@/lib/pdf/payroll-receipt-pdf";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return new Response("No autorizado", { status: 401 });
  if (!canViewPdf(session.user.role, "recibo-sueldo")) {
    return new Response("Sin permiso", { status: 403 });
  }

  const [item, company] = await Promise.all([
    prisma.payrollItem.findUnique({
      where: { id: params.id },
      include: { employee: true, payroll: true },
    }),
    prisma.company.findFirst(),
  ]);
  if (!item || !company) return new Response("Recibo no encontrado", { status: 404 });

  const data = {
    company: {
      razonSocial: company.razonSocial,
      ruc: company.ruc,
      dv: company.dv,
      address: company.address,
      city: company.city,
      phone: company.phone,
    },
    employee: {
      name: `${item.employee.firstName} ${item.employee.lastName}`,
      code: item.employee.code,
      ci: item.employee.ci,
      position: item.employee.position,
      department: item.employee.department,
      hireDate: item.employee.hireDate,
    },
    period: {
      number: item.payroll.number,
      type: item.payroll.type,
      year: item.payroll.year,
      month: item.payroll.month,
      status: item.payroll.status,
      paidAt: item.payroll.paidAt,
    },
    item: {
      payType: item.payType,
      baseAmount: item.baseAmount,
      workedDays: item.workedDays,
      pieceUnits: item.pieceUnits,
      pieceAmount: item.pieceAmount,
      extraMinutes: item.extraMinutes,
      extraAmount: item.extraAmount,
      lateMinutes: item.lateMinutes,
      lateDeduction: item.lateDeduction,
      absenceDays: item.absenceDays,
      absenceDeduction: item.absenceDeduction,
      vacationDays: item.vacationDays,
      vacationAmount: item.vacationAmount,
      otherEarnings: item.otherEarnings,
      otherDeductions: item.otherDeductions,
      grossAmount: item.grossAmount,
      ipsEmployee: item.ipsEmployee,
      ipsEmployer: item.ipsEmployer,
      netAmount: item.netAmount,
      notes: item.notes,
    },
  };

  const element = React.createElement(PayrollReceiptPdf, { data }) as unknown as Parameters<
    typeof renderToBuffer
  >[0];
  const buffer = await renderToBuffer(element);
  const filename = `REC-${item.payroll.number}-${item.employee.code}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
