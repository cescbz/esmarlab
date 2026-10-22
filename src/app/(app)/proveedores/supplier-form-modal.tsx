"use client";

import type { ComponentProps } from "react";
import { FormDialog } from "@/components/shared/form-dialog";
import { SupplierForm } from "./supplier-form";

export function SupplierFormModal({
  supplier,
  trigger,
  open,
  onOpenChange,
}: {
  supplier?: ComponentProps<typeof SupplierForm>["supplier"];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <FormDialog
      title={supplier ? "Editar proveedor" : "Nuevo proveedor"}
      description="Datos fiscales y de contacto del proveedor."
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-3xl"
    >
      {(close) => (
        <SupplierForm supplier={supplier} onSaved={close} onCancel={close} />
      )}
    </FormDialog>
  );
}
