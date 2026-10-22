import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, formatGs, formatTime } from "@/lib/format";
import { reportRange } from "@/lib/reports";
import { ReportFilters } from "@/components/reports/report-filters";
import { CsvButton, PrintButton } from "@/components/reports/report-actions";
import { SimpleBarChart } from "@/components/reports/charts";
import { Landmark } from "lucide-react";

export const metadata: Metadata = { title: "Caja por caja" };

type ClosingDetail = { medio: string; esperado: number; contado: number; diferencia: number };

export default async function CashReportPage({
  searchParams,
}: {
  searchParams: { desde?: string; hasta?: string; caja?: string };
}) {
  const range = reportRange(searchParams);
  const cashRegisters = await prisma.cashRegister.findMany({ orderBy: { name: "asc" } });
  const sessions = await prisma.cashSession.findMany({
    where: {
      openedAt: { gte: range.desdeDate, lte: range.hastaDate },
      ...(searchParams.caja ? { cashRegisterId: searchParams.caja } : {}),
    },
    include: { cashRegister: true, movements: true },
    orderBy: { openedAt: "desc" },
  });

  const rows = sessions.map((session) => {
    const inbound = session.movements
      .filter((movement) => movement.type.startsWith("INGRESO"))
      .reduce((sum, movement) => sum + movement.amount, 0);
    const outbound = session.movements
      .filter((movement) => movement.type === "EGRESO_GASTO" || movement.type === "RETIRO")
      .reduce((sum, movement) => sum + movement.amount, 0);
    const details = Array.isArray(session.closingDetails) ? (session.closingDetails as unknown as ClosingDetail[]) : [];
    const expected = details.length ? details.reduce((sum, detail) => sum + detail.esperado, 0) : session.openingAmount + inbound - outbound;
    const counted = session.countedAmount ?? 0;
    return {
      id: session.id,
      fecha: formatDate(session.openedAt),
      hora: formatTime(session.openedAt),
      caja: session.cashRegister.name,
      estado: session.status,
      apertura: session.openingAmount,
      ingresos: inbound,
      egresos: outbound,
      esperado: expected,
      contado: counted,
      diferencia: session.difference ?? 0,
    };
  });

  const totals = rows.reduce(
    (acc, row) => ({
      ingresos: acc.ingresos + row.ingresos,
      egresos: acc.egresos + row.egresos,
      diferencia: acc.diferencia + row.diferencia,
    }),
    { ingresos: 0, egresos: 0, diferencia: 0 }
  );
  const chart = rows.slice(0, 12).reverse().map((row) => ({
    sesion: `${row.fecha.slice(0, 5)} ${row.caja.replace("Caja ", "C")}`,
    ingresos: row.ingresos,
    egresos: row.egresos,
  }));
  const csvRows = rows.map((row) => ({
    Fecha: row.fecha,
    Hora: row.hora,
    Caja: row.caja,
    Estado: row.estado,
    Apertura: row.apertura,
    Ingresos: row.ingresos,
    Egresos: row.egresos,
    Esperado: row.esperado,
    Contado: row.contado,
    Diferencia: row.diferencia,
  }));

  return (
    <div>
      <PageHeader
        title="Caja por caja"
        description="Ingresos, egresos, monto esperado, contado y diferencias por sesión de caja."
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="no-print"><Link href="/reportes"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Reportes</Link></Button>
            <CsvButton filename="reporte-caja" rows={csvRows} />
            <PrintButton />
          </>
        }
      />
      <ReportFilters
        fields={[
          { type: "date", name: "desde", label: "Desde" },
          { type: "date", name: "hasta", label: "Hasta" },
          { type: "select", name: "caja", label: "Caja", options: [{ value: "", label: "Todas las cajas" }, ...cashRegisters.map((register) => ({ value: register.id, label: register.name }))] },
        ]}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ingresos</p>
          <p className="mt-1 text-xl font-semibold text-emerald-700 tabular">{formatGs(totals.ingresos)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Egresos</p>
          <p className="mt-1 text-xl font-semibold text-red-600 tabular">{formatGs(totals.egresos)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Diferencia acumulada</p>
          <p className={`mt-1 text-xl font-semibold tabular ${totals.diferencia === 0 ? "" : "text-amber-700"}`}>{formatGs(totals.diferencia)}</p>
        </div>
      </div>

      <Card className="mb-4 border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Ingresos y egresos por sesión</CardTitle></CardHeader>
        <CardContent className="p-4">
          {chart.length === 0 ? (
            <EmptyState icon={Landmark} title="Sin sesiones en el período" className="border-0 py-8" />
          ) : (
            <SimpleBarChart
              data={chart}
              xKey="sesion"
              series={[
                { key: "ingresos", label: "Ingresos", color: "#0f766e" },
                { key: "egresos", label: "Egresos", color: "#ef4444" },
              ]}
              height={250}
            />
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-none">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <EmptyState icon={Landmark} title="Sin sesiones" description="No hay cajas abiertas en el período seleccionado." className="border-0" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Caja</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Apertura</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Egresos</TableHead>
                    <TableHead className="text-right">Esperado</TableHead>
                    <TableHead className="text-right">Contado</TableHead>
                    <TableHead className="text-right">Diferencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs whitespace-nowrap">{row.fecha} {row.hora}</TableCell>
                      <TableCell className="text-xs">{row.caja}</TableCell>
                      <TableCell className="text-xs">{row.estado === "ABIERTA" ? "Abierta" : "Cerrada"}</TableCell>
                      <TableCell className="text-right text-xs tabular">{formatGs(row.apertura)}</TableCell>
                      <TableCell className="text-right text-xs tabular text-emerald-700">{formatGs(row.ingresos)}</TableCell>
                      <TableCell className="text-right text-xs tabular text-red-600">{formatGs(row.egresos)}</TableCell>
                      <TableCell className="text-right text-xs tabular">{formatGs(row.esperado)}</TableCell>
                      <TableCell className="text-right text-xs tabular">{formatGs(row.contado)}</TableCell>
                      <TableCell className={`text-right text-xs font-medium tabular ${row.diferencia === 0 ? "text-muted-foreground" : row.diferencia > 0 ? "text-emerald-700" : "text-red-600"}`}>{formatGs(row.diferencia)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
