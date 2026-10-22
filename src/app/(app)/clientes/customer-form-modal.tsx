"use client";

import type { ComponentProps } from "react";
import { FormDialog } from "@/components/shared/form-dialog";
import { CustomerForm } from "./customer-form";

export function CustomerFormModal({
  priceLists,
  customer,
  trigger,
  open,
  onOpenChange,
}: {
  priceLists: ComponentProps<typeof CustomerForm>["priceLists"];
  customer?: ComponentProps<typeof CustomerForm>["customer"];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <FormDialog
      title={customer ? "Editar cliente" : "Nuevo cliente"}
      description="Datos fiscales y condiciones comerciales. El RUC se valida con módulo 11."
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-4xl"
    >
      {(close) => (
        <CustomerForm
          priceLists={priceLists}
          customer={customer}
          onSaved={close}
          onCancel={close}
        />
      )}
    </FormDialog>
  );
}
