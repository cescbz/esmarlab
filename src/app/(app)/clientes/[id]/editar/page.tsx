import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { CustomerForm } from "../../customer-form";

export const metadata: Metadata = { title: "Editar cliente" };

export default async function EditCustomerPage({ params }: { params: { id: string } }) {
  const [customer, priceLists] = await Promise.all([
    prisma.customer.findUnique({ where: { id: params.id } }),
    prisma.priceList.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!customer) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={`Editar ${customer.name}`} description="Actualizá los datos del cliente." />
      <CustomerForm
        priceLists={priceLists}
        customer={{
          id: customer.id,
          type: customer.type,
          name: customer.name,
          rucBase: customer.rucBase,
          dv: customer.dv,
          address: customer.address,
          city: customer.city,
          phone: customer.phone,
          email: customer.email,
          priceListId: customer.priceListId,
          creditLimit: customer.creditLimit,
          termDays: customer.termDays,
          active: customer.active,
        }}
      />
    </div>
  );
}
