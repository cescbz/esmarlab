"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Download, Eye, MoreHorizontal } from "lucide-react";
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

export type QuoteRow = {
  id: string;
  number: string;
  customer: string;
  date: string;
  validUntil: string;
  status: string;
  total: number;
  seller: string;
};

const columns: ColumnDef<QuoteRow, unknown>[] = [
  {
    accessorKey: "number",
    header: "Presupuesto",
    cell: ({ row }) => (
      <Link href={`/presupuestos/${row.original.id}`} className="font-mono text-xs font-medium hover:text-primary hover:underline">
        {row.original.number}
      </Link>
    ),
  },
  { accessorKey: "customer", header: "Cliente", cell: ({ row }) => <span className="font-medium">{row.original.customer}</span> },
  { accessorKey: "date", header: "Fecha", cell: ({ row }) => <span className="text-xs">{row.original.date}</span> },
  { accessorKey: "validUntil", header: "Válido hasta", cell: ({ row }) => <span className="text-xs">{row.original.validUntil}</span> },
  { accessorKey: "status", header: "Estado", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: "total", header: "Total", cell: ({ row }) => <span className="text-xs font-semibold tabular">{formatGs(row.original.total)}</span> },
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
            <Link href={`/presupuestos/${row.original.id}`}><Eye className="mr-2 h-4 w-4" />Ver detalle</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`/api/pdf/presupuesto/${row.original.id}`} target="_blank" rel="noreferrer">
              <Download className="mr-2 h-4 w-4" />Descargar PDF
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export function QuotesTable({ data, toolbar }: { data: QuoteRow[]; toolbar?: React.ReactNode }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKeys={["number", "customer", "seller"]}
      searchPlaceholder="Buscar presupuesto o cliente…"
      toolbar={toolbar}
      pageSize={12}
      emptyMessage="No hay presupuestos que coincidan con los filtros."
    />
  );
}
