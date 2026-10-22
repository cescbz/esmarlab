import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ReceiptText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, formatGs } from "@/lib/format";
import { reportRange } from "@/lib/reports";
import { ReportFilters } from "@/components/reports/report-filters";
import { CsvButton, PrintButton } from "@/components/reports/report-actions";

export const metadata: Metadata = { title: "Libro de ventas IVA" };

export default async function IvaBookPage({
  searchParams,
}: {
  searchParams: { desde?: string; hasta?: string };
}) {
  const range = reportRange(searchParams);
  const invoices = await prisma.invoice.findMany({
    where: { type: "FACTURA", status: { not: "CANCELADO" }, issueDate: { gte: range.desdeDate, lte: range.hastaDate } },
    include: { customer: true },
    orderBy: { issueDate: "asc" },
  });
  const rows = invoices.map((invoice) => ({
    fecha: formatDate(invoice.issueDate),
    numero: invoice.number,
    ruc: `${invoice.customer.rucBase}-${invoice.customer.dv}`,
    nombre: invoice.customer.name,
    gravada10: invoice.subtotal10,
    iva10: invoice.iva10,
    gravada5: invoice.subtotal5,
    iva5: invoice.iva5,
    exenta: invoice.exenta,
    total: invoice.total,
  }));
  const totals = rows.reduce(
    (acc, row) => ({
      gravada10: acc.gravada10 + row.gravada10,
      iva10: acc.iva10 + row.iva10,
      gravada5: acc.gravada5 + row.gravada5,
      iva5: acc.iva5 + row.iva5,
      exenta: acc.exenta + row.exenta,
      total: acc.total + row.total,
    }),
    { gravada10: 0, iva10: 0, gravada5: 0, iva5: 0, exenta: 0, total: 0 }
  );
  const csvRows = rows.map((row) => ({
    Fecha: row.fecha,
    Comprobante: row.numero,
    RUC: row.ruc,
    "Razón social": row.nombre,
    "Gravada 10": row.gravada10,
    "IVA 10": row.iva10,
    "Gravada 5": row.gravada5,
    "IVA 5": row.iva5,
    Exenta: row.exenta,
    Total: row.total,
  }));

  return (
    <div>
      <PageHeader
        title="Libro de ventas IVA"
        description="Detalle de facturas emitidas con discriminación de gravadas, IVA y exentas. Formato para el contador."
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="no-print"><Link href="/reportes"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Reportes</Link></Button>
            <CsvButton filename="libro-ventas-iva" rows={csvRows} />
            <PrintButton />
          </>
        }
      />
      <ReportFilters fields={[{ type: "date", name: "desde", label: "Desde" }, { type: "date", name: "hasta", label: "Hasta" }]} />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total facturado</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatGs(totals.total)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">IVA total</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatGs(totals.iva10 + totals.iva5)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Comprobantes</p>
          <p className="mt-1 text-xl font-semibold">{rows.length}</p>
        </div>
      </div>

      <Card className="border-border/80 shadow-none">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <EmptyState icon={ReceiptText} title="Sin comprobantes" description="No hay facturas en el período." className="border-0" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Comprobante</TableHead>
                    <TableHead>RUC</TableHead>
                    <TableHead>Razón social</TableHead>
                    <TableHead className="text-right">Gravada 10</TableHead>
                    <TableHead className="text-right">IVA 10</TableHead>
                    <TableHead className="text-right">Gravada 5</TableHead>
                    <TableHead className="text-right">IVA 5</TableHead>
                    <TableHead className="text-right">Exenta</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.numero}>
                      <TableCell className="text-xs whitespace-nowrap">{row.fecha}</TableCell>
                      <TableCell className="font-mono text-[11px]">{row.numero}</TableCell>
                      <TableCell className="font-mono text-[11px]">{row.ruc}</TableCell>
                      <TableCell className="text-xs">{row.nombre}</TableCell>
                      <TableCell className="text-right text-xs tabular">{formatGs(row.gravada10)}</TableCell>
                      <TableCell className="text-right text-xs tabular">{formatGs(row.iva10)}</TableCell>
                      <TableCell className="text-right text-xs tabular">{formatGs(row.gravada5)}</TableCell>
                      <TableCell className="text-right text-xs tabular">{formatGs(row.iva5)}</TableCell>
                      <TableCell className="text-right text-xs tabular">{formatGs(row.exenta)}</TableCell>
                      <TableCell className="text-right text-xs font-medium tabular">{formatGs(row.total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-secondary/40 font-semibold">
                    <TableCell colSpan={4} className="text-xs">TOTALES</TableCell>
                    <TableCell className="text-right text-xs tabular">{formatGs(totals.gravada10)}</TableCell>
                    <TableCell className="text-right text-xs tabular">{formatGs(totals.iva10)}</TableCell>
                    <TableCell className="text-right text-xs tabular">{formatGs(totals.gravada5)}</TableCell>
                    <TableCell className="text-right text-xs tabular">{formatGs(totals.iva5)}</TableCell>
                    <TableCell className="text-right text-xs tabular">{formatGs(totals.exenta)}</TableCell>
                    <TableCell className="text-right text-xs tabular">{formatGs(totals.total)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
