import { InvoiceType } from "@prisma/client";
import { toDateInputValue } from "../../src/lib/format";
import type { XmlInput } from "./helpers";

export function buildXml(input: XmlInput) {
  const esc = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const parts = input.number.split("-");
  const isNC = input.type === InvoiceType.NOTA_CREDITO;
  const items = input.lines
    .map(
      (line) => `<gCamItem>
        <dDesProSer>${esc(line.description)}</dDesProSer>
        <dCantProSer>${line.quantity}</dCantProSer>
        <dPrecioUnitario>${line.unitPrice}</dPrecioUnitario>
        <dTotItem>${line.lineTotal}</dTotItem>
        <dTasaIVA>${line.taxRate}</dTasaIVA>
      </gCamItem>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rDE xmlns="http://ekuatia.set.gov.py/sifen/xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dVerFor>150</dVerFor>
  <DE Id="${input.cdc}">
    <gTimb>
      <iTiDE>${isNC ? "5" : "1"}</iTiDE>
      <dDesTiDE>${isNC ? "Nota de crédito electrónica" : "Factura electrónica"}</dDesTiDE>
      <dNumTim>${input.timbrado}</dNumTim>
      <dEst>${parts[0]}</dEst>
      <dPunExp>${parts[1]}</dPunExp>
      <dNumDoc>${parts[2]}</dNumDoc>
      <dFeIniT>2025-01-01</dFeIniT>
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
    <gCamFuFD><dCarQR>https://ekuatia.set.gov.py/consultas/qr?nVerFor=150&amp;Id=${input.cdc}</dCarQR></gCamFuFD>
  </DE>
</rDE>`;
}
