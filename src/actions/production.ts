"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import { applyMovement, StockError } from "@/lib/stock";
import type { ActionResult } from "./customers";

const createSchema = z.object({
  productId: z.string().min(1, "Seleccioná un producto fabricado."),
  orderId: z.string().optional().nullable(),
  dueDate: z.string().min(1, "Seleccioná la fecha compromiso."),
  priority: z.enum(["BAJA", "MEDIA", "ALTA"]),
  consumptionWarehouseId: z.string().min(1),
  outputWarehouseId: z.string().min(1),
  notes: z.string().optional().default(""),
  lines: z
    .array(z.object({ variantId: z.string(), quantity: z.coerce.number().int().min(0) }))
    .refine((lines) => lines.some((line) => line.quantity > 0), "Ingresá cantidades para al menos una variante."),
});

export async function createProductionOrder(values: unknown): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "PRODUCCION");
  } catch {
    return { ok: false, error: "No tenés permiso para crear órdenes de producción." };
  }
  const parsed = createSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const data = parsed.data;

  const [product, variants, bom] = await Promise.all([
    prisma.product.findUnique({ where: { id: data.productId } }),
    prisma.productVariant.findMany({
      where: { id: { in: data.lines.filter((line) => line.quantity > 0).map((line) => line.variantId) } },
    }),
    prisma.billOfMaterials.findUnique({
      where: { productId: data.productId },
      include: { stages: { include: { workshop: true }, orderBy: { sortOrder: "asc" } } },
    }),
  ]);
  if (!product || product.type !== "FABRICADO") return { ok: false, error: "El producto debe ser fabricado." };
  if (!bom) return { ok: false, error: "El producto no tiene ficha técnica." };
  if (variants.some((variant) => variant.productId !== product.id)) {
    return { ok: false, error: "Una variante no pertenece al producto." };
  }
  const lines = data.lines.filter((line) => line.quantity > 0);
  const quantity = lines.reduce((sum, line) => sum + line.quantity, 0);

  try {
    const order = await prisma.$transaction(async (tx) => {
      const count = await tx.productionOrder.count();
      const created = await tx.productionOrder.create({
        data: {
          number: `OP-${String(count + 1).padStart(4, "0")}`,
          productId: data.productId,
          orderId: data.orderId || null,
          status: "PLANIFICADA",
          priority: data.priority,
          startDate: new Date(),
          dueDate: new Date(`${data.dueDate}T12:00:00-03:00`),
          quantity,
          consumptionWarehouseId: data.consumptionWarehouseId,
          outputWarehouseId: data.outputWarehouseId,
          notes: data.notes || null,
          userId: session.user.username,
          lines: { create: lines },
          stages: {
            create: bom.stages.map((bomStage) => ({
              stageId: bomStage.stageId,
              workshopId: bomStage.workshopId,
              status: "PENDIENTE",
              completedQuantity: 0,
              sortOrder: bomStage.sortOrder,
            })),
          },
        },
      });
      if (data.orderId) {
        await tx.salesOrder.update({ where: { id: data.orderId }, data: { status: "EN_PRODUCCION" } });
      }
      return created;
    });
    revalidatePath("/produccion/ordenes");
    revalidatePath("/produccion/tablero");
    revalidatePath("/pedidos");
    if (data.orderId) revalidatePath(`/pedidos/${data.orderId}`);
    return { ok: true, id: order.id };
  } catch {
    return { ok: false, error: "No pudimos crear la orden de producción." };
  }
}

async function consumeMaterials(
  tx: Prisma.TransactionClient,
  productionOrderId: string,
  quantity: number,
  consumptionWarehouseId: string,
  userId: string
) {
  const order = await tx.productionOrder.findUnique({
    where: { id: productionOrderId },
    include: { product: { include: { bom: { include: { lines: { include: { materialVariant: { include: { product: true } } } } } } } } },
  });
  if (!order || !order.product.bom) throw new Error("La orden no tiene ficha técnica.");
  for (const line of order.product.bom.lines) {
    const required = Math.ceil(quantity * line.quantity * (1 + line.wastePercent / 100));
    await applyMovement(tx, {
      type: "CONSUMO_PRODUCCION",
      variantId: line.materialVariantId,
      warehouseId: consumptionWarehouseId,
      quantity: required,
      unitCost: line.materialVariant.product.cost,
      originType: "PRODUCTION_ORDER",
      originId: order.id,
      userId,
      observation: `Consumo OP ${order.number}`,
    });
  }
}

async function finishInternal(tx: Prisma.TransactionClient, productionOrderId: string, userId: string) {
  const order = await tx.productionOrder.findUnique({
    where: { id: productionOrderId },
    include: { lines: { include: { variant: { include: { product: true } } } }, stages: { orderBy: { sortOrder: "asc" } } },
  });
  if (!order) throw new Error("La orden no existe.");
  if (order.status === "TERMINADA") throw new Error("La orden ya está terminada.");

  for (const line of order.lines) {
    await applyMovement(tx, {
      type: "INGRESO_PRODUCCION",
      variantId: line.variantId,
      warehouseId: order.outputWarehouseId,
      quantity: line.quantity,
      unitCost: line.variant.product.cost,
      originType: "PRODUCTION_ORDER",
      originId: order.id,
      userId,
      observation: `Ingreso OP ${order.number}`,
    });
  }
  for (const stage of order.stages) {
    if (stage.status !== "COMPLETADA") {
      await tx.productionOrderStage.update({
        where: { id: stage.id },
        data: {
          status: "COMPLETADA",
          completedQuantity: stage.completedQuantity || order.quantity,
          endDate: stage.endDate ?? new Date(),
          startDate: stage.startDate ?? new Date(),
        },
      });
    }
  }
  await tx.productionOrder.update({
    where: { id: order.id },
    data: { status: "TERMINADA", updatedAt: new Date() },
  });
  if (order.orderId) {
    await tx.salesOrder.update({ where: { id: order.orderId }, data: { status: "LISTO" } });
  }
}

export async function startProductionOrder(productionOrderId: string): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "PRODUCCION");
  } catch {
    return { ok: false, error: "No tenés permiso para iniciar producción." };
  }
  const order = await prisma.productionOrder.findUnique({
    where: { id: productionOrderId },
    include: { stages: { orderBy: { sortOrder: "asc" } } },
  });
  if (!order) return { ok: false, error: "La orden no existe." };
  if (order.status !== "PLANIFICADA") return { ok: false, error: "La orden ya fue iniciada." };

  try {
    await prisma.$transaction(async (tx) => {
      await consumeMaterials(tx, order.id, order.quantity, order.consumptionWarehouseId, session.user.username);
      const first = order.stages[0];
      if (first) {
        await tx.productionOrderStage.update({
          where: { id: first.id },
          data: { status: "EN_CURSO", startDate: new Date() },
        });
      }
      await tx.productionOrder.update({
        where: { id: order.id },
        data: { status: "EN_PROCESO", startDate: new Date() },
      });
    });
  } catch (error) {
    return { ok: false, error: error instanceof StockError ? error.message : "No pudimos iniciar la orden. Verificá stock de materia prima." };
  }
  revalidatePath("/produccion/ordenes");
  revalidatePath(`/produccion/ordenes/${order.id}`);
  revalidatePath("/produccion/tablero");
  revalidatePath("/stock");
  revalidatePath("/stock/movimientos");
  return { ok: true, id: order.id };
}

const advanceSchema = z.object({
  productionOrderId: z.string().min(1),
  completedQuantity: z.coerce.number().int().positive("La cantidad completada debe ser mayor a cero."),
});

export async function advanceProductionStage(values: unknown): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "PRODUCCION");
  } catch {
    return { ok: false, error: "No tenés permiso para avanzar la producción." };
  }
  const parsed = advanceSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const data = parsed.data;

  const order = await prisma.productionOrder.findUnique({
    where: { id: data.productionOrderId },
    include: {
      stages: { include: { workshop: true }, orderBy: { sortOrder: "asc" } },
      product: true,
    },
  });
  if (!order) return { ok: false, error: "La orden no existe." };
  if (order.status === "TERMINADA") return { ok: false, error: "La orden ya está terminada." };
  if (order.status === "PLANIFICADA") return { ok: false, error: "Primero iniciá la producción." };
  if (data.completedQuantity > order.quantity) {
    return { ok: false, error: `La cantidad completada no puede superar ${order.quantity}.` };
  }

  const currentIndex = order.stages.findIndex((stage) => stage.status === "EN_CURSO");
  const fallbackIndex = order.stages.findIndex((stage) => stage.status === "PENDIENTE");
  const index = currentIndex >= 0 ? currentIndex : fallbackIndex;
  if (index < 0) return { ok: false, error: "No hay etapas pendientes." };
  const current = order.stages[index];
  const next = order.stages[index + 1];

  try {
    await prisma.$transaction(async (tx) => {
      const externalCost =
        current.workshop?.type === "EXTERNO"
          ? data.completedQuantity * (current.workshop.referenceCost ?? 0)
          : 0;
      await tx.productionOrderStage.update({
        where: { id: current.id },
        data: {
          status: "COMPLETADA",
          completedQuantity: data.completedQuantity,
          endDate: new Date(),
          startDate: current.startDate ?? new Date(),
          externalCost,
        },
      });
      if (next) {
        await tx.productionOrderStage.update({
          where: { id: next.id },
          data: { status: "EN_CURSO", startDate: new Date() },
        });
      } else {
        await finishInternal(tx, order.id, session.user.username);
      }
    });
  } catch (error) {
    return { ok: false, error: error instanceof StockError ? error.message : "No pudimos avanzar la etapa." };
  }

  revalidatePath("/produccion/ordenes");
  revalidatePath(`/produccion/ordenes/${order.id}`);
  revalidatePath("/produccion/tablero");
  revalidatePath("/stock");
  return { ok: true, id: order.id };
}

export async function finishProductionOrder(productionOrderId: string): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "PRODUCCION");
  } catch {
    return { ok: false, error: "No tenés permiso para terminar la orden." };
  }
  const order = await prisma.productionOrder.findUnique({ where: { id: productionOrderId } });
  if (!order) return { ok: false, error: "La orden no existe." };
  if (order.status === "TERMINADA") return { ok: false, error: "La orden ya está terminada." };

  try {
    await prisma.$transaction(async (tx) => {
      if (order.status === "PLANIFICADA") {
        await consumeMaterials(tx, order.id, order.quantity, order.consumptionWarehouseId, session.user.username);
      }
      await finishInternal(tx, order.id, session.user.username);
    });
  } catch (error) {
    return { ok: false, error: error instanceof StockError ? error.message : "No pudimos terminar la orden." };
  }
  revalidatePath("/produccion/ordenes");
  revalidatePath(`/produccion/ordenes/${order.id}`);
  revalidatePath("/produccion/tablero");
  revalidatePath("/pedidos");
  revalidatePath("/stock");
  return { ok: true, id: order.id };
}
