"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Download, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/shared/data-table";
import { formatGs } from "@/lib/format";

export type ReceiptRow = {
  id: string;
  number: string;
  date: string;
  customer: string;
  cashRegister: string;
  methods: string;
  invoices: number;
  total: number;
};

const columns: ColumnDef<ReceiptRow, unknown>[] = [
  {
    accessorKey: "number",
    header: "Recibo",
    cell: ({ row }) => (
      <Link href={`/recibos/${row.original.id}`} className="font-mono text-xs font-medium hover:text-primary hover:underline">
        {row.original.number}
      </Link>
    ),
  },
  { accessorKey: "customer", header: "Cliente" },
  { accessorKey: "date", header: "Fecha", cell: ({ row }) => <span className="text-xs">{row.original.date}</span> },
  { accessorKey: "cashRegister", header: "Caja" },
  { accessorKey: "methods", header: "Medios de pago", cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.methods}</span> },
  { accessorKey: "invoices", header: "Facturas", cell: ({ row }) => <span className="text-xs tabular">{row.original.invoices}</span> },
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
            <Link href={`/recibos/${row.original.id}`}>Ver recibo</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`/api/pdf/recibo/${row.original.id}`} target="_blank" rel="noreferrer">
              <Download className="mr-2 h-4 w-4" />Descargar PDF
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export function ReceiptsTable({ data }: { data: ReceiptRow[] }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKeys={["number", "customer", "cashRegister"]}
      searchPlaceholder="Buscar recibo o cliente…"
      pageSize={15}
      emptyMessage="No hay recibos de cobro."
    />
  );
}
