"use client";

import * as React from "react";
import Link from "next/link";
import {
  HistoricMapExplorer,
  type HistoricMapPack,
} from "@/components/historic-map-explorer";
import type { HistoricMapEntry } from "@/lib/sources/historic-maps-data";
import { cn, formatCompact } from "@/lib/utils";

export type WorldPop82YearPack = {
  year: number;
  digitized?: boolean;
  pack: HistoricMapPack;
  meta: HistoricMapEntry;
  targetPop?: number;
  worldPop?: number;
};

export function WorldPop82SeriesExplorer({
  years,
}: {
  years: WorldPop82YearPack[];
}) {
  const sorted = React.useMemo(
    () => [...years].sort((a, b) => a.year - b.year),
    [years],
  );
  const defaultYear =
    sorted.find((y) => y.year === 2026)?.year ??
    sorted[sorted.length - 1]?.year ??
    1914;
  const [year, setYear] = React.useState(defaultYear);
  const active = sorted.find((y) => y.year === year) ?? sorted[0];

  if (!active) return null;

  const target =
    active.targetPop ??
    (active.pack.totalPopulation && active.pack.areas.length
      ? active.pack.totalPopulation / active.pack.areas.length
      : null);
  const world = active.worldPop ?? active.pack.totalPopulation;

  return (
    <div className="space-y-4">
      <div className="border border-border bg-card px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Equal-population world
            </p>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {sorted.length} snapshots · 82 regions each. Dense places shatter
              into many tiles; empty continents stay huge blocs.
              {active.digitized ? (
                <>
                  {" "}
                  <span className="text-foreground">
                    1914 is the hand-drawn MapPorn reconstruction
                  </span>
                  ; later years are algorithmic partitions from UN / Gapminder
                  population.
                </>
              ) : (
                <>
                  {" "}
                  Algorithmic partition from country (and some province)
                  populations — comparable idea to{" "}
                  <Link
                    href="/maps/historic/world-pop82-1914"
                    className="link-editorial"
                  >
                    1914
                  </Link>
                  , not the same hand-drawn borders.
                </>
              )}
            </p>
          </div>
          <div className="text-right text-sm tabular-nums text-muted-foreground">
            {world ? (
              <p>
                World{" "}
                <span className="font-semibold text-foreground">
                  {formatCompact(world)}
                </span>
              </p>
            ) : null}
            {target ? (
              <p>
                ~{formatCompact(target)}
                <span className="text-muted-foreground"> / region</span>
              </p>
            ) : null}
          </div>
        </div>
        <div
          className="mt-3 flex flex-wrap gap-1.5"
          role="listbox"
          aria-label="Year"
        >
          {sorted.map((y) => (
            <button
              key={y.year}
              type="button"
              role="option"
              aria-selected={y.year === year}
              onClick={() => setYear(y.year)}
              className={cn(
                "border px-2.5 py-1 text-xs font-medium tabular-nums transition-colors",
                y.year === year
                  ? "border-foreground/40 bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              {y.year}
              {y.digitized ? (
                <span className="ml-1 opacity-70">· hand</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <HistoricMapExplorer
        key={active.pack.slug}
        meta={{ ...active.meta, year: active.year }}
        pack={active.pack}
      />
    </div>
  );
}
