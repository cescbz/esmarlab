"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ExpenseFilters({ categories }: { categories: { id: string; name: string }[] }) {
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
        <Input type="date" defaultValue={searchParams.get("desde") ?? ""} onChange={(event) => update("desde", event.target.value)} className="h-9 w-[145px] bg-white text-xs" />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Hasta</label>
        <Input type="date" defaultValue={searchParams.get("hasta") ?? ""} onChange={(event) => update("hasta", event.target.value)} className="h-9 w-[145px] bg-white text-xs" />
      </div>
      <Select value={searchParams.get("categoria") ?? "todas"} onValueChange={(value) => update("categoria", value === "todas" ? "" : value)}>
        <SelectTrigger className="h-9 w-[220px] bg-white text-xs"><SelectValue placeholder="Categoría" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas las categorías</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {["desde", "hasta", "categoria"].some((key) => searchParams.get(key)) ? (
        <button type="button" onClick={() => router.push("/gastos")} className="pb-2 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
          Limpiar
        </button>
      ) : null}
    </div>
  );
}
