"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { Globe2, MoreHorizontal, Pencil, Power } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable } from "@/components/shared/data-table";
import { setSupplierActive } from "@/actions/suppliers";
import { SupplierFormModal } from "./supplier-form-modal";

export type SupplierRow = {
  id: string;
  name: string;
  ruc: string;
  contactName: string;
  contactNameRaw: string;
  phone: string;
  phoneRaw: string;
  email: string | null;
  rucBase: string;
  dv: string;
  origin: string;
  active: boolean;
};

function Actions({ supplier }: { supplier: SupplierRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await setSupplierActive(supplier.id, !supplier.active);
      if (result.ok) {
        toast.success(supplier.active ? "Proveedor desactivado." : "Proveedor activado.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "No pudimos actualizar el proveedor.");
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setEditOpen(true);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={supplier.active ? "text-destructive focus:text-destructive" : ""}
            onSelect={(event) => {
              event.preventDefault();
              if (supplier.active) setOpen(true);
              else toggle();
            }}
          >
            <Power className="mr-2 h-4 w-4" />
            {supplier.active ? "Desactivar" : "Activar"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SupplierFormModal
        supplier={{
          id: supplier.id,
          name: supplier.name,
          rucBase: supplier.rucBase,
          dv: supplier.dv,
          contactName: supplier.contactNameRaw,
          phone: supplier.phoneRaw,
          email: supplier.email,
          origin: supplier.origin as "LOCAL" | "IMPORTADO",
          active: supplier.active,
        }}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar {supplier.name}?</AlertDialogTitle>
            <AlertDialogDescription>No estará disponible para nuevas compras. El historial se conserva.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={toggle} disabled={pending}>Desactivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const columns: ColumnDef<SupplierRow, unknown>[] = [
  {
    accessorKey: "name",
    header: "Proveedor",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  { accessorKey: "ruc", header: "RUC", cell: ({ row }) => <span className="font-mono text-xs">{row.original.ruc}</span> },
  { accessorKey: "contactName", header: "Contacto" },
  { accessorKey: "phone", header: "Teléfono" },
  {
    accessorKey: "origin",
    header: "Origen",
    cell: ({ row }) => (
      <Badge variant="outline" className={row.original.origin === "IMPORTADO" ? "border-violet-200 bg-violet-50 text-violet-700" : "border-slate-200 bg-slate-50 text-slate-600"}>
        <Globe2 className="mr-1 h-3 w-3" />
        {row.original.origin === "IMPORTADO" ? "Importado" : "Local"}
      </Badge>
    ),
  },
  {
    accessorKey: "active",
    header: "Estado",
    cell: ({ row }) => (
      <Badge className={row.original.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}>
        {row.original.active ? "Activo" : "Inactivo"}
      </Badge>
    ),
  },
  {
    id: "acciones",
    header: "",
    enableSorting: false,
    cell: ({ row }) => <div className="flex justify-end"><Actions supplier={row.original} /></div>,
  },
];

export function SuppliersTable({ data }: { data: SupplierRow[] }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKeys={["name", "ruc", "contactName"]}
      searchPlaceholder="Buscar proveedor o RUC…"
      emptyMessage="No hay proveedores."
    />
  );
}
