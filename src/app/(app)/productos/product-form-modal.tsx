"use client";

import type { ComponentProps } from "react";
import { FormDialog } from "@/components/shared/form-dialog";
import { ProductForm } from "./product-form";

export function ProductFormModal({
  groups,
  product,
  trigger,
  open,
  onOpenChange,
}: {
  groups: ComponentProps<typeof ProductForm>["groups"];
  product?: ComponentProps<typeof ProductForm>["product"];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <FormDialog
      title={product ? "Editar producto" : "Nuevo producto"}
      description="Datos comerciales, precios y variantes por talle y color."
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-6xl"
      bodyClassName="max-h-[calc(92svh-82px)] overflow-y-auto bg-background p-4 sm:p-5"
    >
      {(close) => (
        <ProductForm groups={groups} product={product} onSaved={close} onCancel={close} />
      )}
    </FormDialog>
  );
}
