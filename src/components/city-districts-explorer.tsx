"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { buildColorScale } from "@/lib/color-scale";
import { cn, formatCompact, formatNumber } from "@/lib/utils";
import { HelpImproveData } from "@/components/help-improve-data";
import {
  availableDistrictMetrics,
  districtMetricDef,
  districtMetricValue,
  type CityDistrictRow,
  type DistrictMetricId,
} from "@/lib/city-district-maps";

const RegionChoroplethMap = dynamic(
  () =>
    import("@/components/maps/region-choropleth-map").then(
      (m) => m.RegionChoroplethMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center bg-muted/30 text-sm text-muted-foreground">
        Loading map…
      </div>
    ),
  },
);

function formatMetric(value: number, metric: DistrictMetricId): string {
  const def = districtMetricDef(metric);
  if (metric === "population" || metric === "density") {
    return formatCompact(value);
  }
  if (metric === "income") {
    return `$${formatNumber(value, 0)}`;
  }
  return `${formatNumber(value, def.decimals)}${def.unit ? def.unit : ""}`;
}

export function CityDistrictsExplorer({
  cityName,
  citySlug,
  kindLabel,
  geoUrl,
  source,
  rows,
}: {
  cityName: string;
  citySlug: string;
  kindLabel: string;
  geoUrl: string;
  source: string;
  rows: CityDistrictRow[];
}) {
  const metrics = React.useMemo(
    () => availableDistrictMetrics(citySlug, rows),
    [citySlug, rows],
  );
  const [metric, setMetric] = React.useState<DistrictMetricId>(metrics[0]);
  const [highlight, setHighlight] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!metrics.includes(metric)) setMetric(metrics[0]);
  }, [metrics, metric]);

  const def = districtMetricDef(metric);

  const ranked = React.useMemo(() => {
    return [...rows]
      .map((r) => ({ row: r, value: districtMetricValue(r, metric) }))
      .filter((x) => x.value != null)
      .sort((a, b) => (b.value as number) - (a.value as number));
  }, [rows, metric]);

  const mapData = React.useMemo(
    () =>
      ranked.map(({ row, value }) => ({
        id: row.slug,
        slug: row.slug,
        name: row.name,
        value: value as number,
      })),
    [ranked],
  );

  const scale = React.useMemo(() => {
    const values = mapData.map((d) => d.value);
    return buildColorScale(values, "sequential");
  }, [mapData]);

  const legend = React.useMemo(() => {
    const stops = scale.legend ?? [];
    if (stops.length < 2) return undefined;
    const pick = [
      stops[0],
      stops[Math.floor(stops.length / 2)],
      stops[stops.length - 1],
    ];
    return pick.map((s, i) => ({
      label:
        i === 0
          ? `Low · ${formatMetric(s.value, metric)}`
          : i === pick.length - 1
            ? `High · ${formatMetric(s.value, metric)}`
            : formatMetric(s.value, metric),
      color: s.color,
    }));
  }, [scale, metric]);

  const year = rows.find((r) => r.year != null)?.year;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-serif text-xl font-semibold tracking-tight text-primary md:text-[1.35rem]">
            {kindLabel} of {cityName}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {def.description}
            {year ? ` · ${year}` : ""}
            {" · "}
            {ranked.length} areas
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {metrics.map((id) => {
            const m = districtMetricDef(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => setMetric(id)}
                className={cn(
                  "px-2.5 py-1.5 text-xs font-medium transition-colors",
                  metric === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,20rem)] lg:border lg:border-border">
        <RegionChoroplethMap
          geoUrl={geoUrl}
          data={mapData}
          colorFor={scale.color}
          unit={def.unit}
          decimals={def.decimals}
          height={420}
          fitMaxZoom={11}
          navigate={false}
          revision={`${metric}-${mapData.length}`}
          legend={legend}
          legendTitle={def.label}
          formatValue={(v) => formatMetric(v, metric)}
        />

        <ol className="max-h-[420px] overflow-y-auto border-t border-border lg:border-l lg:border-t-0">
          {ranked.map(({ row, value }, i) => {
            const active = highlight === row.slug;
            return (
              <li key={row.slug}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlight(row.slug)}
                  onMouseLeave={() => setHighlight(null)}
                  className={cn(
                    "flex w-full items-baseline gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                    active ? "bg-muted" : "hover:bg-muted/50",
                  )}
                >
                  <span className="w-5 shrink-0 font-mono text-xs text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {row.name}
                  </span>
                  <span className="shrink-0 font-serif tabular-nums">
                    {formatMetric(value as number, metric)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Source: {source}</p>
        <HelpImproveData context={`${kindLabel} of ${cityName}`} />
      </div>
    </section>
  );
}
