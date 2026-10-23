import {
  Prisma,
  PrismaClient,
  ProductionStatus,
  ProductionStageStatus,
  ProductionPriority,
  StockMovementType,
  WorkshopType,
} from "@prisma/client";
import {
  randInt,
  pick,
  chance,
  daysAgo,
  daysFromNow,
} from "./helpers";
import type { SeedData } from "./masters";
import { recordOutgoing } from "./stock";

const prisma = new PrismaClient();

type OrderContext = {
  orders: Prisma.SalesOrderCreateManyInput[];
  orderLines: {
    id: string;
    orderId: string;
    variantId: string;
    quantity: number;
    quantityShipped: number;
    unitPrice: number;
  }[];
  ordersInProduction: Prisma.SalesOrderCreateManyInput[];
};

export async function seedProduction(data: SeedData, commercial: OrderContext) {
  const boms = await prisma.billOfMaterials.findMany({
    include: { lines: true, stages: { include: { workshop: true } } },
  });
  const workshops = await prisma.workshop.findMany();
  const workshopMap = new Map(workshops.map((workshop) => [workshop.id, workshop]));
  const bomByProduct = new Map(boms.map((bom) => [bom.productId, bom]));
  const fabricatedProducts = data.productsData.filter((product) => product.type === "FABRICADO");
  const variantsByProduct = new Map<string, Prisma.ProductVariantCreateManyInput[]>();
  for (const variant of data.variantsData) {
    const list = variantsByProduct.get(variant.productId) ?? [];
    list.push(variant);
    variantsByProduct.set(variant.productId, list);
  }

  const orders: Prisma.ProductionOrderCreateManyInput[] = [];
  const orderLines: Prisma.ProductionOrderLineCreateManyInput[] = [];
  const orderStages: Prisma.ProductionOrderStageCreateManyInput[] = [];
  let orderLineCounter = 0;
  let orderStageCounter = 0;

  const makeLines = (orderId: string, productId: string, quantity: number) => {
    const variants = variantsByProduct.get(productId) ?? [];
    const lineCount = Math.min(variants.length, randInt(1, 3));
    const chosen: Prisma.ProductVariantCreateManyInput[] = [];
    while (chosen.length < lineCount) {
      const variant = pick(variants);
      if (!chosen.find((item) => item.id === variant.id)) chosen.push(variant);
    }
    let remaining = quantity;
    chosen.forEach((variant, index) => {
      const qty = index === chosen.length - 1 ? remaining : Math.max(1, Math.floor(quantity / chosen.length));
      remaining -= qty;
      orderLines.push({
        id: `opl_${++orderLineCounter}`,
        productionOrderId: orderId,
        variantId: variant.id!,
        quantity: qty,
      });
    });
  };

  const makeStages = (
    productionOrderId: string,
    productId: string,
    totalQuantity: number,
    progressIndex: number,
    status: ProductionStatus,
    startDate: Date,
    dueDate: Date
  ) => {
    const bom = bomByProduct.get(productId);
    const stages = bom?.stages.sort((a, b) => a.sortOrder - b.sortOrder) ?? [];
    stages.forEach((bomStage, index) => {
      let stageStatus: ProductionStageStatus = ProductionStageStatus.PENDIENTE;
      let completedQuantity = 0;
      let stageStart: Date | null = null;
      let stageEnd: Date | null = null;
      if (status === ProductionStatus.TERMINADA) {
        stageStatus = ProductionStageStatus.COMPLETADA;
        completedQuantity = totalQuantity;
        stageStart = new Date(startDate.getTime() + index * 2 * 86_400_000);
        stageEnd = new Date(stageStart.getTime() + 86_400_000);
      } else if (index < progressIndex) {
        stageStatus = ProductionStageStatus.COMPLETADA;
        completedQuantity = totalQuantity;
        stageStart = new Date(startDate.getTime() + index * 2 * 86_400_000);
        stageEnd = new Date(stageStart.getTime() + 86_400_000);
      } else if (index === progressIndex) {
        stageStatus = ProductionStageStatus.EN_CURSO;
        completedQuantity = Math.max(1, Math.floor(totalQuantity * (randInt(25, 75) / 100)));
        stageStart = daysAgo(randInt(1, 4));
      }
      const workshop = workshopMap.get(bomStage.workshopId ?? "");
      const externalCost =
        workshop?.type === WorkshopType.EXTERNO ? completedQuantity * (workshop.referenceCost ?? 0) : 0;
      orderStages.push({
        id: `ops_${++orderStageCounter}`,
        productionOrderId,
        stageId: bomStage.stageId,
        workshopId: bomStage.workshopId,
        status: stageStatus,
        completedQuantity,
        startDate: stageStart,
        endDate: stageEnd,
        responsible:
          workshop?.type === WorkshopType.EXTERNO
            ? workshop.contact
            : pick(["Marisa Ortiz", "Diego Ayala", "Sofía Benítez"]),
        externalCost,
        notes: stageStatus === ProductionStageStatus.EN_CURSO ? "Avance informado por el taller." : null,
        sortOrder: index + 1,
      });
    });
  };

  for (let i = 0; i < 40; i++) {
    const product = pick(fabricatedProducts);
    const quantity = randInt(20, 90);
    const startDate = daysAgo(randInt(20, 180));
    const dueDate = daysAgo(randInt(1, 15));
    const orderId = `op_${i + 1}`;
    orders.push({
      id: orderId,
      number: `OP-${String(i + 1).padStart(4, "0")}`,
      productId: product.id!,
      orderId: null,
      status: ProductionStatus.TERMINADA,
      priority: ProductionPriority.MEDIA,
      startDate,
      dueDate,
      quantity,
      consumptionWarehouseId: "wh_mp",
      outputWarehouseId: "wh_pt",
      notes: null,
      userId: "produccion",
      createdAt: startDate,
      updatedAt: dueDate,
    });
    makeLines(orderId, product.id!, quantity);
    makeStages(orderId, product.id!, quantity, 6, ProductionStatus.TERMINADA, startDate, dueDate);
  }

  const orderCandidates = commercial.ordersInProduction
    .map((order) => {
      const lines = commercial.orderLines.filter((line) => line.orderId === order.id);
      const fabricatedLine = lines.find(
        (line) => data.variantInfo.get(line.variantId)?.product.type === "FABRICADO"
      );
      return fabricatedLine ? { order, line: fabricatedLine } : null;
    })
    .filter(Boolean) as { order: Prisma.SalesOrderCreateManyInput; line: OrderContext["orderLines"][number] }[];

  const activeSpecs: { productId: string; orderId: string | null; dueDate: Date; progress: number }[] = [];
  for (const candidate of orderCandidates.slice(0, 3)) {
    const productId = data.variantInfo.get(candidate.line.variantId)!.productId;
    activeSpecs.push({
      productId,
      orderId: candidate.order.id!,
      dueDate: daysFromNow(randInt(2, 12)),
      progress: randInt(1, 3),
    });
  }
  activeSpecs.push({
    productId: pick(fabricatedProducts).id!,
    orderId: null,
    dueDate: daysFromNow(-3),
    progress: 1,
  });
  activeSpecs.push({
    productId: pick(fabricatedProducts).id!,
    orderId: null,
    dueDate: daysFromNow(-7),
    progress: 2,
  });
  activeSpecs.push({
    productId: pick(fabricatedProducts).id!,
    orderId: null,
    dueDate: daysFromNow(randInt(4, 18)),
    progress: 0,
  });
  while (activeSpecs.length < 6) {
    activeSpecs.push({
      productId: pick(fabricatedProducts).id!,
      orderId: null,
      dueDate: daysFromNow(randInt(2, 16)),
      progress: randInt(0, 3),
    });
  }

  let consumptionCounter = 0;
  for (let i = 0; i < activeSpecs.length; i++) {
    const spec = activeSpecs[i];
    const quantity = randInt(20, 55);
    const startDate = daysAgo(randInt(2, 12));
    const orderId = `op_${41 + i}`;
    const late = spec.dueDate < new Date();
    orders.push({
      id: orderId,
      number: `OP-${String(41 + i).padStart(4, "0")}`,
      productId: spec.productId,
      orderId: spec.orderId,
      status: ProductionStatus.EN_PROCESO,
      priority: late ? ProductionPriority.ALTA : chance(0.5) ? ProductionPriority.MEDIA : ProductionPriority.BAJA,
      startDate,
      dueDate: spec.dueDate,
      quantity,
      consumptionWarehouseId: "wh_mp",
      outputWarehouseId: "wh_pt",
      notes: late ? "Pedido demorado: priorizar terminación." : null,
      userId: "produccion",
      createdAt: startDate,
      updatedAt: new Date(),
    });
    makeLines(orderId, spec.productId, quantity);
    makeStages(orderId, spec.productId, quantity, spec.progress, ProductionStatus.EN_PROCESO, startDate, spec.dueDate);

    const bom = bomByProduct.get(spec.productId);
    if (bom) {
      for (const line of bom.lines) {
        const required = Math.ceil(
          quantity * line.quantity * (1 + line.wastePercent / 100)
        );
        const info = data.variantInfo.get(line.materialVariantId);
        await recordOutgoing(data, {
          movementId: `mov_cons_${++consumptionCounter}`,
          variantId: line.materialVariantId,
          warehouseId: "wh_mp",
          quantity: required,
          unitCost: info?.product.cost ?? 0,
          type: StockMovementType.CONSUMO_PRODUCCION,
          originType: "PRODUCTION_ORDER",
          originId: orderId,
          date: startDate,
          observation: `Consumo de materia prima · ${orderId.toUpperCase()}`,
        });
      }
    }
  }

  await prisma.productionOrder.createMany({ data: orders });
  await prisma.productionOrderLine.createMany({ data: orderLines });
  await prisma.productionOrderStage.createMany({ data: orderStages });
}

