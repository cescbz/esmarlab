import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpenCheck,
  Boxes,
  Layers,
  Pencil,
  Shirt,
  Tags,
  Warehouse,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { EmptyState } from "@/components/shared/empty-state";
import { formatGs, formatNumber } from "@/lib/format";
import { ProductFormModal } from "../product-form-modal";

export const metadata: Metadata = { title: "Ficha de producto" };

const TYPE_LABEL: Record<string, string> = {
  FABRICADO: "Fabricado",
  REVENTA_LOCAL: "Reventa local",
  REVENTA_IMPORTADO: "Importado",
  MATERIA_PRIMA: "Materia prima",
};

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const [product, groups] = await Promise.all([
    prisma.product.findUnique({
      where: { id: params.id },
    include: {
      group: true,
      variants: {
        orderBy: [{ size: "asc" }, { color: "asc" }],
        include: { stockLevels: { include: { warehouse: true } }, priceItems: { include: { priceList: true } } },
      },
      bom: {
        include: {
          lines: {
            include: {
              materialVariant: { include: { product: true } },
            },
          },
          stages: { include: { stage: true, workshop: true }, orderBy: { sortOrder: "asc" } },
        },
      },
      productionOrders: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    }),
    prisma.productGroup.findMany({ select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!product) notFound();

  const variants = product.variants.map((variant) => ({
    ...variant,
    stock: variant.stockLevels.reduce((sum, level) => sum + level.quantity, 0),
  }));
  const totalStock = variants.reduce((sum, variant) => sum + variant.stock, 0);
  const colors = Array.from(new Set(variants.map((variant) => variant.color)));
  const sizes = Array.from(new Set(variants.map((variant) => variant.size)));
  const lowStock = totalStock < product.minStock;
  const margin = product.basePrice > 0 ? Math.round(((product.basePrice - product.cost) / product.basePrice) * 100) : 0;

  const warehouseRows = product.variants.flatMap((variant) =>
    variant.stockLevels.map((level) => ({
      variant,
      warehouse: level.warehouse,
      quantity: level.quantity,
    }))
  );

  const priceRows = product.variants[0]?.priceItems.map((item) => {
    const sameList = product.variants.map((variant) =>
      variant.priceItems.find((price) => price.priceListId === item.priceListId)
    );
    const minPrice = Math.min(...sameList.map((entry) => entry?.price ?? 0));
    const maxPrice = Math.max(...sameList.map((entry) => entry?.price ?? 0));
    return {
      id: item.priceListId,
      name: item.priceList.name,
      discount: item.discountPercent,
      minPrice,
      maxPrice,
    };
  }) ?? [];

  const materialCost = product.bom?.lines.reduce((sum, line) => {
    return sum + line.quantity * (1 + line.wastePercent / 100) * line.materialVariant.product.cost;
  }, 0) ?? 0;

  return (
    <div>
      <PageHeader
        title={product.name}
        description={`${product.code} · ${product.group.name}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/productos"><ArrowLeft className="mr-1.5 h-4 w-4" />Volver</Link>
            </Button>
            <ProductFormModal
              groups={groups}
              product={{
                id: product.id,
                code: product.code,
                name: product.name,
                groupId: product.groupId,
                type: product.type,
                unit: product.unit,
                taxRate: product.taxRate,
                cost: product.cost,
                basePrice: product.basePrice,
                minStock: product.minStock,
                active: product.active,
                variants: product.variants.map((variant) => ({
                  id: variant.id,
                  size: variant.size,
                  color: variant.color,
                  sku: variant.sku,
                  priceOverride: variant.priceOverride,
                })),
              }}
              trigger={<Button><Pencil className="mr-1.5 h-4 w-4" />Editar</Button>}
            />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/80 p-4 shadow-none">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tipo</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline" className="border-teal-200 bg-teal-50 text-[10px] uppercase text-teal-700">
              {TYPE_LABEL[product.type]}
            </Badge>
            <span className="text-xs text-muted-foreground">{product.unit}</span>
          </div>
        </Card>
        <Card className="border-border/80 p-4 shadow-none">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Precio base</p>
          <p className="mt-1.5 text-lg font-semibold tabular">{formatGs(product.basePrice)}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Costo {formatGs(product.cost)} · margen {margin}%</p>
        </Card>
        <Card className="border-border/80 p-4 shadow-none">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Stock total</p>
          <p className={`mt-1.5 text-lg font-semibold tabular ${lowStock ? "text-red-600" : ""}`}>
            {formatNumber(totalStock)}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Mínimo {product.minStock} · {variants.length} variantes</p>
        </Card>
        <Card className="border-border/80 p-4 shadow-none">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Costo de materiales</p>
          <p className="mt-1.5 text-lg font-semibold tabular">{product.bom ? formatGs(Math.round(materialCost)) : "—"}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Estimado por unidad</p>
        </Card>
      </div>

      <Tabs defaultValue="variantes" className="mt-6">
        <TabsList className="h-9 bg-secondary/60">
          <TabsTrigger value="variantes" className="text-xs">Variantes</TabsTrigger>
          <TabsTrigger value="stock" className="text-xs">Stock</TabsTrigger>
          <TabsTrigger value="precios" className="text-xs">Precios</TabsTrigger>
          {product.type === "FABRICADO" ? (
            <TabsTrigger value="ficha" className="text-xs">Ficha técnica</TabsTrigger>
          ) : null}
          <TabsTrigger value="produccion" className="text-xs">Producción</TabsTrigger>
        </TabsList>

        <TabsContent value="variantes" className="mt-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Layers className="h-4 w-4 text-muted-foreground" />
                Grilla talla × color
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {colors.length > 1 && sizes.length > 1 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                        <TableHead className="w-24">Talle</TableHead>
                        {colors.map((color) => (
                          <TableHead key={color} className="text-center">{color}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sizes.map((size) => (
                        <TableRow key={size}>
                          <TableCell className="font-medium">{size}</TableCell>
                          {colors.map((color) => {
                            const variant = variants.find((item) => item.size === size && item.color === color);
                            return (
                              <TableCell key={color} className="text-center">
                                {variant ? (
                                  <div title={variant.sku} className="inline-flex min-w-[52px] flex-col rounded-md border border-border/70 px-2 py-1">
                                    <span className="text-xs font-medium tabular">{variant.stock}</span>
                                    <span className="text-[9px] text-muted-foreground">stock</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                      <TableHead>Talle</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.map((variant) => (
                      <TableRow key={variant.id}>
                        <TableCell className="text-xs">{variant.size}</TableCell>
                        <TableCell className="text-xs">{variant.color}</TableCell>
                        <TableCell className="font-mono text-[11px]">{variant.sku}</TableCell>
                        <TableCell className="text-right text-xs tabular">{variant.stock}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="mt-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="flex-row items-center justify-between border-b border-border/60 px-5 py-3.5">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Warehouse className="h-4 w-4 text-muted-foreground" />
                Stock por depósito
              </CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link href={`/stock/movimientos?producto=${product.id}`}>Ver kardex</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {warehouseRows.length === 0 ? (
                <EmptyState icon={Boxes} title="Sin stock registrado" description="No hay existencias cargadas para este producto." className="border-0" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                      <TableHead>Variante</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Depósito</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouseRows.map((row, index) => (
                      <TableRow key={`${row.variant.id}-${row.warehouse.id}-${index}`}>
                        <TableCell className="text-xs">{row.variant.size} · {row.variant.color}</TableCell>
                        <TableCell className="font-mono text-[11px]">{row.variant.sku}</TableCell>
                        <TableCell className="text-xs">{row.warehouse.name}</TableCell>
                        <TableCell className="text-right text-xs font-medium tabular">{row.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="precios" className="mt-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Tags className="h-4 w-4 text-muted-foreground" />
                Precios por lista
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                    <TableHead>Lista</TableHead>
                    <TableHead className="text-right">Descuento</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs font-medium">{row.name}</TableCell>
                      <TableCell className="text-right text-xs">{row.discount}%</TableCell>
                      <TableCell className="text-right text-xs tabular">
                        {row.minPrice === row.maxPrice
                          ? formatGs(row.minPrice)
                          : `${formatGs(row.minPrice)} — ${formatGs(row.maxPrice)}`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {product.type === "FABRICADO" ? (
          <TabsContent value="ficha" className="mt-4 space-y-4">
            {product.bom ? (
              <>
                <Card className="border-border/80 shadow-none">
                  <CardHeader className="border-b border-border/60 px-5 py-3.5">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <BookOpenCheck className="h-4 w-4 text-muted-foreground" />
                      Materiales
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                          <TableHead>Material</TableHead>
                          <TableHead>Variante</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead className="text-right">Merma</TableHead>
                          <TableHead className="text-right">Costo estimado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {product.bom.lines.map((line) => (
                          <TableRow key={line.id}>
                            <TableCell className="text-xs font-medium">{line.materialVariant.product.name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {line.materialVariant.color} · {line.materialVariant.size}
                            </TableCell>
                            <TableCell className="text-right text-xs tabular">
                              {line.quantity} {line.materialVariant.product.unit}
                            </TableCell>
                            <TableCell className="text-right text-xs">{line.wastePercent}%</TableCell>
                            <TableCell className="text-right text-xs tabular">
                              {formatGs(Math.round(line.quantity * (1 + line.wastePercent / 100) * line.materialVariant.product.cost))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="border-border/80 shadow-none">
                  <CardHeader className="border-b border-border/60 px-5 py-3.5">
                    <CardTitle className="text-sm font-semibold">Etapas de producción</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2 p-5">
                    {product.bom.stages.map((stage, index) => (
                      <div key={stage.id} className="flex items-center gap-2 rounded-full border border-border/70 bg-secondary/30 px-3 py-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
                          {index + 1}
                        </span>
                        <span className="text-xs font-medium">{stage.stage.name}</span>
                        <span className="text-[10px] text-muted-foreground">{stage.workshop?.name}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            ) : (
              <EmptyState
                icon={Shirt}
                title="Sin ficha técnica"
                description="Este producto fabricado todavía no tiene materiales ni etapas definidas."
                action={<Button asChild><Link href="/produccion/fichas">Ir a fichas técnicas</Link></Button>}
              />
            )}
          </TabsContent>
        ) : null}

        <TabsContent value="produccion" className="mt-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5">
              <CardTitle className="text-sm font-semibold">Órdenes de producción recientes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {product.productionOrders.length === 0 ? (
                <EmptyState icon={Shirt} title="Sin órdenes de producción" description="Las OPs de este producto aparecerán acá." className="border-0" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                      <TableHead>OP</TableHead>
                      <TableHead>Inicio</TableHead>
                      <TableHead>Compromiso</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.productionOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Link href={`/produccion/ordenes/${order.id}`} className="font-mono text-xs hover:text-primary hover:underline">
                            {order.number}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs">{order.startDate.toLocaleDateString("es-PY")}</TableCell>
                        <TableCell className="text-xs">{order.dueDate.toLocaleDateString("es-PY")}</TableCell>
                        <TableCell className="text-right text-xs tabular">{order.quantity}</TableCell>
                        <TableCell className="text-xs">{order.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
