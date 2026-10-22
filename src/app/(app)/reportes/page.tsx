import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CreditCard,
  Factory,
  Landmark,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Reportes" };

const REPORTS = [
  { href: "/reportes/caja", title: "Caja por caja", description: "Ingresos, egresos, arqueo y diferencias por sesión.", icon: Landmark },
  { href: "/reportes/pos", title: "Ventas por terminal POS", description: "Cobros con tarjeta por terminal y medio de pago.", icon: CreditCard },
  { href: "/reportes/medios-pago", title: "Ingresos por medio de pago", description: "Efectivo, tarjetas, transferencias, cheques y QR.", icon: Wallet },
  { href: "/reportes/ventas", title: "Ventas", description: "Por período, cliente, vendedor y grupo de producto.", icon: TrendingUp },
  { href: "/reportes/stock", title: "Stock valorizado", description: "Existencias y valor por depósito y grupo.", icon: Boxes },
  { href: "/reportes/cuentas-por-cobrar", title: "Cuentas por cobrar", description: "Antigüedad de saldos: corriente, 30, 60, 90 y más.", icon: Users },
  { href: "/reportes/libro-iva", title: "Libro de ventas IVA", description: "Formato para el contador con gravadas, IVA y exentas.", icon: ReceiptText },
  { href: "/reportes/gastos", title: "Gastos por categoría", description: "Gastos del período, origen y principales categorías.", icon: TrendingDown },
  { href: "/reportes/produccion", title: "Avance de producción", description: "OPs por estado, atrasos, talleres y producción mensual.", icon: Factory },
  { href: "/reportes/margen", title: "Margen por producto", description: "Venta neta de IVA, costo y margen por producto.", icon: BarChart3 },
];

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reportes"
        description="Información administrativa para gestionar ventas, caja, stock, cobranzas, IVA y producción. Todos los reportes permiten exportar CSV e imprimir."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          return (
            <Link key={report.href} href={report.href}>
              <Card className="h-full border-border/80 shadow-none transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
                <CardContent className="flex items-start gap-3 p-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{report.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{report.description}</p>
                    <span className="mt-3 flex items-center gap-1 text-[11px] font-medium text-primary">
                      Abrir reporte <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
