import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { FilterSelect } from "@/components/shared/filter-select";
import { formatDate, formatNumber } from "@/lib/format";
import { ShipmentsTable, type ShipmentRow } from "./shipments-table";

export const metadata: Metadata = { title: "Envíos" };

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: { estado?: string };
}) {
  const shipments = await prisma.shipment.findMany({
    where: searchParams.estado ? { status: searchParams.estado as never } : undefined,
    include: {
      order: { include: { customer: true } },
      warehouse: true,
      lines: true,
    },
    orderBy: { date: "desc" },
  });

  const rows: ShipmentRow[] = shipments.map((shipment) => ({
    id: shipment.id,
    number: shipment.number,
    orderId: shipment.orderId,
    orderNumber: shipment.order.number,
    customer: shipment.order.customer.name,
    date: formatDate(shipment.date),
    carrier: shipment.carrier,
    warehouse: shipment.warehouse.name,
    units: shipment.lines.reduce((sum, line) => sum + line.quantity, 0),
    status: shipment.status,
  }));
  const units = rows.reduce((sum, row) => sum + row.units, 0);

  return (
    <div>
      <PageHeader
        title="Envíos"
        description="Remisiones y entregas, incluyendo despachos parciales. Cada envío descuenta stock y actualiza el pedido."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Remisiones</p>
          <p className="mt-1 text-xl font-semibold">{rows.length}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Unidades enviadas</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatNumber(units)}</p>
        </div>
      </div>

      <ShipmentsTable
        data={rows}
        toolbar={
          <FilterSelect
            name="estado"
            label="Estado"
            options={[
              { value: "todos", label: "Todos" },
              { value: "PENDIENTE", label: "Pendiente" },
              { value: "EN_TRANSITO", label: "En tránsito" },
              { value: "ENTREGADO", label: "Entregado" },
              { value: "ANULADO", label: "Anulado" },
            ]}
          />
        }
      />
    </div>
  );
}
