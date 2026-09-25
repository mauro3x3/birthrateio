"use client";

import * as React from "react";
import { cn, formatCompact, formatNumber } from "@/lib/utils";
import {
  rankingForYear,
  totalForYear,
  type StoryPack,
} from "@/lib/stories";

export function BarChartRaceFrame({
  pack,
  year,
  className,
  compact = false,
}: {
  pack: StoryPack;
  year: number;
  className?: string;
  /** Tighter layout for portrait / square exports. */
  compact?: boolean;
}) {
  const ranking = rankingForYear(pack, year);
  const max = ranking[0]?.value ?? 1;
  const total = totalForYear(pack, year);
  const yearIdx = pack.years.indexOf(year);
  const prevYear = yearIdx > 0 ? pack.years[yearIdx - 1] : null;

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden bg-[#f7f4ef] text-[#1a1a1a]",
        className,
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-start justify-between gap-3 border-b border-black/10",
          compact ? "px-4 py-3" : "px-6 py-4",
        )}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">
            birthrate.io · Stories
          </p>
          <h2
            className={cn(
              "mt-1 font-serif font-semibold tracking-tight text-[#0f172a]",
              compact ? "text-lg leading-snug" : "text-2xl",
            )}
          >
            {pack.title}
          </h2>
          {!compact ? (
            <p className="mt-1 text-sm text-black/55">{pack.subtitle}</p>
          ) : null}
        </div>
        <p
          className={cn(
            "shrink-0 font-serif font-semibold tabular-nums tracking-tight text-[#0f172a]",
            compact ? "text-4xl" : "text-6xl",
          )}
        >
          {year}
        </p>
      </div>

      <div
        className={cn(
          "grid min-h-0 flex-1",
          compact ? "grid-cols-1 gap-2 p-3" : "grid-cols-[1fr_11rem] gap-4 p-5",
        )}
      >
        <ol className="flex min-h-0 flex-col justify-center gap-1.5">
          {ranking.map((row, i) => {
            const width = Math.max(6, (row.value / max) * 100);
            const prev =
              prevYear != null
                ? (row.series.values[String(prevYear)] ?? null)
                : null;
            const delta =
              prev != null && prev > 0 ? row.value - prev : null;
            return (
              <li
                key={row.series.id}
                className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-2"
              >
                <span className="text-right font-mono text-[10px] tabular-nums text-black/40">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="mb-0.5 flex items-baseline justify-between gap-2">
                    <span
                      className={cn(
                        "truncate font-medium",
                        compact ? "text-[11px]" : "text-sm",
                      )}
                    >
                      <span className="mr-1.5" aria-hidden>
                        {row.series.flag}
                      </span>
                      {row.series.name}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 tabular-nums text-black/70",
                        compact ? "text-[11px]" : "text-sm",
                      )}
                    >
                      {formatCompact(row.value)}
                      {delta != null && delta !== 0 ? (
                        <span
                          className={cn(
                            "ml-1.5 text-[10px]",
                            delta > 0 ? "text-emerald-700" : "text-red-700",
                          )}
                        >
                          {delta > 0 ? "+" : ""}
                          {formatCompact(delta)}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-sm bg-black/[0.06]">
                    <div
                      className="h-full rounded-sm transition-[width] duration-500 ease-out"
                      style={{
                        width: `${width}%`,
                        background: row.series.color,
                      }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {!compact ? (
          <aside className="flex flex-col justify-between border-l border-black/10 pl-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">
                {pack.sidebarTitle}
              </p>
              <p className="mt-2 font-serif text-3xl font-semibold tabular-nums tracking-tight">
                {formatNumber(total, 0)}
              </p>
              <p className="mt-1 text-xs text-black/50">{pack.metricLabel}</p>
            </div>
            <p className="text-[10px] leading-relaxed text-black/45">
              {pack.source}
            </p>
          </aside>
        ) : (
          <p className="text-center text-[10px] text-black/45">
            Total {formatCompact(total)} · {pack.metricLabel}
          </p>
        )}
      </div>

      <div
        className={cn(
          "shrink-0 border-t border-black/10 text-[10px] leading-snug text-black/45",
          compact ? "px-3 py-2" : "px-5 py-2.5",
        )}
      >
        {pack.note}
      </div>
    </div>
  );
}
