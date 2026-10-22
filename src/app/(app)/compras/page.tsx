import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { formatGs } from "@/lib/format";
import { PurchasesTable, type PurchaseRow } from "./purchases-table";

export const metadata: Metadata = { title: "Compras" };

export default async function PurchasesPage() {
  const receipts = await prisma.purchaseReceipt.findMany({
    include: { supplier: { select: { name: true } }, warehouse: { select: { name: true } } },
    orderBy: { date: "desc" },
  });
  const rows: PurchaseRow[] = receipts.map((receipt) => ({
    id: receipt.id,
    number: receipt.number,
    supplier: receipt.supplier.name,
    invoice: receipt.supplierInvoiceNumber,
    date: new Intl.DateTimeFormat("es-PY", { timeZone: "America/Asuncion", day: "2-digit", month: "2-digit", year: "numeric" }).format(receipt.date),
    warehouse: receipt.warehouse.name,
    total: receipt.total,
    status: receipt.status,
  }));
  const now = new Date();
  const monthTotal = receipts
    .filter((receipt) => receipt.date.getMonth() === now.getMonth() && receipt.date.getFullYear() === now.getFullYear() && receipt.status === "CONFIRMADA")
    .reduce((sum, receipt) => sum + receipt.total, 0);
  const drafts = receipts.filter((receipt) => receipt.status === "BORRADOR").length;

  return (
    <div>
      <PageHeader
        title="Compras"
        description="Recepción de mercadería de proveedores. Al confirmar se genera la entrada de stock y se actualiza el costo promedio."
        actions={
          <Button asChild>
            <Link href="/compras/nuevo"><Plus className="mr-1.5 h-4 w-4" />Nueva recepción</Link>
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Recepciones</p>
          <p className="mt-1 text-xl font-semibold">{receipts.length}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Compras del mes</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatGs(monthTotal)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Borradores pendientes</p>
          <p className={`mt-1 text-xl font-semibold ${drafts > 0 ? "text-amber-700" : ""}`}>{drafts}</p>
        </div>
      </div>

      <PurchasesTable data={rows} />
    </div>
  );
}
