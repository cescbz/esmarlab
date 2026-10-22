import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PackageCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatGs } from "@/lib/format";
import { PurchaseActions } from "./purchase-actions";

export const metadata: Metadata = { title: "Recepción de compra" };

export default async function PurchaseDetailPage({ params }: { params: { id: string } }) {
  const receipt = await prisma.purchaseReceipt.findUnique({
    where: { id: params.id },
    include: {
      supplier: true,
      warehouse: true,
      lines: { include: { variant: { include: { product: true } } } },
    },
  });
  if (!receipt) notFound();

  const units = receipt.lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div>
      <PageHeader
        title={`Recepción ${receipt.number}`}
        description={`Factura proveedor ${receipt.supplierInvoiceNumber} · ${receipt.supplier.name}`}
        actions={
          <>
            <Button asChild variant="outline"><Link href="/compras"><ArrowLeft className="mr-1.5 h-4 w-4" />Volver</Link></Button>
            <PurchaseActions receiptId={receipt.id} status={receipt.status} />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/80 p-4 shadow-none">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Estado</p>
          <div className="mt-2"><StatusBadge status={receipt.status} /></div>
        </Card>
        <Card className="border-border/80 p-4 shadow-none">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Fecha</p>
          <p className="mt-1.5 text-sm font-semibold">{formatDate(receipt.date)}</p>
        </Card>
        <Card className="border-border/80 p-4 shadow-none">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Depósito destino</p>
          <p className="mt-1.5 text-sm font-semibold">{receipt.warehouse.name}</p>
        </Card>
        <Card className="border-border/80 p-4 shadow-none">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total recibido</p>
          <p className="mt-1.5 text-lg font-semibold tabular">{formatGs(receipt.total)}</p>
          <p className="text-[10px] text-muted-foreground">{units} unidades</p>
        </Card>
      </div>

      {receipt.status === "BORRADOR" ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <PackageCheck className="h-4 w-4 shrink-0" />
          Esta recepción aún no impactó el stock. Confirmala para generar las entradas y actualizar el costo promedio.
        </div>
      ) : null}

      <Card className="mt-5 border-border/80 shadow-none">
        <CardHeader className="flex-row items-center justify-between border-b border-border/60 px-5 py-3.5">
          <CardTitle className="text-sm font-semibold">Detalle de mercadería</CardTitle>
          <Badge variant="outline" className="text-[10px]">{receipt.lines.length} líneas</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                <TableHead>Producto</TableHead>
                <TableHead>Variante</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Costo unit.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipt.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="text-xs font-medium">{line.variant.product.name}</TableCell>
                  <TableCell className="text-xs">{line.variant.size} · {line.variant.color}</TableCell>
                  <TableCell className="font-mono text-[11px]">{line.variant.sku}</TableCell>
                  <TableCell className="text-right text-xs tabular">{line.quantity}</TableCell>
                  <TableCell className="text-right text-xs tabular">{formatGs(line.unitCost)}</TableCell>
                  <TableCell className="text-right text-xs font-medium tabular">{formatGs(line.lineTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end border-t border-border/60 px-5 py-3">
            <div className="flex items-center gap-6 text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="text-base font-semibold tabular">{formatGs(receipt.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
