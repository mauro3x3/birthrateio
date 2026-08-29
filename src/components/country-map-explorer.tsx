"use client";

import * as React from "react";
import { buildColorScale } from "@/lib/color-scale";
import {
  getCountryMapAtlas,
  type CountryMapEntry,
  type CountryMapMetric,
  type MapMetricId,
} from "@/lib/country-map-atlas";
import { formatNumber, cn } from "@/lib/utils";

type MapComponent = typeof import("@/components/maps/region-choropleth-map").RegionChoroplethMap;

const METRIC_ORDER: MapMetricId[] = [
  "tfr",
  "population",
  "pop-growth",
  "gfr",
];

function metricOf(
  country: CountryMapEntry,
  id: MapMetricId,
): CountryMapMetric | undefined {
  return country.metrics.find((m) => m.id === id);
}

export function CountryMapExplorer({
  initialIso3,
}: {
  initialIso3: string;
}) {
  const atlas = React.useMemo(() => getCountryMapAtlas(), []);
  const [iso3, setIso3] = React.useState(initialIso3.toUpperCase());
  const [metricId, setMetricId] = React.useState<MapMetricId>("tfr");
  const [year, setYear] = React.useState<number | null>(null);
  const [panelOpen, setPanelOpen] = React.useState(true);
  const [MapView, setMapView] = React.useState<MapComponent | null>(null);

  React.useEffect(() => {
    setIso3(initialIso3.toUpperCase());
  }, [initialIso3]);

  React.useEffect(() => {
    let cancelled = false;
    import("@/components/maps/region-choropleth-map").then((m) => {
      if (!cancelled) setMapView(() => m.RegionChoroplethMap);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const country =
    atlas.find((c) => c.iso3 === iso3) ?? atlas[0];

  React.useEffect(() => {
    const available = country.metrics.map((m) => m.id);
    if (!available.includes(metricId)) {
      setMetricId(available[0] ?? "tfr");
    }
  }, [country, metricId]);

  const metric = metricOf(country, metricId) ?? country.metrics[0];
  const activeYear = metric
    ? (year && metric.years.includes(year) ? year : metric.years[0])
    : null;

  React.useEffect(() => {
    if (metric && activeYear != null) setYear(activeYear);
  }, [metric, activeYear]);

  const regions = metric && activeYear != null
    ? (metric.valuesByYear[activeYear] ?? [])
    : [];
  const values = regions
    .map((r) => r.value)
    .filter((v): v is number => v != null && Number.isFinite(v));

  const scale = React.useMemo(
    () =>
      buildColorScale(
        values,
        metric?.scale ?? "sequential",
        metric?.mid,
      ),
    [values, metric?.scale, metric?.mid],
  );

  const mapData = React.useMemo(
    () =>
      regions
        .filter((r) => r.value != null)
        .map((r) => ({
          id: r.id,
          slug: r.slug,
          name: r.name,
          value: r.value as number,
        })),
    [regions],
  );

  const ranked = React.useMemo(
    () =>
      [...regions]
        .filter((r) => r.value != null)
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
    [regions],
  );

  const colorFor = React.useCallback(
    (v: number) => scale.color(v),
    [scale],
  );

  const legend = scale.legend.map((s) => ({
    label:
      metric?.id === "population"
        ? formatNumber(s.value, 0)
        : formatNumber(s.value, metric?.decimals ?? 2),
    color: s.color,
  }));

  const formatValue = React.useCallback(
    (v: number) => {
      if (!metric) return String(v);
      if (metric.id === "pop-growth") {
        return `${v > 0 ? "+" : ""}${formatNumber(v, 1)}%`;
      }
      if (metric.id === "population") return formatNumber(v, 0);
      return formatNumber(v, metric.decimals);
    },
    [metric],
  );

  const national =
    metric && activeYear != null
      ? metric.nationalByYear[activeYear]
      : null;

  const fitPaddingTopLeft = React.useMemo<[number, number]>(
    () => (panelOpen ? [8, 328] : [8, 8]),
    [panelOpen],
  );

  const selectCountry = (next: string) => {
    setIso3(next);
    setYear(null);
    setMetricId("tfr");
    // Keep the URL shareable without a Next navigation — that remounts the
    // page behind the root loading skeleton and leaves the map hidden.
    window.history.replaceState(null, "", `/maps/${next.toLowerCase()}`);
  };

  return (
    <div className="relative h-[calc(100dvh-3.75rem)] min-h-[32rem] overflow-hidden bg-[#9aa8b5] text-foreground">
      {country.geoUrl && mapData.length > 0 ? (
        <div className="absolute inset-0">
          {MapView ? (
            <MapView
              key={country.iso3}
              geoUrl={country.geoUrl}
              data={mapData}
              colorFor={colorFor}
              unit={metric?.unit ?? ""}
              decimals={metric?.decimals ?? 2}
              height="100%"
              className="h-full border-0 bg-[#9aa8b5]"
              fit="bounds"
              fitMaxZoom={country.iso3 === "RUS" ? 3.6 : 5.5}
              fitPaddingTopLeft={fitPaddingTopLeft}
              fitPaddingBottomRight={[40, 8]}
              navigate={Boolean(country.hrefPrefix)}
              hrefPrefix={country.hrefPrefix ?? "/state"}
              legend={legend}
              legendTitle={metric?.label ?? country.country}
              legendPlacement="bottom-right"
              formatValue={formatValue}
              revision={`${country.iso3}-${metric?.id}-${activeYear}-${panelOpen ? "p" : "f"}`}
              oceanColor="#9aa8b5"
              variant="light"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-black/40">
              Loading map…
            </div>
          )}
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-black/50">
          {country.note ?? "No regional layer for this country yet."}
        </div>
      )}

      {panelOpen ? (
        <aside className="absolute bottom-3 left-3 top-3 z-[1100] flex w-[min(100%-1.5rem,20rem)] flex-col overflow-hidden rounded-sm border border-black/10 bg-white/95 shadow-xl backdrop-blur-md sm:w-[20rem]">
          <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Regional maps
              </p>
              <h1 className="mt-0.5 font-serif text-xl font-semibold tracking-tight">
                {country.country}
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {country.kind}
                {activeYear != null
                  ? metric?.yearFrom
                    ? ` · ${metric.yearFrom}–${activeYear}`
                    : ` · ${activeYear}`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              aria-label="Hide panel"
              onClick={() => setPanelOpen(false)}
              className="shrink-0 rounded-sm px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Close
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div>
              <label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Country
              </label>
              <select
                className="mt-1.5 flex h-9 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                value={country.iso3}
                onChange={(e) => selectCountry(e.target.value)}
              >
                {atlas.map((c) => (
                  <option key={c.iso3} value={c.iso3}>
                    {c.country}
                    {c.metrics.length === 0 ? " (no layer yet)" : ""}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex flex-wrap gap-1">
                {atlas
                  .filter((c) =>
                    ["IND", "IRN", "RUS", "CHN", "USA"].includes(c.iso3),
                  )
                  .map((c) => (
                    <button
                      key={c.iso3}
                      type="button"
                      onClick={() => selectCountry(c.iso3)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px]",
                        c.iso3 === country.iso3
                          ? "bg-foreground text-background"
                          : "border border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {c.country}
                    </button>
                  ))}
              </div>
            </div>

            {national != null && metric && (
              <div>
                <p className="text-4xl font-semibold tabular-nums tracking-tight">
                  {formatValue(national)}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {country.country} · {metric.label}
                </p>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Indicator
              </p>
              {METRIC_ORDER.map((id) => {
                const m = metricOf(country, id);
                const locked = !m;
                const label =
                  id === "tfr"
                    ? "Total fertility rate"
                    : id === "population"
                      ? "Population"
                      : id === "pop-growth"
                        ? "Population change"
                        : "General fertility rate";
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={locked}
                    onClick={() => m && setMetricId(id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-left text-sm transition-colors",
                      m && id === metric?.id
                        ? "bg-foreground text-background"
                        : locked
                          ? "cursor-not-allowed text-muted-foreground/45"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span>{label}</span>
                    {locked ? (
                      <span className="text-[10px] uppercase tracking-wide">
                        n/a
                      </span>
                    ) : null}
                  </button>
                );
              })}
              <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
                Migration is not published as a comparable provincial series for
                these maps yet.
              </p>
            </div>

            {metric && metric.years.length > 1 && (
              <div>
                <label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Year
                </label>
                <select
                  className="mt-1.5 flex h-9 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                  value={activeYear ?? ""}
                  onChange={(e) => setYear(Number(e.target.value))}
                >
                  {metric.years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {country.note && (
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {country.note}
                {country.iso3 === "IRN" ? (
                  <>
                    {" "}
                    <a
                      href="/country/iran-islamic-rep"
                      className="underline underline-offset-2"
                    >
                      Iran country page
                    </a>
                    .
                  </>
                ) : null}
              </p>
            )}

            {ranked.length > 0 && (
              <>
                <dl className="text-[13px]">
                  <div className="border-t border-border py-2.5">
                    <dt className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Highest
                    </dt>
                    <dd className="mt-0.5">
                      {ranked[0].name}
                      <span className="ml-2 tabular-nums text-primary">
                        {formatValue(ranked[0].value!)}
                      </span>
                    </dd>
                  </div>
                  <div className="border-t border-border py-2.5">
                    <dt className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Lowest
                    </dt>
                    <dd className="mt-0.5">
                      {ranked[ranked.length - 1].name}
                      <span className="ml-2 tabular-nums text-primary">
                        {formatValue(ranked[ranked.length - 1].value!)}
                      </span>
                    </dd>
                  </div>
                </dl>
                <div>
                  <p className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Regions
                  </p>
                  <ol className="text-[13px]">
                    {ranked.slice(0, 24).map((r, i) => (
                      <li
                        key={r.id}
                        className="flex items-baseline justify-between gap-2 border-t border-border/70 py-1.5"
                      >
                        <span className="min-w-0 truncate">
                          <span className="mr-1.5 font-mono text-[10px] text-muted-foreground/60">
                            {i + 1}.
                          </span>
                          {r.name}
                        </span>
                        <span className="shrink-0 tabular-nums text-primary">
                          {formatValue(r.value!)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            )}

            {metric && activeYear != null && (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {metric.credit ? `${metric.credit} ` : null}
                <a
                  href={metric.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  {metric.sourceByYear[activeYear]}
                </a>
              </p>
            )}
          </div>
        </aside>
      ) : (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="absolute left-3 top-3 z-[1100] rounded-sm border border-black/10 bg-white/95 px-3 py-1.5 text-xs shadow-md"
        >
          Show panel
        </button>
      )}
    </div>
  );
}
