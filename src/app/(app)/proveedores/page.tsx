import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { formatRuc } from "@/lib/fiscal";
import { SuppliersTable, type SupplierRow } from "./suppliers-table";
import { SupplierFormModal } from "./supplier-form-modal";

export const metadata: Metadata = { title: "Proveedores" };

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
  const rows: SupplierRow[] = suppliers.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
    ruc: formatRuc(supplier.rucBase, supplier.dv),
    contactName: supplier.contactName ?? "—",
    contactNameRaw: supplier.contactName ?? "",
    phone: supplier.phone ?? "—",
    phoneRaw: supplier.phone ?? "",
    email: supplier.email,
    rucBase: supplier.rucBase,
    dv: supplier.dv,
    origin: supplier.origin,
    active: supplier.active,
  }));

  return (
    <div>
      <PageHeader
        title="Proveedores"
        description="Proveedores locales e importados de telas, calzado, EPP y otros insumos."
        actions={
          <SupplierFormModal
            trigger={<Button><Plus className="mr-1.5 h-4 w-4" />Nuevo proveedor</Button>}
          />
        }
      />
      <SuppliersTable data={rows} />
    </div>
  );
}
