import {
  Prisma,
  PrismaClient,
  QuoteStatus,
  OrderStatus,
  ShipmentStatus,
  PurchaseStatus,
  StockMovementType,
} from "@prisma/client";
import {
  randInt,
  pick,
  chance,
  money,
  daysAgo,
  daysFromNow,
  FAB,
} from "./helpers";
import type { SeedData } from "./masters";
import type { CustomerSeed } from "./helpers";
import { recordOutgoing } from "./stock";

const prisma = new PrismaClient();

function priceFor(data: SeedData, customer: CustomerSeed, variant: Prisma.ProductVariantCreateManyInput) {
  const info = data.variantInfo.get(variant.id!)!;
  return money(info.product.price * (1 - data.listDiscount[customer.priceListId] / 100));
}

export async function seedQuotes(data: SeedData) {
  const statuses: QuoteStatus[] = [
    QuoteStatus.BORRADOR,
    QuoteStatus.BORRADOR,
    QuoteStatus.ENVIADO,
    QuoteStatus.ENVIADO,
    QuoteStatus.APROBADO,
    QuoteStatus.APROBADO,
    QuoteStatus.RECHAZADO,
    QuoteStatus.VENCIDO,
  ];
  const activeCustomers = data.customers.filter((customer) => customer.active);
  const quotes: Prisma.QuoteCreateManyInput[] = [];
  const quoteLines: Prisma.QuoteLineCreateManyInput[] = [];
  const approved: string[] = [];
  let lineCounter = 0;

  statuses.forEach((status, index) => {
    const customer = pick(activeCustomers);
    const quoteId = `quo_${index + 1}`;
    const date = status === QuoteStatus.VENCIDO ? daysAgo(randInt(35, 55)) : daysAgo(randInt(0, 18));
    const lineCount = randInt(1, 4);
    let total = 0;
    for (let i = 0; i < lineCount; i++) {
      const variant = pick(data.sellableVariants);
      const info = data.variantInfo.get(variant.id!)!;
      const quantity = info.product.type === FAB ? randInt(10, 80) : randInt(5, 40);
      const unitPrice = priceFor(data, customer, variant);
      const discount = chance(0.2) ? 5 : 0;
      const lineTotal = Math.round(unitPrice * quantity * (1 - discount / 100));
      total += lineTotal;
      quoteLines.push({
        id: `ql_${++lineCounter}`,
        quoteId,
        variantId: variant.id!,
        quantity,
        unitPrice,
        discountPercent: discount,
        isCustomized: info.product.type === FAB && chance(0.35),
        customizationDetail:
          info.product.type === FAB && chance(0.35) ? "Bordado de logo en pecho izquierdo" : null,
        taxRate: data.productTax.get(variant.productId) ?? 10,
        lineTotal,
      });
    }
    quotes.push({
      id: quoteId,
      number: `PRES-${String(index + 1).padStart(4, "0")}`,
      customerId: customer.id,
      date,
      validityDays: 15,
      status,
      observations: chance(0.4) ? "Precios sujetos a disponibilidad de talles." : null,
      subtotal: total,
      total,
      userId: "ventas",
      createdAt: date,
    });
    if (status === QuoteStatus.APROBADO) approved.push(quoteId);
  });

  await prisma.quote.createMany({ data: quotes });
  await prisma.quoteLine.createMany({ data: quoteLines });
  return approved;
}

export async function seedOrdersAndShipments(data: SeedData, approvedQuotes: string[]) {
  const statuses: OrderStatus[] = [
    OrderStatus.PENDIENTE,
    OrderStatus.PENDIENTE,
    OrderStatus.PENDIENTE,
    OrderStatus.EN_PRODUCCION,
    OrderStatus.EN_PRODUCCION,
    OrderStatus.EN_PRODUCCION,
    OrderStatus.LISTO,
    OrderStatus.LISTO,
    OrderStatus.DESPACHADO_PARCIAL,
    OrderStatus.DESPACHADO_PARCIAL,
    OrderStatus.DESPACHADO,
    OrderStatus.DESPACHADO,
  ];
  const activeCustomers = data.customers.filter((customer) => customer.active);
  const orders: Prisma.SalesOrderCreateManyInput[] = [];
  const orderLines: Prisma.SalesOrderLineCreateManyInput[] = [];
  const shipments: Prisma.ShipmentCreateManyInput[] = [];
  const shipmentLines: Prisma.ShipmentLineCreateManyInput[] = [];
  const orderLineRecords: {
    id: string;
    orderId: string;
    variantId: string;
    quantity: number;
    quantityShipped: number;
    unitPrice: number;
  }[] = [];
  let orderLineCounter = 0;
  let shipmentCounter = 0;
  let shipmentLineCounter = 0;

  statuses.forEach((status, index) => {
    const customer = pick(activeCustomers);
    const orderId = `ord_${index + 1}`;
    const date = daysAgo(randInt(1, 25));
    const deliveryDate = index === 2 ? daysAgo(randInt(1, 4)) : daysFromNow(randInt(1, 25));
    const needsShipment = status === OrderStatus.DESPACHADO || status === OrderStatus.DESPACHADO_PARCIAL;
    const forceFab = needsShipment && chance(0.6);
    const pool = needsShipment
      ? data.sellableVariants.filter(
          (variant) => data.variantInfo.get(variant.id!)?.product.type === "FABRICADO" === forceFab
        )
      : data.sellableVariants;
    const lineCount = randInt(1, 4);
    let total = 0;
    const createdLineIds: string[] = [];
    for (let i = 0; i < lineCount; i++) {
      const variant = pick(pool);
      const info = data.variantInfo.get(variant.id!)!;
      const quantity = info.product.type === FAB ? randInt(8, 40) : randInt(5, 30);
      const unitPrice = priceFor(data, customer, variant);
      const discount = chance(0.2) ? 5 : 0;
      const lineTotal = Math.round(unitPrice * quantity * (1 - discount / 100));
      total += lineTotal;
      const lineId = `ol_${++orderLineCounter}`;
      createdLineIds.push(lineId);
      const shipped = needsShipment
        ? status === OrderStatus.DESPACHADO
          ? quantity
          : Math.max(1, Math.floor(quantity / 2))
        : 0;
      orderLines.push({
        id: lineId,
        orderId,
        variantId: variant.id!,
        quantity,
        quantityShipped: shipped,
        quantityInvoiced: 0,
        unitPrice,
        discountPercent: discount,
        taxRate: data.productTax.get(variant.productId) ?? 10,
        lineTotal,
        isCustomized: info.product.type === FAB && chance(0.2),
        customizationDetail:
          info.product.type === FAB && chance(0.2) ? "Logo bordado según muestra aprobada" : null,
      });
      orderLineRecords.push({
        id: lineId,
        orderId,
        variantId: variant.id!,
        quantity,
        quantityShipped: shipped,
        unitPrice,
      });
    }
    orders.push({
      id: orderId,
      number: `PED-${String(index + 1).padStart(4, "0")}`,
      customerId: customer.id,
      quoteId: index < approvedQuotes.length ? approvedQuotes[index] : null,
      date,
      deliveryDate,
      shippingAddress: chance(0.5) ? `${customer.address}, ${customer.city}` : null,
      status,
      observations: chance(0.25) ? "Entregar en horario de la mañana." : null,
      total,
      userId: "ventas",
      createdAt: date,
    });
  });

  await prisma.salesOrder.createMany({ data: orders });
  await prisma.salesOrderLine.createMany({ data: orderLines });

  const ordersToShip = orders.filter(
    (order) => order.status === OrderStatus.DESPACHADO || order.status === OrderStatus.DESPACHADO_PARCIAL
  );
  for (const order of ordersToShip) {
    const lines = orderLineRecords.filter((line) => line.orderId === order.id);
    if (lines.length === 0) continue;
    const anyFab = lines.some((line) => data.variantInfo.get(line.variantId)?.product.type === FAB);
    const allFab = lines.every((line) => data.variantInfo.get(line.variantId)?.product.type === FAB);
    const warehouseId = allFab ? "wh_pt" : anyFab ? "wh_pt" : "wh_central";
    const shipmentId = `shp_${++shipmentCounter}`;
    const date = daysAgo(randInt(1, 4), randInt(9, 16));
    shipments.push({
      id: shipmentId,
      number: `REM-${String(shipmentCounter).padStart(4, "0")}`,
      orderId: order.id!,
      warehouseId,
      carrier: pick(["Transporte Guaraní", "Fletes del Sur", "Logística del Este", "Retiro del cliente"]),
      date,
      status: ShipmentStatus.ENTREGADO,
      observations: chance(0.3) ? "Entrega parcial autorizada por el cliente." : null,
      userId: "deposito",
      createdAt: date,
    });
    let shippedCount = 0;
    for (const line of lines) {
      const info = data.variantInfo.get(line.variantId)!;
      const warehouse = info.product.type === FAB ? "wh_pt" : "wh_central";
      const actual = await recordOutgoing(data, {
        movementId: `mov_ship_${shipmentLineCounter + 1}`,
        variantId: line.variantId,
        warehouseId: warehouse,
        quantity: line.quantityShipped,
        unitCost: info.product.cost,
        type: StockMovementType.SALIDA_VENTA,
        originType: "SHIPMENT",
        originId: shipmentId,
        date,
        observation: `Envío ${String(shipmentCounter).padStart(4, "0")} · pedido ${order.number}`,
      });
      if (actual <= 0) continue;
      shipmentLines.push({
        id: `shl_${++shipmentLineCounter}`,
        shipmentId,
        orderLineId: line.id,
        variantId: line.variantId,
        quantity: actual,
      });
      await prisma.salesOrderLine.update({
        where: { id: line.id },
        data: { quantityShipped: actual },
      });
      line.quantityShipped = actual;
      shippedCount += actual;
    }
    const fullyShipped = lines.every((line) => line.quantityShipped >= line.quantity);
    await prisma.salesOrder.update({
      where: { id: order.id! },
      data: {
        status: fullyShipped ? OrderStatus.DESPACHADO : OrderStatus.DESPACHADO_PARCIAL,
      },
    });
    if (shippedCount === 0) {
      shipments.pop();
    }
  }

  await prisma.shipment.createMany({ data: shipments });
  await prisma.shipmentLine.createMany({ data: shipmentLines });
  return {
    orders,
    orderLines: orderLineRecords,
    ordersInProduction: orders.filter((order) => order.status === OrderStatus.EN_PRODUCCION),
  };
}

export async function seedPurchases(data: SeedData) {
  const receipts: Prisma.PurchaseReceiptCreateManyInput[] = [];
  const lines: Prisma.PurchaseReceiptLineCreateManyInput[] = [];
  let lineCounter = 0;

  for (let i = 0; i < 12; i++) {
    const supplier = pick(data.suppliers);
    const warehouseId = chance(0.55) ? "wh_mp" : "wh_central";
    const pool = data.variantsData.filter((variant) => {
      const type = data.variantInfo.get(variant.id!)?.product.type;
      return warehouseId === "wh_mp" ? type === "MATERIA_PRIMA" : type !== "MATERIA_PRIMA";
    });
    const receiptId = `pr_${i + 1}`;
    const date = daysAgo(randInt(2, 90));
    let total = 0;
    const lineCount = randInt(1, 4);
    for (let l = 0; l < lineCount; l++) {
      const variant = pick(pool);
      const info = data.variantInfo.get(variant.id!)!;
      const quantity = randInt(10, 120);
      const unitCost = info.product.cost;
      const lineTotal = quantity * unitCost;
      total += lineTotal;
      lines.push({
        id: `prl_${++lineCounter}`,
        receiptId,
        variantId: variant.id!,
        quantity,
        unitCost,
        lineTotal,
      });
    }
    receipts.push({
      id: receiptId,
      number: `COMP-${String(i + 1).padStart(4, "0")}`,
      supplierId: supplier.id,
      supplierInvoiceNumber: `001-001-${String(randInt(1000000, 9999999))}`,
      warehouseId,
      date,
      status: PurchaseStatus.CONFIRMADA,
      total,
      observations: null,
      userId: "deposito",
      createdAt: date,
    });
  }

  await prisma.purchaseReceipt.createMany({ data: receipts });
  await prisma.purchaseReceiptLine.createMany({ data: lines });
}
