import type { Metadata } from "next";
import { Plus, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { FilterSelect } from "@/components/shared/filter-select";
import { Button } from "@/components/ui/button";
import { formatRuc } from "@/lib/fiscal";
import { formatGs } from "@/lib/format";
import { CustomersTable, type CustomerRow } from "./customers-table";
import { CustomerFormModal } from "./customer-form-modal";

export const metadata: Metadata = { title: "Clientes" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { estado?: string; cuenta?: string };
}) {
  const estado = searchParams.estado ?? "todos";
  const cuenta = searchParams.cuenta ?? "todos";

  const [customers, balances, priceLists] = await Promise.all([
    prisma.customer.findMany({
      where:
        estado === "activos"
          ? { active: true }
          : estado === "inactivos"
            ? { active: false }
            : undefined,
      include: { priceList: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.invoice.groupBy({
      by: ["customerId"],
      where: { type: "FACTURA" },
      _sum: { balance: true },
    }),
    prisma.priceList.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const balanceMap = new Map(balances.map((row) => [row.customerId, row._sum.balance ?? 0]));

  let rows: CustomerRow[] = customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    type: customer.type,
    ruc: formatRuc(customer.rucBase, customer.dv),
    rucBase: customer.rucBase,
    dv: customer.dv,
    address: customer.address,
    city: customer.city,
    phone: customer.phone,
    email: customer.email,
    priceList: customer.priceList.name,
    priceListId: customer.priceListId,
    saldo: balanceMap.get(customer.id) ?? 0,
    creditLimit: customer.creditLimit,
    termDays: customer.termDays,
    active: customer.active,
  }));

  if (cuenta === "con-saldo") rows = rows.filter((row) => row.saldo > 0);
  if (cuenta === "sin-saldo") rows = rows.filter((row) => row.saldo === 0);

  const totalSaldo = rows.reduce((sum, row) => sum + row.saldo, 0);

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Empresas y personas con las que opera Esmar. El saldo incluye facturas a crédito pendientes."
        actions={
          <CustomerFormModal
            priceLists={priceLists}
            trigger={
              <Button>
                <Plus className="mr-1.5 h-4 w-4" />
                Nuevo cliente
              </Button>
            }
          />
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Clientes listados</p>
          <p className="mt-1 text-xl font-semibold">{rows.length}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Activos</p>
          <p className="mt-1 text-xl font-semibold">{rows.filter((row) => row.active).length}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Saldo total</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatGs(totalSaldo)}</p>
        </div>
      </div>

      {rows.length === 0 && customers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white px-6 py-16 text-center">
          <Users className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Todavía no hay clientes</p>
          <p className="mt-1 text-xs text-muted-foreground">Creá el primero para comenzar a presupuestar.</p>
          <CustomerFormModal
            priceLists={priceLists}
            trigger={<Button className="mt-4">Nuevo cliente</Button>}
          />
        </div>
      ) : (
        <CustomersTable
          data={rows}
          priceLists={priceLists}
          toolbar={
            <>
              <FilterSelect
                name="estado"
                label="Estado"
                options={[
                  { value: "todos", label: "Todos" },
                  { value: "activos", label: "Activos" },
                  { value: "inactivos", label: "Inactivos" },
                ]}
              />
              <FilterSelect
                name="cuenta"
                label="Cuenta"
                options={[
                  { value: "todos", label: "Todos" },
                  { value: "con-saldo", label: "Con saldo" },
                  { value: "sin-saldo", label: "Sin saldo" },
                ]}
              />
            </>
          }
        />
      )}
    </div>
  );
}
