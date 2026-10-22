"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";

export type ShipmentRow = {
  id: string;
  number: string;
  orderId: string;
  orderNumber: string;
  customer: string;
  date: string;
  carrier: string;
  warehouse: string;
  units: number;
  status: string;
};

const columns: ColumnDef<ShipmentRow, unknown>[] = [
  {
    accessorKey: "number",
    header: "Remisión",
    cell: ({ row }) => (
      <Link href={`/pedidos/${row.original.orderId}`} className="font-mono text-xs font-medium hover:text-primary hover:underline">
        {row.original.number}
      </Link>
    ),
  },
  {
    accessorKey: "orderNumber",
    header: "Pedido",
    cell: ({ row }) => (
      <Link href={`/pedidos/${row.original.orderId}`} className="font-mono text-xs text-muted-foreground hover:text-primary hover:underline">
        {row.original.orderNumber}
      </Link>
    ),
  },
  { accessorKey: "customer", header: "Cliente" },
  { accessorKey: "date", header: "Fecha", cell: ({ row }) => <span className="text-xs">{row.original.date}</span> },
  { accessorKey: "carrier", header: "Transportista" },
  { accessorKey: "warehouse", header: "Depósito" },
  { accessorKey: "units", header: "Unidades", cell: ({ row }) => <span className="text-xs tabular">{row.original.units}</span> },
  { accessorKey: "status", header: "Estado", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
];

export function ShipmentsTable({ data, toolbar }: { data: ShipmentRow[]; toolbar?: React.ReactNode }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKeys={["number", "orderNumber", "customer", "carrier"]}
      searchPlaceholder="Buscar remisión, pedido o cliente…"
      toolbar={toolbar}
      pageSize={12}
      emptyMessage="No hay envíos registrados."
    />
  );
}
