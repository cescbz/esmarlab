"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatGs } from "@/lib/format";

export type PurchaseRow = {
  id: string;
  number: string;
  supplier: string;
  invoice: string;
  date: string;
  warehouse: string;
  total: number;
  status: string;
};

const columns: ColumnDef<PurchaseRow, unknown>[] = [
  {
    accessorKey: "number",
    header: "Recepción",
    cell: ({ row }) => (
      <Link href={`/compras/${row.original.id}`} className="font-mono text-xs font-medium hover:text-primary hover:underline">
        {row.original.number}
      </Link>
    ),
  },
  { accessorKey: "supplier", header: "Proveedor" },
  { accessorKey: "invoice", header: "Factura proveedor", cell: ({ row }) => <span className="font-mono text-[11px]">{row.original.invoice}</span> },
  { accessorKey: "date", header: "Fecha", cell: ({ row }) => <span className="text-xs">{row.original.date}</span> },
  { accessorKey: "warehouse", header: "Depósito" },
  { accessorKey: "total", header: "Total", cell: ({ row }) => <span className="text-xs font-medium tabular">{formatGs(row.original.total)}</span> },
  { accessorKey: "status", header: "Estado", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  {
    id: "acciones",
    header: "",
    enableSorting: false,
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/compras/${row.original.id}`}><Eye className="mr-2 h-4 w-4" />Ver detalle</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export function PurchasesTable({ data }: { data: PurchaseRow[] }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKeys={["number", "supplier", "invoice", "warehouse"]}
      searchPlaceholder="Buscar recepción, proveedor o factura…"
      pageSize={12}
      emptyMessage="No hay recepciones de compra."
    />
  );
}
