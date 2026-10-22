import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PriceListItemsTable, type PriceItemRow } from "../price-list-items-table";

export const metadata: Metadata = { title: "Lista de precios" };

export default async function PriceListDetailPage({ params }: { params: { id: string } }) {
  const list = await prisma.priceList.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: { variant: { include: { product: true } } },
        orderBy: { variant: { sku: "asc" } },
      },
      _count: { select: { customers: true } },
    },
  });
  if (!list) notFound();

  const rows: PriceItemRow[] = list.items.map((item) => ({
    id: item.id,
    product: item.variant.product.name,
    sku: item.variant.sku,
    size: item.variant.size,
    color: item.variant.color,
    price: item.price,
    discount: item.discountPercent,
  }));
  const discount = list.items[0]?.discountPercent ?? 0;

  return (
    <div>
      <PageHeader
        title={list.name}
        description={list.description ?? "Lista de precios"}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/listas-de-precios"><ArrowLeft className="mr-1.5 h-4 w-4" />Volver</Link>
            </Button>
            <Button asChild>
              <Link href={`/listas-de-precios/${list.id}/editar`}><Pencil className="mr-1.5 h-4 w-4" />Editar</Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {list.isDefault ? (
          <Badge className="border-amber-200 bg-amber-50 text-amber-700"><Star className="mr-1 h-3 w-3" />Predeterminada</Badge>
        ) : null}
        <Badge className={list.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}>
          {list.active ? "Activa" : "Inactiva"}
        </Badge>
        <span className="text-xs text-muted-foreground">Descuento {discount}% · {rows.length} ítems · {list._count.customers} clientes</span>
      </div>

      <PriceListItemsTable data={rows} />
    </div>
  );
}
