import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { ProductForm } from "../../product-form";

export const metadata: Metadata = { title: "Editar producto" };

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const [product, groups] = await Promise.all([
    prisma.product.findUnique({
      where: { id: params.id },
      include: { variants: { orderBy: [{ size: "asc" }, { color: "asc" }] } },
    }),
    prisma.productGroup.findMany({
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={`Editar ${product.name}`} description="Modificá precios, datos y variantes del producto." />
      <ProductForm
        groups={groups}
        product={{
          id: product.id,
          code: product.code,
          name: product.name,
          groupId: product.groupId,
          type: product.type,
          unit: product.unit,
          taxRate: product.taxRate,
          cost: product.cost,
          basePrice: product.basePrice,
          minStock: product.minStock,
          active: product.active,
          variants: product.variants.map((variant) => ({
            id: variant.id,
            size: variant.size,
            color: variant.color,
            sku: variant.sku,
            priceOverride: variant.priceOverride,
          })),
        }}
      />
    </div>
  );
}
