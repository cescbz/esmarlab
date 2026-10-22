"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ReportFilterField =
  | { type: "date"; name: string; label: string }
  | { type: "select"; name: string; label: string; options: { value: string; label: string }[] };

export function ReportFilters({ fields }: { fields: ReportFilterField[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete(key);
    else params.set(key, value);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-2 no-print">
      {fields.map((field) =>
        field.type === "date" ? (
          <div key={field.name} className="space-y-1">
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">{field.label}</label>
            <DatePicker
              value={searchParams.get(field.name) ?? ""}
              onChange={(value) => update(field.name, value)}
              className="w-[150px]"
            />
          </div>
        ) : (
          <div key={field.name} className="space-y-1">
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">{field.label}</label>
            <Select
              value={searchParams.get(field.name) || "todos"}
              onValueChange={(value) => update(field.name, value === "todos" ? "" : value)}
            >
              <SelectTrigger className="h-9 min-w-[170px] bg-white text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {field.options.map((option) => (
                  <SelectItem key={option.value || "todos"} value={option.value || "todos"}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      )}
      <button
        type="button"
        onClick={() => router.push(pathname)}
        className="pb-2 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Restablecer
      </button>
    </div>
  );
}
