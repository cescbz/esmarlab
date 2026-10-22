import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  const groups = await prisma.productGroup.findMany({
    select: { id: true, name: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Nuevo producto"
        description="Cargá los datos comerciales y generá las variantes por talle y color."
      />
      <ProductForm groups={groups} />
    </div>
  );
}
