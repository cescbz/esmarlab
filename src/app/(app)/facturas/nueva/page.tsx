import type { Metadata } from "next";
import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatGs } from "@/lib/format";
import { InvoiceForm } from "./invoice-form";

export const metadata: Metadata = { title: "Nueva factura" };

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: { pedido?: string };
}) {
  const points = await prisma.expeditionPoint.findMany({
    where: { active: true },
    include: { cashRegister: true },
    orderBy: { punto: "asc" },
  });
  const pointOptions = points.map((point) => ({
    id: point.id,
    label: point.cashRegister ? `${point.cashRegister.name} · ${point.establecimiento}-${point.punto}` : `${point.establecimiento}-${point.punto}`,
  }));

  if (!searchParams.pedido) {
    const orders = await prisma.salesOrder.findMany({
      where: { status: { not: "ANULADO" } },
      include: { customer: true, lines: true },
      orderBy: { date: "desc" },
    });
    const pendingOrders = orders.filter((order) =>
      order.lines.some((line) => line.quantity > line.quantityInvoiced)
    );

    return (
      <div>
        <PageHeader
          title="Nueva factura"
          description="Elegí un pedido con cantidades pendientes de facturar. Para una venta de mostrador, usá Caja."
          actions={<Button asChild variant="outline"><Link href="/facturas">Volver</Link></Button>}
        />
        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5">
            <CardTitle className="text-sm font-semibold">Pedidos con saldo por facturar</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {pendingOrders.length === 0 ? (
              <EmptyState icon={ReceiptText} title="No hay pedidos pendientes de facturación" description="Todos los pedidos activos ya fueron facturados o no tienen líneas." className="border-0" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Entrega</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Pendiente</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingOrders.map((order) => {
                    const pending = order.lines.reduce(
                      (sum, line) => sum + Math.max(0, line.quantity - line.quantityInvoiced),
                      0
                    );
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">{order.number}</TableCell>
                        <TableCell className="text-xs font-medium">{order.customer.name}</TableCell>
                        <TableCell className="text-xs">{formatDate(order.date)}</TableCell>
                        <TableCell className="text-xs">{formatDate(order.deliveryDate)}</TableCell>
                        <TableCell><StatusBadge status={order.status} /></TableCell>
                        <TableCell className="text-right text-xs tabular">{pending}</TableCell>
                        <TableCell className="text-right text-xs tabular">{formatGs(order.total)}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                            <Link href={`/facturas/nueva?pedido=${order.id}`}>Facturar</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const order = await prisma.salesOrder.findUnique({
    where: { id: searchParams.pedido },
    include: { customer: true, lines: { include: { variant: { include: { product: true } } } } },
  });
  if (!order) {
    return (
      <div>
        <PageHeader title="Nueva factura" />
        <EmptyState icon={ReceiptText} title="Pedido no encontrado" action={<Button asChild><Link href="/facturas/nueva">Elegir otro pedido</Link></Button>} />
      </div>
    );
  }

  const pendingLines = order.lines.filter((line) => line.quantity > line.quantityInvoiced);
  if (pendingLines.length === 0) {
    return (
      <div>
        <PageHeader title={`Facturar ${order.number}`} description={order.customer.name} />
        <EmptyState
          icon={ReceiptText}
          title="No hay cantidades pendientes"
          description="Todas las líneas de este pedido ya fueron facturadas."
          action={<Button asChild><Link href={`/pedidos/${order.id}`}>Volver al pedido</Link></Button>}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Facturar pedido ${order.number}`}
        description={`${order.customer.name} · entrega ${formatDate(order.deliveryDate)}`}
        actions={<Button asChild variant="outline"><Link href={`/pedidos/${order.id}`}>Volver al pedido</Link></Button>}
      />
      <InvoiceForm
        orderId={order.id}
        orderNumber={order.number}
        customer={order.customer.name}
        points={pointOptions}
        defaultCondition={order.customer.termDays > 0 ? "CREDITO" : "CONTADO"}
        defaultTermDays={order.customer.termDays || 30}
        lines={pendingLines.map((line) => ({
          orderLineId: line.id,
          description: `${line.variant.product.name} · Talle ${line.variant.size} · ${line.variant.color}`,
          sku: line.variant.sku,
          ordered: line.quantity,
          invoiced: line.quantityInvoiced,
          pending: line.quantity - line.quantityInvoiced,
          unitPrice: line.unitPrice,
          discountPercent: line.discountPercent,
          taxRate: line.taxRate,
        }))}
      />
    </div>
  );
}
