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
        "relative flex h-full w-full flex-col overflow-hidden bg-[#f7f4ef] text-[#1a1a1a]",
        className,
      )}
    >
      <header
        className={cn(
          "relative z-10 flex shrink-0 items-start justify-between gap-3 border-b border-black/10 bg-[#f7f4ef]",
          compact ? "px-4 py-2.5" : "px-5 py-3",
        )}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">
            birthrate.io · Stories
          </p>
          <h2
            className={cn(
              "mt-0.5 font-serif font-semibold tracking-tight text-[#0f172a]",
              compact ? "text-base leading-snug" : "text-xl leading-tight",
            )}
          >
            {pack.title}
          </h2>
          {!compact ? (
            <p className="mt-0.5 truncate text-xs text-black/55">
              {pack.subtitle}
            </p>
          ) : null}
        </div>
        {compact ? (
          <p className="shrink-0 font-serif text-3xl font-semibold tabular-nums tracking-tight text-[#0f172a]">
            {year}
          </p>
        ) : null}
      </header>

      <div
        className={cn(
          "relative z-0 grid min-h-0 flex-1 overflow-hidden",
          compact ? "grid-cols-1 gap-1.5 p-3" : "grid-cols-[1fr_10.5rem] gap-3 px-5 py-3",
        )}
      >
        <ol className="flex min-h-0 flex-col overflow-hidden">
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
                className="grid min-h-0 flex-1 grid-cols-[1.1rem_minmax(0,1fr)] items-center gap-1.5"
              >
                <span className="text-right font-mono text-[10px] tabular-nums text-black/40">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="mb-0.5 flex items-baseline justify-between gap-2">
                    <span
                      className={cn(
                        "truncate font-medium leading-none",
                        compact ? "text-[11px]" : "text-xs",
                      )}
                    >
                      <span className="mr-1" aria-hidden>
                        {row.series.flag}
                      </span>
                      {row.series.name}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 tabular-nums leading-none text-black/70",
                        compact ? "text-[11px]" : "text-xs",
                      )}
                    >
                      {formatCompact(row.value)}
                      {delta != null && Math.abs(delta) >= 1 ? (
                        <span
                          className={cn(
                            "ml-1 text-[9px]",
                            delta > 0 ? "text-emerald-700" : "text-red-700",
                          )}
                        >
                          {delta > 0 ? "+" : ""}
                          {formatCompact(delta)}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "w-full overflow-hidden rounded-sm bg-black/[0.06]",
                      compact ? "h-2" : "h-2.5",
                    )}
                  >
                    <div
                      className="h-full rounded-sm transition-[width] duration-300 ease-out"
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
          <aside className="flex min-h-0 flex-col justify-between overflow-hidden border-l border-black/10 pl-3">
            <div>
              <p className="font-serif text-5xl font-semibold tabular-nums leading-none tracking-tight text-[#0f172a]">
                {year}
              </p>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">
                {pack.sidebarTitle}
              </p>
              <p className="mt-1 font-serif text-2xl font-semibold tabular-nums tracking-tight">
                {formatNumber(total, 0)}
              </p>
              <p className="mt-0.5 text-[11px] text-black/50">
                {pack.metricLabel}
              </p>
            </div>
            <p className="text-[9px] leading-snug text-black/45">{pack.source}</p>
          </aside>
        ) : (
          <p className="shrink-0 text-center text-[10px] text-black/45">
            Total {formatCompact(total)} · {pack.metricLabel}
          </p>
        )}
      </div>

      <footer
        className={cn(
          "relative z-10 shrink-0 border-t border-black/10 bg-[#f7f4ef] text-[9px] leading-snug text-black/45",
          compact ? "px-3 py-1.5" : "px-5 py-2",
        )}
      >
        <p className="line-clamp-2">{pack.note}</p>
      </footer>
    </div>
  );
}
