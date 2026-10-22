import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return new Response("No autorizado", { status: 401 });
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    select: { cdc: true, xml: true },
  });
  if (!invoice) return new Response("Comprobante no encontrado", { status: 404 });
  return new Response(invoice.xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="DE-${invoice.cdc}.xml"`,
      "Cache-Control": "no-store",
    },
  });
}
