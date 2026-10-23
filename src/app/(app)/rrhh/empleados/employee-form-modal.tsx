"use client";

import { FormDialog } from "@/components/shared/form-dialog";
import { EmployeeForm, type EmployeeDefaults } from "./employee-form";

export function EmployeeFormModal({
  employee,
  workshops,
  trigger,
}: {
  employee?: EmployeeDefaults;
  workshops: { id: string; name: string }[];
  trigger?: React.ReactNode;
}) {
  return (
    <FormDialog
      title={employee?.id ? "Editar empleado" : "Nuevo empleado"}
      description="Ficha, horario, forma de pago y PIN para el reloj."
      trigger={trigger}
    >
      {(close) => <EmployeeForm employee={employee} workshops={workshops} onSaved={close} />}
    </FormDialog>
  );
}
