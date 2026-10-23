"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { AlertTriangle } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { formatGs, formatNumber } from "@/lib/format";

export type StockRow = {
  id: string;
  productId: string;
  product: string;
  variant: string;
  sku: string;
  warehouse: string;
  quantity: number;
  total: number;
  minStock: number;
  unitCost: number;
  value: number;
  low: boolean;
};

const columns: ColumnDef<StockRow, unknown>[] = [
  {
    accessorKey: "sku",
    header: "Código",
    cell: ({ row }) => <span className="font-mono text-[11px]">{row.original.sku}</span>,
  },
  {
    accessorKey: "product",
    header: "Producto",
    cell: ({ row }) => (
      <Link href={`/productos/${row.original.productId}`} className="font-medium hover:text-primary hover:underline">
        {row.original.product}
      </Link>
    ),
  },
  { accessorKey: "variant", header: "Variante" },
  { accessorKey: "warehouse", header: "Depósito" },
  {
    accessorKey: "quantity",
    header: "Cantidad",
    cell: ({ row }) => <span className="text-xs font-medium tabular">{formatNumber(row.original.quantity)}</span>,
  },
  {
    accessorKey: "total",
    header: "Total producto",
    cell: ({ row }) => (
      <span className={`text-xs tabular ${row.original.low ? "font-semibold text-red-600" : "text-muted-foreground"}`}>
        {formatNumber(row.original.total)} / {row.original.minStock}
      </span>
    ),
  },
  {
    accessorKey: "unitCost",
    header: "Costo unit.",
    cell: ({ row }) => <span className="text-xs tabular">{formatGs(row.original.unitCost)}</span>,
  },
  {
    accessorKey: "value",
    header: "Valorizado",
    cell: ({ row }) => <span className="text-xs tabular">{formatGs(row.original.value)}</span>,
  },
  {
    accessorKey: "low",
    header: "Estado",
    cell: ({ row }) =>
      row.original.low ? (
        <Badge variant="outline" className="border-red-200 bg-red-50 text-[9px] uppercase text-red-600">
          <AlertTriangle className="mr-1 h-3 w-3" />Bajo mínimo
        </Badge>
      ) : (
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[9px] uppercase text-emerald-700">Normal</Badge>
      ),
  },
];

export function StockTable({ data, toolbar }: { data: StockRow[]; toolbar?: React.ReactNode }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKeys={["product", "sku", "variant", "warehouse"]}
      searchPlaceholder="Buscar producto, SKU o depósito…"
      toolbar={toolbar}
      pageSize={20}
      emptyMessage="No hay existencias que coincidan con los filtros."
    />
  );
}
