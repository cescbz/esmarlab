import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, SlidersHorizontal, Repeat2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { FilterSelect } from "@/components/shared/filter-select";
import { Button } from "@/components/ui/button";
import { formatGs, formatNumber } from "@/lib/format";
import { StockTable, type StockRow } from "./stock-table";

export const metadata: Metadata = { title: "Existencias" };

export default async function StockPage({
  searchParams,
}: {
  searchParams: { grupo?: string; deposito?: string };
}) {
  const [groups, warehouses, totals] = await Promise.all([
    prisma.productGroup.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.warehouse.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.stockLevel.groupBy({ by: ["variantId"], _sum: { quantity: true } }),
  ]);
  const totalMap = new Map(totals.map((row) => [row.variantId, row._sum.quantity ?? 0]));

  const levels = await prisma.stockLevel.findMany({
    where: {
      ...(searchParams.deposito ? { warehouseId: searchParams.deposito } : {}),
      ...(searchParams.grupo ? { variant: { product: { groupId: searchParams.grupo } } } : {}),
    },
    include: { variant: { include: { product: true } }, warehouse: true },
    orderBy: [{ variant: { product: { name: "asc" } } }],
  });

  const rows: StockRow[] = levels.map((level) => {
    const total = totalMap.get(level.variantId) ?? level.quantity;
    return {
      id: level.id,
      productId: level.variant.productId,
      product: level.variant.product.name,
      variant: `${level.variant.size} · ${level.variant.color}`,
      sku: level.variant.sku,
      warehouse: level.warehouse.name,
      quantity: level.quantity,
      total,
      minStock: level.variant.product.minStock,
      unitCost: level.variant.product.cost,
      value: level.quantity * level.variant.product.cost,
      low: total < level.variant.product.minStock,
    };
  });

  const totalUnits = rows.reduce((sum, row) => sum + row.quantity, 0);
  const totalValue = rows.reduce((sum, row) => sum + row.value, 0);
  const lowVariants = new Set(rows.filter((row) => row.low).map((row) => row.sku)).size;

  return (
    <div>
      <PageHeader
        title="Existencias"
        description="Stock por variante y depósito, valorizado a costo promedio. El mínimo se controla sobre el total del producto."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/stock/transferencias"><Repeat2 className="mr-1.5 h-4 w-4" />Transferir</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/stock/ajustes"><SlidersHorizontal className="mr-1.5 h-4 w-4" />Ajustar</Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Unidades en stock</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatNumber(totalUnits)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Valorizado a costo</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatGs(totalValue)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Variantes bajo mínimo</p>
          <p className={`mt-1 text-xl font-semibold ${lowVariants > 0 ? "text-red-600" : ""}`}>{lowVariants}</p>
        </div>
      </div>

      {levels.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white px-6 py-16 text-center">
          <Boxes className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">No hay existencias</p>
          <p className="mt-1 text-xs text-muted-foreground">Registrá una compra o ajuste para cargar stock.</p>
        </div>
      ) : (
        <StockTable
          data={rows}
          toolbar={
            <>
              <FilterSelect
                name="grupo"
                label="Grupo"
                options={[{ value: "todos", label: "Todos" }, ...groups.map((g) => ({ value: g.id, label: g.name }))]}
              />
              <FilterSelect
                name="deposito"
                label="Depósito"
                options={[{ value: "todos", label: "Todos" }, ...warehouses.map((w) => ({ value: w.id, label: w.name }))]}
              />
            </>
          }
        />
      )}
    </div>
  );
}
