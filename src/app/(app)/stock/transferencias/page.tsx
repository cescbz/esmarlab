import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ArrowLeftRight } from "lucide-react";
import { formatDate } from "@/lib/format";
import { TransferForm } from "./transfer-form";

export const metadata: Metadata = { title: "Transferencias de stock" };

export default async function TransfersPage() {
  const [products, warehouses, movements] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      include: { variants: { where: { active: true }, orderBy: [{ size: "asc" }, { color: "asc" }] } },
      orderBy: { name: "asc" },
    }),
    prisma.warehouse.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.stockMovement.findMany({
      where: { type: { in: ["TRANSFERENCIA_SALIDA", "TRANSFERENCIA_ENTRADA"] } },
      include: { variant: { include: { product: true } }, warehouse: true },
      orderBy: { date: "desc" },
      take: 300,
    }),
  ]);

  const transfers = new Map<
    string,
    {
      reference: string;
      date: Date;
      product: string;
      variant: string;
      sku: string;
      from: string;
      to: string;
      quantity: number;
    }
  >();
  for (const movement of movements) {
    const reference = movement.originId ?? movement.id;
    const existing = transfers.get(reference);
    if (!existing) {
      transfers.set(reference, {
        reference,
        date: movement.date,
        product: movement.variant.product.name,
        variant: `${movement.variant.size} · ${movement.variant.color}`,
        sku: movement.variant.sku,
        from: movement.type === "TRANSFERENCIA_SALIDA" ? movement.warehouse.name : "—",
        to: movement.type === "TRANSFERENCIA_ENTRADA" ? movement.warehouse.name : "—",
        quantity: movement.quantity,
      });
    } else {
      if (movement.type === "TRANSFERENCIA_SALIDA") existing.from = movement.warehouse.name;
      if (movement.type === "TRANSFERENCIA_ENTRADA") existing.to = movement.warehouse.name;
    }
  }
  const rows = Array.from(transfers.values()).slice(0, 30);

  return (
    <div>
      <PageHeader
        title="Transferencias"
        description="Movimientos entre depósitos. El stock se descuenta del origen y se suma al destino en una sola transacción."
      />

      <TransferForm
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
          variants: product.variants.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
          })),
        }))}
        warehouses={warehouses.map((warehouse) => ({ id: warehouse.id, name: warehouse.name }))}
      />

      <Card className="mt-5 border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-3.5">
          <CardTitle className="text-sm font-semibold">Transferencias recientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <EmptyState icon={ArrowLeftRight} title="Sin transferencias" description="Las transferencias que registres aparecerán acá." className="border-0" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hacia</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Referencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.reference}>
                    <TableCell className="text-xs">{formatDate(row.date)}</TableCell>
                    <TableCell>
                      <p className="text-xs font-medium">{row.product}</p>
                      <p className="text-[10px] text-muted-foreground">{row.variant} · {row.sku}</p>
                    </TableCell>
                    <TableCell className="text-xs">{row.from}</TableCell>
                    <TableCell className="text-xs">{row.to}</TableCell>
                    <TableCell className="text-right text-xs font-medium tabular">{row.quantity}</TableCell>
                    <TableCell className="font-mono text-[10px]">{row.reference}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
