import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
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
import { formatDate, formatGs } from "@/lib/format";
import { numeroALetras } from "@/lib/numbers";

export const metadata: Metadata = { title: "Recibo de cobro" };

export default async function ReceiptDetailPage({ params }: { params: { id: string } }) {
  const [receipt, company] = await Promise.all([
    prisma.receipt.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        allocations: { include: { invoice: true } },
        payments: { include: { paymentMethod: true, posTerminal: true } },
        cashSession: { include: { cashRegister: true } },
        expeditionPoint: true,
      },
    }),
    prisma.company.findFirst(),
  ]);
  if (!receipt || !company) notFound();

  const cashRegister = receipt.cashSession?.cashRegister.name ?? `${receipt.expeditionPoint.establecimiento}-${receipt.expeditionPoint.punto}`;

  return (
    <div>
      <PageHeader
        title={`Recibo ${receipt.number}`}
        description={`${receipt.customer.name} · ${formatDate(receipt.date)} · ${cashRegister}`}
        actions={
          <>
            <Button asChild variant="outline"><Link href="/recibos"><ArrowLeft className="mr-1.5 h-4 w-4" />Volver</Link></Button>
            <Button asChild variant="outline">
              <a href={`/api/pdf/recibo/${receipt.id}`} target="_blank" rel="noreferrer"><Download className="mr-1.5 h-4 w-4" />PDF</a>
            </Button>
            <Button asChild>
              <a href={`/api/pdf/recibo/${receipt.id}`} target="_blank" rel="noreferrer"><Printer className="mr-1.5 h-4 w-4" />Imprimir</a>
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] font-bold uppercase text-amber-700">DEMO — SIN VALIDEZ FISCAL</Badge>
        <span className="text-xs text-muted-foreground">Documento interno de cobro</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="demo-watermark border-border/80 shadow-none">
          <CardHeader className="flex-row items-start justify-between border-b border-border/60 px-6 py-4">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0b2f31] text-base font-black text-white">E</div>
              <div>
                <p className="text-base font-bold text-[#0b2f31]">{company.razonSocial}</p>
                <p className="text-[10px] text-muted-foreground">RUC {company.ruc}-{company.dv} · {company.city}</p>
                <p className="text-[10px] text-muted-foreground">{company.phone} · {company.email}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-[#0b2f31]">RECIBO DE COBRO</p>
              <p className="font-mono text-sm font-semibold">{receipt.number}</p>
              <p className="text-[10px] text-muted-foreground">{formatDate(receipt.date)}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="rounded-lg border border-border/70 p-3">
              <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Recibimos de</p>
              <p className="text-sm font-semibold">{receipt.customer.name}</p>
              <p className="text-[10px] text-muted-foreground">RUC / CI {receipt.customer.rucBase}-{receipt.customer.dv}</p>
            </div>

            <div className="overflow-hidden rounded-lg border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#0b2f31] hover:bg-[#0b2f31]">
                    <TableHead className="text-[9px] uppercase text-white/80">Factura</TableHead>
                    <TableHead className="text-right text-[9px] uppercase text-white/80">Total factura</TableHead>
                    <TableHead className="text-right text-[9px] uppercase text-white/80">Aplicado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipt.allocations.map((allocation) => (
                    <TableRow key={allocation.id}>
                      <TableCell>
                        <Link href={`/facturas/${allocation.invoiceId}`} className="font-mono text-xs text-primary hover:underline">{allocation.invoice.number}</Link>
                      </TableCell>
                      <TableCell className="text-right text-xs tabular">{formatGs(allocation.invoice.total)}</TableCell>
                      <TableCell className="text-right text-xs font-medium tabular">{formatGs(allocation.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Medios de pago</p>
                {receipt.payments.map((payment) => (
                  <p key={payment.id} className="mt-1 text-xs">
                    {payment.paymentMethod.name} · <span className="font-medium tabular">{formatGs(payment.amount)}</span>
                    {payment.posTerminal ? ` · ${payment.posTerminal.name}` : ""}
                    {payment.reference ? ` · ${payment.reference}` : ""}
                  </p>
                ))}
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Total cobrado</p>
                <p className="text-xl font-bold tabular">{formatGs(receipt.total)}</p>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground">Son: {numeroALetras(receipt.total)}.</p>
            {receipt.observations ? <p className="text-[11px] text-muted-foreground">Observaciones: {receipt.observations}</p> : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-4 py-3"><CardTitle className="text-sm font-semibold">Sesión de caja</CardTitle></CardHeader>
            <CardContent className="space-y-2 p-4 text-xs">
              <p><span className="text-muted-foreground">Caja:</span> {cashRegister}</p>
              <p><span className="text-muted-foreground">Punto:</span> {receipt.expeditionPoint.establecimiento}-{receipt.expeditionPoint.punto}</p>
              <p><span className="text-muted-foreground">Usuario:</span> {receipt.userId ?? "—"}</p>
              {receipt.cashSessionId ? (
                <Button asChild variant="outline" size="sm" className="mt-1 h-7 text-xs">
                  <Link href="/caja">Ir a caja</Link>
                </Button>
              ) : (
                <p className="text-muted-foreground">Cobro no asociado a una sesión abierta.</p>
              )}
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/60 shadow-none">
            <CardContent className="p-4 text-[10px] leading-relaxed text-amber-800">
              Recibo de demostración. No reemplaza comprobantes fiscales ni tiene validez ante la SET.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
