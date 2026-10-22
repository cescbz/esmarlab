import Link from "next/link";
import { auth } from "@/auth";
import {
  ArrowUpRight,
  FileText,
  ClipboardList,
  Factory,
  Wallet,
  ReceiptText,
  BarChart3,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/roles";

const TODAY_FORMATTER = new Intl.DateTimeFormat("es-PY", {
  timeZone: "America/Asuncion",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] ?? "";
  const today = TODAY_FORMATTER.format(new Date());

  return (
    <div>
      <PageHeader
        title={`Hola, ${firstName}`}
        description="Este es el panel general de Esmar SRL. Los indicadores se completan con la actividad comercial y de producción."
        actions={
          <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-white px-3 py-2 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="capitalize">{today}</span>
          </div>
        }
      />

      <Card className="relative overflow-hidden border-border/80 bg-gradient-to-br from-[#0b2f31] via-[#0e3a3c] to-[#115e59] p-6 text-white shadow-sm md:p-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <Badge className="border-white/15 bg-white/10 text-[10px] font-semibold uppercase tracking-widest text-white/80 hover:bg-white/10">
              <Sparkles className="mr-1.5 h-3 w-3 text-amber-300" />
              Demo funcional
            </Badge>
            <h3 className="mt-4 text-balance text-xl font-semibold tracking-tight md:text-2xl">
              Del presupuesto al cobro, con producción y stock en el mismo sistema.
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60">
              Recorré el circuito completo con datos de ejemplo: presupuestos,
              pedidos, órdenes de producción, envíos, facturas, recibos y caja.
            </p>
            <p className="mt-4 text-[11px] uppercase tracking-widest text-white/40">
              Sesión: {session?.user?.name} · {session ? ROLE_LABELS[session.user.role] : ""}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: "/presupuestos", label: "Nuevo presupuesto", icon: FileText },
              { href: "/pedidos", label: "Ver pedidos", icon: ClipboardList },
              { href: "/produccion/tablero", label: "Tablero", icon: Factory },
              { href: "/caja", label: "Abrir caja", icon: Wallet },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex min-w-[150px] items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5 text-xs font-medium text-white/85 transition-colors hover:bg-white/[0.12]"
                >
                  <Icon className="h-4 w-4 text-amber-300" />
                  <span className="flex-1">{item.label}</span>
                  <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
                </Link>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            href: "/facturas",
            icon: ReceiptText,
            title: "Facturación",
            text: "Comprobantes, CDC, KuDE y notas de crédito.",
          },
          {
            href: "/produccion/ordenes",
            icon: Factory,
            title: "Producción",
            text: "Fichas técnicas, etapas y talleres externos.",
          },
          {
            href: "/reportes",
            icon: BarChart3,
            title: "Reportes",
            text: "Caja, ventas, IVA, cobranzas y márgenes.",
          },
          {
            href: "/configuracion",
            icon: Sparkles,
            title: "Configuración",
            text: "Empresa, timbrado y puntos de expedición.",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="h-full border-border/80 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-4 text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.text}</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
