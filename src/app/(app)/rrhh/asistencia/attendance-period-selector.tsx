"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MONTH_NAMES } from "@/lib/hr";

export function AttendancePeriodSelector({ value }: { value: string }) {
  const router = useRouter();
  const [year, month] = value.split("-").map(Number);
  const years = [year - 1, year, year + 1];
  return (
    <div className="flex items-center gap-2">
      <Select
        value={String(month)}
        onValueChange={(next) =>
          router.push(`/rrhh/asistencia?mes=${year}-${next.padStart(2, "0")}`)
        }
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTH_NAMES.map((name, index) => (
            <SelectItem key={name} value={String(index + 1)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={String(year)}
        onValueChange={(next) =>
          router.push(`/rrhh/asistencia?mes=${next}-${String(month).padStart(2, "0")}`)
        }
      >
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((item) => (
            <SelectItem key={item} value={String(item)}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
