"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";

export type AttendanceSummaryRow = {
  id: string;
  code: string;
  name: string;
  workedDays: number;
  expected: number;
  lateCount: number;
  lateMinutes: number;
  overtimeMinutes: number;
  absentDays: number;
  vacationDays: number;
  incomplete: number;
  schedule: string;
};

const columns: ColumnDef<AttendanceSummaryRow, unknown>[] = [
  {
    accessorKey: "code",
    header: "Legajo",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
  },
  {
    accessorKey: "name",
    header: "Empleado",
    cell: ({ row }) => (
      <Link
        href={`/rrhh/asistencia/${row.original.id}`}
        className="text-xs font-medium hover:text-primary hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  { accessorKey: "schedule", header: "Horario" },
  {
    accessorKey: "workedDays",
    header: "Días",
    cell: ({ row }) => (
      <span className="tabular">
        {row.original.workedDays}/{row.original.expected}
      </span>
    ),
  },
  {
    accessorKey: "lateMinutes",
    header: "Tardanzas",
    cell: ({ row }) =>
      row.original.lateMinutes ? (
        <span className="text-xs text-amber-700 tabular">
          {row.original.lateCount} · {row.original.lateMinutes} min
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "overtimeMinutes",
    header: "Extras",
    cell: ({ row }) =>
      row.original.overtimeMinutes ? (
        <span className="text-xs tabular">
          {Math.round(row.original.overtimeMinutes / 6) / 10} h
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "absentDays",
    header: "Ausencias",
    cell: ({ row }) =>
      row.original.absentDays ? (
        <span className="text-xs text-red-600 tabular">{row.original.absentDays}</span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "vacationDays",
    header: "Vacaciones",
    cell: ({ row }) =>
      row.original.vacationDays ? (
        <span className="text-xs tabular">{row.original.vacationDays}</span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "incomplete",
    header: "Incompletas",
    cell: ({ row }) =>
      row.original.incomplete ? (
        <span className="text-xs font-medium text-amber-700 tabular">
          {row.original.incomplete}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Button asChild variant="outline" size="sm" className="h-7 text-xs">
        <Link href={`/rrhh/asistencia/${row.original.id}`}>Ver detalle</Link>
      </Button>
    ),
  },
];

export function AttendanceSummaryTable({ data }: { data: AttendanceSummaryRow[] }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKeys={["code", "name"]}
      searchPlaceholder="Buscar empleado…"
      pageSize={15}
      emptyMessage="No hay empleados activos."
    />
  );
}
