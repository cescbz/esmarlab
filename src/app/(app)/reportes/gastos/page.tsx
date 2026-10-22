import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, TrendingDown } from "lucide-react";
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
import { formatDate, formatGs } from "@/lib/format";
import { reportRange } from "@/lib/reports";
import { ReportFilters } from "@/components/reports/report-filters";
import { CsvButton, PrintButton } from "@/components/reports/report-actions";
import { SimplePieChart } from "@/components/reports/charts";

export const metadata: Metadata = { title: "Gastos por categoría" };

export default async function ExpensesReportPage({
  searchParams,
}: {
  searchParams: { desde?: string; hasta?: string; categoria?: string };
}) {
  const range = reportRange(searchParams);
  const categories = await prisma.expenseCategory.findMany({ orderBy: { name: "asc" } });
  const expenses = await prisma.expense.findMany({
    where: {
      date: { gte: range.desdeDate, lte: range.hastaDate },
      ...(searchParams.categoria ? { categoryId: searchParams.categoria } : {}),
    },
    include: { category: true, supplier: true, paymentMethod: true },
    orderBy: { date: "desc" },
  });
  const byCategory = new Map<string, number>();
  for (const expense of expenses) byCategory.set(expense.category.name, (byCategory.get(expense.category.name) ?? 0) + expense.amount);
  const categoryRows = Array.from(byCategory.entries()).map(([categoria, total]) => ({ categoria, total })).sort((a, b) => b.total - a.total);
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const cashTotal = expenses.filter((expense) => expense.paidFromCash).reduce((sum, expense) => sum + expense.amount, 0);
  const pie = categoryRows.map((row) => ({ categoria: row.categoria, total: row.total }));
  const csvRows = expenses.map((expense) => ({
    Fecha: formatDate(expense.date),
    Categoria: expense.category.name,
    Proveedor: expense.supplier?.name ?? "",
    Comprobante: expense.voucherNumber ?? "",
    Descripcion: expense.description,
    Medio: expense.paymentMethod.name,
    Origen: expense.paidFromCash ? "Caja" : "Banco",
    Monto: expense.amount,
  }));

  return (
    <div>
      <PageHeader
        title="Gastos por categoría"
        description="Gastos del período con detalle por categoría, origen y medio de pago."
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="no-print"><Link href="/reportes"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Reportes</Link></Button>
            <CsvButton filename="gastos-por-categoria" rows={csvRows} />
            <PrintButton />
          </>
        }
      />
      <ReportFilters
        fields={[
          { type: "date", name: "desde", label: "Desde" },
          { type: "date", name: "hasta", label: "Hasta" },
          { type: "select", name: "categoria", label: "Categoría", options: [{ value: "", label: "Todas las categorías" }, ...categories.map((category) => ({ value: category.id, label: category.name }))] },
        ]}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total gastos</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatGs(total)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Desde caja</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatGs(cashTotal)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Desde banco</p>
          <p className="mt-1 text-xl font-semibold tabular">{formatGs(total - cashTotal)}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Distribución por categoría</CardTitle></CardHeader>
          <CardContent className="p-4">
            {pie.length === 0 ? <EmptyState icon={TrendingDown} title="Sin gastos" className="border-0 py-8" /> : <SimplePieChart data={pie} nameKey="categoria" valueKey="total" height={300} />}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5"><CardTitle className="text-sm font-semibold">Detalle de gastos</CardTitle></CardHeader>
          <CardContent className="p-0">
            {expenses.length === 0 ? (
              <EmptyState icon={TrendingDown} title="Sin gastos" description="No hay gastos en el período." className="border-0" />
            ) : (
              <div className="max-h-[520px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                      <TableHead>Fecha</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="text-xs whitespace-nowrap">{formatDate(expense.date)}</TableCell>
                        <TableCell className="text-xs">{expense.category.name}</TableCell>
                        <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground">{expense.description}</TableCell>
                        <TableCell className="text-xs">{expense.paidFromCash ? "Caja" : "Banco"}</TableCell>
                        <TableCell className="text-right text-xs font-medium tabular">{formatGs(expense.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
