import React from "react";
import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { QuotePdf } from "@/lib/pdf/quote-pdf";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return new Response("No autorizado", { status: 401 });

  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: { customer: true, lines: { include: { variant: { include: { product: true } } } } },
  });
  const company = await prisma.company.findFirst();
  if (!quote || !company) return new Response("Presupuesto no encontrado", { status: 404 });

  const subtotal = quote.lines.reduce((sum, line) => {
    const lineTotal = line.lineTotal;
    const rate = line.taxRate;
    if (rate === 10) return sum + Math.round(lineTotal / 1.1);
    if (rate === 5) return sum + Math.round(lineTotal / 1.05);
    return sum + lineTotal;
  }, 0);
  const iva = quote.total - subtotal;

  const pdfData = {
    number: quote.number,
    date: quote.date,
    validUntil: new Date(quote.date.getTime() + quote.validityDays * 86_400_000),
    observations: quote.observations,
    total: quote.total,
    subtotal,
    iva,
    company: {
      razonSocial: company.razonSocial,
      ruc: company.ruc,
      dv: company.dv,
      address: company.address,
      city: company.city,
      phone: company.phone,
      email: company.email,
    },
    customer: {
      name: quote.customer.name,
      rucBase: quote.customer.rucBase,
      dv: quote.customer.dv,
      address: quote.customer.address,
      city: quote.customer.city,
      phone: quote.customer.phone,
      email: quote.customer.email,
    },
    lines: quote.lines.map((line) => ({
      description: `${line.variant.product.name} · Talle ${line.variant.size} · ${line.variant.color}${line.isCustomized ? " · Personalizado con logo" : ""}`,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountPercent: line.discountPercent,
      lineTotal: line.lineTotal,
    })),
  };
  const element = React.createElement(QuotePdf, { data: pdfData }) as unknown as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(element);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="presupuesto-${quote.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
