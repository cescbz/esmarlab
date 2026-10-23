import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Factory } from "lucide-react";
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
import { formatGs } from "@/lib/format";

export const metadata: Metadata = { title: "Ficha técnica" };

export default async function BomDetailPage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      group: true,
      bom: {
        include: {
          lines: { include: { materialVariant: { include: { product: true } } } },
          stages: { include: { stage: true, workshop: true }, orderBy: { sortOrder: "asc" } },
        },
      },
      variants: true,
    },
  });
  if (!product || !product.bom) notFound();

  const unitCost = product.bom.lines.reduce(
    (sum, line) => sum + line.quantity * (1 + line.wastePercent / 100) * line.materialVariant.product.cost,
    0
  );

  return (
    <div>
      <PageHeader
        title={`Ficha técnica · ${product.name}`}
        description={`${product.code} · ${product.group.name}`}
        actions={
          <>
            <Button asChild variant="outline"><Link href="/produccion/fichas"><ArrowLeft className="mr-1.5 h-4 w-4" />Volver</Link></Button>
            <Button asChild><Link href={`/produccion/ordenes/nueva?producto=${product.id}`}><Factory className="mr-1.5 h-4 w-4" />Crear OP</Link></Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border/80 p-4 shadow-none">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Variantes</p>
          <p className="mt-1.5 text-lg font-semibold">{product.variants.length}</p>
        </Card>
        <Card className="border-border/80 p-4 shadow-none">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Costo de materiales</p>
          <p className="mt-1.5 text-lg font-semibold tabular">{formatGs(Math.round(unitCost))}</p>
          <p className="text-[10px] text-muted-foreground">Estimado por unidad</p>
        </Card>
        <Card className="border-border/80 p-4 shadow-none">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Precio base</p>
          <p className="mt-1.5 text-lg font-semibold tabular">{formatGs(product.basePrice)}</p>
          <p className="text-[10px] text-muted-foreground">Margen bruto {product.basePrice > 0 ? Math.round(((product.basePrice - product.cost) / product.basePrice) * 100) : 0}%</p>
        </Card>
      </div>

      <Card className="mt-5 border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Materiales</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                <TableHead>Código</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Variante</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Merma</TableHead>
                <TableHead className="text-right">Costo unit.</TableHead>
                <TableHead className="text-right">Costo estimado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.bom.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="font-mono text-[10px]">{line.materialVariant.sku}</TableCell>
                  <TableCell className="text-xs font-medium">{line.materialVariant.product.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{line.materialVariant.size} · {line.materialVariant.color}</TableCell>
                  <TableCell className="text-right text-xs tabular">{line.quantity} {line.materialVariant.product.unit}</TableCell>
                  <TableCell className="text-right text-xs">{line.wastePercent}%</TableCell>
                  <TableCell className="text-right text-xs tabular">{formatGs(line.materialVariant.product.cost)}</TableCell>
                  <TableCell className="text-right text-xs font-medium tabular">
                    {formatGs(Math.round(line.quantity * (1 + line.wastePercent / 100) * line.materialVariant.product.cost))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-5 border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Etapas y talleres</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2 p-5">
          {product.bom.stages.map((stage, index) => (
            <div key={stage.id} className="flex items-center gap-2 rounded-lg border border-border/70 bg-secondary/30 px-3 py-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">{index + 1}</span>
              <div>
                <p className="text-xs font-medium">{stage.stage.name}</p>
                <p className="text-[9px] text-muted-foreground">{stage.workshop?.name ?? "Sin taller"}</p>
              </div>
              <Badge variant="outline" className="ml-2 text-[8px] uppercase">{stage.workshop?.type === "EXTERNO" ? "Externo" : "Propio"}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
