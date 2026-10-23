import {
  Prisma,
  PrismaClient,
  CustomerType,
  StockMovementType,
  WorkshopType,
} from "@prisma/client";
import { calculateDV } from "../../src/lib/fiscal";
import {
  catalog,
  CUSTOMER_NAMES,
  CITIES,
  SUPPLIERS,
  PAYMENT_METHODS,
  EXPENSE_CATEGORIES,
  STAGES,
  GROUP_NAMES,
} from "./catalog";
import {
  rand,
  randInt,
  pick,
  chance,
  money,
  daysAgo,
  slug,
  skuPart,
  type CatalogItem,
  type CustomerSeed,
  type SupplierSeed,
  type VariantInfo,
  FAB,
  REV,
  IMP,
  MP,
} from "./helpers";

const prisma = new PrismaClient();

export type SeedData = {
  company: {
    razonSocial: string;
    ruc: string;
    dv: string;
    address: string;
    city: string;
    phone: string;
    email: string;
  };
  timbradoId: string;
  timbradoNumber: string;
  points: { id: string; establecimiento: string; punto: string; name: string }[];
  customers: CustomerSeed[];
  suppliers: SupplierSeed[];
  productsData: Prisma.ProductCreateManyInput[];
  variantsData: Prisma.ProductVariantCreateManyInput[];
  variantInfo: Map<string, VariantInfo>;
  productTax: Map<string, number>;
  productCost: Map<string, number>;
  listDiscount: Record<string, number>;
  stockMap: Map<string, number>;
  sellableVariants: Prisma.ProductVariantCreateManyInput[];
  stockLevels: Prisma.StockLevelCreateManyInput[];
};

export async function seedMasters(): Promise<SeedData> {
  const rucBase = "80000001";
  const companyId = "company_esmar";
  const company = {
    id: companyId,
    razonSocial: "Esmar SRL",
    nombreFantasia: "Esmar Uniformes y EPP",
    ruc: rucBase,
    dv: String(calculateDV(rucBase)),
    address: "Ruta PY01 Km 18,5",
    city: "Ñemby",
    phone: "021 555 1234",
    email: "ventas@esmar.com.py",
    actividadEconomica:
      "Fabricación de prendas de vestir y venta de equipos de protección personal",
  };
  await prisma.company.create({ data: company });

  const timbradoId = "timbrado_1";
  const timbradoNumber = "12345678";
  await prisma.timbrado.create({
    data: {
      id: timbradoId,
      numero: timbradoNumber,
      vigenciaDesde: new Date("2025-01-01T00:00:00-03:00"),
      vigenciaHasta: new Date("2028-12-31T23:59:59-03:00"),
      activo: true,
      companyId,
    },
  });

  const points = [
    { id: "ep_1", establecimiento: "001", punto: "001", name: "Casa central · Caja 1" },
    { id: "ep_2", establecimiento: "001", punto: "002", name: "Casa central · Caja 2" },
  ];
  await prisma.expeditionPoint.createMany({ data: points });
  await prisma.cashRegister.createMany({
    data: [
      { id: "caja_1", name: "Caja 1", expeditionPointId: "ep_1" },
      { id: "caja_2", name: "Caja 2", expeditionPointId: "ep_2" },
    ],
  });
  await prisma.posTerminal.createMany({
    data: [
      { id: "pos_1", name: "POS Bancard Caja 1", code: "POS-C1", cashRegisterId: "caja_1" },
      { id: "pos_2", name: "POS Bancard Caja 2", code: "POS-C2", cashRegisterId: "caja_2" },
    ],
  });
  await prisma.paymentMethod.createMany({
    data: PAYMENT_METHODS.map((method) => ({ id: `pm_${method.code}`, ...method })),
  });
  await prisma.expenseCategory.createMany({
    data: EXPENSE_CATEGORIES.map(([name, color], index) => ({
      id: `cat_${index + 1}`,
      name,
      color,
    })),
  });
  await prisma.productionStage.createMany({
    data: STAGES.map((name, index) => ({
      id: `stage_${index + 1}`,
      name,
      sortOrder: index + 1,
    })),
  });
  await prisma.workshop.createMany({
    data: [
      {
        id: "taller_1",
        name: "Taller propio – Corte",
        type: WorkshopType.PROPIO,
        contact: "Diego Ayala",
        referenceCost: 3000,
      },
      {
        id: "taller_2",
        name: "Taller propio – Confección",
        type: WorkshopType.PROPIO,
        contact: "Marisa Ortiz",
        referenceCost: 12000,
      },
      {
        id: "taller_3",
        name: "Bordados Luque (externo)",
        type: WorkshopType.EXTERNO,
        contact: "Cristian Ruiz",
        phone: "0981 234 567",
        referenceCost: 8500,
      },
      {
        id: "taller_4",
        name: "Estampados Capiatá (externo)",
        type: WorkshopType.EXTERNO,
        contact: "Patricia Medina",
        phone: "0972 345 678",
        referenceCost: 7000,
      },
    ],
  });
  await prisma.warehouse.createMany({
    data: [
      { id: "wh_central", name: "Depósito Central", type: "CENTRAL" },
      { id: "wh_mp", name: "Materia Prima", type: "MATERIA_PRIMA" },
      { id: "wh_pt", name: "Producto Terminado", type: "TERMINADO" },
      { id: "wh_showroom", name: "Showroom", type: "SHOWROOM" },
    ],
  });

  const priceLists = [
    { id: "pl_general", name: "General", description: "Precio de lista", isDefault: true },
    { id: "pl_mayorista", name: "Mayorista", description: "12% de descuento", isDefault: false },
    { id: "pl_frigorificos", name: "Frigoríficos", description: "18% de descuento", isDefault: false },
  ];
  await prisma.priceList.createMany({ data: priceLists });
  const listDiscount: Record<string, number> = {
    pl_general: 0,
    pl_mayorista: 12,
    pl_frigorificos: 18,
  };

  await prisma.productGroup.createMany({
    data: GROUP_NAMES.map((name, index) => ({
      id: `grp_${slug(name)}`,
      name,
      slug: slug(name),
      sortOrder: index + 1,
    })),
  });

  const suppliers: SupplierSeed[] = SUPPLIERS.map((supplier, index) => {
    const base = String(80020000 + index);
    return {
      id: `sup_${index + 1}`,
      code: `PROV-${String(index + 1).padStart(4, "0")}`,
      name: supplier.name,
      rucBase: base,
      dv: String(calculateDV(base)),
      contactName: supplier.contact,
      phone: `021 ${randInt(200, 699)} ${randInt(1000, 9999)}`,
      email: `compras@${slug(supplier.name).split("-").slice(0, 2).join("")}.com.py`,
      origin: supplier.origin,
      active: true,
    };
  });
  await prisma.supplier.createMany({ data: suppliers });

  const frigorificos = new Set([1, 3, 6, 11, 16, 18, 27, 28]);
  const mayoristas = new Set([4, 9, 10, 13, 14, 17, 20, 21, 25, 26, 29, 30]);
  const customers: CustomerSeed[] = CUSTOMER_NAMES.map((name, index) => {
    const isPerson = index >= 30;
    const base = isPerson ? String(3500000 + index) : String(80010000 + index);
    const priceListId = frigorificos.has(index + 1)
      ? "pl_frigorificos"
      : mayoristas.has(index + 1)
        ? "pl_mayorista"
        : "pl_general";
    const termDays = pick([15, 30, 30, 30, 60, 90]);
    return {
      id: `cus_${String(index + 1).padStart(3, "0")}`,
      code: `CLI-${String(index + 1).padStart(4, "0")}`,
      type: isPerson ? CustomerType.PERSONA_FISICA : CustomerType.PERSONA_JURIDICA,
      name,
      rucBase: base,
      dv: String(calculateDV(base)),
      address: `Calle ${randInt(100, 999)} ${pick(["casi", "esq.", "y"])} ${pick(["Mcal. López", "Artigas", "San Martín", "Ruta PY02"])}`,
      city: isPerson ? pick(CITIES.slice(0, 6)) : pick(CITIES),
      phone: `09${randInt(71, 86)} ${randInt(100, 999)} ${randInt(100, 999)}`,
      email: isPerson
        ? `${slug(name).replace("-", ".")}@gmail.com`
        : `compras@${slug(name).split("-").slice(0, 2).join("")}.com.py`,
      priceListId,
      creditLimit: chance(0.2) ? 0 : money(randInt(5000, 60000) * 1000),
      termDays: chance(0.2) ? 0 : termDays,
      active: index < 36,
    };
  });
  await prisma.customer.createMany({ data: customers });
  await prisma.customer.create({
    data: {
      id: "cus_final",
      code: "CLI-0000",
      type: CustomerType.PERSONA_FISICA,
      name: "Consumidor final",
      rucBase: "44444444",
      dv: String(calculateDV("44444444")),
      address: null,
      city: "Asunción",
      phone: null,
      email: null,
      priceListId: "pl_general",
      creditLimit: 0,
      termDays: 0,
      active: true,
    },
  });

  const productsData: Prisma.ProductCreateManyInput[] = [];
  const variantsData: Prisma.ProductVariantCreateManyInput[] = [];
  const variantInfo = new Map<string, VariantInfo>();
  let productCounter = 0;

  for (const item of catalog) {
    productCounter += 1;
    const productId = `prod_${productCounter}`;
    const prefix = item.type === FAB ? "FAB" : item.type === REV ? "REV" : item.type === IMP ? "IMP" : "MP";
    productsData.push({
      id: productId,
      code: `${prefix}-${String(productCounter).padStart(3, "0")}`,
      name: item.name,
      groupId: `grp_${slug(item.group)}`,
      type: item.type,
      unit: item.unit,
      taxRate: item.taxRate ?? 10,
      cost: item.cost,
      basePrice: item.price,
      minStock: item.minStock,
      hasVariants: item.sizes.length * item.colors.length > 1,
      active: true,
      description: null,
    });
    let vIndex = 0;
    for (const size of item.sizes) {
      for (const color of item.colors) {
        vIndex += 1;
        const variantId = `var_${productId}_${vIndex}`;
        const sku = `${prefix}-${String(productCounter).padStart(3, "0")}-${skuPart(size)}-${skuPart(color)}`;
        variantsData.push({
          id: variantId,
          productId,
          size,
          color,
          sku,
          priceOverride: null,
          active: true,
        });
        variantInfo.set(variantId, { product: item, productId, variantId, sku });
      }
    }
  }
  await prisma.product.createMany({ data: productsData });
  await prisma.productVariant.createMany({ data: variantsData });

  const priceItems: Prisma.PriceListItemCreateManyInput[] = [];
  for (const variant of variantsData) {
    const info = variantInfo.get(variant.id!);
    if (!info) continue;
    for (const list of priceLists) {
      const discount = listDiscount[list.id];
      priceItems.push({
        id: `pli_${list.id}_${variant.id}`,
        priceListId: list.id,
        variantId: variant.id!,
        price: money(info.product.price * (1 - discount / 100)),
        discountPercent: discount,
      });
    }
  }
  await prisma.priceListItem.createMany({ data: priceItems });

  const stockLevels: Prisma.StockLevelCreateManyInput[] = [];
  const stockMovements: Prisma.StockMovementCreateManyInput[] = [];
  const stockMap = new Map<string, number>();
  const openingDate = daysAgo(120, 9);
  let movementCounter = 0;

  for (const variant of variantsData) {
    const info = variantInfo.get(variant.id!);
    if (!info) continue;
    const allocations: { warehouseId: string; quantity: number }[] = [];
    if (info.product.type === MP) {
      allocations.push({ warehouseId: "wh_mp", quantity: info.product.minStock * randInt(2, 5) });
    } else if (info.product.type === FAB) {
      allocations.push({ warehouseId: "wh_pt", quantity: info.product.minStock * randInt(2, 5) });
      if (chance(0.35)) allocations.push({ warehouseId: "wh_showroom", quantity: randInt(2, 6) });
    } else {
      allocations.push({ warehouseId: "wh_central", quantity: info.product.minStock * randInt(2, 4) });
      if (chance(0.25)) allocations.push({ warehouseId: "wh_showroom", quantity: randInt(2, 8) });
    }
    for (const allocation of allocations) {
      stockLevels.push({
        id: `sl_${variant.id}_${allocation.warehouseId}`,
        variantId: variant.id!,
        warehouseId: allocation.warehouseId,
        quantity: allocation.quantity,
      });
      stockMap.set(`${variant.id}_${allocation.warehouseId}`, allocation.quantity);
      stockMovements.push({
        id: `mov_${++movementCounter}`,
        type:
          allocation.warehouseId === "wh_mp" || info.product.type !== FAB
            ? StockMovementType.ENTRADA_COMPRA
            : StockMovementType.INGRESO_PRODUCCION,
        variantId: variant.id!,
        warehouseId: allocation.warehouseId,
        quantity: allocation.quantity,
        unitCost: info.product.cost,
        originType: "SEED",
        originId: "CARGA-INICIAL",
        userId: "admin",
        date: openingDate,
        observation: "Carga inicial de inventario (demo)",
      });
    }
  }

  const rawByCode = new Map<string, string[]>();
  variantInfo.forEach((info, variantId) => {
    const list = rawByCode.get(info.product.name) ?? [];
    list.push(variantId);
    rawByCode.set(info.product.name, list);
  });

  const boms: Prisma.BillOfMaterialsCreateManyInput[] = [];
  const bomLines: Prisma.BomLineCreateManyInput[] = [];
  const bomStages: Prisma.BomStageCreateManyInput[] = [];
  const fabricated = productsData.filter((product) => product.type === FAB);
  let bomLineCounter = 0;
  let bomStageCounter = 0;

  for (const product of fabricated) {
    const name = product.name;
    const bomId = `bom_${product.id}`;
    boms.push({
      id: bomId,
      productId: product.id!,
      notes: "Ficha técnica estándar de producción.",
      active: true,
    });

    const materials: { name: string; qty: number; waste: number }[] = [];
    if (name.includes("térmic") || name.includes("cámara")) {
      materials.push({ name: "Tela térmica", qty: randInt(2, 4), waste: 8 });
      materials.push({ name: "Tela polar", qty: randInt(1, 2), waste: 6 });
    } else if (name.includes("Piloto") || name.includes("impermeable")) {
      materials.push({ name: "Tela impermeable", qty: randInt(2, 3), waste: 9 });
      materials.push({ name: "Tela polar", qty: 1, waste: 5 });
    } else if (
      name.includes("Remera") ||
      name.includes("Cofia") ||
      name.includes("Tapabocas") ||
      name.includes("Delantal")
    ) {
      materials.push({ name: "Tela jersey", qty: randInt(1, 2), waste: 7 });
    } else {
      materials.push({ name: "Tela gabardina", qty: randInt(2, 3), waste: 8 });
    }
    materials.push({ name: "Hilo de coser", qty: randInt(1, 2), waste: 3 });
    if (name.includes("Camisa") || name.includes("Uniforme") || name.includes("Chaqueta") || name.includes("Overol")) {
      materials.push({ name: "Botones", qty: 1, waste: 2 });
      materials.push({ name: "Entretela", qty: 1, waste: 4 });
    }
    if (name.includes("Pantalón") || name.includes("Overol") || name.includes("Chaqueta") || name.includes("Conjunto")) {
      materials.push({ name: "Cierres", qty: randInt(1, 2), waste: 2 });
    }
    if (chance(0.6)) materials.push({ name: "Hilo de bordado", qty: 1, waste: 2 });

    for (const material of materials) {
      const candidates = rawByCode.get(material.name);
      if (!candidates || candidates.length === 0) continue;
      bomLines.push({
        id: `boml_${++bomLineCounter}`,
        bomId,
        materialVariantId: pick(candidates),
        quantity: material.qty,
        wastePercent: material.waste,
      });
    }

    STAGES.forEach((stageName, index) => {
      const workshopId =
        stageName === "Corte"
          ? "taller_1"
          : stageName === "Bordado/Estampado"
            ? chance(0.5)
              ? "taller_3"
              : "taller_4"
            : "taller_2";
      bomStages.push({
        id: `boms_${++bomStageCounter}`,
        bomId,
        stageId: `stage_${index + 1}`,
        workshopId,
        sortOrder: index + 1,
      });
    });
  }

  await prisma.stockLevel.createMany({ data: stockLevels });
  await prisma.stockMovement.createMany({ data: stockMovements });
  await prisma.billOfMaterials.createMany({ data: boms });
  await prisma.bomLine.createMany({ data: bomLines });
  await prisma.bomStage.createMany({ data: bomStages });

  const productTax = new Map<string, number>();
  const productCost = new Map<string, number>();
  for (const product of productsData) {
    productTax.set(product.id!, product.taxRate ?? 10);
    productCost.set(product.id!, product.cost);
  }
  const sellableVariants = variantsData.filter(
    (variant) => variantInfo.get(variant.id!)?.product.type !== MP
  );

  return {
    company: {
      razonSocial: company.razonSocial,
      ruc: company.ruc,
      dv: company.dv,
      address: company.address,
      city: company.city,
      phone: company.phone,
      email: company.email,
    },
    timbradoId,
    timbradoNumber,
    points,
    customers,
    suppliers,
    productsData,
    variantsData,
    variantInfo,
    productTax,
    productCost,
    listDiscount,
    stockMap,
    sellableVariants,
    stockLevels,
  };
}
