import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, FileText, Link2, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime, formatGs } from "@/lib/format";
import { formatCdc } from "@/lib/fiscal";
import { numeroALetras } from "@/lib/numbers";
import { settlePendingInvoices } from "@/lib/sifen";
import { InvoiceActions } from "./invoice-actions";
import { InvoiceStatusPoller } from "./status-poller";

export const metadata: Metadata = { title: "Comprobante electrónico" };

const EVENT_LABEL: Record<string, string> = {
  ENVIO: "Envío a SIFEN",
  APROBACION: "Aprobación",
  RECHAZO: "Rechazo",
  CANCELACION: "Cancelación",
  INUTILIZACION: "Inutilización",
};

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  await settlePendingInvoices(params.id);
  const [invoice, company] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        lines: { include: { variant: { include: { product: true } } } },
        timbrado: true,
        expeditionPoint: { include: { cashRegister: true } },
        order: true,
        events: { orderBy: { date: "desc" } },
        creditNotes: { orderBy: { issueDate: "desc" } },
        sourceInvoice: true,
        allocations: { include: { receipt: true } },
      },
    }),
    prisma.company.findFirst(),
  ]);
  if (!invoice || !company) notFound();

  const isNC = invoice.type === "NOTA_CREDITO";
  const cashRegister = invoice.expeditionPoint.cashRegister?.name ?? `${invoice.expeditionPoint.establecimiento}-${invoice.expeditionPoint.punto}`;

  return (
    <div>
      <InvoiceStatusPoller status={invoice.status} />
      <PageHeader
        title={`${isNC ? "Nota de crédito" : "Factura"} ${invoice.number}`}
        description={`${invoice.customer.name} · ${formatDate(invoice.issueDate)} · ${cashRegister}`}
        actions={
          <>
            <Button asChild variant="outline"><Link href="/facturas"><ArrowLeft className="mr-1.5 h-4 w-4" />Volver</Link></Button>
            <InvoiceActions
              invoiceId={invoice.id}
              invoiceNumber={invoice.number}
              type={invoice.type}
              status={invoice.status}
              balance={invoice.balance}
              total={invoice.total}
              issueDate={invoice.issueDate.toISOString()}
            />
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={invoice.status} />
        <span className="rounded-full border border-border bg-white px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {isNC ? "Nota de crédito electrónica" : "Factura electrónica"}
        </span>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
          DEMO — SIN VALIDEZ FISCAL
        </span>
        {invoice.status === "PENDIENTE" ? (
          <span className="flex items-center gap-1 text-xs text-amber-700">
            <Clock3 className="h-3.5 w-3.5" />Esperando aprobación simulada de la SET…
          </span>
        ) : null}
        {invoice.status === "CANCELADO" ? (
          <span className="flex items-center gap-1 text-xs text-red-600">
            <XCircle className="h-3.5 w-3.5" />Comprobante cancelado
          </span>
        ) : null}
      </div>

      <Tabs defaultValue="documento">
        <TabsList className="h-9 bg-secondary/60">
          <TabsTrigger value="documento" className="text-xs">Documento</TabsTrigger>
          <TabsTrigger value="xml" className="text-xs">XML SIFEN</TabsTrigger>
          <TabsTrigger value="eventos" className="text-xs">Eventos ({invoice.events.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="documento" className="mt-4">
          <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
            <Card className="demo-watermark overflow-hidden border-border/80 shadow-none">
              <CardContent className="p-6">
                <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row">
                  <div className="flex gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand text-lg font-bold text-white">E</div>
                    <div>
                      <p className="text-lg font-bold tracking-tight text-brand">{company.razonSocial}</p>
                      <p className="text-[10px] text-muted-foreground">Uniformes empresariales · EPP · Producción</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        RUC {company.ruc}-{company.dv} · {company.address}, {company.city}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{company.phone} · {company.email}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-bold text-brand">KuDE</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide">
                      {isNC ? "Nota de crédito electrónica" : "Factura electrónica"}
                    </p>
                    <p className="font-mono text-sm font-semibold">{invoice.number}</p>
                    <p className="text-[10px] text-muted-foreground">Fecha: {formatDate(invoice.issueDate)}</p>
                    <p className="text-[10px] font-bold text-amber-700">DEMO — SIN VALIDEZ FISCAL</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 rounded-lg border border-border/70 p-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Timbrado</p>
                    <p className="text-xs font-medium">{invoice.timbrado.numero}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Vigencia {formatDate(invoice.timbrado.vigenciaDesde)} al {formatDate(invoice.timbrado.vigenciaHasta)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Condición</p>
                    <p className="text-xs font-medium">{invoice.condition === "CONTADO" ? "Contado" : `Crédito ${invoice.termDays} días`}</p>
                    <p className="text-[10px] text-muted-foreground">Vence {formatDate(invoice.dueDate)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wide text-muted-foreground">CDC</p>
                    <p className="break-all font-mono text-[9px] leading-relaxed">{formatCdc(invoice.cdc)}</p>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 rounded-lg border border-border/70 p-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Receptor</p>
                    <p className="text-xs font-semibold">{invoice.customer.name}</p>
                    <p className="text-[10px] text-muted-foreground">RUC / CI {invoice.customer.rucBase}-{invoice.customer.dv}</p>
                    <p className="text-[10px] text-muted-foreground">{[invoice.customer.address, invoice.customer.city].filter(Boolean).join(", ")}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Referencias</p>
                    <p className="text-[10px] text-muted-foreground">{cashRegister} · {invoice.expeditionPoint.establecimiento}-{invoice.expeditionPoint.punto}</p>
                    {invoice.order ? (
                      <Link href={`/pedidos/${invoice.order.id}`} className="text-[10px] text-primary hover:underline">Pedido {invoice.order.number}</Link>
                    ) : null}
                    {invoice.sourceInvoice ? (
                      <Link href={`/facturas/${invoice.sourceInvoice.id}`} className="ml-2 text-[10px] text-primary hover:underline">
                        Factura origen {invoice.sourceInvoice.number}
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-lg border border-border/70">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-brand hover:bg-brand">
                        <TableHead className="text-[9px] uppercase text-white/80">Descripción</TableHead>
                        <TableHead className="text-center text-[9px] uppercase text-white/80">Cant.</TableHead>
                        <TableHead className="text-right text-[9px] uppercase text-white/80">Precio unit.</TableHead>
                        <TableHead className="text-right text-[9px] uppercase text-white/80">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell className="text-[11px]">{line.description}</TableCell>
                          <TableCell className="text-center text-[11px] tabular">{line.quantity}</TableCell>
                          <TableCell className="text-right text-[11px] tabular">{formatGs(line.unitPrice)}</TableCell>
                          <TableCell className="text-right text-[11px] font-medium tabular">{formatGs(line.lineTotal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:justify-end">
                  <div className="w-full space-y-1 text-[11px] sm:w-64">
                    <div className="flex justify-between"><span className="text-muted-foreground">Gravada 10%</span><span className="tabular">{formatGs(invoice.subtotal10)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">IVA 10%</span><span className="tabular">{formatGs(invoice.iva10)}</span></div>
                    {invoice.subtotal5 > 0 ? <div className="flex justify-between"><span className="text-muted-foreground">IVA 5%</span><span className="tabular">{formatGs(invoice.iva5)}</span></div> : null}
                    {invoice.exenta > 0 ? <div className="flex justify-between"><span className="text-muted-foreground">Exenta</span><span className="tabular">{formatGs(invoice.exenta)}</span></div> : null}
                    <div className="flex justify-between border-t border-brand pt-2 text-sm font-bold"><span>Total</span><span className="tabular">{formatGs(invoice.total)}</span></div>
                  </div>
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground">Son: {numeroALetras(invoice.total)}.</p>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="border-border/80 shadow-none">
                <CardHeader className="border-b border-border/60 px-4 py-3">
                  <CardTitle className="text-sm font-semibold">Estado y cobranza</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 p-4 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-medium tabular">{formatGs(invoice.total)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Cobrado</span><span className="tabular">{formatGs(invoice.paidAmount)}</span></div>
                  <div className="flex justify-between border-t border-border/60 pt-2"><span className="text-muted-foreground">Saldo</span><span className={`font-semibold tabular ${invoice.balance > 0 ? "text-amber-700" : "text-emerald-700"}`}>{formatGs(invoice.balance)}</span></div>
                  {invoice.allocations.length > 0 ? (
                    <div className="space-y-1 border-t border-border/60 pt-2">
                      <p className="text-[9px] uppercase text-muted-foreground">Recibos aplicados</p>
                      {invoice.allocations.map((allocation) => (
                        <Link key={allocation.id} href={`/recibos/${allocation.receiptId}`} className="flex justify-between text-[11px] text-primary hover:underline">
                          <span>{allocation.receipt.number}</span><span className="tabular">{formatGs(allocation.amount)}</span>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-border/80 shadow-none">
                <CardHeader className="border-b border-border/60 px-4 py-3">
                  <CardTitle className="text-sm font-semibold">Documentos vinculados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-4 text-xs">
                  {invoice.order ? (
                    <Link href={`/pedidos/${invoice.order.id}`} className="flex items-center gap-2 text-primary hover:underline">
                      <FileText className="h-3.5 w-3.5" />Pedido {invoice.order.number}
                    </Link>
                  ) : null}
                  {invoice.sourceInvoice ? (
                    <Link href={`/facturas/${invoice.sourceInvoice.id}`} className="flex items-center gap-2 text-primary hover:underline">
                      <Link2 className="h-3.5 w-3.5" />Factura origen {invoice.sourceInvoice.number}
                    </Link>
                  ) : null}
                  {invoice.creditNotes.map((note) => (
                    <Link key={note.id} href={`/facturas/${note.id}`} className="flex items-center gap-2 text-primary hover:underline">
                      <Link2 className="h-3.5 w-3.5" />Nota de crédito {note.number}
                    </Link>
                  ))}
                  {!invoice.order && !invoice.sourceInvoice && invoice.creditNotes.length === 0 ? (
                    <p className="text-muted-foreground">Sin documentos vinculados.</p>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-amber-200 bg-amber-50/60 shadow-none">
                <CardContent className="p-4 text-[10px] leading-relaxed text-amber-800">
                  Este comprobante fue emitido en un ambiente de demostración. El CDC, XML y la respuesta de la SET son simulados. No tiene validez fiscal.
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="xml" className="mt-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="flex-row items-center justify-between border-b border-border/60 px-5 py-3.5">
              <CardTitle className="text-sm font-semibold">XML SIFEN simulado</CardTitle>
              <Button asChild variant="outline" size="sm">
                <a href={`/api/facturas/${invoice.id}/xml`}>Descargar XML</a>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <pre className="max-h-[560px] overflow-auto bg-[#0f172a] p-5 font-mono text-[10px] leading-relaxed text-slate-200">
                {invoice.xml}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eventos" className="mt-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5">
              <CardTitle className="text-sm font-semibold">Eventos SIFEN</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {invoice.events.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin eventos registrados.</p>
              ) : (
                <div className="space-y-4">
                  {invoice.events.map((event) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="mt-0.5">
                        {event.type === "APROBACION" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : event.type === "CANCELACION" || event.type === "RECHAZO" ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <Clock3 className="h-4 w-4 text-sky-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium">{EVENT_LABEL[event.type] ?? event.type}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{event.message}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {formatDateTime(event.date)}{event.details ? ` · ${event.details}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
