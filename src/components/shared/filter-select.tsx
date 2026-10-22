"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function FilterSelect({
  name,
  label,
  options,
  defaultValue = "todos",
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const value = searchParams.get(name) ?? defaultValue;

  function onChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "todos") params.delete(name);
    else params.set(name, next);
    router.push(`?${params.toString()}`);
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto min-w-[150px] gap-2 bg-white text-xs">
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
