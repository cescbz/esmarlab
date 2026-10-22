import { Prisma, StockMovementType } from "@prisma/client";

export class StockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockError";
  }
}

const INCOMING: StockMovementType[] = [
  "ENTRADA_COMPRA",
  "TRANSFERENCIA_ENTRADA",
  "AJUSTE_POSITIVO",
  "INGRESO_PRODUCCION",
  "DEVOLUCION",
];

export function isIncoming(type: StockMovementType): boolean {
  return INCOMING.includes(type);
}

export type MovementInput = {
  type: StockMovementType;
  variantId: string;
  warehouseId: string;
  quantity: number;
  unitCost: number;
  originType?: string;
  originId?: string;
  userId?: string;
  observation?: string;
  date?: Date;
};

export async function applyMovement(
  tx: Prisma.TransactionClient,
  input: MovementInput
): Promise<number> {
  if (input.quantity <= 0) throw new StockError("La cantidad debe ser mayor a cero.");

  const incoming = isIncoming(input.type);

  if (incoming) {
    const level = await tx.stockLevel.upsert({
      where: {
        variantId_warehouseId: {
          variantId: input.variantId,
          warehouseId: input.warehouseId,
        },
      },
      update: { quantity: { increment: input.quantity } },
      create: {
        variantId: input.variantId,
        warehouseId: input.warehouseId,
        quantity: input.quantity,
      },
    });
    await tx.stockMovement.create({
      data: {
        type: input.type,
        variantId: input.variantId,
        warehouseId: input.warehouseId,
        quantity: input.quantity,
        unitCost: input.unitCost,
        originType: input.originType,
        originId: input.originId,
        userId: input.userId,
        observation: input.observation,
        date: input.date ?? new Date(),
      },
    });
    return level.quantity;
  }

  const level = await tx.stockLevel.findUnique({
    where: {
      variantId_warehouseId: {
        variantId: input.variantId,
        warehouseId: input.warehouseId,
      },
    },
  });
  if (!level || level.quantity < input.quantity) {
    throw new StockError(
      `Stock insuficiente en el depósito seleccionado. Disponible: ${level?.quantity ?? 0}.`
    );
  }
  const updated = await tx.stockLevel.update({
    where: { id: level.id },
    data: { quantity: { decrement: input.quantity } },
  });
  await tx.stockMovement.create({
    data: {
      type: input.type,
      variantId: input.variantId,
      warehouseId: input.warehouseId,
      quantity: input.quantity,
      unitCost: input.unitCost,
      originType: input.originType,
      originId: input.originId,
      userId: input.userId,
      observation: input.observation,
      date: input.date ?? new Date(),
    },
  });
  return updated.quantity;
}

export async function getAvailable(
  tx: Prisma.TransactionClient,
  variantId: string,
  warehouseId: string
): Promise<number> {
  const level = await tx.stockLevel.findUnique({
    where: { variantId_warehouseId: { variantId, warehouseId } },
    select: { quantity: true },
  });
  return level?.quantity ?? 0;
}
