import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { formatDate, formatGs } from "@/lib/format";
import { settlePendingInvoices } from "@/lib/sifen";
import { InvoiceFilters } from "./invoice-filters";
import { InvoicesTable, type InvoiceRow } from "./invoices-table";

export const metadata: Metadata = { title: "Facturas" };

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { desde?: string; hasta?: string; estado?: string; caja?: string };
}) {
  await settlePendingInvoices();

  const desde = searchParams.desde ? new Date(`${searchParams.desde}T00:00:00-03:00`) : undefined;
  const hasta = searchParams.hasta ? new Date(`${searchParams.hasta}T23:59:59-03:00`) : undefined;
  const points = await prisma.expeditionPoint.findMany({
    include: { cashRegister: true },
    orderBy: { punto: "asc" },
  });

  const invoices = await prisma.invoice.findMany({
    where: {
      ...(desde ? { issueDate: { gte: desde, ...(hasta ? { lte: hasta } : {}) } } : hasta ? { issueDate: { lte: hasta } } : {}),
      ...(searchParams.estado ? { status: searchParams.estado as never } : {}),
      ...(searchParams.caja ? { expeditionPointId: searchParams.caja } : {}),
    },
    include: { customer: true, expeditionPoint: { include: { cashRegister: true } } },
    orderBy: { issueDate: "desc" },
  });

  const rows: InvoiceRow[] = invoices.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    type: invoice.type,
    customer: invoice.customer.name,
    date: formatDate(invoice.issueDate),
    condition: invoice.condition === "CONTADO" ? "Contado" : `Crédito ${invoice.termDays}d`,
    total: invoice.total,
    paid: invoice.paidAmount,
    balance: invoice.balance,
    status: invoice.status,
    point: invoice.expeditionPoint.cashRegister?.name ?? `${invoice.expeditionPoint.establecimiento}-${invoice.expeditionPoint.punto}`,
  }));

  const facturas = invoices.filter((invoice) => invoice.type === "FACTURA");
  const totalFacturado = facturas.reduce((sum, invoice) => sum + invoice.total, 0);
  const saldo = facturas.reduce((sum, invoice) => sum + invoice.balance, 0);
  const pendientes = facturas.filter((invoice) => invoice.status === "PENDIENTE").length;

  return (
    <div>
      <PageHeader
        title="Facturas"
        description="Facturación electrónica simulada. Los comprobantes se envían a un SIFEN de demostración y se aprueban automáticamente."
        actions={
          <Button asChild>
            <Link href="/facturas/nueva"><Plus className="mr-1.5 h-4 w-4" />Nueva factura</Link>
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total facturado</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatGs(totalFacturado)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Saldo por cobrar</p>
          <p className="mt-1 text-xl font-semibold tabular text-amber-700">{formatGs(saldo)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Pendientes SIFEN</p>
          <p className="mt-1 text-xl font-semibold">{pendientes}</p>
        </div>
      </div>

      <div className="mb-3">
        <InvoiceFilters
          points={points.map((point) => ({
            id: point.id,
            label: point.cashRegister?.name ?? `${point.establecimiento}-${point.punto}`,
          }))}
        />
      </div>

      <InvoicesTable
        data={rows}
        toolbar={
          <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            SIFEN simulado
          </span>
        }
      />
    </div>
  );
}
