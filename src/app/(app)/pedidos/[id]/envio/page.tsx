import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ShipmentForm } from "./shipment-form";

export const metadata: Metadata = { title: "Nuevo envío" };

export default async function NewShipmentPage({ params }: { params: { id: string } }) {
  const [order, warehouses] = await Promise.all([
    prisma.salesOrder.findUnique({
      where: { id: params.id },
      include: { customer: true, lines: { include: { variant: { include: { product: true } } } } },
    }),
    prisma.warehouse.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  if (!order) notFound();

  const pendingLines = order.lines.filter((line) => line.quantity > line.quantityShipped);
  if (pendingLines.length === 0) redirect(`/pedidos/${order.id}`);

  const stockLevels = await prisma.stockLevel.findMany({
    where: { variantId: { in: pendingLines.map((line) => line.variantId) } },
  });
  const stockMap = new Map(
    stockLevels.map((level) => [`${level.variantId}_${level.warehouseId}`, level.quantity])
  );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Nuevo envío"
        description={`Pedido ${order.number} · ${order.customer.name}`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/pedidos/${order.id}`}><ArrowLeft className="mr-1.5 h-4 w-4" />Volver al pedido</Link>
          </Button>
        }
      />
      <ShipmentForm
        orderId={order.id}
        orderNumber={order.number}
        warehouses={warehouses.map((warehouse) => ({ id: warehouse.id, name: warehouse.name }))}
        lines={pendingLines.map((line) => {
          const warehouseId = line.variant.product.type === "FABRICADO" ? "wh_pt" : "wh_central";
          return {
            orderLineId: line.id,
            description: `${line.variant.product.name} · ${line.variant.size} · ${line.variant.color}`,
            sku: line.variant.sku,
            ordered: line.quantity,
            shipped: line.quantityShipped,
            remaining: line.quantity - line.quantityShipped,
            available: stockMap.get(`${line.variantId}_${warehouseId}`) ?? 0,
          };
        })}
      />
    </div>
  );
}
