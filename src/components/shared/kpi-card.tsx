import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "accent";
  className?: string;
}) {
  const tones = {
    default: "bg-secondary text-foreground/70",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-600",
    accent: "bg-primary/10 text-primary",
  };

  return (
    <Card className={cn("border-border/80 p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 truncate text-[22px] font-semibold leading-none tracking-tight text-foreground tabular">
            {value}
          </p>
          {hint ? <p className="mt-2 text-[11px] text-muted-foreground">{hint}</p> : null}
        </div>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </Card>
  );
}
