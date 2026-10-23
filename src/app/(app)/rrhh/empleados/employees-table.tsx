"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";

const PAY_LABELS: Record<string, string> = {
  MENSUAL: "Mensual",
  JORNAL: "Jornal",
  DESTAJO: "Destajo",
  MIXTO: "Mixto",
};

export type EmployeeRow = {
  id: string;
  code: string;
  name: string;
  ci: string;
  position: string;
  department: string;
  payType: string;
  payDetail: string;
  hireDate: string;
  status: string;
};

const columns: ColumnDef<EmployeeRow, unknown>[] = [
  {
    accessorKey: "code",
    header: "Legajo",
    cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.code}</span>,
  },
  {
    accessorKey: "name",
    header: "Empleado",
    cell: ({ row }) => (
      <div>
        <Link
          href={`/rrhh/empleados/${row.original.id}`}
          className="text-xs font-semibold hover:text-primary hover:underline"
        >
          {row.original.name}
        </Link>
        <p className="text-[10px] text-muted-foreground">CI {row.original.ci}</p>
      </div>
    ),
  },
  {
    accessorKey: "position",
    header: "Cargo",
    cell: ({ row }) => (
      <div>
        <p className="text-xs">{row.original.position}</p>
        <p className="text-[10px] text-muted-foreground">{row.original.department}</p>
      </div>
    ),
  },
  {
    accessorKey: "payType",
    header: "Tipo",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-[10px]">
        {PAY_LABELS[row.original.payType] ?? row.original.payType}
      </Badge>
    ),
  },
  {
    accessorKey: "payDetail",
    header: "Remuneración",
    cell: ({ row }) => <span className="text-xs tabular">{row.original.payDetail}</span>,
  },
  {
    accessorKey: "hireDate",
    header: "Ingreso",
    cell: ({ row }) => <span className="whitespace-nowrap text-xs">{row.original.hireDate}</span>,
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function EmployeesTable({ data }: { data: EmployeeRow[] }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKeys={["code", "name", "ci", "position", "department", "payType"]}
      searchPlaceholder="Buscar por legajo, nombre, CI o cargo…"
      pageSize={15}
      emptyMessage="No hay empleados que coincidan con la búsqueda."
    />
  );
}
