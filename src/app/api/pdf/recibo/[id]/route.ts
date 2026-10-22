import React from "react";
import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ReceiptPdf } from "@/lib/pdf/receipt-pdf";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return new Response("No autorizado", { status: 401 });

  const [receipt, company] = await Promise.all([
    prisma.receipt.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        allocations: { include: { invoice: true } },
        payments: { include: { paymentMethod: true } },
        cashSession: { include: { cashRegister: true } },
        expeditionPoint: true,
      },
    }),
    prisma.company.findFirst(),
  ]);
  if (!receipt || !company) return new Response("Recibo no encontrado", { status: 404 });

  const data = {
    company: {
      razonSocial: company.razonSocial,
      ruc: company.ruc,
      dv: company.dv,
      address: company.address,
      city: company.city,
      phone: company.phone,
    },
    receipt: {
      number: receipt.number,
      date: receipt.date,
      customerName: receipt.customer.name,
      customerRuc: receipt.customer.rucBase,
      customerDv: receipt.customer.dv,
      total: receipt.total,
      cashRegister: receipt.cashSession?.cashRegister.name ?? `${receipt.expeditionPoint.establecimiento}-${receipt.expeditionPoint.punto}`,
      observations: receipt.observations,
      allocations: receipt.allocations.map((allocation) => ({
        invoiceNumber: allocation.invoice.number,
        invoiceTotal: allocation.invoice.total,
        amount: allocation.amount,
      })),
      payments: receipt.payments.map((payment) => ({
        method: payment.paymentMethod.name,
        amount: payment.amount,
      })),
    },
  };

  const element = React.createElement(ReceiptPdf, { data }) as unknown as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(element);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${receipt.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
