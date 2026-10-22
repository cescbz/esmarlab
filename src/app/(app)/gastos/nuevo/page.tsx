import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ExpenseForm } from "../../caja/expense-form";

export const metadata: Metadata = { title: "Nuevo gasto" };

export default async function NewExpensePage() {
  const [categories, suppliers, methods, openSession] = await Promise.all([
    prisma.expenseCategory.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.paymentMethod.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.cashSession.findFirst({ where: { status: "ABIERTA" }, orderBy: { openedAt: "desc" } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Nuevo gasto"
        description="Si lo pagás desde caja, se descuenta del efectivo de la sesión abierta y queda en el arqueo."
        actions={<Button asChild variant="outline"><Link href="/gastos"><ArrowLeft className="mr-1.5 h-4 w-4" />Volver</Link></Button>}
      />
      {!openSession ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          No hay una caja abierta. Podés registrar el gasto como bancario o abrir una caja primero.
        </div>
      ) : null}
      <ExpenseForm
        categories={categories}
        suppliers={suppliers}
        methods={methods}
        sessionId={openSession?.id}
        defaultPaidFromCash={Boolean(openSession)}
        redirectTo="/gastos"
      />
    </div>
  );
}
