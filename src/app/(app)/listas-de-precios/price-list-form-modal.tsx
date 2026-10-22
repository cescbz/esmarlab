"use client";

import type { ComponentProps } from "react";
import { FormDialog } from "@/components/shared/form-dialog";
import { PriceListForm } from "./price-list-form";

export function PriceListFormModal({
  list,
  trigger,
  open,
  onOpenChange,
}: {
  list?: ComponentProps<typeof PriceListForm>["list"];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <FormDialog
      title={list ? "Editar lista de precios" : "Nueva lista de precios"}
      description="El descuento se aplica al precio base y recalcula todos los ítems."
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-2xl"
    >
      {(close) => <PriceListForm list={list} onSaved={close} onCancel={close} />}
    </FormDialog>
  );
}
