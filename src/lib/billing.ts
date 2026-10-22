import { InvoiceCondition, InvoiceType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildCdc, calcInvoiceTotals, formatDocNumber } from "@/lib/fiscal";
import { buildSifenXml } from "@/lib/sifen";
import { applyMovement } from "@/lib/stock";

export type EmitInvoiceLine = {
  variantId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxRate: number;
  orderLineId?: string;
  unitCost?: number;
  warehouseId?: string;
};

export type EmitPayment = {
  paymentMethodId: string;
  amount: number;
  posTerminalId?: string;
  reference?: string;
};

export type EmitInvoiceInput = {
  customerId: string;
  expeditionPointId: string;
  condition: InvoiceCondition;
  termDays: number;
  issueDate: Date;
  userId: string;
  orderId?: string;
  lines: EmitInvoiceLine[];
  cashSessionId?: string;
  paymentMethodId?: string;
  payments?: EmitPayment[];
  discountStock?: boolean;
  status?: "PENDIENTE" | "APROBADO";
};

export async function emitInvoice(input: EmitInvoiceInput) {
  const [company, timbrado, customer, point] = await Promise.all([
    prisma.company.findFirst(),
    prisma.timbrado.findFirst({ where: { activo: true } }),
    prisma.customer.findUnique({ where: { id: input.customerId } }),
    prisma.expeditionPoint.findUnique({ where: { id: input.expeditionPointId } }),
  ]);
  if (!company) throw new Error("Configuración de empresa faltante.");
  if (!timbrado) throw new Error("No hay timbrado activo.");
  if (!customer) throw new Error("El cliente no existe.");
  if (!point) throw new Error("El punto de expedición no existe.");
  if (input.lines.length === 0) throw new Error("La factura debe tener al menos una línea.");

  const totals = calcInvoiceTotals(
    input.lines.map((line) => ({ total: line.quantity * line.unitPrice * (1 - line.discountPercent / 100), rate: line.taxRate as 10 | 5 | 0 }))
  );
  const dueDate = new Date(input.issueDate);
  dueDate.setDate(dueDate.getDate() + input.termDays);

  return prisma.$transaction(async (tx) => {
    const currentPoint = await tx.expeditionPoint.findUnique({ where: { id: input.expeditionPointId } });
    if (!currentPoint) throw new Error("Punto de expedición inexistente.");
    const seq = currentPoint.lastInvoiceNumber + 1;
    await tx.expeditionPoint.update({
      where: { id: currentPoint.id },
      data: { lastInvoiceNumber: { increment: 1 } },
    });
    const number = formatDocNumber(currentPoint.establecimiento, currentPoint.punto, seq);
    const cdc = buildCdc({
      tipoDocumento: "01",
      ruc: company.ruc,
      dv: company.dv,
      establecimiento: currentPoint.establecimiento,
      punto: currentPoint.punto,
      numero: seq,
      fecha: input.issueDate,
    });
    const xml = buildSifenXml({
      type: InvoiceType.FACTURA,
      number,
      cdc,
      timbrado: timbrado.numero,
      fechaInicioTimbrado: timbrado.vigenciaDesde,
      company,
      customer,
      issueDate: input.issueDate,
      total: totals.total,
      subtotal10: totals.gravada10,
      iva10: totals.iva10,
      subtotal5: totals.gravada5,
      iva5: totals.iva5,
      exenta: totals.exenta,
      lines: input.lines.map((line) => ({
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: Math.round(line.quantity * line.unitPrice * (1 - line.discountPercent / 100)),
        taxRate: line.taxRate,
      })),
    });

    const invoice = await tx.invoice.create({
      data: {
        type: InvoiceType.FACTURA,
        number,
        expeditionPointId: currentPoint.id,
        timbradoId: timbrado.id,
        customerId: input.customerId,
        condition: input.condition,
        termDays: input.condition === InvoiceCondition.CONTADO ? 0 : input.termDays,
        issueDate: input.issueDate,
        dueDate: input.condition === InvoiceCondition.CONTADO ? input.issueDate : dueDate,
        status: input.status ?? "PENDIENTE",
        cdc,
        xml,
        subtotal10: totals.gravada10,
        subtotal5: totals.gravada5,
        exenta: totals.exenta,
        iva10: totals.iva10,
        iva5: totals.iva5,
        total: totals.total,
        paidAmount: input.condition === InvoiceCondition.CONTADO ? totals.total : 0,
        balance: input.condition === InvoiceCondition.CONTADO ? 0 : totals.total,
        orderId: input.orderId,
        userId: input.userId,
        lines: {
          create: input.lines.map((line) => ({
            variantId: line.variantId,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent,
            taxRate: line.taxRate,
            lineTotal: Math.round(line.quantity * line.unitPrice * (1 - line.discountPercent / 100)),
            orderLineId: line.orderLineId,
          })),
        },
        events: {
          create: {
            type: "ENVIO",
            message: "Documento enviado a SIFEN (simulado).",
            details: "Ambiente de demostración. No se conecta con la SET.",
          },
        },
      },
    });

    if (input.orderId) {
      for (const line of input.lines) {
        if (!line.orderLineId) continue;
        await tx.salesOrderLine.update({
          where: { id: line.orderLineId },
          data: { quantityInvoiced: { increment: line.quantity } },
        });
      }
      const orderLines = await tx.salesOrderLine.findMany({ where: { orderId: input.orderId } });
      const fullyInvoiced = orderLines.every((line) => line.quantityInvoiced >= line.quantity);
      if (fullyInvoiced) {
        await tx.salesOrder.update({ where: { id: input.orderId }, data: { status: "FACTURADO" } });
      }
    }

    if (input.discountStock) {
      for (const line of input.lines) {
        await applyMovement(tx, {
          type: "SALIDA_VENTA",
          variantId: line.variantId,
          warehouseId: line.warehouseId ?? "wh_central",
          quantity: line.quantity,
          unitCost: line.unitCost ?? 0,
          originType: "INVOICE",
          originId: invoice.id,
          userId: input.userId,
          observation: `Venta directa ${number}`,
        });
      }
    }

    if (input.condition === InvoiceCondition.CONTADO && input.cashSessionId) {
      const payments = input.payments?.length
        ? input.payments
        : [{ paymentMethodId: input.paymentMethodId ?? "pm_EFECTIVO", amount: totals.total }];
      const paymentTotal = payments.reduce((sum, payment) => sum + payment.amount, 0);
      if (paymentTotal !== totals.total) {
        throw new Error("La suma de los medios de pago debe coincidir con el total de la factura.");
      }
      for (const payment of payments) {
        await tx.cashMovement.create({
          data: {
            cashSessionId: input.cashSessionId,
            type: "INGRESO_VENTA",
            paymentMethodId: payment.paymentMethodId,
            amount: payment.amount,
            reference: number,
            description: `Venta de contado ${number}`,
            invoiceId: invoice.id,
          },
        });
      }
    }

    return { ...invoice, cdc, number };
  });
}

export async function emitCreditNote(input: {
  invoiceId: string;
  amount: number;
  reason: string;
  userId: string;
}) {
  const [company, timbrado] = await Promise.all([
    prisma.company.findFirst(),
    prisma.timbrado.findFirst({ where: { activo: true } }),
  ]);
  const invoice = await prisma.invoice.findUnique({
    where: { id: input.invoiceId },
    include: { customer: true, lines: true, creditNotes: true },
  });
  if (!company || !timbrado || !invoice) throw new Error("No se pudo preparar la nota de crédito.");
  if (invoice.type !== "FACTURA") throw new Error("Solo se pueden acreditar facturas.");
  if (invoice.status === "CANCELADO") throw new Error("La factura está cancelada.");

  const alreadyCredited = invoice.creditNotes.filter((note) => note.status !== "CANCELADO").reduce((sum, note) => sum + note.total, 0);
  const available = invoice.total - alreadyCredited;
  const amount = Math.min(Math.round(input.amount), Math.max(0, available));
  if (amount <= 0) throw new Error("El monto de la nota de crédito supera el saldo acreditable.");

  const rate = invoice.lines.some((line) => line.taxRate === 10)
    ? 10
    : invoice.lines.some((line) => line.taxRate === 5)
      ? 5
      : 0;
  const totals = calcInvoiceTotals([{ total: amount, rate: rate as 10 | 5 | 0 }]);
  const point = await prisma.expeditionPoint.findUnique({ where: { id: invoice.expeditionPointId } });
  if (!point) throw new Error("Punto de expedición inexistente.");

  return prisma.$transaction(async (tx) => {
    const seq = point.lastCreditNoteNumber + 1;
    await tx.expeditionPoint.update({
      where: { id: point.id },
      data: { lastCreditNoteNumber: { increment: 1 } },
    });
    const number = formatDocNumber(point.establecimiento, point.punto, seq);
    const cdc = buildCdc({
      tipoDocumento: "05",
      ruc: company.ruc,
      dv: company.dv,
      establecimiento: point.establecimiento,
      punto: point.punto,
      numero: seq,
      fecha: new Date(),
    });
    const description = `Nota de crédito · ${input.reason}`;
    const xml = buildSifenXml({
      type: InvoiceType.NOTA_CREDITO,
      number,
      cdc,
      timbrado: timbrado.numero,
      fechaInicioTimbrado: timbrado.vigenciaDesde,
      company,
      customer: invoice.customer,
      issueDate: new Date(),
      total: totals.total,
      subtotal10: totals.gravada10,
      iva10: totals.iva10,
      subtotal5: totals.gravada5,
      iva5: totals.iva5,
      exenta: totals.exenta,
      lines: [{ description, quantity: 1, unitPrice: amount, lineTotal: amount, taxRate: rate }],
    });

    const note = await tx.invoice.create({
      data: {
        type: InvoiceType.NOTA_CREDITO,
        number,
        expeditionPointId: point.id,
        timbradoId: timbrado.id,
        customerId: invoice.customerId,
        condition: invoice.condition,
        termDays: 0,
        issueDate: new Date(),
        dueDate: new Date(),
        status: "PENDIENTE",
        cdc,
        xml,
        subtotal10: totals.gravada10,
        subtotal5: totals.gravada5,
        exenta: totals.exenta,
        iva10: totals.iva10,
        iva5: totals.iva5,
        total: totals.total,
        paidAmount: 0,
        balance: 0,
        sourceInvoiceId: invoice.id,
        userId: input.userId,
        lines: {
          create: {
            description,
            quantity: 1,
            unitPrice: amount,
            discountPercent: 0,
            taxRate: rate,
            lineTotal: amount,
          },
        },
        events: {
          create: {
            type: "ENVIO",
            message: "Nota de crédito enviada a SIFEN (simulada).",
            details: "Ambiente de demostración.",
          },
        },
      },
    });

    if (invoice.balance > 0) {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { balance: Math.max(0, invoice.balance - amount) },
      });
    }

    return { ...note, cdc, number };
  });
}

export async function cancelInvoiceRecord(invoiceId: string, userId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { lines: true, order: true },
  });
  if (!invoice) throw new Error("La factura no existe.");
  if (invoice.type !== "FACTURA") throw new Error("Solo se pueden cancelar facturas.");
  if (invoice.status === "CANCELADO") throw new Error("La factura ya está cancelada.");
  const hours = (Date.now() - invoice.issueDate.getTime()) / 3_600_000;
  if (hours > 48) throw new Error("Solo se puede cancelar dentro de las 48 horas de emisión.");

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: "CANCELADO", balance: 0 },
    });
    await tx.sifenEvent.create({
      data: {
        invoiceId: invoice.id,
        type: "CANCELACION",
        message: "Cancelación registrada (simulada).",
        details: `Solicitada por ${userId} dentro de las 48 horas.`,
      },
    });
    for (const line of invoice.lines) {
      if (!line.orderLineId) continue;
      await tx.salesOrderLine.update({
        where: { id: line.orderLineId },
        data: { quantityInvoiced: { decrement: line.quantity } },
      });
    }
    if (invoice.orderId) {
      const lines = await tx.salesOrderLine.findMany({ where: { orderId: invoice.orderId } });
      const fullyInvoiced = lines.every((line) => line.quantityInvoiced >= line.quantity);
      if (!fullyInvoiced) {
        await tx.salesOrder.update({ where: { id: invoice.orderId }, data: { status: "DESPACHADO" } });
      }
    }
  });
}

export type BillingResult = Awaited<ReturnType<typeof emitInvoice>>;
export type PrismaInvoice = Prisma.InvoiceGetPayload<{ include: { lines: true } }>;
