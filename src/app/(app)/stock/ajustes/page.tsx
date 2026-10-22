import type { Metadata } from "next";
import { SlidersHorizontal } from "lucide-react";
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
import { formatDate } from "@/lib/format";
import { AdjustmentForm } from "./adjustment-form";

export const metadata: Metadata = { title: "Ajustes de inventario" };

export default async function AdjustmentsPage() {
  const [products, warehouses, movements] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      include: { variants: { where: { active: true }, orderBy: [{ size: "asc" }, { color: "asc" }] } },
      orderBy: { name: "asc" },
    }),
    prisma.warehouse.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.stockMovement.findMany({
      where: { type: { in: ["AJUSTE_POSITIVO", "AJUSTE_NEGATIVO"] } },
      include: { variant: { include: { product: true } }, warehouse: true },
      orderBy: { date: "desc" },
      take: 40,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Ajustes de inventario"
        description="Correcciones por inventario físico, rotura, pérdida u otros motivos. Quedan registradas en el kardex."
      />

      <AdjustmentForm
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
          <CardTitle className="text-sm font-semibold">Ajustes recientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {movements.length === 0 ? (
            <EmptyState icon={SlidersHorizontal} title="Sin ajustes" description="Los ajustes que registres aparecerán acá." className="border-0" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Depósito</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="text-xs">{formatDate(movement.date)}</TableCell>
                    <TableCell>
                      <span className={`text-[10px] font-semibold uppercase ${movement.type === "AJUSTE_POSITIVO" ? "text-emerald-700" : "text-red-600"}`}>
                        {movement.type === "AJUSTE_POSITIVO" ? "Positivo" : "Negativo"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-medium">{movement.variant.product.name}</p>
                      <p className="text-[10px] text-muted-foreground">{movement.variant.size} · {movement.variant.color}</p>
                    </TableCell>
                    <TableCell className="text-xs">{movement.warehouse.name}</TableCell>
                    <TableCell className="text-right text-xs font-medium tabular">{movement.quantity}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{movement.originId}</TableCell>
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
