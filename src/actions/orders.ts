"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import { applyMovement, StockError } from "@/lib/stock";
import type { ActionResult } from "./customers";

const shipmentSchema = z.object({
  orderId: z.string().min(1),
  date: z.string().min(1, "Seleccioná la fecha."),
  carrier: z.string().min(2, "Ingresá el transportista."),
  warehouseId: z.string().min(1, "Seleccioná un depósito."),
  observations: z.string().optional().default(""),
  lines: z
    .array(
      z.object({
        orderLineId: z.string().min(1),
        quantity: z.coerce.number().int().min(0),
      })
    )
    .refine((lines) => lines.some((line) => line.quantity > 0), "Ingresá al menos una cantidad a despachar."),
});

export async function createShipment(values: unknown): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "VENTAS", "DEPOSITO");
  } catch {
    return { ok: false, error: "No tenés permiso para crear envíos." };
  }

  const parsed = shipmentSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const data = parsed.data;

  const order = await prisma.salesOrder.findUnique({
    where: { id: data.orderId },
    include: { lines: { include: { variant: { include: { product: true } } } }, customer: true },
  });
  if (!order) return { ok: false, error: "El pedido no existe." };
  if (["ANULADO", "FACTURADO"].includes(order.status)) {
    return { ok: false, error: "Este pedido ya no admite envíos." };
  }

  const lineMap = new Map(order.lines.map((line) => [line.id, line]));
  const shipmentLines = data.lines.filter((line) => line.quantity > 0);
  for (const line of shipmentLines) {
    const orderLine = lineMap.get(line.orderLineId);
    if (!orderLine) return { ok: false, error: "Una de las líneas no pertenece al pedido." };
    const remaining = orderLine.quantity - orderLine.quantityShipped;
    if (line.quantity > remaining) {
      return {
        ok: false,
        error: `La cantidad de ${orderLine.variant.product.name} supera lo pendiente (${remaining}).`,
      };
    }
  }

  try {
    const shipment = await prisma.$transaction(async (tx) => {
      const count = await tx.shipment.count();
      const number = `REM-${String(count + 1).padStart(4, "0")}`;
      const created = await tx.shipment.create({
        data: {
          number,
          orderId: order.id,
          warehouseId: data.warehouseId,
          carrier: data.carrier,
          date: new Date(`${data.date}T12:00:00-03:00`),
          status: "PENDIENTE",
          observations: data.observations || null,
          userId: session.user.username,
          lines: {
            create: shipmentLines.map((line) => ({
              orderLineId: line.orderLineId,
              variantId: lineMap.get(line.orderLineId)!.variantId,
              quantity: line.quantity,
            })),
          },
        },
      });

      for (const line of shipmentLines) {
        const orderLine = lineMap.get(line.orderLineId)!;
        const warehouseId = orderLine.variant.product.type === "FABRICADO" ? "wh_pt" : "wh_central";
        await applyMovement(tx, {
          type: "SALIDA_VENTA",
          variantId: orderLine.variantId,
          warehouseId,
          quantity: line.quantity,
          unitCost: orderLine.variant.product.cost,
          originType: "SHIPMENT",
          originId: created.id,
          userId: session.user.username,
          observation: `Envío ${number} · pedido ${order.number}`,
        });
        await tx.salesOrderLine.update({
          where: { id: orderLine.id },
          data: { quantityShipped: { increment: line.quantity } },
        });
      }

      const updatedLines = await tx.salesOrderLine.findMany({ where: { orderId: order.id } });
      const complete = updatedLines.every((line) => line.quantityShipped >= line.quantity);
      await tx.salesOrder.update({
        where: { id: order.id },
        data: { status: complete ? "DESPACHADO" : "DESPACHADO_PARCIAL" },
      });

      return created;
    });

    revalidatePath("/pedidos");
    revalidatePath(`/pedidos/${order.id}`);
    revalidatePath("/envios");
    revalidatePath("/stock");
    revalidatePath("/stock/movimientos");
    return { ok: true, id: shipment.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof StockError ? error.message : "No pudimos crear el envío.",
    };
  }
}

const statusSchema = z.object({
  orderId: z.string(),
  status: z.enum(["PENDIENTE", "EN_PRODUCCION", "LISTO", "ANULADO"]),
});

export async function updateOrderStatus(values: unknown): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "VENTAS");
  } catch {
    return { ok: false, error: "No tenés permiso para modificar pedidos." };
  }
  const parsed = statusSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Estado inválido." };
  await prisma.salesOrder.update({
    where: { id: parsed.data.orderId },
    data: { status: parsed.data.status },
  });
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${parsed.data.orderId}`);
  return { ok: true, id: parsed.data.orderId };
}
