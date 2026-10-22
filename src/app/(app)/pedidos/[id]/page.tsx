import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Factory,
  MapPin,
  ReceiptText,
  Truck,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, formatGs } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pedido" };

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = await prisma.salesOrder.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      quote: true,
      lines: { include: { variant: { include: { product: true } } } },
      shipments: { orderBy: { date: "desc" }, include: { lines: true } },
      invoices: { orderBy: { issueDate: "desc" } },
      productionOrders: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();

  const units = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  const shipped = order.lines.reduce((sum, line) => sum + line.quantityShipped, 0);
  const invoiced = order.lines.reduce((sum, line) => sum + line.quantityInvoiced, 0);
  const pending = Math.max(0, units - shipped);
  const canShip = pending > 0 && !["ANULADO", "FACTURADO"].includes(order.status);
  const late = order.deliveryDate < new Date() && !["DESPACHADO", "FACTURADO", "ANULADO"].includes(order.status);

  return (
    <div>
      <PageHeader
        title={`Pedido ${order.number}`}
        description={`${order.customer.name} · ${formatDate(order.date)}${order.quote ? ` · origen ${order.quote.number}` : ""}`}
        actions={
          <>
            <Button asChild variant="outline"><Link href="/pedidos"><ArrowLeft className="mr-1.5 h-4 w-4" />Volver</Link></Button>
            {canShip ? (
              <Button asChild variant="outline">
                <Link href={`/pedidos/${order.id}/envio`}><Truck className="mr-1.5 h-4 w-4" />Crear envío</Link>
              </Button>
            ) : null}
            {order.productionOrders.length === 0 ? (
              <Button asChild variant="outline">
                <Link href={`/produccion/ordenes/nueva?pedido=${order.id}`}><Factory className="mr-1.5 h-4 w-4" />Generar OP</Link>
              </Button>
            ) : null}
            <Button asChild>
              <Link href={`/facturas/nueva?pedido=${order.id}`}><ReceiptText className="mr-1.5 h-4 w-4" />Facturar</Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={order.status} />
        {late ? (
          <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-red-600">
            Entrega atrasada
          </span>
        ) : null}
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />Entrega comprometida {formatDate(order.deliveryDate)}
        </span>
        {order.shippingAddress ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />{order.shippingAddress}
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/80 p-4 shadow-none">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total del pedido</p>
          <p className="mt-1.5 text-lg font-semibold tabular">{formatGs(order.total)}</p>
          <p className="text-[10px] text-muted-foreground">{units} unidades · {order.lines.length} líneas</p>
        </Card>
        <Card className="border-border/80 p-4 shadow-none">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Despachado</p>
          <p className="mt-1.5 text-lg font-semibold tabular">{shipped} / {units}</p>
          <Progress value={units ? (shipped / units) * 100 : 0} className="mt-2 h-1.5" />
        </Card>
        <Card className="border-border/80 p-4 shadow-none">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Facturado</p>
          <p className="mt-1.5 text-lg font-semibold tabular">{invoiced} / {units}</p>
          <Progress value={units ? (invoiced / units) * 100 : 0} className="mt-2 h-1.5" />
        </Card>
        <Card className="border-border/80 p-4 shadow-none">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Pendiente de envío</p>
          <p className={cn("mt-1.5 text-lg font-semibold tabular", pending > 0 ? "text-amber-700" : "text-emerald-700")}>{pending}</p>
          <p className="text-[10px] text-muted-foreground">{canShip ? "Podés crear un envío parcial" : "Sin pendientes"}</p>
        </Card>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5">
              <CardTitle className="text-sm font-semibold">Líneas del pedido</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Pedido</TableHead>
                    <TableHead className="text-right">Despachado</TableHead>
                    <TableHead className="text-right">Facturado</TableHead>
                    <TableHead className="text-right">Precio unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <p className="text-xs font-medium">{line.variant.product.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {line.variant.size} · {line.variant.color} · {line.variant.sku}
                          {line.isCustomized ? " · Personalizado" : ""}
                        </p>
                      </TableCell>
                      <TableCell className="text-right text-xs tabular">{line.quantity}</TableCell>
                      <TableCell className="text-right text-xs tabular">{line.quantityShipped}</TableCell>
                      <TableCell className="text-right text-xs tabular">{line.quantityInvoiced}</TableCell>
                      <TableCell className="text-right text-xs tabular">{formatGs(line.unitPrice)}</TableCell>
                      <TableCell className="text-right text-xs font-medium tabular">{formatGs(line.lineTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5">
              <CardTitle className="text-sm font-semibold">Envíos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {order.shipments.length === 0 ? (
                <EmptyState icon={Truck} title="Sin envíos" description="Creá un envío parcial o total para descontar stock." className="border-0" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                      <TableHead>Remisión</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Transportista</TableHead>
                      <TableHead className="text-right">Unidades</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.shipments.map((shipment) => (
                      <TableRow key={shipment.id}>
                        <TableCell className="font-mono text-xs">{shipment.number}</TableCell>
                        <TableCell className="text-xs">{formatDate(shipment.date)}</TableCell>
                        <TableCell className="text-xs">{shipment.carrier}</TableCell>
                        <TableCell className="text-right text-xs tabular">{shipment.lines.reduce((sum, line) => sum + line.quantity, 0)}</TableCell>
                        <TableCell><StatusBadge status={shipment.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5">
              <CardTitle className="text-sm font-semibold">Facturas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {order.invoices.length === 0 ? (
                <EmptyState icon={ReceiptText} title="Sin facturas" description="Este pedido todavía no tiene comprobantes." className="border-0" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                      <TableHead>Número</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Condición</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <Link href={`/facturas/${invoice.id}`} className="font-mono text-xs hover:text-primary hover:underline">{invoice.number}</Link>
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(invoice.issueDate)}</TableCell>
                        <TableCell className="text-xs">{invoice.condition === "CONTADO" ? "Contado" : `Crédito ${invoice.termDays}d`}</TableCell>
                        <TableCell className="text-right text-xs tabular">{formatGs(invoice.total)}</TableCell>
                        <TableCell><StatusBadge status={invoice.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5">
              <CardTitle className="text-sm font-semibold">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-5 text-xs">
              <p className="text-sm font-semibold">{order.customer.name}</p>
              <p className="text-muted-foreground">{order.customer.city}</p>
              <p className="text-muted-foreground">{order.customer.phone ?? "—"}</p>
              <p className="text-muted-foreground">{order.customer.email ?? "—"}</p>
              <Button asChild variant="outline" size="sm" className="mt-2 h-7 text-xs">
                <Link href={`/clientes/${order.customerId}`}>Ver ficha del cliente</Link>
              </Button>
            </CardContent>
          </Card>

          {order.observations ? (
            <Card className="border-border/80 shadow-none">
              <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Observaciones</CardTitle></CardHeader>
              <CardContent className="p-5 text-xs leading-relaxed text-muted-foreground">{order.observations}</CardContent>
            </Card>
          ) : null}

          {order.productionOrders.length > 0 ? (
            <Card className="border-border/80 shadow-none">
              <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Producción</CardTitle></CardHeader>
              <CardContent className="space-y-2 p-5">
                {order.productionOrders.map((op) => (
                  <Button key={op.id} asChild variant="outline" className="w-full justify-start text-xs">
                    <Link href={`/produccion/ordenes/${op.id}`}>
                      <Factory className="mr-2 h-3.5 w-3.5" />{op.number} · {op.status}
                    </Link>
                  </Button>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
