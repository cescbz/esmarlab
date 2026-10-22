import { Prisma, PrismaClient, StockMovementType } from "@prisma/client";
import type { SeedData } from "./masters";

const prisma = new PrismaClient();

export async function recordOutgoing(
  data: SeedData,
  input: {
    movementId: string;
    variantId: string;
    warehouseId: string;
    quantity: number;
    unitCost: number;
    type: StockMovementType;
    originType: string;
    originId: string;
    date: Date;
    observation: string;
  }
): Promise<number> {
  const key = `${input.variantId}_${input.warehouseId}`;
  const available = data.stockMap.get(key) ?? 0;
  const quantity = Math.min(input.quantity, Math.max(0, available));
  if (quantity <= 0) return 0;

  await prisma.stockMovement.create({
    data: {
      id: input.movementId,
      type: input.type,
      variantId: input.variantId,
      warehouseId: input.warehouseId,
      quantity,
      unitCost: input.unitCost,
      originType: input.originType,
      originId: input.originId,
      userId: "produccion",
      date: input.date,
      observation: input.observation,
    },
  });
  await prisma.stockLevel.update({
    where: { variantId_warehouseId: { variantId: input.variantId, warehouseId: input.warehouseId } },
    data: { quantity: { decrement: quantity } },
  });
  data.stockMap.set(key, available - quantity);
  return quantity;
}
