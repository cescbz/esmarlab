"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";

export type VacationBalanceRow = {
  id: string;
  code: string;
  employee: string;
  hireDate: string;
  seniority: string;
  entitlement: number;
  taken: number;
  pending: number;
  available: number;
};

const columns: ColumnDef<VacationBalanceRow, unknown>[] = [
  {
    accessorKey: "code",
    header: "Legajo",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
  },
  { accessorKey: "employee", header: "Empleado" },
  { accessorKey: "hireDate", header: "Ingreso" },
  { accessorKey: "seniority", header: "Antigüedad" },
  { accessorKey: "entitlement", header: "Derecho", cell: ({ row }) => <span className="tabular">{row.original.entitlement} d</span> },
  { accessorKey: "taken", header: "Tomados", cell: ({ row }) => <span className="tabular">{row.original.taken}</span> },
  { accessorKey: "pending", header: "Pendientes", cell: ({ row }) => <span className="tabular">{row.original.pending}</span> },
  {
    accessorKey: "available",
    header: "Disponibles",
    cell: ({ row }) => (
      <span className="font-semibold text-emerald-700 tabular">{row.original.available} d</span>
    ),
  },
];

export function VacationBalancesTable({ data }: { data: VacationBalanceRow[] }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKeys={["code", "employee"]}
      searchPlaceholder="Buscar empleado…"
      pageSize={15}
      emptyMessage="No hay empleados activos."
    />
  );
}
