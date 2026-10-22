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
import { Badge } from "@/components/ui/badge";

export type ProductionOrderRow = {
  id: string;
  number: string;
  product: string;
  order: string;
  customer: string;
  quantity: number;
  dueDate: string;
  status: string;
  currentStage: string;
  progress: number;
  priority: string;
  late: boolean;
};

const columns: ColumnDef<ProductionOrderRow, unknown>[] = [
  {
    accessorKey: "number",
    header: "OP",
    cell: ({ row }) => (
      <Link href={`/produccion/ordenes/${row.original.id}`} className="font-mono text-xs font-medium hover:text-primary hover:underline">
        {row.original.number}
      </Link>
    ),
  },
  {
    accessorKey: "product",
    header: "Producto",
    cell: ({ row }) => (
      <div className="min-w-[180px]">
        <p className="text-xs font-medium">{row.original.product}</p>
        <p className="text-[10px] text-muted-foreground">{row.original.order !== "—" ? `Pedido ${row.original.order}` : "Para stock"}{row.original.customer !== "—" ? ` · ${row.original.customer}` : ""}</p>
      </div>
    ),
  },
  { accessorKey: "quantity", header: "Cantidad", cell: ({ row }) => <span className="text-xs tabular">{row.original.quantity}</span> },
  { accessorKey: "currentStage", header: "Etapa actual", cell: ({ row }) => <span className="text-xs">{row.original.currentStage}</span> },
  {
    accessorKey: "progress",
    header: "Avance",
    cell: ({ row }) => (
      <div className="min-w-[90px]">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{row.original.progress}%</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary" style={{ width: `${row.original.progress}%` }} />
        </div>
      </div>
    ),
  },
  {
    accessorKey: "dueDate",
    header: "Compromiso",
    cell: ({ row }) => (
      <span className={`text-xs ${row.original.late ? "font-medium text-red-600" : ""}`}>{row.original.dueDate}</span>
    ),
  },
  {
    accessorKey: "priority",
    header: "Prioridad",
    cell: ({ row }) => (
      <Badge variant="outline" className={row.original.priority === "ALTA" ? "border-red-200 bg-red-50 text-[9px] uppercase text-red-600" : row.original.priority === "MEDIA" ? "border-amber-200 bg-amber-50 text-[9px] uppercase text-amber-700" : "border-slate-200 bg-slate-50 text-[9px] uppercase text-slate-500"}>
        {row.original.priority === "ALTA" ? "Alta" : row.original.priority === "MEDIA" ? "Media" : "Baja"}
      </Badge>
    ),
  },
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
            <Link href={`/produccion/ordenes/${row.original.id}`}><Eye className="mr-2 h-4 w-4" />Ver OP</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export function ProductionOrdersTable({ data, toolbar }: { data: ProductionOrderRow[]; toolbar?: React.ReactNode }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKeys={["number", "product", "order", "customer"]}
      searchPlaceholder="Buscar OP, producto o pedido…"
      toolbar={toolbar}
      pageSize={15}
      emptyMessage="No hay órdenes de producción."
    />
  );
}
