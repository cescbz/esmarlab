import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { PriceListForm } from "../../price-list-form";

export const metadata: Metadata = { title: "Editar lista de precios" };

export default async function EditPriceListPage({ params }: { params: { id: string } }) {
  const list = await prisma.priceList.findUnique({
    where: { id: params.id },
    include: { items: { take: 1 } },
  });
  if (!list) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`Editar ${list.name}`}
        description="Al cambiar el descuento se recalculan todos los precios de la lista."
      />
      <PriceListForm
        list={{
          id: list.id,
          name: list.name,
          description: list.description,
          discountPercent: list.items[0]?.discountPercent ?? 0,
          isDefault: list.isDefault,
          active: list.active,
        }}
      />
    </div>
  );
}
