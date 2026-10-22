import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { formatDate, formatGs } from "@/lib/format";
import { ExpenseFilters } from "./expense-filters";
import { ExpensesTable, type ExpenseRow } from "./expenses-table";

export const metadata: Metadata = { title: "Gastos" };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: { desde?: string; hasta?: string; categoria?: string };
}) {
  const categories = await prisma.expenseCategory.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const desde = searchParams.desde ? new Date(`${searchParams.desde}T00:00:00-03:00`) : undefined;
  const hasta = searchParams.hasta ? new Date(`${searchParams.hasta}T23:59:59-03:00`) : undefined;

  const expenses = await prisma.expense.findMany({
    where: {
      ...(searchParams.categoria ? { categoryId: searchParams.categoria } : {}),
      ...(desde ? { date: { gte: desde, ...(hasta ? { lte: hasta } : {}) } } : hasta ? { date: { lte: hasta } } : {}),
    },
    include: { category: true, supplier: true, paymentMethod: true },
    orderBy: { date: "desc" },
  });

  const rows: ExpenseRow[] = expenses.map((expense) => ({
    id: expense.id,
    date: formatDate(expense.date),
    category: expense.category.name,
    supplier: expense.supplier?.name ?? "—",
    description: expense.description,
    amount: expense.amount,
    method: expense.paymentMethod.name,
    source: expense.paidFromCash ? "Caja" : "Banco",
    voucher: expense.voucherNumber ?? "—",
  }));

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const cashTotal = expenses.filter((expense) => expense.paidFromCash).reduce((sum, expense) => sum + expense.amount, 0);
  const byCategory = new Map<string, number>();
  for (const expense of expenses) {
    byCategory.set(expense.category.name, (byCategory.get(expense.category.name) ?? 0) + expense.amount);
  }
  const topCategories = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div>
      <PageHeader
        title="Gastos"
        description="Gastos operativos pagados desde caja o banco. Se descuentan de la sesión de caja cuando corresponde."
        actions={<Button asChild><Link href="/gastos/nuevo"><Plus className="mr-1.5 h-4 w-4" />Nuevo gasto</Link></Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total gastos</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatGs(total)}</p>
          <p className="text-[10px] text-muted-foreground">{expenses.length} registros</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Pagado desde caja</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatGs(cashTotal)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Principal categoría</p>
          <p className="mt-1 text-sm font-semibold">{topCategories[0]?.[0] ?? "—"}</p>
          <p className="text-[10px] text-muted-foreground tabular">{formatGs(topCategories[0]?.[1] ?? 0)}</p>
        </div>
      </div>

      {topCategories.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {topCategories.map(([name, value]) => (
            <div key={name} className="flex items-center gap-2 rounded-full border border-border/80 bg-white px-3 py-1.5 text-[11px]">
              <span className="text-muted-foreground">{name}</span>
              <span className="font-semibold tabular">{formatGs(value)}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mb-3">
        <ExpenseFilters categories={categories.map((category) => ({ id: category.id, name: category.name }))} />
      </div>

      <ExpensesTable data={rows} />
    </div>
  );
}
