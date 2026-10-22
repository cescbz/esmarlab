"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function InvoiceFilters({
  points,
}: {
  points: { id: string; label: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete(key);
    else params.set(key, value);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Desde</label>
        <DatePicker
          value={searchParams.get("desde") ?? ""}
          onChange={(value) => update("desde", value)}
          className="w-[145px]"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Hasta</label>
        <DatePicker
          value={searchParams.get("hasta") ?? ""}
          onChange={(value) => update("hasta", value)}
          className="w-[145px]"
        />
      </div>
      <Select value={searchParams.get("estado") ?? "todos"} onValueChange={(value) => update("estado", value === "todos" ? "" : value)}>
        <SelectTrigger className="h-9 w-[150px] bg-white text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos los estados</SelectItem>
          <SelectItem value="PENDIENTE">Pendiente</SelectItem>
          <SelectItem value="APROBADO">Aprobado</SelectItem>
          <SelectItem value="CANCELADO">Cancelado</SelectItem>
          <SelectItem value="RECHAZADO">Rechazado</SelectItem>
        </SelectContent>
      </Select>
      <Select value={searchParams.get("caja") ?? "todas"} onValueChange={(value) => update("caja", value === "todas" ? "" : value)}>
        <SelectTrigger className="h-9 w-[130px] bg-white text-xs"><SelectValue placeholder="Caja" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas las cajas</SelectItem>
          {points.map((point) => (
            <SelectItem key={point.id} value={point.id}>{point.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {["desde", "hasta", "estado", "caja"].some((key) => searchParams.get(key)) ? (
        <button
          type="button"
          onClick={() => router.push("/facturas")}
          className="pb-2 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Limpiar
        </button>
      ) : null}
    </div>
  );
}
