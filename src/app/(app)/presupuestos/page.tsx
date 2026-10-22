import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { FilterSelect } from "@/components/shared/filter-select";
import { Button } from "@/components/ui/button";
import { formatDate, formatGs } from "@/lib/format";
import { QuotesTable, type QuoteRow } from "./quotes-table";

export const metadata: Metadata = { title: "Presupuestos" };

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: { estado?: string };
}) {
  const quotes = await prisma.quote.findMany({
    where: searchParams.estado ? { status: searchParams.estado as never } : undefined,
    include: { customer: { select: { name: true } } },
    orderBy: { date: "desc" },
  });

  const rows: QuoteRow[] = quotes.map((quote) => ({
    id: quote.id,
    number: quote.number,
    customer: quote.customer.name,
    date: formatDate(quote.date),
    validUntil: formatDate(new Date(quote.date.getTime() + quote.validityDays * 86_400_000)),
    status: quote.status,
    total: quote.total,
    seller: quote.userId ?? "—",
  }));

  const approvedTotal = quotes.filter((quote) => quote.status === "APROBADO").reduce((sum, quote) => sum + quote.total, 0);
  const sentCount = quotes.filter((quote) => quote.status === "ENVIADO").length;

  return (
    <div>
      <PageHeader
        title="Presupuestos"
        description="Cotizaciones para clientes. Al aprobar se genera automáticamente un pedido de venta."
        actions={
          <Button asChild>
            <Link href="/presupuestos/nuevo"><Plus className="mr-1.5 h-4 w-4" />Nuevo presupuesto</Link>
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Presupuestos</p>
          <p className="mt-1 text-xl font-semibold">{quotes.length}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Enviados pendientes</p>
          <p className="mt-1 text-xl font-semibold text-sky-700">{sentCount}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Aprobado</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatGs(approvedTotal)}</p>
        </div>
      </div>

      <QuotesTable
        data={rows}
        toolbar={
          <FilterSelect
            name="estado"
            label="Estado"
            options={[
              { value: "todos", label: "Todos" },
              { value: "BORRADOR", label: "Borrador" },
              { value: "ENVIADO", label: "Enviado" },
              { value: "APROBADO", label: "Aprobado" },
              { value: "RECHAZADO", label: "Rechazado" },
              { value: "VENCIDO", label: "Vencido" },
            ]}
          />
        }
      />
    </div>
  );
}
