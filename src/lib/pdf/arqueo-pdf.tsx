import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 9, color: "#1e293b" },
  watermark: {
    position: "absolute",
    top: 350,
    left: 20,
    right: 20,
    textAlign: "center",
    transform: "rotate(-28deg)",
    fontSize: 40,
    fontFamily: "Helvetica-Bold",
    color: "#dc2626",
    opacity: 0.08,
    letterSpacing: 2,
  },
  header: { borderBottomWidth: 1.2, borderBottomColor: "#0b2f31", paddingBottom: 10, flexDirection: "row", justifyContent: "space-between" },
  brand: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#0b2f31" },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#0b2f31", textAlign: "right" },
  muted: { fontSize: 7, color: "#64748b", marginTop: 2 },
  box: { marginTop: 14, borderWidth: 0.7, borderColor: "#cbd5e1", borderRadius: 5, padding: 10, flexDirection: "row" },
  cell: { flex: 1 },
  label: { fontSize: 6.5, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  value: { fontSize: 9 },
  table: { marginTop: 14, borderWidth: 0.7, borderColor: "#cbd5e1", borderRadius: 5, overflow: "hidden" },
  thead: { flexDirection: "row", backgroundColor: "#0b2f31", color: "#fff", padding: 5, fontSize: 7, fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", padding: 5, borderBottomWidth: 0.4, borderBottomColor: "#e2e8f0" },
  c1: { flex: 2 },
  c2: { flex: 1, textAlign: "right" },
  c3: { flex: 1, textAlign: "right" },
  c4: { flex: 1, textAlign: "right" },
  totalRow: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: 6, fontFamily: "Helvetica-Bold" },
  observation: { marginTop: 14, fontSize: 8, color: "#475569", lineHeight: 1.5 },
  signatures: { marginTop: 50, flexDirection: "row", justifyContent: "space-between" },
  signatureLine: { width: 180, borderTopWidth: 0.7, borderTopColor: "#64748b", paddingTop: 4, textAlign: "center", fontSize: 7, color: "#64748b" },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, borderTopWidth: 0.6, borderTopColor: "#cbd5e1", paddingTop: 5, fontSize: 6, color: "#64748b", flexDirection: "row", justifyContent: "space-between" },
  demo: { marginTop: 14, padding: 5, backgroundColor: "#fef3c7", color: "#92400e", fontSize: 7, fontFamily: "Helvetica-Bold", textAlign: "center" },
});

function gs(value: number) {
  return `Gs. ${new Intl.NumberFormat("es-PY").format(Math.round(value))}`;
}

function dt(value: Date) {
  return new Intl.DateTimeFormat("es-PY", {
    timeZone: "America/Asuncion",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export type ArqueoData = {
  company: { razonSocial: string; ruc: string; dv: string; city: string };
  session: {
    id: string;
    cashRegister: string;
    openedAt: Date;
    closedAt: Date | null;
    user: string;
    openingAmount: number;
    countedAmount: number;
    difference: number;
    observations: string | null;
    rows: { medio: string; esperado: number; contado: number; diferencia: number }[];
  };
};

export function ArqueoPdf({ data }: { data: ArqueoData }) {
  const totalExpected = data.session.rows.reduce((sum, row) => sum + row.esperado, 0);
  const totalCounted = data.session.rows.reduce((sum, row) => sum + row.contado, 0);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark} fixed>DEMO — SIN VALIDEZ FISCAL</Text>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>{data.company.razonSocial}</Text>
            <Text style={styles.muted}>RUC {data.company.ruc}-{data.company.dv} · {data.company.city}</Text>
            <Text style={styles.muted}>Sistema de gestión · Demo</Text>
          </View>
          <View>
            <Text style={styles.title}>ARQUEO DE CAJA</Text>
            <Text style={styles.muted}>{data.session.cashRegister}</Text>
            <Text style={styles.muted}>Sesión {data.session.id}</Text>
          </View>
        </View>

        <View style={styles.box}>
          <View style={styles.cell}>
            <Text style={styles.label}>Apertura</Text>
            <Text style={styles.value}>{dt(data.session.openedAt)}</Text>
            <Text style={styles.muted}>Monto inicial {gs(data.session.openingAmount)}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.label}>Cierre</Text>
            <Text style={styles.value}>{data.session.closedAt ? dt(data.session.closedAt) : "—"}</Text>
            <Text style={styles.muted}>Responsable {data.session.user}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.label}>Diferencia total</Text>
            <Text style={{ ...styles.value, fontFamily: "Helvetica-Bold", color: data.session.difference === 0 ? "#15803d" : "#b91c1c" }}>
              {gs(data.session.difference)}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={styles.c1}>Medio de pago</Text>
            <Text style={styles.c2}>Esperado</Text>
            <Text style={styles.c3}>Contado</Text>
            <Text style={styles.c4}>Diferencia</Text>
          </View>
          {data.session.rows.map((row) => (
            <View key={row.medio} style={styles.row}>
              <Text style={styles.c1}>{row.medio}</Text>
              <Text style={styles.c2}>{gs(row.esperado)}</Text>
              <Text style={styles.c3}>{gs(row.contado)}</Text>
              <Text style={{ ...styles.c4, color: row.diferencia === 0 ? "#334155" : row.diferencia > 0 ? "#15803d" : "#b91c1c" }}>
                {gs(row.diferencia)}
              </Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.c1}>TOTAL</Text>
            <Text style={styles.c2}>{gs(totalExpected)}</Text>
            <Text style={styles.c3}>{gs(totalCounted)}</Text>
            <Text style={styles.c4}>{gs(totalCounted - totalExpected)}</Text>
          </View>
        </View>

        <Text style={styles.observation}>
          Observaciones: {data.session.observations || "Sin observaciones."}
        </Text>

        <Text style={styles.demo}>DEMO — SIN VALIDEZ FISCAL · Documento generado para presentación</Text>

        <View style={styles.signatures}>
          <Text style={styles.signatureLine}>Firma del cajero</Text>
          <Text style={styles.signatureLine}>Firma del supervisor</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>Arqueo generado por el sistema de gestión Esmar SRL.</Text>
          <Text>{dt(new Date())}</Text>
        </View>
      </Page>
    </Document>
  );
}
