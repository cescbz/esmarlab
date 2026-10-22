import React from "react";
import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { KudeA4, KudeTicket } from "@/lib/pdf/kude-pdf";
import { simulatedConsultaUrl } from "@/lib/sifen";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return new Response("No autorizado", { status: 401 });

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { customer: true, lines: true, timbrado: true, order: true },
  });
  const company = await prisma.company.findFirst();
  if (!invoice || !company) return new Response("Comprobante no encontrado", { status: 404 });

  const formato = request.nextUrl.searchParams.get("formato") === "ticket" ? "ticket" : "a4";
  const qrDataUrl = await QRCode.toDataURL(simulatedConsultaUrl(invoice.cdc), {
    width: 220,
    margin: 1,
    color: { dark: "#0b2f31", light: "#ffffff" },
  });

  const data = {
    company: {
      razonSocial: company.razonSocial,
      ruc: company.ruc,
      dv: company.dv,
      address: company.address,
      city: company.city,
      phone: company.phone,
      email: company.email,
    },
    timbrado: {
      numero: invoice.timbrado.numero,
      vigenciaDesde: invoice.timbrado.vigenciaDesde,
      vigenciaHasta: invoice.timbrado.vigenciaHasta,
    },
    invoice: {
      type: invoice.type,
      number: invoice.number,
      cdc: invoice.cdc,
      issueDate: invoice.issueDate,
      condition: invoice.condition,
      termDays: invoice.termDays,
      dueDate: invoice.dueDate,
      customerName: invoice.customer.name,
      customerRuc: invoice.customer.rucBase,
      customerDv: invoice.customer.dv,
      customerAddress: [invoice.customer.address, invoice.customer.city].filter(Boolean).join(", "),
      orderNumber: invoice.order?.number,
      subtotal10: invoice.subtotal10,
      iva10: invoice.iva10,
      subtotal5: invoice.subtotal5,
      iva5: invoice.iva5,
      exenta: invoice.exenta,
      total: invoice.total,
      lines: invoice.lines.map((line) => ({
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
      })),
    },
    qrDataUrl,
  };

  const element = (
    formato === "ticket"
      ? React.createElement(KudeTicket, { data })
      : React.createElement(KudeA4, { data })
  ) as unknown as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(element);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="kude-${invoice.number}-${formato}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
