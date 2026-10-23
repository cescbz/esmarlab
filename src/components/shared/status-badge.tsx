import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  BORRADOR: "border-slate-200 bg-slate-50 text-slate-600",
  ENVIADO: "border-sky-200 bg-sky-50 text-sky-700",
  APROBADO: "border-emerald-200 bg-emerald-50 text-emerald-700",
  RECHAZADO: "border-red-200 bg-red-50 text-red-700",
  VENCIDO: "border-amber-200 bg-amber-50 text-amber-700",
  PENDIENTE: "border-amber-200 bg-amber-50 text-amber-700",
  EN_PRODUCCION: "border-violet-200 bg-violet-50 text-violet-700",
  LISTO: "border-teal-200 bg-teal-50 text-teal-700",
  DESPACHADO_PARCIAL: "border-orange-200 bg-orange-50 text-orange-700",
  DESPACHADO: "border-sky-200 bg-sky-50 text-sky-700",
  FACTURADO: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ANULADO: "border-slate-200 bg-slate-100 text-slate-500",
  CANCELADO: "border-slate-200 bg-slate-100 text-slate-500",
  ABIERTA: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CERRADA: "border-slate-200 bg-slate-100 text-slate-600",
  PLANIFICADA: "border-slate-200 bg-slate-50 text-slate-600",
  EN_PROCESO: "border-sky-200 bg-sky-50 text-sky-700",
  EN_CURSO: "border-sky-200 bg-sky-50 text-sky-700",
  TERMINADA: "border-emerald-200 bg-emerald-50 text-emerald-700",
  COMPLETADA: "border-emerald-200 bg-emerald-50 text-emerald-700",
  RECIBIDA: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ACTIVO: "border-emerald-200 bg-emerald-50 text-emerald-700",
  INACTIVO: "border-slate-200 bg-slate-100 text-slate-500",
  LICENCIA: "border-amber-200 bg-amber-50 text-amber-700",
  PAGADA: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ANULADA: "border-slate-200 bg-slate-100 text-slate-500",
  APROBADA: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export const STATUS_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  ENVIADO: "Enviado",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
  VENCIDO: "Vencido",
  PENDIENTE: "Pendiente",
  EN_PRODUCCION: "En producción",
  LISTO: "Listo",
  DESPACHADO_PARCIAL: "Despacho parcial",
  DESPACHADO: "Despachado",
  FACTURADO: "Facturado",
  ANULADO: "Anulado",
  CANCELADO: "Cancelado",
  ABIERTA: "Abierta",
  CERRADA: "Cerrada",
  PLANIFICADA: "Planificada",
  EN_PROCESO: "En proceso",
  EN_CURSO: "En curso",
  TERMINADA: "Terminada",
  COMPLETADA: "Completada",
  RECIBIDA: "Recibida",
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
  LICENCIA: "Licencia",
  PAGADA: "Pagada",
  ANULADA: "Anulada",
  APROBADA: "Aprobada",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "whitespace-nowrap px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        STYLES[status] ?? "border-slate-200 bg-slate-50 text-slate-600",
        className
      )}
    >
      {label ?? STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
