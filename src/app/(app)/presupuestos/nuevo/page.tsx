import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { QuoteForm } from "../quote-form";

export const metadata: Metadata = { title: "Nuevo presupuesto" };

export default async function NewQuotePage() {
  const [customers, products, priceLists] = await Promise.all([
    prisma.customer.findMany({
      where: { active: true },
      include: { priceList: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { active: true },
      include: { variants: { where: { active: true }, orderBy: [{ size: "asc" }, { color: "asc" }] } },
      orderBy: { name: "asc" },
    }),
    prisma.priceList.findMany({ include: { items: { take: 1, select: { discountPercent: true } } } }),
  ]);

  const listDiscount: Record<string, number> = {};
  for (const list of priceLists) listDiscount[list.id] = list.items[0]?.discountPercent ?? 0;

  return (
    <div>
      <PageHeader
        title="Nuevo presupuesto"
        description="Seleccioná el cliente para aplicar su lista de precios. Podés personalizar prendas con logo."
      />
      <QuoteForm
        customers={customers.map((customer) => ({
          id: customer.id,
          name: customer.name,
          rucBase: customer.rucBase,
          dv: customer.dv,
          priceListId: customer.priceListId,
          priceListName: customer.priceList.name,
        }))}
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
          code: product.code,
          taxRate: product.taxRate,
          variants: product.variants.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
            price: variant.priceOverride ?? product.basePrice,
          })),
        }))}
        listDiscount={listDiscount}
      />
    </div>
  );
}
