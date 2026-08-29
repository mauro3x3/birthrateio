"use client";

import * as React from "react";
import { LabeledChoropleth } from "@/components/maps/labeled-choropleth";
import type { SubnationalMap } from "@/lib/subnational-maps";
import { formatNumber, cn } from "@/lib/utils";

export function SubnationalMapsExplorer({ maps }: { maps: SubnationalMap[] }) {
  const [active, setActive] = React.useState(maps[0]?.id ?? "");
  const current = maps.find((m) => m.id === active) ?? maps[0];
  if (!current) return null;

  const countries = React.useMemo(() => {
    const seen = new Map<string, SubnationalMap[]>();
    for (const m of maps) {
      const list = seen.get(m.iso3) ?? [];
      list.push(m);
      seen.set(m.iso3, list);
    }
    return [...seen.entries()].map(([iso3, list]) => ({
      iso3,
      name: list[0].country,
      maps: list,
    }));
  }, [maps]);

  const siblings = countries.find((c) => c.iso3 === current.iso3)?.maps ?? [
    current,
  ];

  const tabLabel = (m: SubnationalMap) => {
    if (m.tab) return m.tab;
    if (siblings.some((s) => s.metric !== m.metric)) {
      return m.metric === "tfr" ? "Fertility" : "Population change";
    }
    if (siblings.some((s) => s.year !== m.year)) return String(m.year);
    return m.metric === "tfr" ? "Fertility" : "Population change";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1.5">
        {countries.map((c) => {
          const ids = new Set(c.maps.map((m) => m.id));
          const on = ids.has(current.id);
          return (
            <button
              key={c.iso3}
              type="button"
              onClick={() => setActive(c.maps[0].id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm transition-colors",
                on
                  ? "bg-foreground text-background"
                  : "border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      {siblings.length > 1 && (
        <div className="flex flex-wrap gap-2 text-sm">
          {siblings.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActive(m.id)}
              className={cn(
                "border-b-2 pb-0.5",
                m.id === current.id
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tabLabel(m)}
            </button>
          ))}
        </div>
      )}

      <LabeledChoropleth
        key={current.id}
        map={current}
        className="rounded-md border border-border"
      />

      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
        {current.credit ? (
          <>
            {current.credit}{" "}
            <a
              href={current.sourceUrl}
              className="underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              {current.source}
            </a>
          </>
        ) : (
          <>
            Source:{" "}
            <a
              href={current.sourceUrl}
              className="underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              {current.source}
            </a>
          </>
        )}
      </p>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Region</th>
              <th className="px-4 py-3 text-right font-medium">{current.unit}</th>
            </tr>
          </thead>
          <tbody>
            {[...current.regions]
              .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
              .map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2.5">{r.name}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {r.value == null
                      ? "—"
                      : current.metric === "pop-change"
                        ? `${r.value > 0 ? "+" : ""}${formatNumber(r.value, 1)}%`
                        : formatNumber(r.value, 2)}
                  </td>
                </tr>
              ))}
            {(current.highlights ?? []).map((h) => (
              <tr
                key={h.name}
                className="border-b border-border/60 last:border-0 text-muted-foreground"
              >
                <td className="px-4 py-2.5">
                  {h.name}
                  <span className="ml-2 text-xs">comparator</span>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {formatNumber(h.value, 2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
