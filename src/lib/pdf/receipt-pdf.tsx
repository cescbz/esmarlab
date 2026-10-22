import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { numeroALetras } from "@/lib/numbers";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 9, color: "#1e293b" },
  watermark: {
    position: "absolute",
    top: 340,
    left: 20,
    right: 20,
    textAlign: "center",
    transform: "rotate(-28deg)",
    fontSize: 38,
    fontFamily: "Helvetica-Bold",
    color: "#dc2626",
    opacity: 0.08,
    letterSpacing: 2,
  },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1.2, borderBottomColor: "#0b2f31", paddingBottom: 12 },
  brand: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#0b2f31" },
  muted: { fontSize: 7, color: "#64748b", marginTop: 2 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#0b2f31", textAlign: "right" },
  number: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "right", marginTop: 2 },
  box: { marginTop: 16, borderWidth: 0.7, borderColor: "#cbd5e1", borderRadius: 5, padding: 10 },
  label: { fontSize: 6.5, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  value: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  table: { marginTop: 14, borderWidth: 0.7, borderColor: "#cbd5e1", borderRadius: 5, overflow: "hidden" },
  thead: { flexDirection: "row", backgroundColor: "#0b2f31", color: "#fff", padding: 5, fontSize: 7, fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", padding: 5, borderBottomWidth: 0.4, borderBottomColor: "#e2e8f0" },
  c1: { flex: 2 },
  c2: { flex: 1, textAlign: "right" },
  c3: { flex: 1, textAlign: "right" },
  total: { flexDirection: "row", justifyContent: "space-between", marginTop: 19, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#0b2f31", fontSize: 12, fontFamily: "Helvetica-Bold" },
  letters: { marginTop: 8, fontSize: 8, color: "#334155" },
  payments: { marginTop: 14 },
  signature: { marginTop: 60, flexDirection: "row", justifyContent: "space-between" },
  line: { width: 180, borderTopWidth: 0.7, borderTopColor: "#64748b", paddingTop: 4, textAlign: "center", fontSize: 7, color: "#64748b" },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, borderTopWidth: 0.6, borderTopColor: "#cbd5e1", paddingTop: 5, fontSize: 6, color: "#64748b", flexDirection: "row", justifyContent: "space-between" },
  demo: { marginTop: 12, padding: 4, backgroundColor: "#fef3c7", color: "#92400e", fontSize: 7, fontFamily: "Helvetica-Bold", textAlign: "center" },
});

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

export type ReceiptPdfData = {
  company: { razonSocial: string; ruc: string; dv: string; address: string; city: string; phone: string };
  receipt: {
    number: string;
    date: Date;
    customerName: string;
    customerRuc: string;
    customerDv: string;
    total: number;
    cashRegister: string;
    observations: string | null;
    allocations: { invoiceNumber: string; invoiceTotal: number; amount: number }[];
    payments: { method: string; amount: number }[];
  };
};

export function ReceiptPdf({ data }: { data: ReceiptPdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark} fixed>DEMO — SIN VALIDEZ FISCAL</Text>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>{data.company.razonSocial}</Text>
            <Text style={styles.muted}>RUC {data.company.ruc}-{data.company.dv} · {data.company.address}, {data.company.city}</Text>
            <Text style={styles.muted}>{data.company.phone}</Text>
          </View>
          <View>
            <Text style={styles.title}>RECIBO DE COBRO</Text>
            <Text style={styles.number}>{data.receipt.number}</Text>
            <Text style={styles.muted}>Fecha: {date(data.receipt.date)}</Text>
            <Text style={styles.muted}>Caja: {data.receipt.cashRegister}</Text>
          </View>
        </View>

        <View style={styles.box}>
          <Text style={styles.label}>Recibimos de</Text>
          <Text style={styles.value}>{data.receipt.customerName}</Text>
          <Text style={styles.muted}>RUC / CI {data.receipt.customerRuc}-{data.receipt.customerDv}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={styles.c1}>Factura</Text>
            <Text style={styles.c2}>Total factura</Text>
            <Text style={styles.c3}>Importe aplicado</Text>
          </View>
          {data.receipt.allocations.map((allocation) => (
            <View key={allocation.invoiceNumber} style={styles.row}>
              <Text style={styles.c1}>{allocation.invoiceNumber}</Text>
              <Text style={styles.c2}>{gs(allocation.invoiceTotal)}</Text>
              <Text style={styles.c3}>{gs(allocation.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.payments}>
          <Text style={styles.label}>Forma de pago</Text>
          {data.receipt.payments.map((payment, index) => (
            <View key={index} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 1 }}>
              <Text>{payment.method}</Text>
              <Text>{gs(payment.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.total}>
          <Text>TOTAL COBRADO</Text>
          <Text>{gs(data.receipt.total)}</Text>
        </View>
        <Text style={styles.letters}>Son: {numeroALetras(data.receipt.total)}.</Text>

        {data.receipt.observations ? <Text style={styles.letters}>Observaciones: {data.receipt.observations}</Text> : null}

        <Text style={styles.demo}>DEMO — SIN VALIDEZ FISCAL · Recibo interno de demostración</Text>

        <View style={styles.signature}>
          <Text style={styles.line}>Firma del cliente</Text>
          <Text style={styles.line}>Firma del cajero</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>Recibo generado por el sistema de gestión Esmar SRL.</Text>
          <Text>DEMO — SIN VALIDEZ FISCAL</Text>
        </View>
      </Page>
    </Document>
  );
}
