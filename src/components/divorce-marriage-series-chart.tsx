"use client";

import * as React from "react";
import { MultiSeriesChart } from "@/components/charts/multi-series-chart";
import { colorAt } from "@/components/charts/palette";
import { cn } from "@/lib/utils";
import type { DivorceMarriageCountry } from "@/lib/sources/eurostat-divorce-marriage-data";

const MAX_SERIES = 8;

export function DivorceMarriageSeriesChart({
  countries,
  defaultIso3s,
  height = 360,
}: {
  countries: DivorceMarriageCountry[];
  defaultIso3s: string[];
  height?: number;
}) {
  const [selected, setSelected] = React.useState<string[]>(() =>
    defaultIso3s.filter((iso) => countries.some((c) => c.iso3 === iso)).slice(
      0,
      MAX_SERIES,
    ),
  );

  const byIso = React.useMemo(() => {
    const m = new Map(countries.map((c) => [c.iso3, c]));
    return m;
  }, [countries]);

  const series = selected
    .map((iso, i) => {
      const c = byIso.get(iso);
      if (!c) return null;
      return {
        key: c.iso3,
        label: c.name,
        color: colorAt(i),
      };
    })
    .filter((s): s is NonNullable<typeof s> => s != null);

  const years = React.useMemo(() => {
    const ys = new Set<number>();
    for (const iso of selected) {
      const c = byIso.get(iso);
      if (!c) continue;
      for (const p of c.series) ys.add(p.year);
    }
    return [...ys].sort((a, b) => a - b);
  }, [selected, byIso]);

  const data = years.map((year) => {
    const row: Record<string, number | string | null> = { year };
    for (const iso of selected) {
      const c = byIso.get(iso);
      const hit = c?.series.find((p) => p.year === year);
      row[iso] = hit?.value ?? null;
    }
    return row;
  });

  function toggle(iso3: string) {
    setSelected((prev) => {
      if (prev.includes(iso3)) {
        if (prev.length <= 1) return prev;
        return prev.filter((x) => x !== iso3);
      }
      if (prev.length >= MAX_SERIES) {
        return [...prev.slice(1), iso3];
      }
      return [...prev, iso3];
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {countries.map((c) => {
          const on = selected.includes(c.iso3);
          return (
            <button
              key={c.iso3}
              type="button"
              onClick={() => toggle(c.iso3)}
              className={cn(
                "border px-2 py-0.5 text-[11px] transition-colors",
                on
                  ? "border-foreground/40 bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
              aria-pressed={on}
            >
              {c.flag} {c.name}
            </button>
          );
        })}
      </div>
      <MultiSeriesChart
        data={data}
        series={series}
        height={height}
        unit="per 100 marriages"
        decimals={1}
      />
      <p className="text-[11px] text-muted-foreground">
        Select up to {MAX_SERIES} countries. Gaps are years Eurostat has not
        published for that country.
      </p>
    </div>
  );
}
