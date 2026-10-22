import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { SupplierForm } from "../../supplier-form";

export const metadata: Metadata = { title: "Editar proveedor" };

export default async function EditSupplierPage({ params }: { params: { id: string } }) {
  const supplier = await prisma.supplier.findUnique({ where: { id: params.id } });
  if (!supplier) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={`Editar ${supplier.name}`} description="Actualizá los datos del proveedor." />
      <SupplierForm
        supplier={{
          id: supplier.id,
          name: supplier.name,
          rucBase: supplier.rucBase,
          dv: supplier.dv,
          contactName: supplier.contactName,
          phone: supplier.phone,
          email: supplier.email,
          origin: supplier.origin,
          active: supplier.active,
        }}
      />
    </div>
  );
}
