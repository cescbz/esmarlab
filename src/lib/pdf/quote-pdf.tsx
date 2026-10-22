import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1e293b",
  },
  watermark: {
    position: "absolute",
    top: 360,
    left: 30,
    right: 30,
    textAlign: "center",
    transform: "rotate(-28deg)",
    fontSize: 44,
    letterSpacing: 2,
    color: "#dc2626",
    opacity: 0.09,
    fontFamily: "Helvetica-Bold",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 14,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 34,
    height: 34,
    backgroundColor: "#0b2f31",
    color: "#ffffff",
    borderRadius: 6,
    textAlign: "center",
    paddingTop: 9,
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginRight: 10,
  },
  companyName: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: "#0b2f31",
  },
  muted: { color: "#64748b" },
  docBox: { textAlign: "right" },
  docTitle: { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#0b2f31" },
  docNumber: { fontSize: 11, marginTop: 3, fontFamily: "Helvetica-Bold" },
  section: { marginTop: 16 },
  sectionTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    letterSpacing: 1,
    marginBottom: 5,
    textTransform: "uppercase",
  },
  box: {
    borderWidth: 0.7,
    borderColor: "#cbd5e1",
    borderRadius: 5,
    padding: 10,
  },
  row: { flexDirection: "row" },
  colCustomer: { flex: 1.4, paddingRight: 10 },
  colMeta: { flex: 1 },
  label: { fontSize: 7, color: "#64748b", marginBottom: 2 },
  value: { fontSize: 9, marginBottom: 6 },
  table: { marginTop: 16, borderWidth: 0.7, borderColor: "#cbd5e1", borderRadius: 5, overflow: "hidden" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0b2f31",
    color: "#ffffff",
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
  },
  cProduct: { flex: 3.2 },
  cQty: { flex: 0.7, textAlign: "center" },
  cPrice: { flex: 1.1, textAlign: "right" },
  cDiscount: { flex: 0.7, textAlign: "right" },
  cTotal: { flex: 1.2, textAlign: "right" },
  totalsWrap: { marginTop: 12, flexDirection: "row", justifyContent: "flex-end" },
  totalsBox: { width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#0b2f31",
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 0.7,
    borderTopColor: "#cbd5e1",
    paddingTop: 8,
    fontSize: 7,
    color: "#64748b",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  badge: {
    marginTop: 10,
    backgroundColor: "#fef3c7",
    color: "#92400e",
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 7,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },
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

export type QuotePdfData = {
  number: string;
  date: Date;
  validUntil: Date;
  observations: string | null;
  total: number;
  subtotal: number;
  iva: number;
  company: {
    razonSocial: string;
    ruc: string;
    dv: string;
    address: string;
    city: string;
    phone: string;
    email: string;
  };
  customer: {
    name: string;
    rucBase: string;
    dv: string;
    address: string | null;
    city: string;
    phone: string | null;
    email: string | null;
  };
  lines: {
    description: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    lineTotal: number;
  }[];
};

export function QuotePdf({ data }: { data: QuotePdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark} fixed>DEMO — SIN VALIDEZ FISCAL</Text>

        <View style={styles.header}>
          <View style={styles.brand}>
            <Text style={styles.logo}>E</Text>
            <View>
              <Text style={styles.companyName}>{data.company.razonSocial}</Text>
              <Text style={{ fontSize: 7, color: "#64748b", marginTop: 2 }}>
                Uniformes empresariales · EPP · Producción
              </Text>
              <Text style={{ fontSize: 7, color: "#64748b", marginTop: 2 }}>
                RUC {data.company.ruc}-{data.company.dv} · {data.company.address}, {data.company.city}
              </Text>
              <Text style={{ fontSize: 7, color: "#64748b", marginTop: 1 }}>
                {data.company.phone} · {data.company.email}
              </Text>
            </View>
          </View>
          <View style={styles.docBox}>
            <Text style={styles.docTitle}>PRESUPUESTO</Text>
            <Text style={styles.docNumber}>{data.number}</Text>
            <Text style={[styles.muted, { fontSize: 8, marginTop: 4 }]}>Fecha: {date(data.date)}</Text>
            <Text style={[styles.muted, { fontSize: 8 }]}>Válido hasta: {date(data.validUntil)}</Text>
            <Text style={styles.badge}>DOCUMENTO DEMO</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.box}>
            <View style={styles.row}>
              <View style={styles.colCustomer}>
                <Text style={styles.sectionTitle}>Cliente</Text>
                <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 3 }}>{data.customer.name}</Text>
                <Text style={styles.value}>RUC / CI: {data.customer.rucBase}-{data.customer.dv}</Text>
                <Text style={styles.value}>
                  {data.customer.address ? `${data.customer.address} · ` : ""}{data.customer.city}
                </Text>
              </View>
              <View style={styles.colMeta}>
                <Text style={styles.sectionTitle}>Contacto</Text>
                <Text style={styles.value}>{data.customer.phone ?? "—"}</Text>
                <Text style={styles.value}>{data.customer.email ?? "—"}</Text>
              </View>
              <View style={styles.colMeta}>
                <Text style={styles.sectionTitle}>Condiciones</Text>
                <Text style={styles.value}>Precios con IVA incluido</Text>
                <Text style={styles.value}>Validez {Math.max(1, Math.round((data.validUntil.getTime() - data.date.getTime()) / 86_400_000))} días</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.cProduct}>Descripción</Text>
            <Text style={styles.cQty}>Cant.</Text>
            <Text style={styles.cPrice}>Precio unit.</Text>
            <Text style={styles.cDiscount}>Desc.</Text>
            <Text style={styles.cTotal}>Subtotal</Text>
          </View>
          {data.lines.map((line, index) => (
            <View key={index} style={[styles.tableRow, index % 2 === 1 ? { backgroundColor: "#f8fafc" } : {}]} wrap={false}>
              <Text style={styles.cProduct}>{line.description}</Text>
              <Text style={styles.cQty}>{line.quantity}</Text>
              <Text style={styles.cPrice}>{gs(line.unitPrice)}</Text>
              <Text style={styles.cDiscount}>{line.discountPercent}%</Text>
              <Text style={styles.cTotal}>{gs(line.lineTotal)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsWrap}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.muted}>Subtotal gravado</Text>
              <Text>{gs(data.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.muted}>IVA incluido</Text>
              <Text>{gs(data.iva)}</Text>
            </View>
            <View style={styles.grandTotal}>
              <Text>Total</Text>
              <Text>{gs(data.total)}</Text>
            </View>
          </View>
        </View>

        {data.observations ? (
          <View style={{ marginTop: 18 }}>
            <Text style={styles.sectionTitle}>Observaciones</Text>
            <Text style={{ fontSize: 8, lineHeight: 1.5, color: "#475569" }}>{data.observations}</Text>
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>Esmar SRL · {data.company.address}, {data.company.city} · {data.company.phone}</Text>
          <Text>DEMO — SIN VALIDEZ FISCAL</Text>
        </View>
      </Page>
    </Document>
  );
}
