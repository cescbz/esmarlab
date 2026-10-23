"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, PackageSearch, Power } from "lucide-react";
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
import { formatGs, formatNumber } from "@/lib/format";
import { setProductActive } from "@/actions/products";
import { ProductFormModal } from "./product-form-modal";

export type ProductRow = {
  id: string;
  code: string;
  name: string;
  group: string;
  type: string;
  unit: string;
  basePrice: number;
  stock: number;
  minStock: number;
  variants: number;
  active: boolean;
  groupId: string;
  taxRate: number;
  cost: number;
  variantsData: { id: string; size: string; color: string; sku: string; priceOverride: number | null }[];
};

const TYPE_LABEL: Record<string, string> = {
  FABRICADO: "Fabricado",
  REVENTA_LOCAL: "Reventa local",
  REVENTA_IMPORTADO: "Importado",
  MATERIA_PRIMA: "Materia prima",
};

const TYPE_CLASS: Record<string, string> = {
  FABRICADO: "border-teal-200 bg-teal-50 text-teal-700",
  REVENTA_LOCAL: "border-sky-200 bg-sky-50 text-sky-700",
  REVENTA_IMPORTADO: "border-violet-200 bg-violet-50 text-violet-700",
  MATERIA_PRIMA: "border-amber-200 bg-amber-50 text-amber-700",
};

function ProductActions({ product, groups }: { product: ProductRow; groups: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await setProductActive(product.id, !product.active);
      if (result.ok) {
        toast.success(product.active ? "Producto desactivado." : "Producto activado.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "No pudimos actualizar el producto.");
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
            <Link href={`/productos/${product.id}`}>
              <PackageSearch className="mr-2 h-4 w-4" />
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
            className={product.active ? "text-destructive focus:text-destructive" : ""}
            onSelect={(event) => {
              event.preventDefault();
              if (product.active) setOpen(true);
              else toggle();
            }}
          >
            <Power className="mr-2 h-4 w-4" />
            {product.active ? "Desactivar" : "Activar"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProductFormModal
        groups={groups}
        product={{
          id: product.id,
          code: product.code,
          name: product.name,
          groupId: product.groupId,
          type: product.type as "FABRICADO" | "REVENTA_LOCAL" | "REVENTA_IMPORTADO" | "MATERIA_PRIMA",
          unit: product.unit as "UN" | "PAR" | "DOC" | "MT" | "KG",
          taxRate: product.taxRate,
          cost: product.cost,
          basePrice: product.basePrice,
          minStock: product.minStock,
          active: product.active,
          variants: product.variantsData,
        }}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar {product.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              No se podrá seleccionar en nuevas ventas ni producción. El stock y el historial se mantienen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={toggle} disabled={pending}>Desactivar producto</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function buildColumns(groups: { id: string; name: string }[]): ColumnDef<ProductRow, unknown>[] {
  return [
  {
    accessorKey: "code",
    header: "Código",
    cell: ({ row }) => <span className="font-mono text-[11px] font-medium">{row.original.code}</span>,
  },
  {
    accessorKey: "name",
    header: "Producto",
    cell: ({ row }) => (
      <div className="min-w-[210px]">
        <Link href={`/productos/${row.original.id}`} className="font-medium hover:text-primary hover:underline">
          {row.original.name}
        </Link>
      </div>
    ),
  },
  { accessorKey: "group", header: "Grupo" },
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={`whitespace-nowrap px-1.5 py-0 text-[9px] font-semibold uppercase ${TYPE_CLASS[row.original.type] ?? ""}`}
      >
        {TYPE_LABEL[row.original.type] ?? row.original.type}
      </Badge>
    ),
  },
  {
    accessorKey: "variants",
    header: "Variantes",
    cell: ({ row }) => <span className="text-xs tabular">{row.original.variants}</span>,
  },
  {
    accessorKey: "basePrice",
    header: "Precio",
    cell: ({ row }) => <span className="text-xs tabular">{formatGs(row.original.basePrice)}</span>,
  },
  {
    accessorKey: "stock",
    header: "Stock",
    cell: ({ row }) => {
      const low = row.original.stock < row.original.minStock;
      return (
        <div>
          <span className={`text-xs font-medium tabular ${low ? "text-red-600" : ""}`}>
            {formatNumber(row.original.stock)}
          </span>
          <span className="ml-1 text-[10px] text-muted-foreground">/ mín. {row.original.minStock}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "active",
    header: "Estado",
    cell: ({ row }) =>
      row.original.active ? (
        <Badge className="border-emerald-200 bg-emerald-50 text-[10px] uppercase text-emerald-700 hover:bg-emerald-50">
          Activo
        </Badge>
      ) : (
        <Badge className="border-slate-200 bg-slate-100 text-[10px] uppercase text-slate-500 hover:bg-slate-100">
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
        <ProductActions product={row.original} groups={groups} />
      </div>
    ),
  },
  ];
}

export function ProductsTable({
  data,
  groups,
  toolbar,
}: {
  data: ProductRow[];
  groups: { id: string; name: string }[];
  toolbar?: React.ReactNode;
}) {
  const columns = buildColumns(groups);
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKeys={["name", "code", "group"]}
      searchPlaceholder="Buscar por nombre, código o grupo…"
      toolbar={toolbar}
      pageSize={15}
      emptyMessage="No hay productos que coincidan con los filtros."
    />
  );
}
