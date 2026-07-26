import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { MigrationBreakdown } from "@/lib/queries";
import { cn, formatCompact } from "@/lib/utils";

function growth(value: number, prev: number | null) {
  if (prev == null || prev <= 0) return null;
  return ((value - prev) / prev) * 100;
}

export function MigrationBreakdownList({
  data,
  emptyLabel = "No bilateral data available.",
}: {
  data: MigrationBreakdown | null;
  emptyLabel?: string;
}) {
  if (!data || data.rows.length === 0) {
    return <p className="py-6 text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  const max = data.rows[0]?.value ?? 1;

  return (
    <div className="space-y-2.5">
      {data.rows.map((row, i) => {
        const g = growth(row.value, row.prevValue);
        return (
          <div key={row.iso3} className="flex items-center gap-3 text-sm">
            <span className="w-4 shrink-0 text-right font-mono text-xs text-muted-foreground">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <Link
                  href={`/country/${row.slug}`}
                  className="flex min-w-0 items-center gap-1.5 font-medium hover:text-primary"
                >
                  <span className="text-base leading-none">
                    {row.flagEmoji ?? "🏳️"}
                  </span>
                  <span className="truncate">{row.name}</span>
                </Link>
                <span className="shrink-0 tabular-nums">
                  {formatCompact(row.value)}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({(row.share * 100).toFixed(1)}%)
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/80"
                    style={{ width: `${Math.max((row.value / max) * 100, 1.5)}%` }}
                  />
                </div>
                {g != null && (
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-0.5 text-xs tabular-nums",
                      g >= 0 ? "text-emerald-600" : "text-red-600",
                    )}
                    title={`Change since ${data.prevYear}`}
                  >
                    {g >= 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {Math.abs(g) >= 900
                      ? `${(1 + Math.abs(g) / 100).toFixed(0)}×`
                      : `${g >= 0 ? "+" : "−"}${Math.abs(g).toFixed(0)}%`}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
