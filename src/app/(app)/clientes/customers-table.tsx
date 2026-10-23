"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Power, UserRound } from "lucide-react";
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
import { formatGs } from "@/lib/format";
import { setCustomerActive } from "@/actions/customers";
import { CustomerFormModal } from "./customer-form-modal";

export type PriceListOption = { id: string; name: string };

export type CustomerRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  ruc: string;
  rucBase: string;
  dv: string;
  address: string | null;
  city: string;
  phone: string | null;
  email: string | null;
  priceList: string;
  priceListId: string;
  saldo: number;
  creditLimit: number;
  termDays: number;
  active: boolean;
};

function CustomerActions({ customer, priceLists }: { customer: CustomerRow; priceLists: PriceListOption[] }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await setCustomerActive(customer.id, !customer.active);
      if (result.ok) {
        toast.success(customer.active ? "Cliente desactivado." : "Cliente activado.");
        setConfirmOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "No pudimos actualizar el cliente.");
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Acciones">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/clientes/${customer.id}`}>
              <UserRound className="mr-2 h-4 w-4" />
              Ver ficha
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setEditOpen(true);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={customer.active ? "text-destructive focus:text-destructive" : ""}
            onSelect={(event) => {
              event.preventDefault();
              if (customer.active) setConfirmOpen(true);
              else toggle();
            }}
          >
            <Power className="mr-2 h-4 w-4" />
            {customer.active ? "Desactivar" : "Activar"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CustomerFormModal
        priceLists={priceLists}
        customer={{
          id: customer.id,
          type: customer.type as "PERSONA_FISICA" | "PERSONA_JURIDICA",
          name: customer.name,
          rucBase: customer.rucBase,
          dv: customer.dv,
          address: customer.address,
          city: customer.city,
          phone: customer.phone,
          email: customer.email,
          priceListId: customer.priceListId,
          creditLimit: customer.creditLimit,
          termDays: customer.termDays,
          active: customer.active,
        }}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar a {customer.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              El cliente dejará de aparecer en las búsquedas de ventas, pero su historial se conserva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={toggle} disabled={pending}>
              Desactivar cliente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function buildColumns(priceLists: PriceListOption[]): ColumnDef<CustomerRow, unknown>[] {
  return [
  {
    accessorKey: "code",
    header: "Código",
    cell: ({ row }) => <span className="font-mono text-[11px] font-medium">{row.original.code}</span>,
  },
  {
    accessorKey: "name",
    header: "Cliente",
    cell: ({ row }) => (
      <div className="min-w-[210px]">
        <Link href={`/clientes/${row.original.id}`} className="font-medium hover:text-primary hover:underline">
          {row.original.name}
        </Link>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {row.original.type === "PERSONA_JURIDICA" ? "Persona jurídica" : "Persona física"}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "ruc",
    header: "RUC / CI",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.ruc}</span>,
  },
  { accessorKey: "city", header: "Ciudad" },
  {
    accessorKey: "priceList",
    header: "Lista",
    cell: ({ row }) => <span className="text-xs">{row.original.priceList}</span>,
  },
  {
    accessorKey: "saldo",
    header: "Saldo",
    cell: ({ row }) => (
      <span className={row.original.saldo > 0 ? "font-medium text-amber-700 tabular" : "text-muted-foreground tabular"}>
        {formatGs(row.original.saldo)}
      </span>
    ),
  },
  {
    accessorKey: "creditLimit",
    header: "Límite",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground tabular">{formatGs(row.original.creditLimit)}</span>
    ),
  },
  {
    accessorKey: "active",
    header: "Estado",
    cell: ({ row }) =>
      row.original.active ? (
        <Badge className="border-emerald-200 bg-emerald-50 text-[10px] font-semibold uppercase text-emerald-700 hover:bg-emerald-50">
          Activo
        </Badge>
      ) : (
        <Badge className="border-slate-200 bg-slate-100 text-[10px] font-semibold uppercase text-slate-500 hover:bg-slate-100">
          Inactivo
        </Badge>
      ),
  },
  {
    id: "acciones",
    header: "",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <CustomerActions customer={row.original} priceLists={priceLists} />
      </div>
    ),
  },
  ];
}

export function CustomersTable({
  data,
  priceLists,
  toolbar,
}: {
  data: CustomerRow[];
  priceLists: PriceListOption[];
  toolbar?: React.ReactNode;
}) {
  const columns = buildColumns(priceLists);
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKeys={["code", "name", "ruc", "city", "priceList"]}
      searchPlaceholder="Buscar por nombre, RUC o ciudad…"
      toolbar={toolbar}
      emptyMessage="No hay clientes que coincidan con los filtros."
    />
  );
}
