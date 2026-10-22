import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { numeroALetras } from "@/lib/numbers";

export type KudeData = {
  company: {
    razonSocial: string;
    ruc: string;
    dv: string;
    address: string;
    city: string;
    phone: string;
    email: string;
  };
  timbrado: {
    numero: string;
    vigenciaDesde: Date;
    vigenciaHasta: Date;
  };
  invoice: {
    type: "FACTURA" | "NOTA_CREDITO";
    number: string;
    cdc: string;
    issueDate: Date;
    condition: "CONTADO" | "CREDITO";
    termDays: number;
    dueDate: Date;
    customerName: string;
    customerRuc: string;
    customerDv: string;
    customerAddress: string;
    orderNumber?: string;
    subtotal10: number;
    iva10: number;
    subtotal5: number;
    iva5: number;
    exenta: number;
    total: number;
    lines: {
      description: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }[];
  };
  qrDataUrl: string;
};

function gs(value: number) {
  return `Gs. ${new Intl.NumberFormat("es-PY").format(Math.round(value))}`;
}

function date(value: Date) {
  return new Intl.DateTimeFormat("es-PY", {
    timeZone: "America/Asuncion",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function cdcGroups(cdc: string) {
  return cdc.match(/.{1,4}/g)?.join(" ") ?? cdc;
}

const BRAND = "#0b2f31";

const a4 = StyleSheet.create({
  page: { padding: 34, fontFamily: "Helvetica", fontSize: 8, color: "#1e293b" },
  watermark: {
    position: "absolute",
    top: 370,
    left: 20,
    right: 20,
    textAlign: "center",
    transform: "rotate(-28deg)",
    fontSize: 42,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    color: "#dc2626",
    opacity: 0.08,
  },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1.2, borderBottomColor: BRAND, paddingBottom: 10 },
  brandRow: { flexDirection: "row", alignItems: "center" },
  logo: { width: 36, height: 36, backgroundColor: BRAND, borderRadius: 5, color: "#fff", textAlign: "center", paddingTop: 10, fontSize: 16, fontFamily: "Helvetica-Bold", marginRight: 9 },
  company: { fontSize: 13, fontFamily: "Helvetica-Bold", color: BRAND },
  small: { fontSize: 6.5, color: "#64748b", marginTop: 1.5 },
  docRight: { textAlign: "right" },
  kudeTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: BRAND },
  docType: { fontSize: 8, fontFamily: "Helvetica-Bold", marginTop: 2 },
  docNumber: { fontSize: 9, fontFamily: "Helvetica-Bold", marginTop: 1 },
  fiscBox: { marginTop: 10, flexDirection: "row", borderWidth: 0.7, borderColor: "#cbd5e1", borderRadius: 4 },
  fiscCell: { flex: 1, padding: 7, borderRightWidth: 0.5, borderRightColor: "#e2e8f0" },
  label: { fontSize: 6, color: "#64748b", letterSpacing: 0.5, marginBottom: 2 },
  value: { fontSize: 8 },
  clientBox: { marginTop: 8, borderWidth: 0.7, borderColor: "#cbd5e1", borderRadius: 4, padding: 8, flexDirection: "row" },
  table: { marginTop: 10, borderWidth: 0.7, borderColor: "#cbd5e1", borderRadius: 4, overflow: "hidden" },
  tHead: { flexDirection: "row", backgroundColor: BRAND, color: "#fff", paddingVertical: 4, paddingHorizontal: 5, fontFamily: "Helvetica-Bold", fontSize: 6.5 },
  tRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 5, borderBottomWidth: 0.4, borderBottomColor: "#e2e8f0" },
  cDesc: { flex: 3.4 },
  cQty: { flex: 0.7, textAlign: "center" },
  cPrice: { flex: 1.1, textAlign: "right" },
  cTotal: { flex: 1.2, textAlign: "right" },
  bottom: { marginTop: 10, flexDirection: "row" },
  qrBox: { width: 125, alignItems: "center" },
  qr: { width: 100, height: 100 },
  qrText: { fontSize: 5.5, color: "#64748b", textAlign: "center", marginTop: 3 },
  totalsCol: { flex: 1, paddingLeft: 16 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 },
  taxTable: { marginTop: 5, borderWidth: 0.6, borderColor: "#cbd5e1" },
  taxHead: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: 3, fontSize: 6, fontFamily: "Helvetica-Bold" },
  taxRow: { flexDirection: "row", padding: 3, fontSize: 6.5, borderTopWidth: 0.4, borderTopColor: "#e2e8f0" },
  taxCell: { flex: 1, textAlign: "right" },
  taxLabel: { flex: 1.4 },
  grand: { flexDirection: "row", justifyContent: "space-between", marginTop: 5, paddingTop: 5, borderTopWidth: 1, borderTopColor: BRAND, fontFamily: "Helvetica-Bold", fontSize: 10 },
  letters: { marginTop: 8, fontSize: 7, color: "#334155" },
  footer: { position: "absolute", bottom: 20, left: 34, right: 34, borderTopWidth: 0.6, borderTopColor: "#cbd5e1", paddingTop: 5, fontSize: 6, color: "#64748b", flexDirection: "row", justifyContent: "space-between" },
});

const ticket = StyleSheet.create({
  page: { padding: 11, fontFamily: "Helvetica", fontSize: 6.5, color: "#111827" },
  center: { textAlign: "center" },
  brand: { fontSize: 11, fontFamily: "Helvetica-Bold", color: BRAND, letterSpacing: 0.5 },
  small: { fontSize: 5.5, color: "#4b5563", marginTop: 1 },
  divider: { borderTopWidth: 0.6, borderTopColor: "#94a3b8", marginVertical: 5 },
  dashed: { borderTopWidth: 0.6, borderTopColor: "#94a3b8", borderStyle: "dashed", marginVertical: 5 },
  title: { fontSize: 8, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 3 },
  number: { fontSize: 8, fontFamily: "Helvetica-Bold", textAlign: "center" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 1 },
  line: { marginBottom: 3 },
  lineDesc: { fontSize: 6, lineHeight: 1.3 },
  lineMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 1 },
  total: { flexDirection: "row", justifyContent: "space-between", fontFamily: "Helvetica-Bold", fontSize: 9, marginTop: 2 },
  cdc: { fontSize: 5, textAlign: "center", color: "#4b5563", marginTop: 3, letterSpacing: 0.2 },
  qr: { width: 85, height: 85, alignSelf: "center", marginTop: 4 },
  demo: { marginTop: 4, padding: 3, backgroundColor: "#fef3c7", color: "#92400e", fontSize: 5, textAlign: "center", fontFamily: "Helvetica-Bold" },
  letters: { fontSize: 5, color: "#374151", marginTop: 3, lineHeight: 1.3 },
});

export function KudeA4({ data }: { data: KudeData }) {
  const invoice = data.invoice;
  const isNC = invoice.type === "NOTA_CREDITO";
  return (
    <Document>
      <Page size="A4" style={a4.page}>
        <Text style={a4.watermark} fixed>DEMO — SIN VALIDEZ FISCAL</Text>
        <View style={a4.header}>
          <View style={a4.brandRow}>
            <Text style={a4.logo}>E</Text>
            <View>
              <Text style={a4.company}>{data.company.razonSocial}</Text>
              <Text style={a4.small}>Uniformes empresariales · EPP · Producción</Text>
              <Text style={a4.small}>RUC {data.company.ruc}-{data.company.dv} · {data.company.address}, {data.company.city}</Text>
              <Text style={a4.small}>{data.company.phone} · {data.company.email}</Text>
            </View>
          </View>
          <View style={a4.docRight}>
            <Text style={a4.kudeTitle}>KuDE</Text>
            <Text style={a4.docType}>{isNC ? "NOTA DE CRÉDITO ELECTRÓNICA" : "FACTURA ELECTRÓNICA"}</Text>
            <Text style={a4.docNumber}>N° {invoice.number}</Text>
            <Text style={a4.small}>Fecha: {date(invoice.issueDate)}</Text>
            {invoice.orderNumber ? <Text style={a4.small}>Pedido: {invoice.orderNumber}</Text> : null}
            <Text style={{ ...a4.small, color: "#b45309", fontFamily: "Helvetica-Bold", marginTop: 3 }}>DEMO — SIN VALIDEZ FISCAL</Text>
          </View>
        </View>

        <View style={a4.fiscBox}>
          <View style={a4.fiscCell}>
            <Text style={a4.label}>TIMBRADO</Text>
            <Text style={a4.value}>{data.timbrado.numero}</Text>
            <Text style={a4.small}>Vigencia {date(data.timbrado.vigenciaDesde)} al {date(data.timbrado.vigenciaHasta)}</Text>
          </View>
          <View style={a4.fiscCell}>
            <Text style={a4.label}>CONDICIÓN DE VENTA</Text>
            <Text style={a4.value}>{invoice.condition === "CONTADO" ? "Contado" : `Crédito ${invoice.termDays} días`}</Text>
            <Text style={a4.small}>Vencimiento: {date(invoice.dueDate)}</Text>
          </View>
          <View style={{ ...a4.fiscCell, borderRightWidth: 0 }}>
            <Text style={a4.label}>CDC</Text>
            <Text style={{ ...a4.value, fontSize: 6.5 }}>{cdcGroups(invoice.cdc)}</Text>
          </View>
        </View>

        <View style={a4.clientBox}>
          <View style={{ flex: 1.5 }}>
            <Text style={a4.label}>RECEPTOR</Text>
            <Text style={{ ...a4.value, fontFamily: "Helvetica-Bold" }}>{invoice.customerName}</Text>
            <Text style={a4.small}>RUC / CI {invoice.customerRuc}-{invoice.customerDv}</Text>
            <Text style={a4.small}>{invoice.customerAddress}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={a4.label}>MONEDA</Text>
            <Text style={a4.value}>Guaraní (PYG)</Text>
            <Text style={a4.label}>TIPO DE CAMBIO</Text>
            <Text style={a4.value}>1,00</Text>
          </View>
        </View>

        <View style={a4.table}>
          <View style={a4.tHead}>
            <Text style={a4.cDesc}>Descripción</Text>
            <Text style={a4.cQty}>Cant.</Text>
            <Text style={a4.cPrice}>Precio unit.</Text>
            <Text style={a4.cTotal}>Subtotal</Text>
          </View>
          {invoice.lines.map((line, index) => (
            <View key={index} style={[a4.tRow, index % 2 === 1 ? { backgroundColor: "#f8fafc" } : {}]} wrap={false}>
              <Text style={a4.cDesc}>{line.description}</Text>
              <Text style={a4.cQty}>{line.quantity}</Text>
              <Text style={a4.cPrice}>{gs(line.unitPrice)}</Text>
              <Text style={a4.cTotal}>{gs(line.lineTotal)}</Text>
            </View>
          ))}
        </View>

        <View style={a4.bottom}>
          <View style={a4.qrBox}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={data.qrDataUrl} style={a4.qr} />
            <Text style={a4.qrText}>Consultá la validez simulada escaneando el código</Text>
          </View>
          <View style={a4.totalsCol}>
            <View style={a4.rowBetween}><Text>Subtotal gravada 10%</Text><Text>{gs(invoice.subtotal10)}</Text></View>
            <View style={a4.rowBetween}><Text>IVA 10%</Text><Text>{gs(invoice.iva10)}</Text></View>
            {invoice.subtotal5 > 0 ? (
              <>
                <View style={a4.rowBetween}><Text>Subtotal gravada 5%</Text><Text>{gs(invoice.subtotal5)}</Text></View>
                <View style={a4.rowBetween}><Text>IVA 5%</Text><Text>{gs(invoice.iva5)}</Text></View>
              </>
            ) : null}
            {invoice.exenta > 0 ? <View style={a4.rowBetween}><Text>Exenta</Text><Text>{gs(invoice.exenta)}</Text></View> : null}
            <View style={a4.grand}><Text>TOTAL</Text><Text>{gs(invoice.total)}</Text></View>

            <View style={a4.taxTable}>
              <View style={a4.taxHead}>
                <Text style={a4.taxLabel}>Liquidación IVA</Text>
                <Text style={a4.taxCell}>Base</Text>
                <Text style={a4.taxCell}>IVA</Text>
              </View>
              <View style={a4.taxRow}>
                <Text style={a4.taxLabel}>Gravada 10%</Text>
                <Text style={a4.taxCell}>{gs(invoice.subtotal10)}</Text>
                <Text style={a4.taxCell}>{gs(invoice.iva10)}</Text>
              </View>
              {invoice.subtotal5 > 0 ? (
                <View style={a4.taxRow}>
                  <Text style={a4.taxLabel}>Gravada 5%</Text>
                  <Text style={a4.taxCell}>{gs(invoice.subtotal5)}</Text>
                  <Text style={a4.taxCell}>{gs(invoice.iva5)}</Text>
                </View>
              ) : null}
              {invoice.exenta > 0 ? (
                <View style={a4.taxRow}>
                  <Text style={a4.taxLabel}>Exenta</Text>
                  <Text style={a4.taxCell}>{gs(invoice.exenta)}</Text>
                  <Text style={a4.taxCell}>—</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <Text style={a4.letters}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>Son: </Text>
          {numeroALetras(invoice.total)}.
        </Text>

        <View style={a4.footer} fixed>
          <Text>KuDE generado en ambiente de demostración. No se conecta con la SET.</Text>
          <Text>DEMO — SIN VALIDEZ FISCAL</Text>
        </View>
      </Page>
    </Document>
  );
}

export function KudeTicket({ data }: { data: KudeData }) {
  const invoice = data.invoice;
  const isNC = invoice.type === "NOTA_CREDITO";
  return (
    <Document>
      <Page size={[226, 820]} style={ticket.page}>
        <View style={ticket.center}>
          <Text style={ticket.brand}>ESMAR SRL</Text>
          <Text style={ticket.small}>Uniformes y EPP</Text>
          <Text style={ticket.small}>RUC {data.company.ruc}-{data.company.dv}</Text>
          <Text style={ticket.small}>{data.company.address} · {data.company.city}</Text>
          <Text style={ticket.small}>{data.company.phone}</Text>
        </View>
        <View style={ticket.divider} />
        <Text style={ticket.title}>{isNC ? "NOTA DE CRÉDITO" : "FACTURA ELECTRÓNICA"}</Text>
        <Text style={ticket.number}>N° {invoice.number}</Text>
        <Text style={{ ...ticket.small, textAlign: "center" }}>{date(invoice.issueDate)} · {invoice.condition === "CONTADO" ? "Contado" : `Crédito ${invoice.termDays}d`}</Text>
        <Text style={{ ...ticket.small, textAlign: "center" }}>Timbrado {data.timbrado.numero} · {date(data.timbrado.vigenciaDesde)}</Text>
        <View style={ticket.dashed} />
        <Text style={ticket.small}>Cliente: {invoice.customerName}</Text>
        <Text style={ticket.small}>RUC/CI: {invoice.customerRuc}-{invoice.customerDv}</Text>
        {invoice.orderNumber ? <Text style={ticket.small}>Pedido: {invoice.orderNumber}</Text> : null}
        <View style={ticket.dashed} />
        {invoice.lines.map((line, index) => (
          <View key={index} style={ticket.line} wrap={false}>
            <Text style={ticket.lineDesc}>{line.description}</Text>
            <View style={ticket.lineMeta}>
              <Text>{line.quantity} x {gs(line.unitPrice)}</Text>
              <Text>{gs(line.lineTotal)}</Text>
            </View>
          </View>
        ))}
        <View style={ticket.dashed} />
        <View style={ticket.row}><Text>Gravada 10%</Text><Text>{gs(invoice.subtotal10)}</Text></View>
        <View style={ticket.row}><Text>IVA 10%</Text><Text>{gs(invoice.iva10)}</Text></View>
        {invoice.subtotal5 > 0 ? <View style={ticket.row}><Text>IVA 5%</Text><Text>{gs(invoice.iva5)}</Text></View> : null}
        {invoice.exenta > 0 ? <View style={ticket.row}><Text>Exenta</Text><Text>{gs(invoice.exenta)}</Text></View> : null}
        <View style={ticket.total}><Text>TOTAL</Text><Text>{gs(invoice.total)}</Text></View>
        <Text style={ticket.letters}>Son: {numeroALetras(invoice.total)}</Text>
        <View style={ticket.dashed} />
        <Text style={ticket.cdc}>CDC {cdcGroups(invoice.cdc)}</Text>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={data.qrDataUrl} style={ticket.qr} />
        <Text style={{ ...ticket.small, textAlign: "center", marginTop: 2 }}>Consulta simulada SIFEN</Text>
        <Text style={ticket.demo}>DEMO — SIN VALIDEZ FISCAL</Text>
        <Text style={{ ...ticket.small, textAlign: "center" }}>
          KuDE de demostración. No se conecta con la SET.
        </Text>
      </Page>
    </Document>
  );
}
