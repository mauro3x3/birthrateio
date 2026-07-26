import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  trend,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  trend?: number | null;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {trend !== undefined && trend !== null && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                trend > 0
                  ? "text-emerald-600"
                  : trend < 0
                    ? "text-rose-600"
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
      </CardContent>
    </Card>
  );
}
