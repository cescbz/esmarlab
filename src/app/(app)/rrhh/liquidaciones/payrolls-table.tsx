"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatGs } from "@/lib/format";

const TYPE_LABELS: Record<string, string> = {
  MENSUAL: "Mensual",
  AGUINALDO: "Aguinaldo",
};

export type PayrollRow = {
  id: string;
  number: string;
  type: string;
  period: string;
  status: string;
  employees: number;
  grossTotal: number;
  ipsEmployeeTotal: number;
  netTotal: number;
};

const columns: ColumnDef<PayrollRow, unknown>[] = [
  {
    accessorKey: "number",
    header: "Número",
    cell: ({ row }) => (
      <Link
        href={`/rrhh/liquidaciones/${row.original.id}`}
        className="font-mono text-xs font-medium hover:text-primary hover:underline"
      >
        {row.original.number}
      </Link>
    ),
  },
  { accessorKey: "type", header: "Tipo", cell: ({ row }) => TYPE_LABELS[row.original.type] ?? row.original.type },
  { accessorKey: "period", header: "Período" },
  { accessorKey: "status", header: "Estado", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: "employees", header: "Empleados", cell: ({ row }) => <span className="tabular">{row.original.employees}</span> },
  { accessorKey: "grossTotal", header: "Haberes", cell: ({ row }) => <span className="tabular">{formatGs(row.original.grossTotal)}</span> },
  { accessorKey: "ipsEmployeeTotal", header: "IPS", cell: ({ row }) => <span className="tabular">{formatGs(row.original.ipsEmployeeTotal)}</span> },
  { accessorKey: "netTotal", header: "Neto", cell: ({ row }) => <span className="font-semibold tabular">{formatGs(row.original.netTotal)}</span> },
];

export function PayrollsTable({ data }: { data: PayrollRow[] }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKeys={["number", "type", "period", "status"]}
      searchPlaceholder="Buscar liquidación…"
      pageSize={15}
      emptyMessage="No hay liquidaciones."
    />
  );
}
