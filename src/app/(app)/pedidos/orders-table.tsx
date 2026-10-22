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

export type OrderRow = {
  id: string;
  number: string;
  customer: string;
  date: string;
  deliveryDate: string;
  status: string;
  total: number;
  shipped: number;
  units: number;
};

const columns: ColumnDef<OrderRow, unknown>[] = [
  {
    accessorKey: "number",
    header: "Pedido",
    cell: ({ row }) => (
      <Link href={`/pedidos/${row.original.id}`} className="font-mono text-xs font-medium hover:text-primary hover:underline">
        {row.original.number}
      </Link>
    ),
  },
  { accessorKey: "customer", header: "Cliente", cell: ({ row }) => <span className="font-medium">{row.original.customer}</span> },
  { accessorKey: "date", header: "Fecha", cell: ({ row }) => <span className="text-xs">{row.original.date}</span> },
  { accessorKey: "deliveryDate", header: "Entrega", cell: ({ row }) => <span className="text-xs">{row.original.deliveryDate}</span> },
  { accessorKey: "status", header: "Estado", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  {
    accessorKey: "shipped",
    header: "Despachado",
    cell: ({ row }) => (
      <div className="min-w-[90px]">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{row.original.shipped}/{row.original.units}</span>
          <span>{row.original.units > 0 ? Math.round((row.original.shipped / row.original.units) * 100) : 0}%</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${row.original.units > 0 ? Math.min(100, (row.original.shipped / row.original.units) * 100) : 0}%` }}
          />
        </div>
      </div>
    ),
  },
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
            <Link href={`/pedidos/${row.original.id}`}><Eye className="mr-2 h-4 w-4" />Ver pedido</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export function OrdersTable({ data, toolbar }: { data: OrderRow[]; toolbar?: React.ReactNode }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKeys={["number", "customer"]}
      searchPlaceholder="Buscar pedido o cliente…"
      toolbar={toolbar}
      pageSize={12}
      emptyMessage="No hay pedidos que coincidan con los filtros."
    />
  );
}
