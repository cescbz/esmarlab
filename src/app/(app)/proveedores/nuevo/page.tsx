import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SupplierForm } from "../supplier-form";

export const metadata: Metadata = { title: "Nuevo proveedor" };

export default function NewSupplierPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Nuevo proveedor" description="Registrá los datos fiscales y de contacto del proveedor." />
      <SupplierForm />
    </div>
  );
}
