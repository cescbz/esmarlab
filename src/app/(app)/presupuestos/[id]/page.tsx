import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
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
import { formatRuc } from "@/lib/fiscal";
import { QuoteActions } from "./quote-actions";

export const metadata: Metadata = { title: "Presupuesto" };

export default async function QuoteDetailPage({ params }: { params: { id: string } }) {
  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      lines: { include: { variant: { include: { product: true } } } },
      orders: true,
    },
  });
  if (!quote) notFound();

  const iva = quote.lines.reduce((sum, line) => {
    if (line.taxRate === 10) return sum + Math.round(line.lineTotal / 11);
    if (line.taxRate === 5) return sum + Math.round(line.lineTotal / 21);
    return sum;
  }, 0);
  const canEdit = ["BORRADOR", "ENVIADO"].includes(quote.status);

  return (
    <div>
      <PageHeader
        title={`Presupuesto ${quote.number}`}
        description={`${quote.customer.name} · ${formatDate(quote.date)} · válido ${quote.validityDays} días`}
        actions={
          <>
            <Button asChild variant="outline"><Link href="/presupuestos"><ArrowLeft className="mr-1.5 h-4 w-4" />Volver</Link></Button>
            {canEdit ? (
              <Button asChild variant="outline"><Link href={`/presupuestos/${quote.id}/editar`}><Pencil className="mr-1.5 h-4 w-4" />Editar</Link></Button>
            ) : null}
            <QuoteActions quoteId={quote.id} status={quote.status} hasOrder={quote.orders.length > 0} orderId={quote.orders[0]?.id} />
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={quote.status} />
        {quote.orders.map((order) => (
          <Button key={order.id} asChild variant="outline" size="sm" className="h-7 text-xs">
            <Link href={`/pedidos/${order.id}`}><FileText className="mr-1 h-3 w-3" />Pedido {order.number}</Link>
          </Button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5">
            <CardTitle className="text-sm font-semibold">Detalle</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                  <TableHead>Código</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio unit.</TableHead>
                  <TableHead className="text-right">Desc.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quote.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-mono text-[10px]">{line.variant.sku}</TableCell>
                    <TableCell>
                      <p className="text-xs font-medium">{line.variant.product.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {line.variant.size} · {line.variant.color}
                        {line.isCustomized ? ` · ${line.customizationDetail ?? "Personalizado"}` : ""}
                      </p>
                    </TableCell>
                    <TableCell className="text-right text-xs tabular">{line.quantity}</TableCell>
                    <TableCell className="text-right text-xs tabular">{formatGs(line.unitPrice)}</TableCell>
                    <TableCell className="text-right text-xs">{line.discountPercent}%</TableCell>
                    <TableCell className="text-right text-xs font-medium tabular">{formatGs(line.lineTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5">
              <CardTitle className="text-sm font-semibold">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-5 text-xs">
              <p className="text-sm font-semibold">{quote.customer.name}</p>
              <p className="text-muted-foreground">RUC {formatRuc(quote.customer.rucBase, quote.customer.dv)}</p>
              <p className="text-muted-foreground">{[quote.customer.address, quote.customer.city].filter(Boolean).join(", ")}</p>
              <p className="text-muted-foreground">{quote.customer.phone ?? "—"}</p>
              <p className="text-muted-foreground">{quote.customer.email ?? "—"}</p>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5">
              <CardTitle className="text-sm font-semibold">Totales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular">{formatGs(quote.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">IVA incluido</span><span className="tabular">{formatGs(iva)}</span></div>
              <div className="flex justify-between border-t border-border/60 pt-2 text-sm font-semibold"><span>Total</span><span className="tabular">{formatGs(quote.total)}</span></div>
              <p className="pt-1 text-[10px] leading-relaxed text-muted-foreground">Precios con IVA incluido. Documento demo sin validez fiscal.</p>
            </CardContent>
          </Card>

          {quote.observations ? (
            <Card className="border-border/80 shadow-none">
              <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Observaciones</CardTitle></CardHeader>
              <CardContent className="p-5 text-xs leading-relaxed text-muted-foreground">{quote.observations}</CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
