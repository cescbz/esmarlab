import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="min-h-svh bg-[#f4f6f7] lg:grid lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[#0b2f31] px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="pointer-events-none absolute -right-28 -top-32 h-96 w-96 rounded-full bg-[#0f766e] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-amber-500/20 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg font-black tracking-tight text-[#0b2f31] shadow-lg">
              E
              <span className="ml-0.5 mt-2 h-1.5 w-1.5 rounded-full bg-amber-500" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none tracking-tight">ESMAR SRL</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/50">
                Sistema de gestión
              </p>
            </div>
          </div>

          <div className="mt-24 max-w-xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Demo funcional
            </p>
            <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight xl:text-5xl">
              Todo el circuito de tu empresa, en un solo lugar.
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-white/60">
              Uniformes empresariales, EPP y producción. Ventas, stock, caja,
              facturación electrónica y reportes en tiempo real.
            </p>

            <div className="mt-14 grid max-w-lg grid-cols-2 gap-x-8 gap-y-5">
              {[
                ["Presupuestos y pedidos", "Del primer contacto a la entrega"],
                ["Producción por etapas", "Tablero y control de talleres"],
                ["Caja y cobranzas", "Dos cajas, múltiples medios de pago"],
                ["Facturación SIFEN", "Simulada, con KuDE y CDC"],
              ].map(([title, subtitle]) => (
                <div key={title} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  <div>
                    <p className="text-sm font-medium text-white/90">{title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/45">{subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-between text-[11px] text-white/35">
          <span>Ñemby · Paraguay</span>
          <span className="rounded border border-white/15 px-2 py-1 font-semibold uppercase tracking-wider text-white/45">
            Demo — sin validez fiscal
          </span>
        </div>
      </section>

      <section className="flex min-h-svh items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b2f31] text-base font-black text-white">
              E
            </div>
            <div>
              <p className="font-bold leading-none text-[#0b2f31]">ESMAR SRL</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Sistema de gestión
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-white p-7 shadow-[0_20px_60px_-30px_rgba(15,50,55,0.25)] sm:p-9">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Iniciar sesión
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Ingresá con tu usuario para acceder al sistema.
            </p>
            <LoginForm />
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
            Esta es una demostración. Los comprobantes emitidos no tienen
            validez fiscal.
          </p>
        </div>
      </section>
    </div>
  );
}
