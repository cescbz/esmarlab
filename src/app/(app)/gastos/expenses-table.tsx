"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { formatGs } from "@/lib/format";

export type ExpenseRow = {
  id: string;
  date: string;
  category: string;
  supplier: string;
  description: string;
  amount: number;
  method: string;
  source: string;
  voucher: string;
};

const columns: ColumnDef<ExpenseRow, unknown>[] = [
  { accessorKey: "date", header: "Fecha", cell: ({ row }) => <span className="text-xs whitespace-nowrap">{row.original.date}</span> },
  { accessorKey: "category", header: "Categoría", cell: ({ row }) => <Badge variant="outline" className="whitespace-nowrap text-[10px]">{row.original.category}</Badge> },
  {
    accessorKey: "description",
    header: "Descripción",
    cell: ({ row }) => (
      <div className="min-w-[220px]">
        <p className="text-xs font-medium">{row.original.description}</p>
        <p className="text-[10px] text-muted-foreground">{row.original.supplier} {row.original.voucher !== "—" ? `· ${row.original.voucher}` : ""}</p>
      </div>
    ),
  },
  { accessorKey: "method", header: "Medio" },
  {
    accessorKey: "source",
    header: "Origen",
    cell: ({ row }) => (
      <Badge variant="outline" className={row.original.source === "Caja" ? "border-sky-200 bg-sky-50 text-[9px] uppercase text-sky-700" : "border-slate-200 bg-slate-50 text-[9px] uppercase text-slate-600"}>
        {row.original.source}
      </Badge>
    ),
  },
  { accessorKey: "amount", header: "Monto", cell: ({ row }) => <span className="text-xs font-semibold tabular">{formatGs(row.original.amount)}</span> },
];

export function ExpensesTable({ data, toolbar }: { data: ExpenseRow[]; toolbar?: React.ReactNode }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKeys={["category", "description", "supplier", "voucher", "method"]}
      searchPlaceholder="Buscar gasto, proveedor o comprobante…"
      toolbar={toolbar}
      pageSize={15}
      emptyMessage="No hay gastos que coincidan con los filtros."
    />
  );
}
