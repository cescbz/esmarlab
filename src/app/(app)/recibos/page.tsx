import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { formatDate, formatGs } from "@/lib/format";
import { ReceiptsTable, type ReceiptRow } from "./receipts-table";

export const metadata: Metadata = { title: "Recibos" };

export default async function ReceiptsPage() {
  const receipts = await prisma.receipt.findMany({
    include: {
      customer: true,
      payments: { include: { paymentMethod: true } },
      allocations: true,
      cashSession: { include: { cashRegister: true } },
      expeditionPoint: true,
    },
    orderBy: { date: "desc" },
  });

  const rows: ReceiptRow[] = receipts.map((receipt) => ({
    id: receipt.id,
    number: receipt.number,
    date: formatDate(receipt.date),
    customer: receipt.customer.name,
    cashRegister: receipt.cashSession?.cashRegister.name ?? `${receipt.expeditionPoint.establecimiento}-${receipt.expeditionPoint.punto}`,
    methods: Array.from(new Set(receipt.payments.map((payment) => payment.paymentMethod.name))).join(", "),
    invoices: receipt.allocations.length,
    total: receipt.total,
  }));
  const total = receipts.reduce((sum, receipt) => sum + receipt.total, 0);

  return (
    <div>
      <PageHeader
        title="Recibos de cobro"
        description="Cobros aplicados a una o varias facturas, con uno o varios medios de pago. Documento interno de demostración."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Recibos emitidos</p>
          <p className="mt-1 text-xl font-semibold">{rows.length}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total cobrado</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatGs(total)}</p>
        </div>
      </div>
      <ReceiptsTable data={rows} />
    </div>
  );
}
