import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CreditCard,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ReceiptText,
  Users,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, formatGs } from "@/lib/format";
import { formatRuc } from "@/lib/fiscal";

export const metadata: Metadata = { title: "Ficha de cliente" };

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      priceList: true,
      invoices: {
        where: { type: "FACTURA" },
        orderBy: { issueDate: "desc" },
      },
      receipts: {
        orderBy: { date: "desc" },
        include: { payments: { include: { paymentMethod: true } } },
        take: 100,
      },
      orders: { orderBy: { date: "desc" }, include: { lines: true } },
      quotes: { orderBy: { date: "desc" }, include: { lines: true } },
    },
  });
  if (!customer) notFound();

  const totalFacturado = customer.invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const saldo = customer.invoices.reduce((sum, invoice) => sum + invoice.balance, 0);
  const today = new Date();
  const vencido = customer.invoices
    .filter((invoice) => invoice.balance > 0 && invoice.dueDate < today)
    .reduce((sum, invoice) => sum + invoice.balance, 0);
  const disponible = Math.max(0, customer.creditLimit - saldo);

  const aging = { corriente: 0, d30: 0, d60: 0, d90: 0, mas90: 0 };
  for (const invoice of customer.invoices) {
    if (invoice.balance <= 0) continue;
    const days = Math.floor((today.getTime() - invoice.dueDate.getTime()) / 86_400_000);
    if (days <= 0) aging.corriente += invoice.balance;
    else if (days <= 30) aging.d30 += invoice.balance;
    else if (days <= 60) aging.d60 += invoice.balance;
    else if (days <= 90) aging.d90 += invoice.balance;
    else aging.mas90 += invoice.balance;
  }

  return (
    <div>
      <PageHeader
        title={customer.name}
        description={`${customer.type === "PERSONA_JURIDICA" ? "Persona jurídica" : "Persona física"} · ${customer.priceList.name}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/clientes">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Volver
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/clientes/${customer.id}/editar`}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Editar
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total facturado", value: formatGs(totalFacturado), icon: ReceiptText },
          { label: "Saldo pendiente", value: formatGs(saldo), icon: Wallet, tone: saldo > 0 },
          { label: "Vencido", value: formatGs(vencido), icon: CalendarClock, tone: vencido > 0 },
          { label: "Crédito disponible", value: formatGs(disponible), icon: CreditCard },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="border-border/80 p-4 shadow-none">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className={`mt-1.5 text-lg font-semibold tabular ${item.tone ? "text-amber-700" : ""}`}>
                    {item.value}
                  </p>
                </div>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="datos" className="mt-6">
        <TabsList className="h-9 bg-secondary/60">
          <TabsTrigger value="datos" className="text-xs">Datos</TabsTrigger>
          <TabsTrigger value="cuenta" className="text-xs">Cuenta corriente</TabsTrigger>
          <TabsTrigger value="pedidos" className="text-xs">Pedidos ({customer.orders.length})</TabsTrigger>
          <TabsTrigger value="presupuestos" className="text-xs">Presupuestos ({customer.quotes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="datos" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-border/80 shadow-none lg:col-span-2">
              <CardHeader className="border-b border-border/60 px-5 py-3.5">
                <CardTitle className="text-sm font-semibold">Información del cliente</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
                <InfoRow icon={Building2} label="Razón social" value={customer.name} />
                <InfoRow icon={FileText} label="RUC / CI" value={formatRuc(customer.rucBase, customer.dv)} mono />
                <InfoRow icon={MapPin} label="Dirección" value={[customer.address, customer.city].filter(Boolean).join(", ") || "—"} />
                <InfoRow icon={Phone} label="Teléfono" value={customer.phone ?? "—"} />
                <InfoRow icon={Mail} label="Email" value={customer.email ?? "—"} />
                <InfoRow icon={Users} label="Lista de precios" value={customer.priceList.name} />
                <InfoRow icon={CreditCard} label="Límite de crédito" value={formatGs(customer.creditLimit)} />
                <InfoRow icon={CalendarClock} label="Plazo por defecto" value={customer.termDays === 0 ? "Contado" : `${customer.termDays} días`} />
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-none">
              <CardHeader className="border-b border-border/60 px-5 py-3.5">
                <CardTitle className="text-sm font-semibold">Antigüedad de saldos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 p-5">
                {[
                  ["Corriente", aging.corriente],
                  ["1 a 30 días", aging.d30],
                  ["31 a 60 días", aging.d60],
                  ["61 a 90 días", aging.d90],
                  ["Más de 90 días", aging.mas90],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className={`text-xs font-medium tabular ${Number(value) > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                      {formatGs(Number(value))}
                    </span>
                  </div>
                ))}
                <div className="pt-1">
                  <Badge
                    variant="outline"
                    className={customer.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}
                  >
                    Cliente {customer.active ? "activo" : "inactivo"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cuenta" className="mt-4 space-y-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="flex-row items-center justify-between border-b border-border/60 px-5 py-3.5">
              <CardTitle className="text-sm font-semibold">Facturas</CardTitle>
              <span className="text-xs text-muted-foreground">{customer.invoices.length} comprobantes</span>
            </CardHeader>
            <CardContent className="p-0">
              {customer.invoices.length === 0 ? (
                <EmptyState icon={ReceiptText} title="Sin facturas" description="Este cliente todavía no tiene comprobantes emitidos." className="border-0" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                        <TableHead>Fecha</TableHead>
                        <TableHead>Número</TableHead>
                        <TableHead>Condición</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Cobrado</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead>SIFEN</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customer.invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="text-xs">{formatDate(invoice.issueDate)}</TableCell>
                          <TableCell>
                            <Link href={`/facturas/${invoice.id}`} className="font-mono text-xs hover:text-primary hover:underline">
                              {invoice.number}
                            </Link>
                          </TableCell>
                          <TableCell className="text-xs">{invoice.condition === "CONTADO" ? "Contado" : "Crédito"}</TableCell>
                          <TableCell className="text-right text-xs tabular">{formatGs(invoice.total)}</TableCell>
                          <TableCell className="text-right text-xs tabular">{formatGs(invoice.paidAmount)}</TableCell>
                          <TableCell className={`text-right text-xs tabular ${invoice.balance > 0 ? "font-medium text-amber-700" : "text-muted-foreground"}`}>
                            {formatGs(invoice.balance)}
                          </TableCell>
                          <TableCell className="text-xs">{formatDate(invoice.dueDate)}</TableCell>
                          <TableCell><StatusBadge status={invoice.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5">
              <CardTitle className="text-sm font-semibold">Recibos de cobro</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {customer.receipts.length === 0 ? (
                <EmptyState icon={Wallet} title="Sin recibos" description="Los cobros aplicados al cliente aparecerán acá." className="border-0" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                        <TableHead>Fecha</TableHead>
                        <TableHead>Número</TableHead>
                        <TableHead>Medios de pago</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customer.receipts.map((receipt) => (
                        <TableRow key={receipt.id}>
                          <TableCell className="text-xs">{formatDate(receipt.date)}</TableCell>
                          <TableCell>
                            <Link href={`/recibos/${receipt.id}`} className="font-mono text-xs hover:text-primary hover:underline">
                              {receipt.number}
                            </Link>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {receipt.payments.map((payment) => payment.paymentMethod.name).join(", ")}
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium tabular">{formatGs(receipt.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pedidos" className="mt-4">
          <Card className="border-border/80 shadow-none">
            <CardContent className="p-0">
              {customer.orders.length === 0 ? (
                <EmptyState icon={FileText} title="Sin pedidos" description="Los pedidos generados para este cliente aparecerán acá." className="border-0" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                      <TableHead>Número</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Entrega</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Link href={`/pedidos/${order.id}`} className="font-mono text-xs hover:text-primary hover:underline">
                            {order.number}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(order.date)}</TableCell>
                        <TableCell className="text-xs">{formatDate(order.deliveryDate)}</TableCell>
                        <TableCell><StatusBadge status={order.status} /></TableCell>
                        <TableCell className="text-right text-xs tabular">{formatGs(order.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="presupuestos" className="mt-4">
          <Card className="border-border/80 shadow-none">
            <CardContent className="p-0">
              {customer.quotes.length === 0 ? (
                <EmptyState icon={FileText} title="Sin presupuestos" description="Creá un presupuesto desde el módulo de ventas." className="border-0" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                      <TableHead>Número</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Validez</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.quotes.map((quote) => (
                      <TableRow key={quote.id}>
                        <TableCell>
                          <Link href={`/presupuestos/${quote.id}`} className="font-mono text-xs hover:text-primary hover:underline">
                            {quote.number}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(quote.date)}</TableCell>
                        <TableCell className="text-xs">{quote.validityDays} días</TableCell>
                        <TableCell><StatusBadge status={quote.status} /></TableCell>
                        <TableCell className="text-right text-xs tabular">{formatGs(quote.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-0.5 text-sm ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
