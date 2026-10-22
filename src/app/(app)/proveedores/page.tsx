import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { formatRuc } from "@/lib/fiscal";
import { SuppliersTable, type SupplierRow } from "./suppliers-table";

export const metadata: Metadata = { title: "Proveedores" };

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
  const rows: SupplierRow[] = suppliers.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
    ruc: formatRuc(supplier.rucBase, supplier.dv),
    contactName: supplier.contactName ?? "—",
    phone: supplier.phone ?? "—",
    origin: supplier.origin,
    active: supplier.active,
  }));

  return (
    <div>
      <PageHeader
        title="Proveedores"
        description="Proveedores locales e importados de telas, calzado, EPP y otros insumos."
        actions={
          <Button asChild>
            <Link href="/proveedores/nuevo"><Plus className="mr-1.5 h-4 w-4" />Nuevo proveedor</Link>
          </Button>
        }
      />
      <SuppliersTable data={rows} />
    </div>
  );
}
