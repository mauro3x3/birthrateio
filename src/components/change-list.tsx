import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";

export interface ChangeItem {
  slug: string;
  name: string;
  flagEmoji: string | null;
  from: number;
  to: number;
  change: number;
  pct: number;
}

export function ChangeList({
  items,
  decimals = 2,
  direction,
}: {
  items: ChangeItem[];
  decimals?: number;
  direction: "up" | "down";
}) {
  return (
    <ul className="divide-y">
      {items.map((it) => (
        <li key={it.slug}>
          <Link
            href={`/country/${it.slug}`}
            className="flex items-center gap-3 py-2.5 transition-colors hover:text-primary"
          >
            <span className="text-lg">{it.flagEmoji ?? "🏳️"}</span>
            <span className="flex-1 font-medium">{it.name}</span>
            <span className="text-sm tabular-nums text-muted-foreground">
              {it.from.toFixed(decimals)} → {it.to.toFixed(decimals)}
            </span>
            <span
              className={`inline-flex w-20 items-center justify-end gap-1 text-sm font-semibold tabular-nums ${
                direction === "up"
                  ? "text-emerald-600"
                  : "text-rose-600"
              }`}
            >
              {direction === "up" ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {it.change > 0 ? "+" : ""}
              {it.change.toFixed(decimals)}
            </span>
          </Link>
        </li>
      ))}
      {items.length === 0 && (
        <li className="py-6 text-center text-sm text-muted-foreground">
          No data yet.
        </li>
      )}
    </ul>
  );
}
