import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ProductionForm } from "./production-form";

export const metadata: Metadata = { title: "Nueva orden de producción" };

export default async function NewProductionOrderPage({
  searchParams,
}: {
  searchParams: { pedido?: string; producto?: string };
}) {
  const [products, orders, warehouses] = await Promise.all([
    prisma.product.findMany({
      where: { type: "FABRICADO", active: true, bom: { isNot: null } },
      include: {
        variants: { where: { active: true }, orderBy: [{ size: "asc" }, { color: "asc" }] },
      },
      orderBy: { name: "asc" },
    }),
    prisma.salesOrder.findMany({
      where: { status: { notIn: ["ANULADO", "FACTURADO"] } },
      include: { customer: true, lines: { include: { variant: { include: { product: true } } } } },
      orderBy: { date: "desc" },
    }),
    prisma.warehouse.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const orderOptions = orders
    .map((order) => ({
      id: order.id,
      number: order.number,
      customer: order.customer.name,
      lines: order.lines
        .filter((line) => line.variant.product.type === "FABRICADO")
        .map((line) => ({
          productId: line.variant.productId,
          variantId: line.variantId,
          quantity: line.quantity - line.quantityShipped,
        }))
        .filter((line) => line.quantity > 0),
    }))
    .filter((order) => order.lines.length > 0);

  return (
    <div>
      <PageHeader
        title="Nueva orden de producción"
        description="Podés producir para un pedido de venta o para stock. Las etapas se generan desde la ficha técnica."
        actions={<Button asChild variant="outline"><Link href="/produccion/ordenes"><ArrowLeft className="mr-1.5 h-4 w-4" />Volver</Link></Button>}
      />
      <ProductionForm
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
          code: product.code,
          variants: product.variants.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
          })),
        }))}
        orders={orderOptions}
        warehouses={warehouses.map((warehouse) => ({ id: warehouse.id, name: warehouse.name }))}
        defaultOrderId={searchParams.pedido}
        defaultProductId={searchParams.producto}
      />
    </div>
  );
}
