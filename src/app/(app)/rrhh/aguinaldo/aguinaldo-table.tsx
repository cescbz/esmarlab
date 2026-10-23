"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { formatGs } from "@/lib/format";

export type AguinaldoRow = {
  id: string;
  code: string;
  employee: string;
  months: number;
  finalizedTotal: number;
  projectedTotal: number;
  finalizedAguinaldo: number;
  projectedAguinaldo: number;
};

const columns: ColumnDef<AguinaldoRow, unknown>[] = [
  {
    accessorKey: "code",
    header: "Legajo",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
  },
  { accessorKey: "employee", header: "Empleado" },
  { accessorKey: "months", header: "Meses", cell: ({ row }) => <span className="tabular">{row.original.months}</span> },
  {
    accessorKey: "finalizedTotal",
    header: "Ganado cerrado",
    cell: ({ row }) => <span className="tabular">{formatGs(row.original.finalizedTotal)}</span>,
  },
  {
    accessorKey: "finalizedAguinaldo",
    header: "Aguinaldo 1/12",
    cell: ({ row }) => (
      <span className="font-semibold tabular">{formatGs(row.original.finalizedAguinaldo)}</span>
    ),
  },
  {
    accessorKey: "projectedTotal",
    header: "Proyección ganado",
    cell: ({ row }) => <span className="text-xs text-muted-foreground tabular">{formatGs(row.original.projectedTotal)}</span>,
  },
  {
    accessorKey: "projectedAguinaldo",
    header: "Proyección aguinaldo",
    cell: ({ row }) => <span className="text-xs text-muted-foreground tabular">{formatGs(row.original.projectedAguinaldo)}</span>,
  },
];

export function AguinaldoTable({ data }: { data: AguinaldoRow[] }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKeys={["code", "employee"]}
      searchPlaceholder="Buscar empleado…"
      pageSize={15}
      emptyMessage="No hay datos de aguinaldo para el año."
    />
  );
}
