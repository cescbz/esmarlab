"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { formatGs } from "@/lib/format";

export type PriceItemRow = {
  id: string;
  product: string;
  sku: string;
  size: string;
  color: string;
  price: number;
  discount: number;
};

const columns: ColumnDef<PriceItemRow, unknown>[] = [
  {
    accessorKey: "product",
    header: "Producto",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.product}</p>
        <p className="font-mono text-[10px] text-muted-foreground">{row.original.sku}</p>
      </div>
    ),
  },
  { accessorKey: "size", header: "Talle" },
  { accessorKey: "color", header: "Color" },
  {
    accessorKey: "discount",
    header: "Descuento",
    cell: ({ row }) => <span className="text-xs">{row.original.discount}%</span>,
  },
  {
    accessorKey: "price",
    header: "Precio",
    cell: ({ row }) => <span className="text-xs font-medium tabular">{formatGs(row.original.price)}</span>,
  },
];

export function PriceListItemsTable({ data }: { data: PriceItemRow[] }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKeys={["product", "sku", "size", "color"]}
      searchPlaceholder="Buscar producto o SKU…"
      pageSize={15}
      emptyMessage="Esta lista no tiene ítems."
    />
  );
}
