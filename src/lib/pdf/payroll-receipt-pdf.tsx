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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1.2,
    borderBottomColor: "#0b2f31",
    paddingBottom: 12,
  },
  brand: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#0b2f31" },
  muted: { fontSize: 7, color: "#64748b", marginTop: 2 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#0b2f31", textAlign: "right" },
  number: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "right", marginTop: 2 },
  box: {
    marginTop: 16,
    borderWidth: 0.7,
    borderColor: "#cbd5e1",
    borderRadius: 5,
    padding: 10,
  },
  boxRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },
  label: {
    fontSize: 6.5,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  table: {
    marginTop: 14,
    borderWidth: 0.7,
    borderColor: "#cbd5e1",
    borderRadius: 5,
    overflow: "hidden",
  },
  thead: {
    flexDirection: "row",
    backgroundColor: "#0b2f31",
    color: "#fff",
    padding: 5,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
  },
  row: { flexDirection: "row", padding: 5, borderBottomWidth: 0.4, borderBottomColor: "#e2e8f0" },
  c1: { flex: 3 },
  c2: { flex: 1, textAlign: "right" },
  totals: { marginTop: 12, marginLeft: 220 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    fontSize: 9,
  },
  net: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#0b2f31",
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  letters: { marginTop: 8, fontSize: 8, color: "#334155" },
  demo: {
    marginTop: 12,
    padding: 4,
    backgroundColor: "#fef3c7",
    color: "#92400e",
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  signature: { marginTop: 60, flexDirection: "row", justifyContent: "space-between" },
  line: {
    width: 180,
    borderTopWidth: 0.7,
    borderTopColor: "#64748b",
    paddingTop: 4,
    textAlign: "center",
    fontSize: 7,
    color: "#64748b",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 0.6,
    borderTopColor: "#cbd5e1",
    paddingTop: 5,
    fontSize: 6,
    color: "#64748b",
    flexDirection: "row",
    justifyContent: "space-between",
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

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const PAY_LABELS: Record<string, string> = {
  MENSUAL: "Sueldo mensual",
  JORNAL: "Jornal",
  DESTAJO: "Destajo",
  MIXTO: "Sueldo + destajo",
};

export type PayrollReceiptData = {
  company: {
    razonSocial: string;
    ruc: string;
    dv: string;
    address: string;
    city: string;
    phone: string;
  };
  employee: {
    name: string;
    code: string;
    ci: string;
    position: string;
    department: string;
    hireDate: Date;
  };
  period: {
    number: string;
    type: string;
    year: number;
    month: number;
    status: string;
    paidAt: Date | null;
  };
  item: {
    payType: string;
    baseAmount: number;
    workedDays: number;
    pieceUnits: number;
    pieceAmount: number;
    extraMinutes: number;
    extraAmount: number;
    lateMinutes: number;
    lateDeduction: number;
    absenceDays: number;
    absenceDeduction: number;
    vacationDays: number;
    vacationAmount: number;
    otherEarnings: number;
    otherDeductions: number;
    grossAmount: number;
    ipsEmployee: number;
    ipsEmployer: number;
    netAmount: number;
    notes: string | null;
  };
};

export function PayrollReceiptPdf({ data }: { data: PayrollReceiptData }) {
  const isAguinaldo = data.period.type === "AGUINALDO";
  const periodLabel = isAguinaldo
    ? `Aguinaldo ${data.period.year}`
    : `${MONTHS[data.period.month - 1]} ${data.period.year}`;
  const receiptNumber = `REC-${data.period.number}-${data.employee.code}`;
  const rows: { label: string; amount: number; deduction?: boolean }[] = [];

  if (isAguinaldo) {
    rows.push({ label: "Aguinaldo (1/12 de lo ganado en el año)", amount: data.item.grossAmount });
  } else {
    rows.push({
      label:
        data.item.payType === "JORNAL"
          ? `${PAY_LABELS[data.item.payType]} (${data.item.workedDays} días)`
          : data.item.payType === "DESTAJO"
            ? `${PAY_LABELS[data.item.payType]} (${data.item.pieceUnits} unidades)`
            : PAY_LABELS[data.item.payType] ?? "Remuneración",
      amount: data.item.baseAmount,
    });
  }
  if (data.item.vacationAmount) {
    rows.push({ label: `Vacaciones (${data.item.vacationDays} días)`, amount: data.item.vacationAmount });
  }
  if (data.item.extraAmount) {
    rows.push({ label: `Horas extras (${data.item.extraMinutes} min)`, amount: data.item.extraAmount });
  }
  if (data.item.otherEarnings) {
    rows.push({ label: "Otros ingresos", amount: data.item.otherEarnings });
  }
  if (data.item.lateDeduction) {
    rows.push({ label: `Tardanzas (${data.item.lateMinutes} min)`, amount: data.item.lateDeduction, deduction: true });
  }
  if (data.item.absenceDeduction) {
    rows.push({ label: `Ausencias (${data.item.absenceDays} días)`, amount: data.item.absenceDeduction, deduction: true });
  }
  if (data.item.ipsEmployee) {
    rows.push({ label: "IPS 9%", amount: data.item.ipsEmployee, deduction: true });
  }
  if (data.item.otherDeductions) {
    rows.push({ label: "Otros descuentos", amount: data.item.otherDeductions, deduction: true });
  }

  const totalDeductions = rows
    .filter((row) => row.deduction)
    .reduce((sum, row) => sum + row.amount, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark} fixed>
          DEMO — SIN VALIDEZ FISCAL
        </Text>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>{data.company.razonSocial}</Text>
            <Text style={styles.muted}>
              RUC {data.company.ruc}-{data.company.dv} · {data.company.address}, {data.company.city}
            </Text>
            <Text style={styles.muted}>{data.company.phone}</Text>
          </View>
          <View>
            <Text style={styles.title}>{isAguinaldo ? "RECIBO DE AGUINALDO" : "RECIBO DE SUELDO"}</Text>
            <Text style={styles.number}>{receiptNumber}</Text>
            <Text style={styles.muted}>{periodLabel}</Text>
            <Text style={styles.muted}>
              {data.period.paidAt ? `Pagado: ${date(data.period.paidAt)}` : `Estado: ${data.period.status}`}
            </Text>
          </View>
        </View>

        <View style={styles.box}>
          <Text style={styles.label}>Empleado</Text>
          <Text style={styles.value}>{data.employee.name}</Text>
          <View style={styles.boxRow}>
            <Text style={styles.muted}>Legajo {data.employee.code}</Text>
            <Text style={styles.muted}>CI {data.employee.ci}</Text>
            <Text style={styles.muted}>
              {data.employee.position} · {data.employee.department}
            </Text>
          </View>
          <Text style={styles.muted}>Ingreso: {date(data.employee.hireDate)}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={styles.c1}>Concepto</Text>
            <Text style={styles.c2}>Importe</Text>
          </View>
          {rows.map((row, index) => (
            <View key={`${row.label}-${index}`} style={styles.row}>
              <Text style={styles.c1}>{row.label}</Text>
              <Text style={styles.c2}>
                {row.deduction ? `- ${gs(row.amount)}` : gs(row.amount)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Total haberes</Text>
            <Text>{gs(data.item.grossAmount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Total descuentos</Text>
            <Text>- {gs(totalDeductions)}</Text>
          </View>
          <View style={styles.net}>
            <Text>NETO A PAGAR</Text>
            <Text>{gs(data.item.netAmount)}</Text>
          </View>
        </View>

        <Text style={styles.letters}>Son: {numeroALetras(data.item.netAmount)}.</Text>
        {data.item.notes ? (
          <Text style={styles.letters}>Observaciones: {data.item.notes}</Text>
        ) : null}

        <Text style={styles.demo}>DEMO — SIN VALIDEZ FISCAL · Recibo interno de demostración</Text>

        <View style={styles.signature}>
          <Text style={styles.line}>Firma del empleado</Text>
          <Text style={styles.line}>Responsable de RRHH</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>Recibo generado por el sistema de gestión Esmar SRL.</Text>
          <Text>DEMO — SIN VALIDEZ FISCAL</Text>
        </View>
      </Page>
    </Document>
  );
}
