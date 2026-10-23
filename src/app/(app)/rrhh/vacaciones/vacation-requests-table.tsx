"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { type ColumnDef } from "@tanstack/react-table";
import { Check, X } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
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
import { cancelVacationRequest, decideVacationRequest } from "@/actions/vacations";

export type VacationRequestRow = {
  id: string;
  code: string;
  employee: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  decidedBy: string;
};

function RowActions({ row, canWrite }: { row: VacationRequestRow; canWrite: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<"reject" | "cancel" | null>(null);

  if (!canWrite || row.status !== "PENDIENTE") return null;

  function approve() {
    startTransition(async () => {
      const result = await decideVacationRequest(row.id, "APROBADA");
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos aprobar la solicitud.");
        return;
      }
      toast.success("Solicitud aprobada.");
      router.refresh();
    });
  }

  function reject() {
    startTransition(async () => {
      const result = await decideVacationRequest(row.id, "RECHAZADA");
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos rechazar la solicitud.");
        return;
      }
      toast.success("Solicitud rechazada.");
      setDialog(null);
      router.refresh();
    });
  }

  function cancel() {
    startTransition(async () => {
      const result = await cancelVacationRequest(row.id);
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos cancelar la solicitud.");
        return;
      }
      toast.success("Solicitud cancelada.");
      setDialog(null);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-emerald-700"
        onClick={approve}
        disabled={pending}
        aria-label="Aprobar"
      >
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-red-600"
        onClick={() => setDialog("reject")}
        disabled={pending}
        aria-label="Rechazar"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={() => setDialog("cancel")}
        disabled={pending}
      >
        Cancelar
      </Button>

      <AlertDialog open={dialog !== null} onOpenChange={(open) => setDialog(open ? dialog : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialog === "reject" ? "¿Rechazar la solicitud?" : "¿Cancelar la solicitud?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialog === "reject"
                ? "La solicitud quedará rechazada y no descontará saldo."
                : "La solicitud quedará cancelada y no descontará saldo."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={dialog === "reject" ? reject : cancel} disabled={pending}>
              {dialog === "reject" ? "Rechazar" : "Cancelar solicitud"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function VacationRequestsTable({
  data,
  canWrite,
}: {
  data: VacationRequestRow[];
  canWrite: boolean;
}) {
  const columns: ColumnDef<VacationRequestRow, unknown>[] = [
    {
      accessorKey: "code",
      header: "Legajo",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
    },
    { accessorKey: "employee", header: "Empleado" },
    { accessorKey: "startDate", header: "Desde" },
    { accessorKey: "endDate", header: "Hasta" },
    { accessorKey: "days", header: "Días", cell: ({ row }) => <span className="tabular">{row.original.days}</span> },
    { accessorKey: "status", header: "Estado", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      accessorKey: "decidedBy",
      header: "Decidido por",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.decidedBy || "—"}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <RowActions row={row.original} canWrite={canWrite} />,
    },
  ];

  return (
    <DataTable
      data={data}
      columns={columns}
      searchKeys={["code", "employee", "status"]}
      searchPlaceholder="Buscar solicitud…"
      pageSize={10}
      emptyMessage="No hay solicitudes de vacaciones."
    />
  );
}
