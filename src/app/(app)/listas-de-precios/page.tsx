import type { Metadata } from "next";
import { ArrowRight, Plus, Star, Tags } from "lucide-react";
import { PriceListFormModal } from "./price-list-form-modal";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Listas de precios" };

export default async function PriceListsPage() {
  const lists = await prisma.priceList.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: { _count: { select: { items: true, customers: true } }, items: { take: 1, select: { discountPercent: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Listas de precios"
        description="Precios diferenciados por tipo de cliente. Los precios se cargan con IVA incluido."
        actions={<PriceListFormModal trigger={<Button><Plus className="mr-1.5 h-4 w-4" />Nueva lista</Button>} />}
      />

      {lists.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white px-6 py-16 text-center">
          <Tags className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">No hay listas de precios</p>
          <p className="mt-1 text-xs text-muted-foreground">Creá la primera lista para asignar a tus clientes.</p>
          <PriceListFormModal trigger={<Button className="mt-4">Nueva lista</Button>} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lists.map((list) => (
            <Card key={list.id} className="border-border/80 shadow-none">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold">{list.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{list.description ?? "Sin descripción"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {list.isDefault ? (
                      <Badge className="border-amber-200 bg-amber-50 text-[9px] uppercase text-amber-700">
                        <Star className="mr-1 h-3 w-3" />Predeterminada
                      </Badge>
                    ) : null}
                    <Badge className={list.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}>
                      {list.active ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-secondary/40 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Ítems</p>
                    <p className="mt-0.5 text-lg font-semibold">{list._count.items}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/40 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Clientes</p>
                    <p className="mt-0.5 text-lg font-semibold">{list._count.customers}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                  <PriceListFormModal
                    list={{
                      id: list.id,
                      name: list.name,
                      description: list.description,
                      discountPercent: list.items[0]?.discountPercent ?? 0,
                      isDefault: list.isDefault,
                      active: list.active,
                    }}
                    trigger={<Button variant="outline" size="sm" className="h-7 px-2 text-xs">Editar</Button>}
                  />
                  <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                    <a href={`/listas-de-precios/${list.id}`}>
                      Ver precios <ArrowRight className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
