import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { PurchaseForm } from "../purchase-form";

export const metadata: Metadata = { title: "Nueva recepción de compra" };

export default async function NewPurchasePage() {
  const [suppliers, warehouses, products] = await Promise.all([
    prisma.supplier.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { active: true },
      include: { variants: { where: { active: true }, orderBy: [{ size: "asc" }, { color: "asc" }] } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Nueva recepción de compra"
        description="Cargá la factura del proveedor y las cantidades recibidas. Podés guardar borrador o confirmar para impactar stock."
      />
      <PurchaseForm
        suppliers={suppliers}
        warehouses={warehouses}
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
          variants: product.variants.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
            cost: product.cost,
          })),
        }))}
      />
    </div>
  );
}
