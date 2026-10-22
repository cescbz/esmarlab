import React from "react";
import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ArqueoPdf } from "@/lib/pdf/arqueo-pdf";
import { getSessionSummary } from "@/lib/cash";

export const runtime = "nodejs";

type Detail = { medio: string; esperado: number; contado: number; diferencia: number };

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return new Response("No autorizado", { status: 401 });

  const [cashSession, company] = await Promise.all([
    prisma.cashSession.findUnique({
      where: { id: params.id },
      include: { cashRegister: true },
    }),
    prisma.company.findFirst(),
  ]);
  if (!cashSession || !company) return new Response("Sesión no encontrada", { status: 404 });

  let rows = Array.isArray(cashSession.closingDetails)
    ? (cashSession.closingDetails as unknown as Detail[])
    : [];
  if (rows.length === 0) {
    const summary = await getSessionSummary(cashSession.id);
    rows = (summary?.rows ?? []).map((row) => ({
      medio: row.name,
      esperado: row.expected,
      contado: row.expected,
      diferencia: 0,
    }));
  }

  const data = {
    company: {
      razonSocial: company.razonSocial,
      ruc: company.ruc,
      dv: company.dv,
      city: company.city,
    },
    session: {
      id: cashSession.id,
      cashRegister: cashSession.cashRegister.name,
      openedAt: cashSession.openedAt,
      closedAt: cashSession.closedAt,
      user: cashSession.userId ?? "—",
      openingAmount: cashSession.openingAmount,
      countedAmount: cashSession.countedAmount ?? 0,
      difference: cashSession.difference ?? 0,
      observations: cashSession.observations,
      rows,
    },
  };

  const element = React.createElement(ArqueoPdf, { data }) as unknown as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(element);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="arqueo-${cashSession.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
