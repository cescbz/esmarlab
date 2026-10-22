import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownToLine,
  Banknote,
  CalendarDays,
  CreditCard,
  FileText,
  LockKeyhole,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { auth } from "@/auth";
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
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, formatGs, formatTime } from "@/lib/format";
import { getSessionSummary } from "@/lib/cash";
import { OpenCashForm } from "./open-cash-form";
import { QuickSaleForm, type SaleProduct } from "./quick-sale-form";
import { CollectForm } from "./collect-form";
import { ExpenseForm } from "./expense-form";
import { WithdrawalForm } from "./withdrawal-form";
import { CloseCashForm } from "./close-cash-form";

export const metadata: Metadata = { title: "Caja" };

const MOVEMENT_LABEL: Record<string, string> = {
  INGRESO_VENTA: "Venta",
  INGRESO_COBRO: "Cobro",
  EGRESO_GASTO: "Gasto",
  RETIRO: "Retiro",
  DEPOSITO: "Depósito",
};

export default async function CashPage({
  searchParams,
}: {
  searchParams: { caja?: string };
}) {
  const authSession = await auth();
  const role = authSession?.user?.role ?? "CAJA";
  const canOperate = ["ADMIN", "CAJA"].includes(role);

  const registers = await prisma.cashRegister.findMany({
    include: {
      expeditionPoint: true,
      sessions: {
        where: { status: "ABIERTA" },
        orderBy: { openedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });
  const selectedId =
    searchParams.caja && registers.some((register) => register.id === searchParams.caja)
      ? searchParams.caja
      : registers.find((register) => register.sessions.length > 0)?.id ?? registers[0]?.id;
  const register = registers.find((item) => item.id === selectedId) ?? registers[0];
  const cashSession = register?.sessions[0];

  if (!register) {
    return (
      <div>
        <PageHeader title="Caja" />
        <EmptyState icon={Wallet} title="No hay cajas configuradas" description="Configurá una caja desde Configuración." />
      </div>
    );
  }

  const summary = cashSession ? await getSessionSummary(cashSession.id) : null;
  const closedSessions = await prisma.cashSession.findMany({
    where: { cashRegisterId: register.id, status: "CERRADA" },
    orderBy: { closedAt: "desc" },
    take: 8,
  });

  let products: SaleProduct[] = [];
  let customers: { id: string; name: string }[] = [];
  let methods: { id: string; name: string }[] = [];
  let categories: { id: string; name: string }[] = [];
  let suppliers: { id: string; name: string }[] = [];
  let openInvoices: {
    id: string;
    number: string;
    customerId: string;
    customer: string;
    dueDate: string;
    balance: number;
    total: number;
  }[] = [];
  let customersWithBalance: { id: string; name: string; saldo: number }[] = [];

  if (cashSession) {
    const [productRows, customerRows, methodRows, categoryRows, supplierRows, invoiceRows] = await Promise.all([
      prisma.product.findMany({
        where: { active: true, type: { not: "MATERIA_PRIMA" } },
        include: {
          variants: {
            where: { active: true },
            include: { priceItems: { where: { priceListId: "pl_general" }, take: 1 } },
            orderBy: [{ size: "asc" }, { color: "asc" }],
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.customer.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.paymentMethod.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
      prisma.expenseCategory.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
      prisma.supplier.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.invoice.findMany({
        where: { type: "FACTURA", balance: { gt: 0 }, status: { in: ["APROBADO", "PENDIENTE"] } },
        include: { customer: { select: { id: true, name: true } } },
        orderBy: { dueDate: "asc" },
        take: 300,
      }),
    ]);

    products = productRows.map((product) => ({
      id: product.id,
      name: product.name,
      productName: product.name,
      taxRate: product.taxRate,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        price: variant.priceItems[0]?.price ?? variant.priceOverride ?? product.basePrice,
      })),
    }));
    customers = customerRows;
    methods = methodRows.map((method) => ({ id: method.id, name: method.name }));
    categories = categoryRows;
    suppliers = supplierRows;
    openInvoices = invoiceRows.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      customerId: invoice.customerId,
      customer: invoice.customer.name,
      dueDate: formatDate(invoice.dueDate),
      balance: invoice.balance,
      total: invoice.total,
    }));
    const map = new Map<string, { id: string; name: string; saldo: number }>();
    for (const invoice of openInvoices) {
      const current = map.get(invoice.customerId) ?? { id: invoice.customerId, name: invoice.customer, saldo: 0 };
      current.saldo += invoice.balance;
      map.set(invoice.customerId, current);
    }
    customersWithBalance = Array.from(map.values()).sort((a, b) => b.saldo - a.saldo);
  }

  const movements = summary?.session.movements.slice().sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 25) ?? [];
  const inbound = summary?.session.movements.filter((movement) => movement.type.startsWith("INGRESO")).reduce((sum, movement) => sum + movement.amount, 0) ?? 0;
  const outbound = summary?.session.movements.filter((movement) => movement.type === "EGRESO_GASTO" || movement.type === "RETIRO").reduce((sum, movement) => sum + movement.amount, 0) ?? 0;

  return (
    <div>
      <PageHeader
        title="Caja"
        description="Apertura, ventas de mostrador, cobros, gastos, retiros y cierre con arqueo por medio de pago."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Demo</Badge>
            <span className="text-xs text-muted-foreground">{formatDate(new Date())}</span>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        {registers.map((item) => {
          const open = item.sessions.length > 0;
          const active = item.id === register.id;
          return (
            <Link key={item.id} href={`/caja?caja=${item.id}`}>
              <Card className={`border p-4 shadow-none transition-colors ${active ? "border-primary/40 bg-primary/[0.03]" : "border-border/80 hover:border-primary/20"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${open ? "bg-emerald-50 text-emerald-700" : "bg-secondary text-muted-foreground"}`}>
                      <Wallet className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">Punto {item.expeditionPoint.establecimiento}-{item.expeditionPoint.punto}</p>
                    </div>
                  </div>
                  <Badge className={open ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}>
                    {open ? "Abierta" : "Cerrada"}
                  </Badge>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {!cashSession ? (
        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          {canOperate ? (
            <OpenCashForm
              registerId={register.id}
              registerName={register.name}
              point={`${register.expeditionPoint.establecimiento}-${register.expeditionPoint.punto}`}
            />
          ) : (
            <Card className="border-border/80 p-5 shadow-none">
              <p className="text-sm font-semibold">Caja cerrada</p>
              <p className="mt-1 text-xs text-muted-foreground">Solo caja o administración pueden abrir una sesión.</p>
            </Card>
          )}
          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Últimos cierres</CardTitle></CardHeader>
            <CardContent className="p-0">
              {closedSessions.length === 0 ? (
                <EmptyState icon={LockKeyhole} title="Sin cierres" description="Los cierres y arqueos de esta caja aparecerán acá." className="border-0" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                      <TableHead>Fecha</TableHead>
                      <TableHead>Apertura</TableHead>
                      <TableHead className="text-right">Contado</TableHead>
                      <TableHead className="text-right">Diferencia</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {closedSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="text-xs">{formatDate(session.closedAt ?? session.openedAt)}</TableCell>
                        <TableCell className="text-xs">{formatGs(session.openingAmount)}</TableCell>
                        <TableCell className="text-right text-xs tabular">{formatGs(session.countedAmount ?? 0)}</TableCell>
                        <TableCell className={`text-right text-xs tabular ${session.difference ? "font-medium text-red-600" : "text-muted-foreground"}`}>{formatGs(session.difference ?? 0)}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                            <a href={`/ver/arqueo/${session.id}`}>Arqueo</a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-border/80 p-4 shadow-none">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Monto inicial</p>
              <p className="mt-1.5 text-lg font-semibold tabular">{formatGs(cashSession.openingAmount)}</p>
              <p className="text-[10px] text-muted-foreground">Apertura {formatTime(cashSession.openedAt)}</p>
            </Card>
            <Card className="border-border/80 p-4 shadow-none">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ingresos del turno</p>
              <p className="mt-1.5 text-lg font-semibold tabular text-emerald-700">{formatGs(inbound)}</p>
              <p className="text-[10px] text-muted-foreground">{summary?.session.movements.length ?? 0} movimientos</p>
            </Card>
            <Card className="border-border/80 p-4 shadow-none">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Egresos del turno</p>
              <p className="mt-1.5 text-lg font-semibold tabular text-red-600">{formatGs(outbound)}</p>
              <p className="text-[10px] text-muted-foreground">Gastos y retiros</p>
            </Card>
            <Card className="border-border/80 p-4 shadow-none">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Efectivo esperado</p>
              <p className="mt-1.5 text-lg font-semibold tabular">{formatGs(summary?.cashExpected ?? 0)}</p>
              <p className="text-[10px] text-muted-foreground">Total esperado {formatGs(summary?.totalExpected ?? 0)}</p>
            </Card>
          </div>

          {canOperate ? (
            <Tabs defaultValue="venta">
              <TabsList className="h-9 flex-wrap bg-secondary/60">
                <TabsTrigger value="venta" className="text-xs"><ShoppingCart className="mr-1.5 h-3.5 w-3.5" />Venta</TabsTrigger>
                <TabsTrigger value="cobro" className="text-xs"><Banknote className="mr-1.5 h-3.5 w-3.5" />Cobrar</TabsTrigger>
                <TabsTrigger value="gasto" className="text-xs"><CreditCard className="mr-1.5 h-3.5 w-3.5" />Gasto</TabsTrigger>
                <TabsTrigger value="retiro" className="text-xs"><ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />Retiro</TabsTrigger>
                <TabsTrigger value="cierre" className="text-xs"><LockKeyhole className="mr-1.5 h-3.5 w-3.5" />Cierre</TabsTrigger>
              </TabsList>
              <TabsContent value="venta" className="mt-4">
                <QuickSaleForm
                  sessionId={cashSession.id}
                  products={products}
                  customers={customers}
                  methods={methods}
                />
              </TabsContent>
              <TabsContent value="cobro" className="mt-4">
                <CollectForm
                  sessionId={cashSession.id}
                  invoices={openInvoices}
                  customers={customersWithBalance}
                  methods={methods}
                />
              </TabsContent>
              <TabsContent value="gasto" className="mt-4">
                <Card className="border-border/80 shadow-none">
                  <CardContent className="p-5">
                    <ExpenseForm
                      categories={categories}
                      suppliers={suppliers}
                      methods={methods}
                      sessionId={cashSession.id}
                      defaultPaidFromCash
                      compact
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="retiro" className="mt-4">
                <WithdrawalForm sessionId={cashSession.id} cashExpected={summary?.cashExpected ?? 0} />
              </TabsContent>
              <TabsContent value="cierre" className="mt-4">
                <CloseCashForm
                  sessionId={cashSession.id}
                  rows={(summary?.rows ?? []).map((row) => ({
                    methodId: row.methodId,
                    name: row.name,
                    expected: row.expected,
                  }))}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="rounded-lg border border-border/80 bg-white px-4 py-3 text-xs text-muted-foreground">
              Estás viendo la caja en modo lectura. Solo caja y administración pueden operar.
            </div>
          )}

          <Card className="mt-5 border-border/80 shadow-none">
            <CardHeader className="flex-row items-center justify-between border-b border-border/60 px-5 py-3.5">
              <CardTitle className="text-sm font-semibold">Movimientos del turno</CardTitle>
              <span className="text-xs text-muted-foreground">{formatDate(cashSession.openedAt)} · {register.name}</span>
            </CardHeader>
            <CardContent className="p-0">
              {movements.length === 0 ? (
                <EmptyState icon={CalendarDays} title="Sin movimientos" description="Las ventas, cobros, gastos y retiros aparecerán acá." className="border-0" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                        <TableHead>Hora</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Medio</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell className="text-xs">{formatTime(movement.date)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={movement.type.startsWith("INGRESO") ? "border-emerald-200 bg-emerald-50 text-[9px] uppercase text-emerald-700" : "border-red-200 bg-red-50 text-[9px] uppercase text-red-600"}
                            >
                              {MOVEMENT_LABEL[movement.type] ?? movement.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{movement.paymentMethod.name}</TableCell>
                          <TableCell className="font-mono text-[10px] text-muted-foreground">{movement.reference ?? "—"}</TableCell>
                          <TableCell className={`text-right text-xs font-medium tabular ${movement.type.startsWith("INGRESO") ? "text-emerald-700" : "text-red-600"}`}>
                            {movement.type.startsWith("INGRESO") ? "+" : "−"}{formatGs(movement.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {closedSessions.length > 0 && cashSession ? (
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Arqueos recientes:</span>
          {closedSessions.slice(0, 4).map((session) => (
            <a
              key={session.id}
              href={`/ver/arqueo/${session.id}`}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <FileText className="h-3 w-3" />
              {formatDate(session.closedAt ?? session.openedAt)}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
