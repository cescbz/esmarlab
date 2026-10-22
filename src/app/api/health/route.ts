import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", database: "ok", service: "esmar-demo" });
  } catch {
    return Response.json({ status: "degraded", database: "error", service: "esmar-demo" }, { status: 503 });
  }
}
