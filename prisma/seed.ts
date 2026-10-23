import { PrismaClient, Role, StockMovementType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedMasters } from "./seed/masters";
import {
  seedSessions,
  seedInvoices,
  seedReceipts,
  seedExpenses,
  closeSessions,
} from "./seed/sales";
import { seedQuotes, seedOrdersAndShipments, seedPurchases } from "./seed/commercial";
import { seedProduction } from "./seed/production";
import { seedHR } from "./seed/hr";
import { daysAgo, randInt, pick } from "./seed/helpers";

const prisma = new PrismaClient();

async function cleanup() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "PayrollItem", "PayrollPeriod", "PieceworkEntry", "VacationRequest", "AttendancePhoto", "Attendance", "Employee",
      "ReceiptPayment", "ReceiptAllocation", "CashMovement", "SifenEvent", "InvoiceLine", "Invoice",
      "Receipt", "Expense", "ProductionOrderStage", "ProductionOrderLine", "ProductionOrder",
      "ShipmentLine", "Shipment", "SalesOrderLine", "SalesOrder", "QuoteLine", "Quote",
      "PurchaseReceiptLine", "PurchaseReceipt", "BomStage", "BomLine", "BillOfMaterials",
      "StockMovement", "StockLevel", "PriceListItem", "PriceList", "ProductVariant", "Product",
      "ProductGroup", "Workshop", "ProductionStage", "ExpenseCategory", "PaymentMethod",
      "PosTerminal", "CashSession", "CashRegister", "ExpeditionPoint", "Timbrado",
      "Customer", "Supplier", "Warehouse", "Company"
    RESTART IDENTITY CASCADE;
  `);
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash("demo1234", 10);
  const users: { username: string; name: string; role: Role }[] = [
    { username: "admin", name: "Ana Giménez", role: Role.ADMIN },
    { username: "gerencia", name: "Roberto Esmar", role: Role.GERENCIA },
    { username: "ventas", name: "Lucía Benítez", role: Role.VENTAS },
    { username: "caja", name: "Mabel Ortiz", role: Role.CAJA },
    { username: "deposito", name: "Hugo Villalba", role: Role.DEPOSITO },
    { username: "produccion", name: "Diego Ayala", role: Role.PRODUCCION },
    { username: "rrhh", name: "Patricia Ocampos", role: Role.RRHH },
  ];
  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: { name: user.name, role: user.role, passwordHash, active: true },
      create: { ...user, passwordHash, active: true },
    });
  }
}

async function adjustLowStock(stockMap: Map<string, number>) {
  const candidates = await prisma.stockLevel.findMany({
    where: {
      quantity: { gte: 8 },
      warehouseId: { in: ["wh_central", "wh_pt"] },
    },
    include: { variant: { include: { product: true } } },
    take: 80,
  });
  const chosen: typeof candidates = [];
  while (chosen.length < 10 && candidates.length > 0) {
    const candidate = pick(candidates);
    if (!chosen.find((item) => item.id === candidate.id)) chosen.push(candidate);
  }
  let counter = 0;
  for (const level of chosen) {
    const key = `${level.variantId}_${level.warehouseId}`;
    const current = stockMap.get(key) ?? level.quantity;
    const target = randInt(0, 4);
    if (current <= target) continue;
    const difference = current - target;
    await prisma.stockLevel.update({
      where: { id: level.id },
      data: { quantity: target },
    });
    await prisma.stockMovement.create({
      data: {
        id: `mov_low_${++counter}`,
        type: StockMovementType.AJUSTE_NEGATIVO,
        variantId: level.variantId,
        warehouseId: level.warehouseId,
        quantity: difference,
        unitCost: level.variant.product.cost,
        originType: "ADJUSTMENT",
        originId: "INVENTARIO-FISICO",
        userId: "deposito",
        date: daysAgo(randInt(1, 6), 16),
        observation: "Ajuste por inventario físico (demo)",
      },
    });
    stockMap.set(key, target);
  }
}

async function main() {
  console.log("Limpiando datos de demo...");
  await cleanup();
  await seedUsers();
  console.log("Usuarios demo listos.");

  const data = await seedMasters();
  console.log(
    `Maestros listos: ${data.productsData.length} productos, ${data.variantsData.length} variantes.`
  );

  const { sessions, sessionKeyMap } = await seedSessions(data);
  console.log(`Sesiones de caja: ${sessions.length}`);

  const invoiceRecords = await seedInvoices(data, sessionKeyMap);
  await seedReceipts(data, sessionKeyMap, invoiceRecords);
  await seedExpenses(data, sessions, sessionKeyMap);
  await closeSessions(data, sessions);
  console.log("Cobranzas, gastos y cierres de caja listos.");

  const approvedQuotes = await seedQuotes(data);
  const commercial = await seedOrdersAndShipments(data, approvedQuotes);
  await seedPurchases(data);
  console.log("Presupuestos, pedidos, envíos y compras listos.");

  await seedProduction(data, commercial);
  console.log("Órdenes de producción y consumo de materia prima listos.");

  await seedHR();
  console.log("Empleados, asistencia, liquidaciones y recibos listos.");

  await adjustLowStock(data.stockMap);
  console.log("Ajustes de stock bajo mínimo listos.");

  const counts = {
    clientes: await prisma.customer.count(),
    productos: await prisma.product.count(),
    variantes: await prisma.productVariant.count(),
    facturas: await prisma.invoice.count({ where: { type: "FACTURA" } }),
    recibos: await prisma.receipt.count(),
    pedidos: await prisma.salesOrder.count(),
    ordenesProduccion: await prisma.productionOrder.count(),
    movimientosStock: await prisma.stockMovement.count(),
    empleados: await prisma.employee.count(),
    liquidaciones: await prisma.payrollPeriod.count(),
  };
  console.log("Seed completado:", counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
