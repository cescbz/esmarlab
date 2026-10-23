import {
  Prisma,
  PrismaClient,
  InvoiceType,
  InvoiceCondition,
  SifenStatus,
  SifenEventType,
  CashSessionStatus,
  CashMovementType,
} from "@prisma/client";
import { buildCdc, calcInvoiceTotals, formatDocNumber } from "../../src/lib/fiscal";
import { toDateInputValue } from "../../src/lib/format";
import { buildXml } from "./xml";
import {
  randInt,
  pick,
  chance,
  money,
  now,
  daysAgo,
  addDays,
  startOfMonth,
  type InvoiceDraft,
  type InvoiceRecord,
  type SessionSeed,
  type CustomerSeed,
} from "./helpers";
import type { SeedData } from "./masters";
import { EXPENSE_CATEGORIES } from "./catalog";

const prisma = new PrismaClient();

export async function seedSessions(data: SeedData): Promise<{
  sessions: SessionSeed[];
  sessionKeyMap: Map<string, string>;
}> {
  const sessions: SessionSeed[] = [];
  const sessionKeyMap = new Map<string, string>();
  for (let day = 59; day >= 0; day--) {
    const date = daysAgo(day, 8);
    if (date.getDay() === 0) continue;
    const dateKey = toDateInputValue(date);
    if (day === 0) {
      const sessionId = `ses_${dateKey.replace(/-/g, "")}_caja_1`;
      sessions.push({
        id: sessionId,
        cashRegisterId: "caja_1",
        userId: "caja",
        openedAt: new Date(`${dateKey}T07:30:00-03:00`),
        openingAmount: money(randInt(900, 1600) * 1000),
        closedAt: null,
        countedAmount: null,
        difference: null,
        status: CashSessionStatus.ABIERTA,
      });
      sessionKeyMap.set(`${dateKey}_caja_1`, sessionId);
      continue;
    }
    for (const register of [
      { id: "caja_1", userId: "caja" },
      { id: "caja_2", userId: "admin" },
    ]) {
      const sessionId = `ses_${dateKey.replace(/-/g, "")}_${register.id}`;
      sessions.push({
        id: sessionId,
        cashRegisterId: register.id,
        userId: register.userId,
        openedAt: new Date(`${dateKey}T07:30:00-03:00`),
        openingAmount: money(randInt(800, 1800) * 1000),
        closedAt: new Date(`${dateKey}T19:00:00-03:00`),
        countedAmount: null,
        difference: null,
        status: CashSessionStatus.CERRADA,
      });
      sessionKeyMap.set(`${dateKey}_${register.id}`, sessionId);
    }
  }
  await prisma.cashSession.createMany({ data: sessions });
  return { sessions, sessionKeyMap };
}

function customerPrice(customer: CustomerSeed, variant: Prisma.ProductVariantCreateManyInput, data: SeedData) {
  const info = data.variantInfo.get(variant.id!)!;
  return money(info.product.price * (1 - data.listDiscount[customer.priceListId] / 100));
}

export async function seedInvoices(
  data: SeedData,
  sessionKeyMap: Map<string, string>
): Promise<InvoiceRecord[]> {
  const activeCustomers = data.customers.filter((customer) => customer.active);
  const drafts: InvoiceDraft[] = [];
  const monthWeights = [0.55, 0.65, 0.72, 0.8, 0.72, 0.9, 1.02, 1.18, 1.28, 1.15, 1.05, 1.1];
  const totalWeight = monthWeights.reduce((sum, weight) => sum + weight, 0);

  for (let offset = 11; offset >= 0; offset--) {
    const count = Math.round((600 * monthWeights[11 - offset]) / totalWeight);
    const monthStart = startOfMonth(offset);
    const maxDay = offset === 0 ? now.getDate() : 27;
    for (let i = 0; i < count; i++) {
      const date = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        randInt(1, maxDay),
        randInt(8, 18),
        randInt(0, 59)
      );
      if (date > now) date.setDate(now.getDate() - 1);
      const customer = pick(activeCustomers);
      const condition = chance(0.7) ? InvoiceCondition.CREDITO : InvoiceCondition.CONTADO;
      const lines: InvoiceDraft["lines"] = [];
      const lineCount = randInt(1, 5);
      for (let l = 0; l < lineCount; l++) {
        const variant = pick(data.sellableVariants);
        const info = data.variantInfo.get(variant.id!)!;
        const quantity = info.product.type === "FABRICADO" ? randInt(2, 35) : randInt(1, 24);
        const unitPrice = customerPrice(customer, variant, data);
        const discount = chance(0.25) ? pick([5, 10]) : 0;
        const lineTotal = Math.round(unitPrice * quantity * (1 - discount / 100));
        lines.push({
          variant,
          quantity,
          unitPrice,
          discount,
          taxRate: data.productTax.get(variant.productId) ?? 10,
          lineTotal,
          customized: info.product.type === "FABRICADO" && chance(0.18),
        });
      }
      let status: SifenStatus = SifenStatus.APROBADO;
      if (chance(0.012)) status = SifenStatus.PENDIENTE;
      if (chance(0.003) && date > daysAgo(2)) status = SifenStatus.CANCELADO;
      drafts.push({
        id: `inv_${drafts.length + 1}`,
        point: chance(0.55) ? "ep_1" : "ep_2",
        customer,
        date,
        condition,
        termDays: condition === InvoiceCondition.CREDITO ? customer.termDays || 30 : 0,
        status,
        lines,
      });
      if (drafts.length >= 600) break;
    }
    if (drafts.length >= 600) break;
  }
  drafts.sort((a, b) => a.date.getTime() - b.date.getTime());

  const todayKey = toDateInputValue(now);
  const todayAt = (time: string) => new Date(`${todayKey}T${time}:00-03:00`);
  if (drafts.length >= 3) {
    const recent = drafts.slice(-3);
    recent[0].date = todayAt("10:15");
    recent[0].condition = InvoiceCondition.CONTADO;
    recent[0].termDays = 0;
    recent[0].point = "ep_1";
    recent[0].status = SifenStatus.APROBADO;
    recent[1].date = todayAt("12:40");
    recent[1].condition = InvoiceCondition.CREDITO;
    recent[1].termDays = 30;
    recent[1].point = "ep_1";
    recent[1].status = SifenStatus.APROBADO;
    recent[2].date = todayAt("16:20");
    recent[2].condition = InvoiceCondition.CREDITO;
    recent[2].termDays = 30;
    recent[2].point = "ep_2";
    recent[2].status = SifenStatus.APROBADO;
  }

  const invoiceData: Prisma.InvoiceCreateManyInput[] = [];
  const invoiceLineData: Prisma.InvoiceLineCreateManyInput[] = [];
  const eventData: Prisma.SifenEventCreateManyInput[] = [];
  const records: InvoiceRecord[] = [];
  const counters: Record<string, number> = { ep_1: 0, ep_2: 0 };
  const ncCounters: Record<string, number> = { ep_1: 0, ep_2: 0 };
  let lineCounter = 0;
  let eventCounter = 0;
  const cashMovements: Prisma.CashMovementCreateManyInput[] = [];

  for (const draft of drafts) {
    const point = data.points.find((p) => p.id === draft.point)!;
    const seq = ++counters[draft.point];
    const number = formatDocNumber(point.establecimiento, point.punto, seq);
    const totals = calcInvoiceTotals(
      draft.lines.map((line) => ({ total: line.lineTotal, rate: line.taxRate as 10 | 5 | 0 }))
    );
    const cdc = buildCdc({
      tipoDocumento: "01",
      ruc: data.company.ruc,
      dv: data.company.dv,
      establecimiento: point.establecimiento,
      punto: point.punto,
      numero: seq,
      fecha: draft.date,
    });
    const dueDate = addDays(draft.date, draft.termDays);
    const linePayload = draft.lines.map((line) => {
      const info = data.variantInfo.get(line.variant.id!)!;
      return {
        description: `${info.product.name}${line.variant.size !== "ÚNICA" ? ` · Talle ${line.variant.size}` : ""}${line.variant.color !== "—" ? ` · ${line.variant.color}` : ""}`,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountPercent: line.discount,
        taxRate: line.taxRate,
        lineTotal: line.lineTotal,
        variantId: line.variant.id!,
        orderLineId: null,
      };
    });
    invoiceData.push({
      id: draft.id,
      type: InvoiceType.FACTURA,
      number,
      expeditionPointId: draft.point,
      timbradoId: data.timbradoId,
      customerId: draft.customer.id,
      condition: draft.condition,
      termDays: draft.termDays,
      issueDate: draft.date,
      dueDate,
      status: draft.status,
      cdc,
      xml: buildXml({
        number,
        cdc,
        timbrado: data.timbradoNumber,
        company: data.company,
        customer: draft.customer,
        issueDate: draft.date,
        total: totals.total,
        subtotal10: totals.gravada10,
        iva10: totals.iva10,
        subtotal5: totals.gravada5,
        iva5: totals.iva5,
        exenta: totals.exenta,
        lines: linePayload,
        type: InvoiceType.FACTURA,
      }),
      subtotal10: totals.gravada10,
      subtotal5: totals.gravada5,
      exenta: totals.exenta,
      iva10: totals.iva10,
      iva5: totals.iva5,
      total: totals.total,
      paidAmount: draft.condition === InvoiceCondition.CONTADO ? totals.total : 0,
      balance: draft.condition === InvoiceCondition.CONTADO ? 0 : totals.total,
      userId: pick(["ventas", "caja", "admin"]),
      createdAt: draft.date,
    });
    for (const line of linePayload) {
      invoiceLineData.push({ id: `inl_${++lineCounter}`, invoiceId: draft.id, ...line });
    }
    records.push({
      id: draft.id,
      number,
      customerId: draft.customer.id,
      customerName: draft.customer.name,
      condition: draft.condition,
      issueDate: draft.date,
      dueDate,
      point: draft.point,
      total: totals.total,
      paidAmount: draft.condition === InvoiceCondition.CONTADO ? totals.total : 0,
      balance: draft.condition === InvoiceCondition.CONTADO ? 0 : totals.total,
    });
    eventData.push({
      id: `evt_${++eventCounter}`,
      invoiceId: draft.id,
      type: SifenEventType.ENVIO,
      date: new Date(draft.date.getTime() + 1000),
      message: "Documento enviado a SIFEN (simulado).",
      details: "Ambiente de demostración. No se conecta con la SET.",
    });
    if (draft.status === SifenStatus.APROBADO || draft.status === SifenStatus.CANCELADO) {
      eventData.push({
        id: `evt_${++eventCounter}`,
        invoiceId: draft.id,
        type: SifenEventType.APROBACION,
        date: new Date(draft.date.getTime() + 4000),
        message: "Aprobado por la SET (simulado).",
        details: `CDC ${cdc}`,
      });
    }
    if (draft.status === SifenStatus.CANCELADO) {
      eventData.push({
        id: `evt_${++eventCounter}`,
        invoiceId: draft.id,
        type: SifenEventType.CANCELACION,
        date: new Date(draft.date.getTime() + 60000),
        message: "Cancelación registrada (simulada).",
        details: "Cancelación dentro de las 48 horas.",
      });
    }

    if (draft.condition === InvoiceCondition.CONTADO) {
      const dateKey = toDateInputValue(draft.date);
      const session = sessionKeyMap.get(`${dateKey}_${draft.point === "ep_1" ? "caja_1" : "caja_2"}`);
      if (session) {
        const method = chance(0.55)
          ? "pm_EFECTIVO"
          : chance(0.5)
            ? "pm_TARJETA_DEBITO"
            : "pm_TARJETA_CREDITO";
        cashMovements.push({
          id: `cm_contado_${cashMovements.length + 1}`,
          cashSessionId: session,
          type: CashMovementType.INGRESO_VENTA,
          paymentMethodId: method,
          amount: totals.total,
          reference: number,
          description: `Venta de contado ${number}`,
          date: draft.date,
          invoiceId: draft.id,
        });
      }
    }
  }

  const creditNotes: Prisma.InvoiceCreateManyInput[] = [];
  const creditNoteLines: Prisma.InvoiceLineCreateManyInput[] = [];
  const candidates = records.filter(
    (invoice) => invoice.condition === InvoiceCondition.CREDITO && invoice.balance > 0 && invoice.issueDate < daysAgo(5)
  );
  for (let i = 0; i < 3; i++) {
    const source = pick(candidates);
    if (!source) break;
    const point = data.points.find((p) => p.id === source.point)!;
    const seq = ++ncCounters[source.point];
    const number = formatDocNumber(point.establecimiento, point.punto, seq);
    const total = money(source.total * (randInt(10, 22) / 100));
    const issuedAt = addDays(source.issueDate, 3);
    const cdc = buildCdc({
      tipoDocumento: "05",
      ruc: data.company.ruc,
      dv: data.company.dv,
      establecimiento: point.establecimiento,
      punto: point.punto,
      numero: seq,
      fecha: issuedAt,
    });
    const ncId = `nc_${i + 1}`;
    const customer = data.customers.find((c) => c.id === source.customerId)!;
    creditNotes.push({
      id: ncId,
      type: InvoiceType.NOTA_CREDITO,
      number,
      expeditionPointId: source.point,
      timbradoId: data.timbradoId,
      customerId: source.customerId,
      condition: source.condition,
      termDays: 0,
      issueDate: issuedAt,
      dueDate: issuedAt,
      status: SifenStatus.APROBADO,
      cdc,
      xml: buildXml({
        number,
        cdc,
        timbrado: data.timbradoNumber,
        company: data.company,
        customer,
        issueDate: issuedAt,
        total,
        subtotal10: Math.round(total / 1.1),
        iva10: Math.round(total / 11),
        subtotal5: 0,
        iva5: 0,
        exenta: 0,
        lines: [
          {
            description: "Nota de crédito por devolución de mercadería",
            quantity: 1,
            unitPrice: total,
            lineTotal: total,
            taxRate: 10,
          },
        ],
        type: InvoiceType.NOTA_CREDITO,
      }),
      subtotal10: Math.round(total / 1.1),
      subtotal5: 0,
      exenta: 0,
      iva10: Math.round(total / 11),
      iva5: 0,
      total,
      paidAmount: 0,
      balance: 0,
      sourceInvoiceId: source.id,
      userId: "admin",
      createdAt: issuedAt,
    });
    creditNoteLines.push({
      id: `inl_nc_${i + 1}`,
      invoiceId: ncId,
      variantId: null,
      description: "Nota de crédito por devolución de mercadería",
      quantity: 1,
      unitPrice: total,
      discountPercent: 0,
      taxRate: 10,
      lineTotal: total,
      orderLineId: null,
    });
    source.balance = Math.max(0, source.balance - total);
    const sourceInvoice = invoiceData.find((invoice) => invoice.id === source.id);
    if (sourceInvoice) sourceInvoice.balance = source.balance;
    eventData.push(
      {
        id: `evt_${++eventCounter}`,
        invoiceId: ncId,
        type: SifenEventType.ENVIO,
        date: issuedAt,
        message: "Nota de crédito enviada a SIFEN (simulada).",
        details: "Ambiente de demostración.",
      },
      {
        id: `evt_${++eventCounter}`,
        invoiceId: ncId,
        type: SifenEventType.APROBACION,
        date: new Date(issuedAt.getTime() + 4000),
        message: "Nota de crédito aprobada (simulada).",
        details: `CDC ${cdc}`,
      }
    );
  }

  await prisma.invoice.createMany({ data: invoiceData });
  await prisma.invoice.createMany({ data: creditNotes });
  for (const point of data.points) {
    await prisma.expeditionPoint.update({
      where: { id: point.id },
      data: {
        lastInvoiceNumber: counters[point.id] ?? 0,
        lastCreditNoteNumber: ncCounters[point.id] ?? 0,
      },
    });
  }
  await prisma.invoiceLine.createMany({ data: [...invoiceLineData, ...creditNoteLines] });
  await prisma.sifenEvent.createMany({ data: eventData });
  if (cashMovements.length) await prisma.cashMovement.createMany({ data: cashMovements });

  console.log(`Facturas: ${invoiceData.length} · Notas de crédito: ${creditNotes.length}`);
  return records;
}

export async function seedReceipts(
  data: SeedData,
  sessionKeyMap: Map<string, string>,
  invoiceRecords: InvoiceRecord[]
) {
  const receipts: Prisma.ReceiptCreateManyInput[] = [];
  const allocations: Prisma.ReceiptAllocationCreateManyInput[] = [];
  const payments: Prisma.ReceiptPaymentCreateManyInput[] = [];
  const movements: Prisma.CashMovementCreateManyInput[] = [];
  const counters: Record<string, number> = { ep_1: 0, ep_2: 0 };
  let allocationCounter = 0;
  let paymentCounter = 0;
  const todayKey = toDateInputValue(now);
  const todayAt = (time: string) => new Date(`${todayKey}T${time}:00-03:00`);
  const methodIds = [
    "pm_EFECTIVO",
    "pm_EFECTIVO",
    "pm_TARJETA_DEBITO",
    "pm_TARJETA_CREDITO",
    "pm_TRANSFERENCIA",
    "pm_CHEQUE",
    "pm_QR",
  ];
  const candidates = invoiceRecords.filter(
    (invoice) => invoice.condition === InvoiceCondition.CREDITO && invoice.balance > 0
  );
  const todayInvoice = invoiceRecords.find(
    (invoice) =>
      invoice.condition === InvoiceCondition.CREDITO &&
      invoice.balance > 0 &&
      toDateInputValue(invoice.issueDate) === todayKey &&
      invoice.point === "ep_1"
  );
  if (todayInvoice) {
    const todayReceiptId = `rec_${receipts.length + 1}`;
    const todayPoint = data.points.find((point) => point.id === todayInvoice.point)!;
    const amount = Math.min(
      todayInvoice.balance,
      Math.max(1000, money(todayInvoice.balance * 0.4))
    );
    if (amount > 0) {
      const seq = ++counters[todayInvoice.point];
      const number = `REC-${todayPoint.establecimiento}-${todayPoint.punto}-${String(seq).padStart(7, "0")}`;
      const receiptDate = todayAt("11:30");
      const session = sessionKeyMap.get(`${todayKey}_caja_1`) ?? null;
      receipts.push({
        id: todayReceiptId,
        number,
        customerId: todayInvoice.customerId,
        cashSessionId: session,
        expeditionPointId: todayInvoice.point,
        date: receiptDate,
        total: amount,
        userId: "caja",
        observations: "Cobro del día",
        createdAt: receiptDate,
      });
      allocations.push({
        id: `alloc_${++allocationCounter}`,
        receiptId: todayReceiptId,
        invoiceId: todayInvoice.id,
        amount,
      });
      todayInvoice.paidAmount += amount;
      todayInvoice.balance = Math.max(0, todayInvoice.balance - amount);
      payments.push({
        id: `pay_${++paymentCounter}`,
        receiptId: todayReceiptId,
        paymentMethodId: "pm_EFECTIVO",
        amount,
        reference: null,
        bank: null,
        chequeNumber: null,
      });
      if (session) {
        movements.push({
          id: `cm_rec_${movements.length + 1}`,
          cashSessionId: session,
          type: CashMovementType.INGRESO_COBRO,
          paymentMethodId: "pm_EFECTIVO",
          amount,
          reference: number,
          description: `Cobro ${number}`,
          date: receiptDate,
          receiptId: todayReceiptId,
        });
      }
    }
  }

  const paymentTargets = new Map<string, number>();
  for (const invoice of candidates) {
    const profile = randInt(1, 100);
    const fraction = profile <= 20 ? 0 : profile <= 55 ? randInt(35, 80) / 100 : 1;
    paymentTargets.set(invoice.id, Math.round(invoice.total * fraction));
  }

  for (let attempt = 0; receipts.length < 400 && attempt < 800; attempt++) {
    const available = candidates.filter(
      (invoice) =>
        invoice.balance > 0 &&
        invoice.paidAmount < (paymentTargets.get(invoice.id) ?? 0) &&
        (paymentTargets.get(invoice.id) ?? 0) > 0
    );
    if (available.length === 0) break;
    const primary = pick(available);
    const customerInvoices = available
      .filter((invoice) => invoice.customerId === primary.customerId)
      .slice(0, 3);
    if (customerInvoices.length === 0) continue;
    const register = primary.point === "ep_1" ? "caja_1" : "caja_2";
    const latest = Math.max(...customerInvoices.map((invoice) => invoice.issueDate.getTime()));
    let receiptDate = chance(0.65)
      ? daysAgo(randInt(0, 45), randInt(8, 17))
      : new Date(Math.min(now.getTime(), latest + randInt(1, 25) * 86_400_000));
    if (receiptDate.getTime() < latest) receiptDate = new Date(Math.min(now.getTime(), latest + 86_400_000));
    receiptDate.setHours(randInt(8, 17), randInt(0, 59), 0, 0);
    const session = sessionKeyMap.get(`${toDateInputValue(receiptDate)}_${register}`) ?? null;
    const receiptAllocations: { invoice: InvoiceRecord; amount: number }[] = [];
    for (const invoice of customerInvoices) {
      if (invoice.balance <= 0) continue;
      const target = paymentTargets.get(invoice.id) ?? 0;
      const capacity = Math.max(0, target - invoice.paidAmount);
      if (capacity <= 0) continue;
      const amount = chance(0.2)
        ? Math.min(invoice.balance, capacity)
        : Math.min(
            invoice.balance,
            capacity,
            money(Math.max(5000, capacity * (randInt(20, 75) / 100)))
          );
      if (amount <= 0) continue;
      receiptAllocations.push({ invoice, amount });
      if (receiptAllocations.length >= 3) break;
    }
    if (receiptAllocations.length === 0) continue;
    const total = receiptAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    const point = data.points.find((p) => p.id === primary.point)!;
    const seq = ++counters[primary.point];
    const number = `REC-${point.establecimiento}-${point.punto}-${String(seq).padStart(7, "0")}`;
    const receiptId = `rec_${receipts.length + 1}`;
    receipts.push({
      id: receiptId,
      number,
      customerId: primary.customerId,
      cashSessionId: session,
      expeditionPointId: primary.point,
      date: receiptDate,
      total,
      userId: pick(["caja", "ventas", "admin"]),
      observations: null,
      createdAt: receiptDate,
    });
    for (const allocation of receiptAllocations) {
      allocations.push({
        id: `alloc_${++allocationCounter}`,
        receiptId,
        invoiceId: allocation.invoice.id,
        amount: allocation.amount,
      });
      allocation.invoice.paidAmount += allocation.amount;
      allocation.invoice.balance = Math.max(0, allocation.invoice.balance - allocation.amount);
    }
    const split =
      total > 800000 && chance(0.25)
        ? [Math.round(total * 0.6), total - Math.round(total * 0.6)]
        : [total];
    split.forEach((amount, index) => {
      const method = pick(methodIds);
      const isCard = method === "pm_TARJETA_DEBITO" || method === "pm_TARJETA_CREDITO";
      const paymentId = `pay_${++paymentCounter}`;
      payments.push({
        id: paymentId,
        receiptId,
        paymentMethodId: method,
        posTerminalId: isCard ? (register === "caja_1" ? "pos_1" : "pos_2") : null,
        amount,
        reference:
          method === "pm_CHEQUE"
            ? `CH-${randInt(100000, 999999)}`
            : method === "pm_TRANSFERENCIA"
              ? `TRF-${randInt(100000, 999999)}`
              : null,
        bank:
          method === "pm_CHEQUE" || method === "pm_TRANSFERENCIA"
            ? pick(["Banco Continental", "Itaú", "Ueno", "Sudameris"])
            : null,
        chequeNumber: method === "pm_CHEQUE" ? String(randInt(100000, 999999)) : null,
      });
      if (session) {
        movements.push({
          id: `cm_rec_${movements.length + 1}`,
          cashSessionId: session,
          type: CashMovementType.INGRESO_COBRO,
          paymentMethodId: method,
          amount,
          reference: number,
          description: `Cobro ${number} · medio ${index + 1}`,
          date: receiptDate,
          receiptId,
        });
      }
    });
  }

  await prisma.receipt.createMany({ data: receipts });
  for (const point of data.points) {
    await prisma.expeditionPoint.update({
      where: { id: point.id },
      data: { lastReceiptNumber: counters[point.id] ?? 0 },
    });
  }
  await prisma.receiptAllocation.createMany({ data: allocations });
  await prisma.receiptPayment.createMany({ data: payments });
  if (movements.length) await prisma.cashMovement.createMany({ data: movements });

  const updates = invoiceRecords.map(
    (invoice) => Prisma.sql`(${invoice.id}, ${invoice.paidAmount}, ${invoice.balance})`
  );
  await prisma.$executeRaw(
    Prisma.sql`UPDATE "Invoice" AS i SET "paidAmount" = v."paidAmount", balance = v."balance"
      FROM (VALUES ${Prisma.join(updates)}) AS v(id, "paidAmount", balance)
      WHERE i.id = v.id`
  );

  console.log(`Recibos: ${receipts.length} · Aplicaciones: ${allocations.length}`);
}

export async function seedExpenses(
  data: SeedData,
  sessions: SessionSeed[],
  sessionKeyMap: Map<string, string>
) {
  const sessionDates = new Set(sessions.map((session) => toDateInputValue(session.openedAt)));
  const expenses: Prisma.ExpenseCreateManyInput[] = [];
  const movements: Prisma.CashMovementCreateManyInput[] = [];
  const descriptions: Record<string, string[]> = {
    Alquiler: ["Alquiler del local industrial", "Alquiler de oficinas"],
    "Servicios (ANDE/ESSAP/Internet)": ["Factura ANDE", "Factura ESSAP", "Internet fibra óptica"],
    Combustible: ["Combustible flota de reparto", "Nafta para vehículo de gerencia"],
    Fletes: ["Flete de telas", "Flete de mercadería al cliente"],
    Sueldos: ["Adelanto de sueldos", "Aguinaldo"],
    Mantenimiento: ["Mantenimiento de máquinas de coser", "Reparación de camioneta"],
    "Insumos de oficina": ["Resmas y papelería", "Tóner para impresora"],
    "Talleres externos": ["Bordados Luque", "Estampados Capiatá"],
    Otros: ["Gastos varios", "Comisión bancaria"],
  };

  for (let i = 0; i < 150; i++) {
    const date = daysAgo(randInt(0, 360), randInt(8, 18));
    const category = pick(EXPENSE_CATEGORIES);
    const categoryId = `cat_${EXPENSE_CATEGORIES.findIndex(([name]) => name === category[0]) + 1}`;
    const register = chance(0.6) ? "caja_1" : "caja_2";
    const session = sessionDates.has(toDateInputValue(date))
      ? sessionKeyMap.get(`${toDateInputValue(date)}_${register}`) ?? null
      : null;
    const paidFromCash = Boolean(session) && chance(0.55);
    const method = paidFromCash
      ? "pm_EFECTIVO"
      : pick(["pm_TRANSFERENCIA", "pm_TARJETA_CREDITO", "pm_CHEQUE"]);
    const amount = money(randInt(150, 9000) * 1000);
    const supplier = chance(0.6) ? pick(data.suppliers) : null;
    const voucher = `FAC-${randInt(1000, 9999)}`;
    expenses.push({
      id: `exp_${i + 1}`,
      date,
      categoryId,
      supplierId: supplier?.id ?? null,
      voucherNumber: voucher,
      description: `${pick(descriptions[category[0]])}${supplier ? ` · ${supplier.name}` : ""}`,
      amount,
      taxRate: 10,
      paymentMethodId: method,
      cashSessionId: paidFromCash ? session : null,
      paidFromCash,
      userId: "caja",
      createdAt: date,
    });
    if (paidFromCash && session) {
      movements.push({
        id: `cm_exp_${i + 1}`,
        cashSessionId: session,
        type: CashMovementType.EGRESO_GASTO,
        paymentMethodId: "pm_EFECTIVO",
        amount,
        reference: voucher,
        description: `Gasto: ${category[0]}`,
        date,
      });
    }
  }
  await prisma.expense.createMany({ data: expenses });
  if (movements.length) await prisma.cashMovement.createMany({ data: movements });
}

export async function closeSessions(data: SeedData, sessions: SessionSeed[]) {
  const groups = await prisma.cashMovement.groupBy({
    by: ["cashSessionId", "paymentMethodId", "type"],
    _sum: { amount: true },
  });
  const methods = await prisma.paymentMethod.findMany();
  const totals = new Map<string, Map<string, number>>();
  for (const group of groups) {
    if (!totals.has(group.cashSessionId)) totals.set(group.cashSessionId, new Map());
    const byMethod = totals.get(group.cashSessionId)!;
    const amount = group._sum.amount ?? 0;
    const sign =
      group.type === CashMovementType.EGRESO_GASTO || group.type === CashMovementType.RETIRO
        ? -1
        : 1;
    byMethod.set(group.paymentMethodId, (byMethod.get(group.paymentMethodId) ?? 0) + amount * sign);
  }

  for (const session of sessions) {
    if (session.status === CashSessionStatus.ABIERTA) continue;
    const byMethod = totals.get(session.id) ?? new Map<string, number>();
    const details: { medio: string; esperado: number; contado: number; diferencia: number }[] = [];
    let totalExpected = 0;
    let totalCounted = 0;
    for (const method of methods) {
      const expected =
        (byMethod.get(method.id) ?? 0) + (method.id === "pm_EFECTIVO" ? session.openingAmount : 0);
      const counted = expected + (method.id === "pm_EFECTIVO" ? money(randInt(-12, 12) * 1000) : 0);
      totalExpected += expected;
      totalCounted += counted;
      if (expected !== 0 || method.id === "pm_EFECTIVO") {
        details.push({
          medio: method.name,
          esperado: expected,
          contado: counted,
          diferencia: counted - expected,
        });
      }
    }
    await prisma.cashSession.update({
      where: { id: session.id },
      data: {
        countedAmount: totalCounted,
        difference: totalCounted - totalExpected,
        closingDetails: details,
      },
    });
  }
}
