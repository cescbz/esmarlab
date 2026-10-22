"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toDateInputValue } from "@/lib/format";

export function DatePicker({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  disabled,
  className,
  id,
  "aria-label": ariaLabel,
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => {
    if (!value) return undefined;
    const date = parseISO(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }, [value]);

  function choose(date: Date | undefined) {
    onChange(date ? format(date, "yyyy-MM-dd") : "");
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel ?? "Seleccionar fecha"}
          className={cn(
            "h-9 w-full justify-start gap-2 bg-card px-3 text-left text-xs font-normal shadow-none",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {selected ? format(selected, "dd/MM/yyyy", { locale: es }) : placeholder}
          </span>
          {selected && !disabled ? (
            <span
              role="button"
              tabIndex={0}
              aria-label="Limpiar fecha"
              className="ml-auto rounded-sm p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onChange("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onChange("");
                }
              }}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto border-border bg-popover p-0 shadow-lg" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={choose}
          locale={es}
          weekStartsOn={1}
          defaultMonth={selected}
          className="p-3"
        />
        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => choose(parseISO(toDateInputValue(new Date())))}
          >
            Hoy
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => choose(undefined)}
          >
            Limpiar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
