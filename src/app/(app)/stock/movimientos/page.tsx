import type { Metadata } from "next";
import { ArrowLeftRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/format";
import { KardexFilters } from "./kardex-filters";
import { KardexTable, type KardexRow } from "./kardex-table";

export const metadata: Metadata = { title: "Movimientos de stock" };

const TYPE_LABEL: Record<string, string> = {
  ENTRADA_COMPRA: "Entrada compra",
  SALIDA_VENTA: "Salida venta",
  TRANSFERENCIA_SALIDA: "Transferencia salida",
  TRANSFERENCIA_ENTRADA: "Transferencia entrada",
  AJUSTE_POSITIVO: "Ajuste positivo",
  AJUSTE_NEGATIVO: "Ajuste negativo",
  CONSUMO_PRODUCCION: "Consumo producción",
  INGRESO_PRODUCCION: "Ingreso producción",
  DEVOLUCION: "Devolución",
};

const INCOMING = new Set([
  "ENTRADA_COMPRA",
  "TRANSFERENCIA_ENTRADA",
  "AJUSTE_POSITIVO",
  "INGRESO_PRODUCCION",
  "DEVOLUCION",
]);

export default async function StockMovementsPage({
  searchParams,
}: {
  searchParams: { producto?: string; variante?: string };
}) {
  const [products, movements] = await Promise.all([
    prisma.product.findMany({
      include: { variants: { orderBy: [{ size: "asc" }, { color: "asc" }] } },
      orderBy: { name: "asc" },
    }),
    prisma.stockMovement.findMany({
      where: {
        ...(searchParams.variante
          ? { variantId: searchParams.variante }
          : searchParams.producto
            ? { variant: { productId: searchParams.producto } }
            : {}),
      },
      include: { variant: { include: { product: true } }, warehouse: true },
      orderBy: { date: searchParams.producto ? "asc" : "desc" },
      take: 500,
    }),
  ]);

  const balances = new Map<string, number>();
  const withBalance = movements.map((movement) => {
    const key = `${movement.variantId}_${movement.warehouseId}`;
    const incoming = INCOMING.has(movement.type);
    const balance = (balances.get(key) ?? 0) + (incoming ? movement.quantity : -movement.quantity);
    balances.set(key, balance);
    return { movement, incoming, balance };
  });

  const rows: KardexRow[] = (searchParams.producto ? [...withBalance].reverse() : withBalance).map(
    ({ movement, incoming, balance }) => ({
      id: movement.id,
      date: formatDate(movement.date),
      type: movement.type,
      typeLabel: TYPE_LABEL[movement.type] ?? movement.type,
      product: movement.variant.product.name,
      variant: `${movement.variant.size} · ${movement.variant.color}`,
      sku: movement.variant.sku,
      warehouse: movement.warehouse.name,
      quantity: movement.quantity,
      incoming,
      balance: searchParams.producto ? balance : null,
      reference: movement.originId ?? "—",
      observation: movement.observation ?? "—",
    })
  );

  return (
    <div>
      <PageHeader
        title="Movimientos de stock"
        description="Kardex de entradas y salidas. Seleccioná un producto para ver el saldo acumulado por variante y depósito."
      />

      <div className="mb-4">
        <KardexFilters products={products.map((product) => ({
          id: product.id,
          name: product.name,
          variants: product.variants.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
          })),
        }))} />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title="Sin movimientos" description="No hay movimientos para el filtro seleccionado." />
      ) : (
        <KardexTable data={rows} />
      )}
    </div>
  );
}
