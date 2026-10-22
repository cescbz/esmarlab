import type { Metadata } from "next";
import { Warehouse as WarehouseIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatGs, formatNumber } from "@/lib/format";
import { WarehouseDialog } from "./warehouse-dialog";

export const metadata: Metadata = { title: "Depósitos" };

const TYPE_LABEL: Record<string, string> = {
  CENTRAL: "Depósito central",
  MATERIA_PRIMA: "Materia prima",
  TERMINADO: "Producto terminado",
  SHOWROOM: "Showroom",
};

export default async function WarehousesPage() {
  const warehouses = await prisma.warehouse.findMany({
    orderBy: { name: "asc" },
    include: {
      stockLevels: { include: { variant: { include: { product: true } } } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Depósitos"
        description="Ubicaciones físicas de stock. Cada movimiento queda asociado a un depósito."
        actions={<WarehouseDialog />}
      />

      {warehouses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white px-6 py-16 text-center">
          <WarehouseIcon className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">No hay depósitos</p>
          <p className="mt-1 text-xs text-muted-foreground">Creá el primer depósito para comenzar.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {warehouses.map((warehouse) => {
            const units = warehouse.stockLevels.reduce((sum, level) => sum + level.quantity, 0);
            const value = warehouse.stockLevels.reduce(
              (sum, level) => sum + level.quantity * level.variant.product.cost,
              0
            );
            return (
              <Card key={warehouse.id} className="border-border/80 shadow-none">
                <CardHeader className="flex-row items-start justify-between border-b border-border/60 px-4 py-3">
                  <div>
                    <CardTitle className="text-sm font-semibold">{warehouse.name}</CardTitle>
                    <p className="mt-1 text-[11px] text-muted-foreground">{TYPE_LABEL[warehouse.type] ?? warehouse.type}</p>
                  </div>
                  <Badge className={warehouse.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}>
                    {warehouse.active ? "Activo" : "Inactivo"}
                  </Badge>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Unidades</p>
                      <p className="mt-0.5 text-lg font-semibold tabular">{formatNumber(units)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Valorizado</p>
                      <p className="mt-0.5 text-sm font-semibold tabular">{formatGs(value)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
                    <span className="text-[11px] text-muted-foreground">
                      {warehouse.stockLevels.length} variantes con stock
                    </span>
                    <WarehouseDialog
                      warehouse={{
                        id: warehouse.id,
                        name: warehouse.name,
                        type: warehouse.type,
                        active: warehouse.active,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
