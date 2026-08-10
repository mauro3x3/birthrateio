import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  trend,
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  trend?: number | null;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border border-border bg-card px-4 py-3.5 shadow-none",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        {icon ? (
          <span className="text-muted-foreground opacity-60">{icon}</span>
        ) : null}
      </div>
      <p className="mt-1.5 font-serif text-2xl font-semibold tracking-tight text-primary tabular-nums">
        {value}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {trend !== undefined && trend !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              trend > 0
                ? "text-emerald-700"
                : trend < 0
                  ? "text-rose-700"
                  : "text-muted-foreground",
            )}
          >
            {trend > 0 ? (
              <ArrowUp className="h-3 w-3" />
            ) : trend < 0 ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        {sub}
      </div>
    </div>
  );
}
