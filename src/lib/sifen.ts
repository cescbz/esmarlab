import { InvoiceType, SifenEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toDateInputValue } from "@/lib/format";

export type XmlInvoiceLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  taxRate: number;
};

export type XmlInvoiceInput = {
  type: InvoiceType;
  number: string;
  cdc: string;
  timbrado: string;
  fechaInicioTimbrado: Date;
  company: { razonSocial: string; ruc: string; dv: string };
  customer: { name: string; rucBase: string; dv: string };
  issueDate: Date;
  total: number;
  subtotal10: number;
  iva10: number;
  subtotal5: number;
  iva5: number;
  exenta: number;
  lines: XmlInvoiceLine[];
};

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildSifenXml(input: XmlInvoiceInput): string {
  const parts = input.number.split("-");
  const isNC = input.type === InvoiceType.NOTA_CREDITO;
  const items = input.lines
    .map(
      (line) => `      <gCamItem>
        <dDesProSer>${esc(line.description)}</dDesProSer>
        <dCantProSer>${line.quantity}</dCantProSer>
        <dPrecioUnitario>${line.unitPrice}</dPrecioUnitario>
        <dTotItem>${line.lineTotal}</dTotItem>
        <dTasaIVA>${line.taxRate}</dTasaIVA>
      </gCamItem>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rDE xmlns="http://ekuatia.set.gov.py/sifen/xsd">
  <dVerFor>150</dVerFor>
  <DE Id="${input.cdc}">
    <gTimb>
      <iTiDE>${isNC ? "5" : "1"}</iTiDE>
      <dDesTiDE>${isNC ? "Nota de crédito electrónica" : "Factura electrónica"}</dDesTiDE>
      <dNumTim>${input.timbrado}</dNumTim>
      <dEst>${parts[0]}</dEst>
      <dPunExp>${parts[1]}</dPunExp>
      <dNumDoc>${parts[2]}</dNumDoc>
      <dFeIniT>${toDateInputValue(input.fechaInicioTimbrado)}</dFeIniT>
    </gTimb>
    <gDatGralOpe>
      <dFeEmiDE>${toDateInputValue(input.issueDate)}T10:00:00</dFeEmiDE>
      <gOpeCom><iTipTra>1</iTipTra><dDesTipTra>Venta de mercadería</dDesTipTra></gOpeCom>
      <gEmisor>
        <dRucEm>${input.company.ruc}</dRucEm>
        <dDVEmi>${input.company.dv}</dDVEmi>
        <dNomEmi>${esc(input.company.razonSocial)}</dNomEmi>
      </gEmisor>
      <gDatRec>
        <iNatRec>2</iNatRec>
        <dRucRec>${input.customer.rucBase}</dRucRec>
        <dDVRec>${input.customer.dv}</dDVRec>
        <dNomRec>${esc(input.customer.name)}</dNomRec>
      </gDatRec>
    </gDatGralOpe>
    <gDtipDE>
${items}
    </gDtipDE>
    <gTotSub>
      <dSub10>${input.subtotal10}</dSub10>
      <dIVA10>${input.iva10}</dIVA10>
      <dSub5>${input.subtotal5}</dSub5>
      <dIVA5>${input.iva5}</dIVA5>
      <dSubEx>${input.exenta}</dSubEx>
      <dTotGralOpe>${input.total}</dTotGralOpe>
    </gTotSub>
    <gCamFuFD>
      <dCarQR>https://ekuatia.set.gov.py/consultas/qr?nVerFor=150&amp;Id=${input.cdc}</dCarQR>
    </gCamFuFD>
  </DE>
</rDE>`;
}

export async function settlePendingInvoices(invoiceId?: string) {
  const threshold = new Date(Date.now() - 3000);
  const pending = await prisma.invoice.findMany({
    where: {
      status: "PENDIENTE",
      createdAt: { lt: threshold },
      ...(invoiceId ? { id: invoiceId } : {}),
    },
    select: { id: true, cdc: true },
  });
  if (pending.length === 0) return;

  await prisma.$transaction(
    pending.flatMap((invoice) => [
      prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "APROBADO" },
      }),
      prisma.sifenEvent.create({
        data: {
          invoiceId: invoice.id,
          type: SifenEventType.APROBACION,
          message: "Aprobado por la SET (simulado).",
          details: `CDC ${invoice.cdc}. Ambiente de demostración.`,
        },
      }),
    ])
  );
}

export function simulatedConsultaUrl(cdc: string) {
  return `https://ekuatia.set.gov.py/consultas/qr?nVerFor=150&Id=${cdc}`;
}
