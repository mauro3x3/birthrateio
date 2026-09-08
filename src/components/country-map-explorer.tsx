"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildColorScale } from "@/lib/color-scale";
import {
  getCountryMapAtlas,
  type CountryMapEntry,
  type CountryMapMetric,
  type CountryMapTab,
  type MapMetricId,
} from "@/lib/country-map-atlas";
import { MAP_OCEAN } from "@/lib/map-path-style";
import { downloadMapSharePng, mapShareUrl } from "@/lib/map-share-export";
import {
  REGIONAL_SHARES_SOURCE,
  REGIONAL_SHARES_SOURCE_URL,
  tidyCountryName,
} from "@/lib/regional-shares";
import { RegionSharePies } from "@/components/region-share-pies";
import { formatNumber, formatCompact, cn } from "@/lib/utils";

type MapComponent = typeof import("@/components/maps/region-choropleth-map").RegionChoroplethMap;

const METRIC_ORDER: MapMetricId[] = [
  "tfr",
  "population",
  "pop-growth",
  "gfr",
];

/** Default camera ignores overseas islands / Siberia so Download image frames the continent. */
const MAP_FIT_CLAMP: Partial<
  Record<string, { west: number; south: number; east: number; north: number }>
> = {
  EU: { west: -24.5, south: 35, east: 60, north: 71.6 },
  AFRICA: { west: -17.6, south: -35.2, east: 51.5, north: 37.5 },
};

function metricOf(
  metrics: CountryMapMetric[],
  id: MapMetricId,
): CountryMapMetric | undefined {
  return metrics.find((m) => m.id === id);
}

function displayTabsFor(country: CountryMapEntry): CountryMapTab[] | undefined {
  if (!country.shares) return country.mapTabs;
  const shareTab: CountryMapTab = {
    id: "shares",
    label: "Shares",
    geoUrl: "",
    kind: "shares",
    metrics: [],
    note: country.shares.year
      ? `World Bank population and crude birth rate, latest year (mostly ${country.shares.year}). Births are population × CBR / 1,000, not a civil-registration count.`
      : undefined,
  };
  if (country.mapTabs && country.mapTabs.length > 0) {
    return [...country.mapTabs, shareTab];
  }
  return [
    {
      id: "map",
      label: "Map",
      geoUrl: country.geoUrl,
      kind: country.kind,
      note: country.note,
      metrics: country.metrics,
    },
    shareTab,
  ];
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
  const [tabId, setTabId] = React.useState<string | null>(null);
  const [shareMetric, setShareMetric] = React.useState<"population" | "births">(
    "population",
  );
  const [variantId, setVariantId] = React.useState<string | null>(null);
  const [panelOpen, setPanelOpen] = React.useState(true);
  const [showValues, setShowValues] = React.useState(() => {
    const iso = initialIso3.toUpperCase();
    return iso !== "MENA" && iso !== "EU";
  });
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [combineSelection, setCombineSelection] = React.useState(true);
  const [MapView, setMapView] = React.useState<MapComponent | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const [exportWhenPanelOpens, setExportWhenPanelOpens] = React.useState(false);
  const frameRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();

  React.useEffect(() => {
    setIso3(initialIso3.toUpperCase());
  }, [initialIso3]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedIds([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
  const tabs = displayTabsFor(country);
  const activeTab = tabs?.find((t) => t.id === tabId) ?? tabs?.[0];
  const shareMode = activeTab?.kind === "shares" && country.shares != null;
  const viewMetrics = shareMode ? [] : (activeTab?.metrics ?? country.metrics);
  const geoUrl = shareMode ? "" : (activeTab?.geoUrl ?? country.geoUrl);
  const kind = activeTab?.kind ?? country.kind;
  const note = activeTab?.note ?? country.note;

  React.useEffect(() => {
    setSelectedIds([]);
    setTabId(null);
    setVariantId(null);
    setShareMetric("population");
  }, [iso3]);

  React.useEffect(() => {
    setShowValues(
      !(
        kind === "province" &&
        (country.iso3 === "MENA" || country.iso3 === "EU")
      ),
    );
  }, [country.iso3, kind]);

  React.useEffect(() => {
    const available = viewMetrics.map((m) => m.id);
    if (!available.includes(metricId)) {
      setMetricId(available[0] ?? "tfr");
    }
  }, [country, viewMetrics, metricId]);

  const metric = metricOf(viewMetrics, metricId) ?? viewMetrics[0];
  const variant =
    metric?.variants?.find((v) => v.id === variantId) ?? metric?.variants?.[0];
  const valuesByYear = variant?.valuesByYear ?? metric?.valuesByYear;
  const nationalByYear = variant?.nationalByYear ?? metric?.nationalByYear;
  const years = variant
    ? Object.keys(variant.valuesByYear)
        .map(Number)
        .sort((a, b) => b - a)
    : (metric?.years ?? []);
  const activeYear = metric
    ? (year && years.includes(year) ? year : years[0])
    : null;

  React.useEffect(() => {
    if (metric && activeYear != null) setYear(activeYear);
  }, [metric, activeYear]);

  const regions = metric && activeYear != null
    ? (valuesByYear?.[activeYear] ?? [])
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

  const shareRows = React.useMemo(() => {
    if (!country.shares) return [];
    return [...country.shares.countries]
      .map((c) => ({
        id: c.iso3,
        slug: c.iso3.toLowerCase(),
        name: tidyCountryName(c.name),
        value:
          shareMetric === "births"
            ? (c.births ?? null)
            : c.population,
      }))
      .filter((r) => r.value != null)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  }, [country.shares, shareMetric]);

  const shareTotal = shareRows.reduce((s, r) => s + (r.value ?? 0), 0);
  const panelRows = shareMode ? shareRows : ranked;

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

  const selectedRegions = React.useMemo(() => {
    if (selectedIds.length === 0) return [];
    const by = new Map(regions.map((r) => [r.id, r]));
    return selectedIds
      .map((id) => by.get(id))
      .filter((r): r is NonNullable<typeof r> => r != null && r.value != null);
  }, [regions, selectedIds]);

  const additiveMetric = metric?.id === "population";
  const selectedAggregate = React.useMemo(() => {
    if (selectedRegions.length === 0) return null;
    const vals = selectedRegions.map((r) => r.value as number);
    if (additiveMetric) return vals.reduce((a, b) => a + b, 0);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [additiveMetric, selectedRegions]);

  const onRegionActivate = React.useCallback(
    (
      datum: { id: string; slug: string; name: string; value: number },
      event: { shiftKey: boolean },
    ) => {
      if (event.shiftKey) {
        setSelectedIds((prev) =>
          prev.includes(datum.id)
            ? prev.filter((id) => id !== datum.id)
            : [...prev, datum.id],
        );
        return;
      }
      if (country.hrefPrefix && datum.slug) {
        router.push(`${country.hrefPrefix}/${datum.slug}`);
      }
    },
    [country.hrefPrefix, router],
  );

  const national =
    metric && activeYear != null
      ? (nationalByYear?.[activeYear] ?? null)
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

  const shareUrl = mapShareUrl(country.iso3);
  const exportingRef = React.useRef(false);

  const captureSharePng = React.useCallback(async () => {
    const node = frameRef.current;
    if (!node || exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    try {
      await downloadMapSharePng({
        node,
        iso3: country.iso3,
        background: MAP_OCEAN.atlas,
      });
    } catch (err) {
      console.error("Map PNG export failed", err);
    } finally {
      exportingRef.current = false;
      setExporting(false);
    }
  }, [country.iso3]);

  const requestSharePng = React.useCallback(() => {
    if (!panelOpen) {
      setExportWhenPanelOpens(true);
      setPanelOpen(true);
      return;
    }
    void captureSharePng();
  }, [captureSharePng, panelOpen]);

  React.useEffect(() => {
    if (!exportWhenPanelOpens || !panelOpen) return;
    const t = window.setTimeout(() => {
      setExportWhenPanelOpens(false);
      void captureSharePng();
    }, 450);
    return () => window.clearTimeout(t);
  }, [captureSharePng, exportWhenPanelOpens, panelOpen]);

  return (
    <div
      ref={frameRef}
      className="br-map-share relative h-[calc(100dvh-3.75rem)] min-h-[32rem] overflow-hidden text-foreground"
      style={{ background: MAP_OCEAN.atlas }}
    >
      {geoUrl && mapData.length > 0 && !shareMode ? (
        <div className="br-map-canvas absolute inset-0">
          {MapView ? (
            <MapView
              key={`${country.iso3}-${geoUrl}-${variant?.id ?? "base"}`}
              geoUrl={geoUrl}
              data={mapData}
              colorFor={colorFor}
              unit={metric?.unit ?? ""}
              decimals={metric?.decimals ?? 2}
              height="100%"
              className="h-full border-0"
              fit={country.iso3 === "USA" ? "usa" : "bounds"}
              fitMaxZoom={
                {
                  RUS: 3.6,
                  AFRICA: 4.5,
                  EU: 4.15,
                  SOUTHAMERICA: 2.9,
                  MENA: 3.2,
                  SAU: 5.8,
                  YEM: 5.6,
                  JOR: 6.4,
                  CARIBBEAN: 4.8,
                  SEASIA: 3.4,
                  CENTRALAMERICA: 4.4,
                  CENTRALASIA: 4.0,
                  NORTHAMERICA: 2.7,
                  OCEANIA: 2.35,
                  BRA: 4.0,
                  IDN: 4.2,
                  NGA: 5.3,
                  KEN: 5.8,
                  AGO: 5.2,
                  PHL: 5.4,
                  GHA: 6.2,
                  TZA: 5.0,
                  ZAF: 5.4,
                  NPL: 6.4,
                  ZMB: 5.4,
                  MOZ: 5.0,
                  SEN: 6.2,
                  MLI: 5.0,
                  BFA: 6.0,
                  BGD: 6.4,
                  KHM: 6.0,
                  TJK: 6.2,
                  MWI: 6.4,
                }[country.iso3] ?? 5.5
              }
              fitPaddingTopLeft={fitPaddingTopLeft}
              fitPaddingBottomRight={[40, 8]}
              fitClamp={MAP_FIT_CLAMP[country.iso3] ?? null}
              navigate={Boolean(country.hrefPrefix)}
              hrefPrefix={country.hrefPrefix ?? "/state"}
              legend={legend}
              legendTitle={metric?.label ?? country.country}
              legendPlacement="bottom-right"
              formatValue={formatValue}
              revision={`${country.iso3}-${geoUrl}-${metric?.id}-${variant?.id ?? "base"}-${activeYear}-${panelOpen ? "p" : "f"}`}
              oceanColor={MAP_OCEAN.atlas}
              variant="light"
              adaptiveStroke={country.iso3 !== "USA"}
              showLabels={showValues}
              selectedIds={selectedIds}
              onRegionActivate={onRegionActivate}
              combineSelection={combineSelection}
              selectedValue={selectedAggregate}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-black/40">
              Loading map…
            </div>
          )}
        </div>
      ) : shareMode && country.shares ? (
        <div className="br-map-canvas absolute inset-0 overflow-auto bg-white">
          <RegionSharePies region={country.shares} />
        </div>
      ) : (
        <div className="br-map-canvas absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-black/50">
          {note ?? "No regional layer for this country yet."}
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
                {shareMode
                  ? `shares · ${country.shares?.year ?? ""}`
                  : kind}
                {!shareMode && activeYear != null
                  ? metric?.yearFrom
                    ? ` · ${metric.yearFrom}–${activeYear}`
                    : ` · ${activeYear}`
                  : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-start gap-1">
              <button
                type="button"
                data-export-ignore
                disabled={exporting}
                onClick={requestSharePng}
                className="rounded-sm px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60"
              >
                {exporting ? "Saving…" : "Download image"}
              </button>
              <button
                type="button"
                data-export-ignore
                aria-label="Hide panel"
                onClick={() => setPanelOpen(false)}
                className="shrink-0 rounded-sm px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Close
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div data-export-ignore>
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
                    [
                      "IND",
                      "PAK",
                      "NGA",
                      "BRA",
                      "IDN",
                      "EU",
                      "MENA",
                      "SAU",
                      "MAR",
                      "JOR",
                      "YEM",
                      "AFRICA",
                      "CARIBBEAN",
                      "SOUTHAMERICA",
                      "JPN",
                      "DEU",
                      "TUR",
                      "USA",
                    ].includes(c.iso3),
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

            {tabs && tabs.length > 1 && (
              <div data-export-ignore>
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Geography
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {tabs.map((tab) => {
                    const on =
                      tab.id === (activeTab?.id ?? tabs[0]?.id);
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setTabId(tab.id);
                          setSelectedIds([]);
                          setYear(null);
                        }}
                        className={cn(
                          "flex-1 rounded-sm border px-2 py-1.5 text-xs transition-colors",
                          on
                            ? "border-foreground bg-foreground text-background"
                            : "border-input text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {(shareMode ? shareTotal > 0 : national != null && metric) && (
              <div className="br-map-share-tfr">
                <p className="br-map-share-tfr-value font-serif text-4xl font-semibold tabular-nums tracking-tight">
                  {shareMode
                    ? formatCompact(shareTotal)
                    : formatValue(national as number)}
                </p>
                <p className="br-map-share-tfr-label mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {shareMode
                    ? `${country.country} · ${
                        shareMetric === "births"
                          ? "Estimated births"
                          : "Population"
                      }`
                    : `${country.country} · ${metric?.label}`}
                </p>
              </div>
            )}

            <div data-export-ignore className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Indicator
              </p>
              {shareMode ? (
                <>
                  {(
                    [
                      ["population", "Population"],
                      ["births", "Births"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setShareMetric(id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-left text-sm transition-colors",
                        id === shareMetric
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <span>{label}</span>
                    </button>
                  ))}
                  <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
                    Births are estimated from the crude birth rate, so a younger
                    population can account for more of the region’s births than
                    of its residents.
                  </p>
                </>
              ) : (
                <>
              {METRIC_ORDER.map((id) => {
                const m = metricOf(viewMetrics, id);
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
                </>
              )}
            </div>

            {metric?.variants && metric.variants.length > 1 && (
              <div data-export-ignore>
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Women counted
                </p>
                <div className="mt-1.5 flex flex-col gap-1">
                  {metric.variants.map((v) => {
                    const on = v.id === (variant?.id ?? metric.variants?.[0]?.id);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        role="switch"
                        aria-checked={on}
                        onClick={() => setVariantId(v.id)}
                        className={cn(
                          "flex h-9 w-full items-center justify-between rounded-sm border px-3 text-sm transition-colors",
                          on
                            ? "border-foreground bg-foreground text-background"
                            : "border-input bg-background text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <span>{v.label}</span>
                      </button>
                    );
                  })}
                </div>
                {country.iso3 === "SAU" ? (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    Saudi women only drops non-Saudi residents. That is the
                    published census split, not a modelled residual. Non-Saudi
                    TFR was 0.91 nationally in 2022.
                  </p>
                ) : null}
              </div>
            )}

            {metric && years.length > 1 && (
              <div data-export-ignore>
                <label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Year
                </label>
                <select
                  className="mt-1.5 flex h-9 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                  value={activeYear ?? ""}
                  onChange={(e) => setYear(Number(e.target.value))}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!shareMode && (
            <div data-export-ignore>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Labels
              </p>
              <button
                type="button"
                role="switch"
                aria-checked={showValues}
                onClick={() => setShowValues((v) => !v)}
                className={cn(
                  "mt-1.5 flex h-9 w-full items-center justify-between rounded-sm border px-3 text-sm transition-colors",
                  showValues
                    ? "border-foreground bg-foreground text-background"
                    : "border-input bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                <span>Values on map</span>
                <span className="text-[10px] uppercase tracking-[0.14em]">
                  {showValues ? "On" : "Off"}
                </span>
              </button>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                Shift-click regions on the map to add them up.
              </p>
            </div>
            )}

            {selectedRegions.length > 0 && selectedAggregate != null && (
              <div className="border-t border-border pt-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Selection
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
                <p className="mt-1.5 text-3xl font-semibold tabular-nums tracking-tight">
                  {formatValue(selectedAggregate)}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {additiveMetric ? "Sum" : "Average"} of{" "}
                  {selectedRegions.length} selected
                </p>
                <div data-export-ignore>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={combineSelection}
                    onClick={() => setCombineSelection((v) => !v)}
                    className={cn(
                      "mt-2.5 flex h-9 w-full items-center justify-between rounded-sm border px-3 text-sm transition-colors",
                      combineSelection
                        ? "border-foreground bg-foreground text-background"
                        : "border-input bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span>One area on map</span>
                    <span className="text-[10px] uppercase tracking-[0.14em]">
                      {combineSelection ? "On" : "Off"}
                    </span>
                  </button>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    Merges the selection into a single shape for screenshots.
                  </p>
                </div>
                <ul className="mt-2 text-[13px]">
                  {selectedRegions.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-baseline justify-between gap-2 border-t border-border/70 py-1.5"
                    >
                      <span className="min-w-0 truncate">{r.name}</span>
                      <span className="shrink-0 tabular-nums text-primary">
                        {formatValue(r.value!)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {note && (
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {note}
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

            {panelRows.length > 0 && (
              <>
                <dl className="text-[13px]">
                  <div className="border-t border-border py-2.5">
                    <dt className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Highest
                    </dt>
                    <dd className="mt-0.5">
                      {panelRows[0].name}
                      <span className="ml-2 tabular-nums text-primary">
                        {shareMode
                          ? `${formatCompact(panelRows[0].value!)} · ${(
                              ((panelRows[0].value ?? 0) / shareTotal) *
                              100
                            ).toFixed(1)}%`
                          : formatValue(panelRows[0].value!)}
                      </span>
                    </dd>
                  </div>
                  <div className="border-t border-border py-2.5">
                    <dt className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Lowest
                    </dt>
                    <dd className="mt-0.5">
                      {panelRows[panelRows.length - 1].name}
                      <span className="ml-2 tabular-nums text-primary">
                        {shareMode
                          ? formatCompact(panelRows[panelRows.length - 1].value!)
                          : formatValue(panelRows[panelRows.length - 1].value!)}
                      </span>
                    </dd>
                  </div>
                </dl>
                <div>
                  <p className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {shareMode ? "Countries" : "Regions"}
                  </p>
                  <ol className="text-[13px]">
                    {panelRows.slice(0, 24).map((r, i) => (
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
                          {shareMode
                            ? `${formatCompact(r.value!)}${
                                shareTotal
                                  ? ` · ${((r.value! / shareTotal) * 100).toFixed(1)}%`
                                  : ""
                              }`
                            : formatValue(r.value!)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            )}

            {shareMode ? (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                <a
                  href={REGIONAL_SHARES_SOURCE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  {REGIONAL_SHARES_SOURCE}
                </a>
              </p>
            ) : metric && activeYear != null ? (
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
                .{" "}
                <Link
                  data-export-ignore
                  href="/demographics"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Census maps
                </Link>
                .
              </p>
            ) : null}
          </div>
        </aside>
      ) : (
        <>
          <div
            data-export-ignore
            className="absolute left-3 top-3 z-[1100] flex gap-2"
          >
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              className="rounded-sm border border-black/10 bg-white/95 px-3 py-1.5 text-xs shadow-md"
            >
              Show panel
            </button>
            <button
              type="button"
              disabled={exporting}
              onClick={requestSharePng}
              className="rounded-sm border border-black/10 bg-white/95 px-3 py-1.5 text-xs shadow-md disabled:opacity-60"
            >
              {exporting ? "Saving…" : "Download image"}
            </button>
          </div>
          {selectedRegions.length > 0 && selectedAggregate != null ? (
            <div className="absolute left-3 top-12 z-[1100] w-[min(100%-1.5rem,18rem)] rounded-sm border border-black/10 bg-white/95 px-3 py-2.5 shadow-md">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {additiveMetric ? "Sum" : "Average"} · {selectedRegions.length}{" "}
                  selected
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
              <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
                {formatValue(selectedAggregate)}
              </p>
            </div>
          ) : null}
        </>
      )}

      <p className="br-map-share-url absolute right-3 top-3 z-[1100] rounded-sm border border-black/10 bg-white/95 px-3.5 py-2 font-serif text-base font-semibold tracking-tight text-foreground shadow-md">
        {shareUrl}
      </p>
    </div>
  );
}
