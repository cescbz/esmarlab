import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PriceListForm } from "../price-list-form";

export const metadata: Metadata = { title: "Nueva lista de precios" };

export default function NewPriceListPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Nueva lista de precios"
        description="El descuento se aplica sobre el precio base de cada producto y genera todos los ítems automáticamente."
      />
      <PriceListForm />
    </div>
  );
}
