"use client";

import type { ComponentProps } from "react";
import { FormDialog } from "@/components/shared/form-dialog";
import { ExpenseForm } from "../caja/expense-form";

export function ExpenseFormModal({
  categories,
  suppliers,
  methods,
  sessionId,
  defaultPaidFromCash,
  trigger,
  open,
  onOpenChange,
}: {
  categories: ComponentProps<typeof ExpenseForm>["categories"];
  suppliers: ComponentProps<typeof ExpenseForm>["suppliers"];
  methods: ComponentProps<typeof ExpenseForm>["methods"];
  sessionId?: string;
  defaultPaidFromCash?: boolean;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <FormDialog
      title="Nuevo gasto"
      description="Gasto operativo pagado desde caja o banco."
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-2xl"
    >
      {(close) => (
        <ExpenseForm
          categories={categories}
          suppliers={suppliers}
          methods={methods}
          sessionId={sessionId}
          defaultPaidFromCash={defaultPaidFromCash}
          onSaved={close}
          compact
        />
      )}
    </FormDialog>
  );
}
