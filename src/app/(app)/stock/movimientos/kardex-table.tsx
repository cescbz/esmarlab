"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/format";

export type KardexRow = {
  id: string;
  date: string;
  type: string;
  typeLabel: string;
  product: string;
  variant: string;
  sku: string;
  warehouse: string;
  quantity: number;
  incoming: boolean;
  balance: number | null;
  reference: string;
  observation: string;
};

const columns: ColumnDef<KardexRow, unknown>[] = [
  { accessorKey: "date", header: "Fecha", cell: ({ row }) => <span className="text-xs whitespace-nowrap">{row.original.date}</span> },
  {
    accessorKey: "typeLabel",
    header: "Movimiento",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={row.original.incoming ? "border-emerald-200 bg-emerald-50 text-[9px] uppercase text-emerald-700" : "border-orange-200 bg-orange-50 text-[9px] uppercase text-orange-700"}
      >
        {row.original.typeLabel}
      </Badge>
    ),
  },
  {
    accessorKey: "sku",
    header: "Código",
    cell: ({ row }) => <span className="font-mono text-[10px]">{row.original.sku}</span>,
  },
  {
    accessorKey: "product",
    header: "Producto",
    cell: ({ row }) => <span className="text-xs font-medium">{row.original.product}</span>,
  },
  { accessorKey: "variant", header: "Variante" },
  { accessorKey: "warehouse", header: "Depósito" },
  {
    accessorKey: "quantity",
    header: "Cantidad",
    cell: ({ row }) => (
      <span className={`text-xs font-medium tabular ${row.original.incoming ? "text-emerald-700" : "text-orange-700"}`}>
        {row.original.incoming ? "+" : "−"}{formatNumber(row.original.quantity)}
      </span>
    ),
  },
  {
    accessorKey: "balance",
    header: "Saldo",
    cell: ({ row }) => (
      <span className="text-xs font-semibold tabular">{row.original.balance !== null ? formatNumber(row.original.balance) : "—"}</span>
    ),
  },
  { accessorKey: "reference", header: "Origen", cell: ({ row }) => <span className="font-mono text-[10px]">{row.original.reference}</span> },
];

export function KardexTable({ data }: { data: KardexRow[] }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKeys={["product", "sku", "warehouse", "typeLabel", "reference"]}
      searchPlaceholder="Buscar producto, depósito o referencia…"
      pageSize={25}
      emptyMessage="No hay movimientos para el filtro seleccionado."
    />
  );
}
