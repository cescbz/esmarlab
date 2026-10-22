"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Download, Eye, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

export type InvoiceRow = {
  id: string;
  number: string;
  type: string;
  customer: string;
  date: string;
  condition: string;
  total: number;
  paid: number;
  balance: number;
  status: string;
  point: string;
};

const columns: ColumnDef<InvoiceRow, unknown>[] = [
  {
    accessorKey: "number",
    header: "Comprobante",
    cell: ({ row }) => (
      <div>
        <Link href={`/facturas/${row.original.id}`} className="font-mono text-xs font-medium hover:text-primary hover:underline">
          {row.original.number}
        </Link>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {row.original.type === "NOTA_CREDITO" ? "Nota de crédito" : "Factura"} · {row.original.point}
        </p>
      </div>
    ),
  },
  { accessorKey: "customer", header: "Cliente" },
  { accessorKey: "date", header: "Fecha", cell: ({ row }) => <span className="text-xs">{row.original.date}</span> },
  {
    accessorKey: "condition",
    header: "Condición",
    cell: ({ row }) => <span className="text-xs">{row.original.condition}</span>,
  },
  { accessorKey: "total", header: "Total", cell: ({ row }) => <span className="text-xs font-medium tabular">{formatGs(row.original.total)}</span> },
  {
    accessorKey: "balance",
    header: "Saldo",
    cell: ({ row }) => (
      <span className={`text-xs tabular ${row.original.balance > 0 ? "font-medium text-amber-700" : "text-muted-foreground"}`}>
        {formatGs(row.original.balance)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "SIFEN",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "acciones",
    header: "",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        {row.original.type === "FACTURA" ? (
          <Badge variant="outline" className="hidden border-amber-200 bg-amber-50 text-[8px] uppercase text-amber-700 lg:inline-flex">
            KuDE
          </Badge>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/facturas/${row.original.id}`}><Eye className="mr-2 h-4 w-4" />Ver comprobante</Link>
            </DropdownMenuItem>
            {row.original.type === "FACTURA" ? (
              <DropdownMenuItem asChild>
                <a href={`/ver/kude/${row.original.id}?formato=a4`} target="_blank" rel="noreferrer">
                  <Download className="mr-2 h-4 w-4" />Abrir KuDE
                </a>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  },
];

export function InvoicesTable({ data, toolbar }: { data: InvoiceRow[]; toolbar?: React.ReactNode }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKeys={["number", "customer", "point"]}
      searchPlaceholder="Buscar número o cliente…"
      toolbar={toolbar}
      pageSize={15}
      emptyMessage="No hay comprobantes que coincidan con los filtros."
    />
  );
}
