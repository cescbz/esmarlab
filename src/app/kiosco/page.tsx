import type { Metadata } from "next";
import { headers } from "next/headers";
import { Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getClientIp, isIpAllowed } from "@/lib/ip";
import { PublicKiosk } from "./public-kiosk";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reloj de asistencia" };

function KioskMessage({
  title,
  description,
  ip,
}: {
  title: string;
  description: string;
  ip?: string;
}) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-brand px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/10 p-8 text-center backdrop-blur">
        <Clock className="mx-auto h-10 w-10 text-amber-400" />
        <h1 className="mt-4 text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-white/70">{description}</p>
        {ip ? <p className="mt-4 font-mono text-[11px] text-white/50">IP detectada: {ip}</p> : null}
      </div>
    </main>
  );
}

export default async function KioscoPage() {
  const [settings, company] = await Promise.all([
    prisma.kioskSettings.findUnique({ where: { id: "default" } }),
    prisma.company.findFirst(),
  ]);
  const headerList = headers();
  const ip = getClientIp({
    forwardedFor: headerList.get("x-forwarded-for"),
    realIp: headerList.get("x-real-ip"),
    cfConnectingIp: headerList.get("cf-connecting-ip"),
    trustCloudflare: process.env.TRUST_CLOUDFLARE === "1",
  });

  if (!settings?.enabled) {
    return (
      <KioskMessage
        title="Reloj desactivado"
        description="Administración todavía no habilitó el reloj público."
      />
    );
  }
  if (!isIpAllowed(ip, settings.allowedIps)) {
    return (
      <KioskMessage
        title="Red no autorizada"
        description="Este reloj solo funciona desde la red configurada por la empresa."
        ip={ip}
      />
    );
  }

  return (
    <PublicKiosk
      title={settings.title ?? "Reloj de asistencia"}
      companyName={company?.razonSocial ?? "Esmar SRL"}
      requirePhoto={settings.requirePhoto}
    />
  );
}
