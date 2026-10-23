import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return new Response("No autorizado", { status: 401 });
  if (!["ADMIN", "GERENCIA", "RRHH"].includes(session.user.role)) {
    return new Response("Sin permiso", { status: 403 });
  }
  const photo = await prisma.attendancePhoto.findUnique({ where: { id: params.id } });
  if (!photo) return new Response("Foto no encontrada", { status: 404 });

  const base64 = photo.data.split(",")[1] ?? "";
  const buffer = Buffer.from(base64, "base64");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": photo.mimeType,
      "Cache-Control": "private, no-store",
    },
  });
}
