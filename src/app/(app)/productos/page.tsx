import type { Metadata } from "next";
import { Boxes, Plus } from "lucide-react";
import { ProductType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { FilterSelect } from "@/components/shared/filter-select";
import { Button } from "@/components/ui/button";
import { ProductsTable, type ProductRow } from "./products-table";
import { ProductFormModal } from "./product-form-modal";

export const metadata: Metadata = { title: "Productos" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { grupo?: string; tipo?: string; estado?: string };
}) {
  const [products, groups] = await Promise.all([
    prisma.product.findMany({
      where: {
        ...(searchParams.grupo ? { groupId: searchParams.grupo } : {}),
        ...(searchParams.tipo ? { type: searchParams.tipo as ProductType } : {}),
        ...(searchParams.estado === "activos"
          ? { active: true }
          : searchParams.estado === "inactivos"
            ? { active: false }
            : {}),
      },
      include: {
        group: { select: { name: true } },
        variants: {
          select: {
            id: true,
            size: true,
            color: true,
            sku: true,
            priceOverride: true,
            stockLevels: { select: { quantity: true } },
          },
        },
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.productGroup.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const rows: ProductRow[] = products.map((product) => ({
    id: product.id,
    code: product.code,
    name: product.name,
    group: product.group.name,
    type: product.type,
    unit: product.unit,
    basePrice: product.basePrice,
    stock: product.variants.reduce(
      (sum, variant) => sum + variant.stockLevels.reduce((acc, level) => acc + level.quantity, 0),
      0
    ),
    minStock: product.minStock,
    variants: product.variants.length,
    active: product.active,
    groupId: product.groupId,
    taxRate: product.taxRate,
    cost: product.cost,
    variantsData: product.variants.map((variant) => ({
      id: variant.id,
      size: variant.size,
      color: variant.color,
      sku: variant.sku,
      priceOverride: variant.priceOverride,
    })),
  }));

  const lowCount = rows.filter((row) => row.stock < row.minStock).length;

  return (
    <div>
      <PageHeader
        title="Productos"
        description="Catálogo de uniformes, calzado, EPP y materia prima. Los precios se cargan con IVA incluido."
        actions={
          <ProductFormModal
            groups={groups}
            trigger={<Button><Plus className="mr-1.5 h-4 w-4" />Nuevo producto</Button>}
          />
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Productos listados</p>
          <p className="mt-1 text-xl font-semibold">{rows.length}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Variantes</p>
          <p className="mt-1 text-xl font-semibold">{rows.reduce((sum, row) => sum + row.variants, 0)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Bajo stock mínimo</p>
          <p className="mt-1 text-xl font-semibold text-red-600">{lowCount}</p>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white px-6 py-16 text-center">
          <Boxes className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">No hay productos</p>
          <p className="mt-1 text-xs text-muted-foreground">Creá el primer producto del catálogo.</p>
          <ProductFormModal groups={groups} trigger={<Button className="mt-4">Nuevo producto</Button>} />
        </div>
      ) : (
        <ProductsTable
          data={rows}
          groups={groups}
          toolbar={
            <>
              <FilterSelect
                name="grupo"
                label="Grupo"
                options={[
                  { value: "todos", label: "Todos" },
                  ...groups.map((group) => ({ value: group.id, label: group.name })),
                ]}
              />
              <FilterSelect
                name="tipo"
                label="Tipo"
                options={[
                  { value: "todos", label: "Todos" },
                  { value: "FABRICADO", label: "Fabricado" },
                  { value: "REVENTA_LOCAL", label: "Reventa local" },
                  { value: "REVENTA_IMPORTADO", label: "Importado" },
                  { value: "MATERIA_PRIMA", label: "Materia prima" },
                ]}
              />
              <FilterSelect
                name="estado"
                label="Estado"
                options={[
                  { value: "todos", label: "Todos" },
                  { value: "activos", label: "Activos" },
                  { value: "inactivos", label: "Inactivos" },
                ]}
              />
            </>
          }
        />
      )}
    </div>
  );
}
