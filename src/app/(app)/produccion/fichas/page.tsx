import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, Factory } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatGs } from "@/lib/format";

export const metadata: Metadata = { title: "Fichas técnicas" };

export default async function BomsPage() {
  const products = await prisma.product.findMany({
    where: { type: "FABRICADO", active: true },
    include: {
      bom: {
        include: {
          lines: { include: { materialVariant: { include: { product: true } } } },
          stages: { include: { stage: true, workshop: true }, orderBy: { sortOrder: "asc" } },
        },
      },
      variants: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Fichas técnicas"
        description="Materiales, mermas y etapas de producción por producto fabricado."
        actions={
          <Button asChild variant="outline">
            <Link href="/produccion/ordenes"><Factory className="mr-1.5 h-4 w-4" />Órdenes de producción</Link>
          </Button>
        }
      />

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white px-6 py-16 text-center">
          <BookOpenCheck className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">No hay productos fabricados</p>
          <p className="mt-1 text-xs text-muted-foreground">Creá un producto fabricado para definir su ficha técnica.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const materialCost = product.bom?.lines.reduce(
              (sum, line) => sum + line.quantity * (1 + line.wastePercent / 100) * line.materialVariant.product.cost,
              0
            ) ?? 0;
            return (
              <Card key={product.id} className="border-border/80 shadow-none transition-colors hover:border-primary/25">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{product.name}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{product.code}</p>
                    </div>
                    <Badge variant="outline" className="border-teal-200 bg-teal-50 text-[9px] uppercase text-teal-700">
                      {product.variants.length} variantes
                    </Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-secondary/40 px-2 py-2">
                      <p className="text-[9px] uppercase text-muted-foreground">Materiales</p>
                      <p className="mt-0.5 text-lg font-semibold">{product.bom?.lines.length ?? 0}</p>
                    </div>
                    <div className="rounded-lg bg-secondary/40 px-2 py-2">
                      <p className="text-[9px] uppercase text-muted-foreground">Etapas</p>
                      <p className="mt-0.5 text-lg font-semibold">{product.bom?.stages.length ?? 0}</p>
                    </div>
                    <div className="rounded-lg bg-secondary/40 px-2 py-2">
                      <p className="text-[9px] uppercase text-muted-foreground">Costo unit.</p>
                      <p className="mt-0.5 text-[11px] font-semibold tabular">{formatGs(Math.round(materialCost))}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {product.bom?.stages.slice(0, 4).map((stage) => (
                      <span key={stage.id} className="rounded-full border border-border/70 px-2 py-0.5 text-[9px] text-muted-foreground">
                        {stage.stage.name}
                      </span>
                    ))}
                    {(product.bom?.stages.length ?? 0) > 4 ? (
                      <span className="rounded-full border border-border/70 px-2 py-0.5 text-[9px] text-muted-foreground">
                        +{(product.bom?.stages.length ?? 0) - 4}
                      </span>
                    ) : null}
                  </div>
                  <Button asChild variant="ghost" size="sm" className="mt-3 h-7 px-2 text-xs">
                    <Link href={`/produccion/fichas/${product.id}`}>
                      Ver ficha <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
