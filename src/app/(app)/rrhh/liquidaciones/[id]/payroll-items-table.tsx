"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { FileText, Pencil } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { formatGs } from "@/lib/format";
import { PayrollItemDialog } from "./payroll-item-dialog";

const PAY_LABELS: Record<string, string> = {
  MENSUAL: "Mensual",
  JORNAL: "Jornal",
  DESTAJO: "Destajo",
  MIXTO: "Mixto",
};

export type PayrollItemRow = {
  id: string;
  employeeId: string;
  code: string;
  employee: string;
  payType: string;
  workedDays: number;
  pieceUnits: number;
  extraMinutes: number;
  lateMinutes: number;
  grossAmount: number;
  ipsEmployee: number;
  netAmount: number;
  otherEarnings: number;
  otherDeductions: number;
  notes: string;
};

const columns: ColumnDef<PayrollItemRow, unknown>[] = [
  {
    accessorKey: "code",
    header: "Legajo",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
  },
  {
    accessorKey: "employee",
    header: "Empleado",
    cell: ({ row }) => (
      <Link
        href={`/rrhh/empleados/${row.original.employeeId}`}
        className="text-xs font-medium hover:text-primary hover:underline"
      >
        {row.original.employee}
      </Link>
    ),
  },
  {
    accessorKey: "payType",
    header: "Tipo",
    cell: ({ row }) => PAY_LABELS[row.original.payType] ?? row.original.payType,
  },
  {
    accessorKey: "workedDays",
    header: "Días / unidades",
    cell: ({ row }) =>
      row.original.payType === "DESTAJO" || row.original.payType === "MIXTO"
        ? `${row.original.pieceUnits} u`
        : `${row.original.workedDays} d`,
  },
  {
    accessorKey: "extraMinutes",
    header: "Extras",
    cell: ({ row }) =>
      row.original.extraMinutes ? `${Math.round(row.original.extraMinutes / 6) / 10} h` : "—",
  },
  {
    accessorKey: "lateMinutes",
    header: "Tardanzas",
    cell: ({ row }) => (row.original.lateMinutes ? `${row.original.lateMinutes} min` : "—"),
  },
  {
    accessorKey: "grossAmount",
    header: "Haberes",
    cell: ({ row }) => <span className="tabular">{formatGs(row.original.grossAmount)}</span>,
  },
  {
    accessorKey: "ipsEmployee",
    header: "IPS",
    cell: ({ row }) => <span className="tabular">{formatGs(row.original.ipsEmployee)}</span>,
  },
  {
    accessorKey: "netAmount",
    header: "Neto",
    cell: ({ row }) => (
      <span
        className={
          row.original.netAmount < 0
            ? "font-semibold text-red-600 tabular"
            : "font-semibold tabular"
        }
      >
        {formatGs(row.original.netAmount)}
      </span>
    ),
  },
];

export function PayrollItemsTable({
  data,
  canEdit,
}: {
  data: PayrollItemRow[];
  canEdit: boolean;
}) {
  const allColumns: ColumnDef<PayrollItemRow, unknown>[] = [
    ...columns,
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button asChild variant="ghost" size="icon" className="h-7 w-7" aria-label="Ver recibo">
            <Link href={`/ver/recibo-sueldo/${row.original.id}`} aria-label="Ver recibo">
              <FileText className="h-3.5 w-3.5" />
            </Link>
          </Button>
          {canEdit ? (
            <PayrollItemDialog
              itemId={row.original.id}
              employeeName={row.original.employee}
              otherEarnings={row.original.otherEarnings}
              otherDeductions={row.original.otherDeductions}
              notes={row.original.notes}
              trigger={
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Ajustar ítem">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              }
            />
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={data}
      columns={allColumns}
      searchKeys={["code", "employee", "payType"]}
      searchPlaceholder="Buscar empleado…"
      pageSize={20}
      emptyMessage="No hay ítems en la liquidación."
    />
  );
}
