import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { QuoteForm } from "../../quote-form";

export const metadata: Metadata = { title: "Editar presupuesto" };

export default async function EditQuotePage({ params }: { params: { id: string } }) {
  const [quote, customers, products, priceLists] = await Promise.all([
    prisma.quote.findUnique({ where: { id: params.id }, include: { lines: true } }),
    prisma.customer.findMany({ include: { priceList: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      include: { variants: { orderBy: [{ size: "asc" }, { color: "asc" }] } },
      orderBy: { name: "asc" },
    }),
    prisma.priceList.findMany({ include: { items: { take: 1, select: { discountPercent: true } } } }),
  ]);
  if (!quote) notFound();

  const listDiscount: Record<string, number> = {};
  for (const list of priceLists) listDiscount[list.id] = list.items[0]?.discountPercent ?? 0;

  return (
    <div>
      <PageHeader title={`Editar ${quote.number}`} description="Modificá las líneas y condiciones del presupuesto." />
      <QuoteForm
        quote={{
          id: quote.id,
          status: quote.status,
          customerId: quote.customerId,
          date: quote.date,
          validityDays: quote.validityDays,
          observations: quote.observations,
          lines: quote.lines.map((line) => ({
            variantId: line.variantId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent,
            isCustomized: line.isCustomized,
            customizationDetail: line.customizationDetail,
          })),
        }}
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
