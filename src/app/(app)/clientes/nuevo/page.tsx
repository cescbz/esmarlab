import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { CustomerForm } from "../customer-form";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default async function NewCustomerPage() {
  const priceLists = await prisma.priceList.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Nuevo cliente"
        description="Registrá los datos comerciales y fiscales del cliente. El RUC se valida con el algoritmo módulo 11."
      />
      <CustomerForm priceLists={priceLists} />
    </div>
  );
}
