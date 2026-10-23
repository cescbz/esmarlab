import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Building2, Clock, CreditCard, Factory, ReceiptText, Users, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatRuc } from "@/lib/fiscal";
import { toDateInputValue } from "@/lib/format";
import { getClientIp } from "@/lib/ip";
import {
  CompanyForm,
  CreateCategoryForm,
  CreateStageForm,
  PaymentMethodSwitch,
  TimbradoForm,
  UserRoleRow,
} from "./config-forms";
import { KioskForm } from "./kiosk-form";

export const metadata: Metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const [company, timbrado, points, registers, terminals, methods, stages, categories, users, kioskSettings] =
    await Promise.all([
      prisma.company.findFirst(),
      prisma.timbrado.findFirst({ orderBy: { vigenciaDesde: "desc" } }),
      prisma.expeditionPoint.findMany({ orderBy: { punto: "asc" } }),
      prisma.cashRegister.findMany({ include: { expeditionPoint: true }, orderBy: { name: "asc" } }),
      prisma.posTerminal.findMany({ include: { cashRegister: true }, orderBy: { name: "asc" } }),
      prisma.paymentMethod.findMany({ orderBy: { name: "asc" } }),
      prisma.productionStage.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.expenseCategory.findMany({ orderBy: { name: "asc" } }),
      prisma.user.findMany({ orderBy: { username: "asc" } }),
      prisma.kioskSettings.findUnique({ where: { id: "default" } }),
    ]);
  if (!company) notFound();

  const headerList = headers();
  const currentIp = getClientIp({
    forwardedFor: headerList.get("x-forwarded-for"),
    realIp: headerList.get("x-real-ip"),
    cfConnectingIp: headerList.get("cf-connecting-ip"),
    trustCloudflare: process.env.TRUST_CLOUDFLARE === "1",
  });

  return (
    <div>
      <PageHeader
        title="Configuración"
        description="Empresa, timbrado, puntos de expedición, cajas, medios de pago, etapas, categorías y usuarios."
      />

      <Tabs defaultValue="empresa">
        <TabsList className="h-9 flex-wrap bg-secondary/60">
          <TabsTrigger value="empresa" className="text-xs"><Building2 className="mr-1.5 h-3.5 w-3.5" />Empresa</TabsTrigger>
          <TabsTrigger value="facturacion" className="text-xs"><ReceiptText className="mr-1.5 h-3.5 w-3.5" />Facturación</TabsTrigger>
          <TabsTrigger value="cajas" className="text-xs"><Wallet className="mr-1.5 h-3.5 w-3.5" />Cajas</TabsTrigger>
          <TabsTrigger value="produccion" className="text-xs"><Factory className="mr-1.5 h-3.5 w-3.5" />Producción</TabsTrigger>
          <TabsTrigger value="gastos" className="text-xs"><CreditCard className="mr-1.5 h-3.5 w-3.5" />Gastos</TabsTrigger>
          <TabsTrigger value="reloj" className="text-xs"><Clock className="mr-1.5 h-3.5 w-3.5" />Reloj</TabsTrigger>
          <TabsTrigger value="usuarios" className="text-xs"><Users className="mr-1.5 h-3.5 w-3.5" />Usuarios</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="mt-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Datos de la empresa</CardTitle></CardHeader>
            <CardContent className="p-5">
              <CompanyForm
                company={{
                  razonSocial: company.razonSocial,
                  nombreFantasia: company.nombreFantasia ?? "",
                  ruc: formatRuc(company.ruc, company.dv),
                  address: company.address,
                  city: company.city,
                  phone: company.phone,
                  email: company.email,
                  actividadEconomica: company.actividadEconomica,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="facturacion" className="mt-4 space-y-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Timbrado</CardTitle></CardHeader>
            <CardContent className="p-5">
              {timbrado ? (
                <TimbradoForm
                  timbrado={{
                    numero: timbrado.numero,
                    vigenciaDesde: toDateInputValue(timbrado.vigenciaDesde),
                    vigenciaHasta: toDateInputValue(timbrado.vigenciaHasta),
                    activo: timbrado.activo,
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No hay timbrado configurado.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Puntos de expedición</CardTitle></CardHeader>
            <CardContent className="space-y-2 p-5">
              {points.map((point) => (
                <div key={point.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2 text-xs">
                  <div>
                    <p className="font-mono font-medium">{point.establecimiento}-{point.punto}</p>
                    <p className="text-[10px] text-muted-foreground">{point.name}</p>
                  </div>
                  <div className="flex gap-4 text-[10px] text-muted-foreground">
                    <span>Facturas: {point.lastInvoiceNumber}</span>
                    <span>NC: {point.lastCreditNoteNumber}</span>
                    <span>Recibos: {point.lastReceiptNumber}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Medios de pago</CardTitle></CardHeader>
            <CardContent className="space-y-2 p-5">
              {methods.map((method) => (
                <div key={method.id} className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
                  <div>
                    <p className="text-xs font-medium">{method.name}</p>
                    <p className="text-[10px] text-muted-foreground">{method.type}{method.requiresPos ? " · requiere POS" : ""}{method.requiresReference ? " · requiere referencia" : ""}</p>
                  </div>
                  <PaymentMethodSwitch id={method.id} active={method.active} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cajas" className="mt-4 space-y-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Cajas y puntos</CardTitle></CardHeader>
            <CardContent className="space-y-2 p-5">
              {registers.map((register) => (
                <div key={register.id} className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
                  <div>
                    <p className="text-xs font-medium">{register.name}</p>
                    <p className="text-[10px] text-muted-foreground">Punto {register.expeditionPoint.establecimiento}-{register.expeditionPoint.punto}</p>
                  </div>
                  <Badge className={register.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}>
                    {register.active ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Terminales POS</CardTitle></CardHeader>
            <CardContent className="space-y-2 p-5">
              {terminals.map((terminal) => (
                <div key={terminal.id} className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
                  <div>
                    <p className="text-xs font-medium">{terminal.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{terminal.code} · {terminal.cashRegister?.name ?? "Sin caja"}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] uppercase">{terminal.active ? "Activa" : "Inactiva"}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="produccion" className="mt-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Etapas de producción</CardTitle></CardHeader>
            <CardContent className="space-y-3 p-5">
              <div className="space-y-2">
                {stages.map((stage) => (
                  <div key={stage.id} className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2 text-xs">
                    <span className="font-medium">{stage.sortOrder}. {stage.name}</span>
                    <Badge className={stage.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}>
                      {stage.active ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                ))}
              </div>
              <CreateStageForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gastos" className="mt-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Categorías de gastos</CardTitle></CardHeader>
            <CardContent className="space-y-3 p-5">
              <div className="grid gap-2 sm:grid-cols-2">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2 text-xs">
                    <span>{category.name}</span>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color ?? "#64748b" }} />
                  </div>
                ))}
              </div>
              <CreateCategoryForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reloj" className="mt-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5">
              <CardTitle className="text-sm font-semibold">Reloj público</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <KioskForm
                currentIp={currentIp}
                settings={{
                  enabled: kioskSettings?.enabled ?? false,
                  restrictIp: kioskSettings?.restrictIp ?? true,
                  allowedIps: kioskSettings?.allowedIps ?? "",
                  requirePhoto: kioskSettings?.requirePhoto ?? true,
                  title: kioskSettings?.title ?? "",
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios" className="mt-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Usuarios y roles</CardTitle></CardHeader>
            <CardContent className="p-5">
              {users.map((user) => (
                <UserRoleRow
                  key={user.id}
                  user={{
                    id: user.id,
                    name: user.name,
                    username: user.username,
                    role: user.role,
                    active: user.active,
                  }}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
