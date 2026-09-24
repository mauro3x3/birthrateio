"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { HistoricMapEntry } from "@/lib/sources/historic-maps-data";
import { buildClassedScale } from "@/lib/color-scale";
import { MAP_OCEAN } from "@/lib/map-path-style";
import { cn, formatCompact, formatNumber } from "@/lib/utils";

const RegionChoroplethMap = dynamic(
  () =>
    import("@/components/maps/region-choropleth-map").then(
      (m) => m.RegionChoroplethMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-full min-h-[24rem] items-center justify-center text-sm text-black/40"
        style={{ background: MAP_OCEAN.atlas }}
      >
        Loading map…
      </div>
    ),
  },
);

type HalfId = "cisleithania" | "transleithania" | "bosnia";
type ScopeId = "empire" | "austria" | "hungary";
type MetricId = "nationality" | "religion" | "population" | "density";

export type HistoricMapPack = {
  id: string;
  slug: string;
  title: string;
  year: number;
  mapMode: "plurality";
  primaryMetric?: "nationality" | "religion";
  note: string;
  source: string;
  sourceUrl: string;
  geoUrl: string;
  groups: { id: string; shortLabel: string; color: string }[];
  religionGroups?: { id: string; shortLabel: string; color: string }[];
  nationalShares?: Record<string, number>;
  nationalReligionShares?: Record<string, number>;
  halfTotals?: Partial<Record<HalfId, number>>;
  totalPopulation?: number;
  areas: {
    code: string;
    slug: string;
    name: string;
    plurality: string;
    nationality?: string | null;
    religion?: string;
    half?: string;
    adm0?: string;
    areaKm2?: number;
    density?: number;
    population: number;
    shares: Record<string, number>;
    religionShares?: Record<string, number>;
  }[];
};

const HALF_LABEL: Record<HalfId, string> = {
  cisleithania: "Austria (Cisleithania)",
  transleithania: "Hungary (Transleithania)",
  bosnia: "Bosnia (condominium)",
};

const SCOPE_HALVES: Record<ScopeId, HalfId[] | null> = {
  empire: null,
  austria: ["cisleithania"],
  hungary: ["transleithania"],
};

const FIT: Record<
  string,
  {
    clamp: { west: number; south: number; east: number; north: number };
    maxZoom: number;
  }
> = {
  "austria-hungary-1910": {
    clamp: { west: 8.5, south: 41.8, east: 27.5, north: 51.2 },
    maxZoom: 8.2,
  },
  "austria-hungary-1910:austria": {
    clamp: { west: 9.2, south: 44.2, east: 27.2, north: 51.2 },
    maxZoom: 8.4,
  },
  "austria-hungary-1910:hungary": {
    clamp: { west: 13.5, south: 44.5, east: 27.5, north: 50.0 },
    maxZoom: 8.4,
  },
  "russian-empire-1897": {
    clamp: { west: 19.5, south: 38.5, east: 150, north: 72 },
    maxZoom: 4.6,
  },
  "empires-1914": {
    clamp: { west: -25, south: 12, east: 120, north: 72 },
    maxZoom: 5.5,
  },
};

function isHalf(v: string | undefined): v is HalfId {
  return v === "cisleithania" || v === "transleithania" || v === "bosnia";
}

function areaInScope(
  half: string | undefined,
  scope: ScopeId,
): boolean {
  const allowed = SCOPE_HALVES[scope];
  if (!allowed) return true;
  return isHalf(half) && allowed.includes(half);
}

export function HistoricMapExplorer({
  meta,
  pack,
}: {
  meta: HistoricMapEntry;
  pack: HistoricMapPack;
}) {
  const isAh = pack.slug === "austria-hungary-1910";
  const hasReligion = Boolean(
    pack.religionGroups?.length ||
      pack.primaryMetric === "religion" ||
      pack.areas.some((a) => a.religion),
  );
  const hasNationality = Boolean(
    pack.primaryMetric !== "religion" ||
      pack.areas.some((a) => a.nationality),
  );
  const [showNames, setShowNames] = React.useState(false);
  const [showValues, setShowValues] = React.useState(false);
  const [selectedCode, setSelectedCode] = React.useState<string | null>(null);
  const [scope, setScope] = React.useState<ScopeId>("empire");
  const [metric, setMetric] = React.useState<MetricId>(
    pack.primaryMetric === "religion" ? "religion" : "nationality",
  );

  React.useEffect(() => {
    // Numbers on by default for pop/density so the layer is readable.
    if (metric === "population" || metric === "density") {
      setShowValues(true);
    } else {
      setShowValues(false);
    }
  }, [metric]);

  const formatPop = React.useCallback((v: number) => {
    if (v >= 1_000_000) return `${formatNumber(v / 1_000_000, 1)}M`;
    if (v >= 10_000) return `${formatNumber(v / 1_000, 0)}k`;
    if (v >= 1_000) return `${formatNumber(v / 1_000, 1)}k`;
    return formatNumber(v, 0);
  }, []);

  const formatDens = React.useCallback((v: number) => {
    if (v >= 100) return formatNumber(v, 0);
    if (v >= 10) return formatNumber(v, 1);
    return formatNumber(v, 1);
  }, []);

  const formatRange = React.useCallback(
    (lo: number, hi: number, kind: "population" | "density") => {
      const fmt = kind === "population" ? formatPop : formatDens;
      const unit = kind === "density" ? "/km²" : "";
      return `${fmt(lo)}–${fmt(hi)}${unit}`;
    },
    [formatPop, formatDens],
  );

  const groupById = React.useMemo(() => {
    const list =
      metric === "religion" && pack.religionGroups?.length
        ? pack.religionGroups
        : pack.groups;
    return new Map(list.map((g) => [g.id, g]));
  }, [pack.groups, pack.religionGroups, metric]);

  const activeGroups = React.useMemo(() => {
    if (metric === "religion" && pack.religionGroups?.length) {
      return pack.religionGroups;
    }
    return pack.groups;
  }, [metric, pack.groups, pack.religionGroups]);

  const areaGroupId = React.useCallback(
    (area: HistoricMapPack["areas"][number]) => {
      if (metric === "religion") {
        return area.religion ?? area.plurality;
      }
      return area.nationality ?? area.plurality;
    },
    [metric],
  );

  const digInShares = React.useCallback(
    (area: HistoricMapPack["areas"][number]) => {
      if (metric === "religion" && area.religionShares) {
        return area.religionShares;
      }
      return area.shares;
    },
    [metric],
  );

  const areaByCode = React.useMemo(() => {
    return new Map(pack.areas.map((a) => [a.code, a]));
  }, [pack.areas]);

  const scopedAreas = React.useMemo(() => {
    if (!isAh) return pack.areas;
    return pack.areas.filter((a) => areaInScope(a.half, scope));
  }, [isAh, pack.areas, scope]);

  const filterIds = React.useMemo(() => {
    if (!isAh || scope === "empire") return null;
    return scopedAreas.map((a) => a.code);
  }, [isAh, scope, scopedAreas]);

  React.useEffect(() => {
    if (!selectedCode) return;
    if (!scopedAreas.some((a) => a.code === selectedCode)) {
      setSelectedCode(null);
    }
  }, [scopedAreas, selectedCode]);

  const popScale = React.useMemo(() => {
    return buildClassedScale(
      scopedAreas.map((a) => a.population).filter((v) => v > 0),
      5,
    );
  }, [scopedAreas]);

  const densityScale = React.useMemo(() => {
    return buildClassedScale(
      scopedAreas
        .map((a) => a.density ?? 0)
        .filter((v) => Number.isFinite(v) && v > 0),
      5,
    );
  }, [scopedAreas]);

  const mapData = React.useMemo(
    () =>
      scopedAreas.map((a, i) => ({
        id: a.code,
        slug: a.slug,
        name: a.name,
        value:
          metric === "population"
            ? a.population
            : metric === "density"
              ? (a.density ?? 0)
              : i + 1,
      })),
    [scopedAreas, metric],
  );

  const fillForId = React.useCallback(
    (id: string) => {
      const area = areaByCode.get(id) ?? pack.areas.find((a) => a.slug === id);
      if (!area) return undefined;
      if (isAh && !areaInScope(area.half, scope)) return undefined;
      if (metric === "population") return popScale.color(area.population);
      if (metric === "density") {
        return area.density != null
          ? densityScale.color(area.density)
          : undefined;
      }
      return groupById.get(areaGroupId(area))?.color;
    },
    [
      areaByCode,
      pack.areas,
      isAh,
      scope,
      metric,
      popScale,
      densityScale,
      groupById,
      areaGroupId,
    ],
  );

  const legend = React.useMemo(() => {
    if (metric === "nationality" || metric === "religion") {
      return activeGroups.map((g) => ({
        label: g.shortLabel,
        color: g.color,
      }));
    }
    const scale = metric === "population" ? popScale : densityScale;
    return scale.ranges.map((r) => ({
      label: formatRange(
        r.lo,
        r.hi,
        metric === "population" ? "population" : "density",
      ),
      color: r.color,
    }));
  }, [metric, activeGroups, popScale, densityScale, formatRange]);

  const legendTitle =
    metric === "nationality"
      ? `${pack.year} majority`
      : metric === "religion"
        ? `${pack.year} religion`
        : metric === "population"
          ? "Population (quintiles)"
          : "People / km² (quintiles)";

  const formatValue = React.useCallback(
    (v: number) => {
      if (metric === "population") return formatPop(v);
      if (metric === "density") return `${formatDens(v)}/km²`;
      const area = scopedAreas[Math.round(v) - 1];
      if (!area) return "";
      const gid = areaGroupId(area);
      return groupById.get(gid)?.shortLabel ?? gid;
    },
    [scopedAreas, metric, groupById, areaGroupId, formatPop, formatDens],
  );

  const labelMode = React.useMemo(() => {
    if (showNames && showValues) return "name-value" as const;
    if (showNames) return "name" as const;
    if (showValues) return "value" as const;
    return "name" as const;
  }, [showNames, showValues]);

  const showLabels = showNames || showValues;

  const fitKey =
    isAh && scope !== "empire"
      ? `austria-hungary-1910:${scope}`
      : pack.slug;
  const fit = FIT[fitKey] ?? FIT[pack.slug] ?? FIT["austria-hungary-1910"]!;
  const selected = selectedCode ? areaByCode.get(selectedCode) : null;
  const selectedGroupId = selected ? areaGroupId(selected) : null;
  const selectedGroup = selectedGroupId
    ? groupById.get(selectedGroupId)
    : null;

  const selectedBreakdown = React.useMemo(() => {
    if (!selected) return [];
    const shares = digInShares(selected);
    return Object.entries(shares)
      .map(([id, share]) => ({
        group: groupById.get(id),
        id,
        share,
        pop: Math.round(share * (selected.population || 0)),
      }))
      .filter((r) => r.share > 0)
      .sort((a, b) => b.share - a.share);
  }, [selected, groupById, digInShares]);

  const nationalRows = React.useMemo(() => {
    const shares =
      metric === "religion"
        ? pack.nationalReligionShares ?? pack.nationalShares
        : pack.nationalShares;
    if (!shares) return [];
    return activeGroups
      .map((g) => ({
        group: g,
        share: shares[g.id] ?? 0,
      }))
      .filter((r) => r.share > 0)
      .sort((a, b) => b.share - a.share);
  }, [activeGroups, pack.nationalShares, pack.nationalReligionShares, metric]);

  const scopeEthnicRows = React.useMemo(() => {
    if (!isAh || scope === "empire" || metric === "religion") return nationalRows;
    const totals = new Map<string, number>();
    let sum = 0;
    for (const a of scopedAreas) {
      for (const [gid, share] of Object.entries(a.shares ?? {})) {
        const n = share * (a.population || 0);
        totals.set(gid, (totals.get(gid) ?? 0) + n);
        sum += n;
      }
    }
    if (sum <= 0) return [];
    return activeGroups
      .map((g) => ({
        group: g,
        share: (totals.get(g.id) ?? 0) / sum,
      }))
      .filter((r) => r.share > 0.005)
      .sort((a, b) => b.share - a.share);
  }, [isAh, scope, nationalRows, scopedAreas, activeGroups, metric]);

  const scopePop = React.useMemo(() => {
    if (!isAh) return pack.totalPopulation;
    if (scope === "empire") return pack.totalPopulation;
    return scopedAreas.reduce((s, a) => s + a.population, 0);
  }, [isAh, scope, pack.totalPopulation, scopedAreas]);

  const scopeHeading =
    scope === "empire"
      ? "Empire population (1910)"
      : scope === "austria"
        ? "Cisleithania (1910)"
        : "Transleithania (1910)";

  return (
    <div
      className="relative h-[calc(100dvh-3.75rem)] min-h-[32rem] overflow-hidden text-foreground"
      style={{ background: MAP_OCEAN.atlas }}
    >
      <div className="absolute inset-0">
        <RegionChoroplethMap
          geoUrl={pack.geoUrl}
          data={mapData}
          colorFor={() => "#ccc"}
          fillForId={fillForId}
          filterIds={filterIds}
          height="100%"
          className="h-full border-0"
          fit="bounds"
          fitMaxZoom={fit.maxZoom}
          fitClamp={fit.clamp}
          fitPaddingTopLeft={[28, 340]}
          fitPaddingBottomRight={[48, 12]}
          navigate={false}
          legend={legend}
          legendTitle={legendTitle}
          legendPlacement="bottom-right"
          revision={`${pack.slug}:${scope}:${metric}`}
          oceanColor={MAP_OCEAN.atlas}
          variant="light"
          formatValue={formatValue}
          showLabels={showLabels}
          labelMode={labelMode}
          selectedIds={selectedCode ? [selectedCode] : []}
          onRegionActivate={(d) =>
            setSelectedCode((prev) => (prev === d.id ? null : d.id))
          }
        />
      </div>

      <aside className="absolute bottom-3 left-3 top-3 z-[1100] flex w-[min(100%-1.5rem,20rem)] flex-col overflow-hidden rounded-sm border border-black/10 bg-white/95 shadow-xl backdrop-blur-md sm:w-[20rem]">
        <div className="border-b border-border px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Historic · {meta.empire} · {meta.year}
          </p>
          <h1 className="mt-0.5 font-serif text-xl font-semibold tracking-tight text-foreground">
            {pack.title}
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {pack.note}
          </p>
        </div>

        <div className="space-y-3 border-b border-border px-4 py-2.5">
          {isAh ? (
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Scope
              </p>
              <div className="mt-1.5 grid grid-cols-3 gap-1">
                {(
                  [
                    ["empire", "Empire"],
                    ["austria", "Austria"],
                    ["hungary", "Hungary"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setScope(id)}
                    className={cn(
                      "rounded-sm px-1.5 py-1.5 text-[0.7rem] font-medium transition-colors",
                      scope === id
                        ? "bg-foreground text-background"
                        : "bg-muted/60 text-foreground hover:bg-muted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Map layer
            </p>
            <div
              className={cn(
                "mt-1.5 grid gap-1",
                hasNationality && hasReligion
                  ? "grid-cols-2 sm:grid-cols-4"
                  : "grid-cols-3",
              )}
            >
              {(
                [
                  ...(hasNationality
                    ? ([["nationality", "Ethnicity"]] as const)
                    : []),
                  ...(hasReligion ? ([["religion", "Religion"]] as const) : []),
                  ["population", "Population"],
                  ["density", "Density"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMetric(id)}
                  className={cn(
                    "rounded-sm px-1.5 py-1.5 text-[0.7rem] font-medium transition-colors",
                    metric === id
                      ? "bg-foreground text-background"
                      : "bg-muted/60 text-foreground hover:bg-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2 border-b border-border px-4 py-2.5">
          <label className="flex items-center justify-between text-xs font-medium text-foreground">
            <span>Region names</span>
            <button
              type="button"
              role="switch"
              aria-checked={showNames}
              onClick={() => setShowNames((v) => !v)}
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors",
                showNames ? "bg-foreground" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                  showNames ? "left-4" : "left-0.5",
                )}
              />
            </button>
          </label>
          <label className="flex items-center justify-between text-xs font-medium text-foreground">
            <span>
              {metric === "density"
                ? "Density numbers"
                : metric === "population"
                  ? "Population numbers"
                  : "Values on map"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={showValues}
              onClick={() => setShowValues((v) => !v)}
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors",
                showValues ? "bg-foreground" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                  showValues ? "left-4" : "left-0.5",
                )}
              />
            </button>
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {selected ? (
            <div className="mb-4 rounded-sm border border-border bg-muted/30 px-3 py-2.5">
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                {isHalf(selected.half)
                  ? HALF_LABEL[selected.half]
                  : (selected.half ?? "Region")}
              </p>
              <p className="mt-0.5 font-serif text-lg font-semibold text-foreground">
                {selected.name}
              </p>
              {selectedGroup &&
              (metric === "nationality" || metric === "religion") ? (
                <p className="mt-1 flex items-center gap-2 text-sm">
                  <span
                    className="inline-block h-3 w-3 rounded-sm border border-black/10"
                    style={{ background: selectedGroup.color }}
                  />
                  {selectedGroup.shortLabel} majority
                </p>
              ) : null}
              {metric === "population" || metric === "density" ? (
                <p className="mt-1 text-sm tabular-nums text-foreground">
                  {metric === "population" ? (
                    <>Est. population {formatPop(selected.population)}</>
                  ) : (
                    <>
                      {formatDens(selected.density ?? 0)} people/km²
                      {selected.population > 0 ? (
                        <span className="text-muted-foreground">
                          {" "}
                          · {formatPop(selected.population)} people
                        </span>
                      ) : null}
                    </>
                  )}
                </p>
              ) : null}
              {selected.population > 0 &&
              metric !== "population" &&
              metric !== "density" ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Est. pop.{" "}
                  <span className="tabular-nums text-foreground">
                    {formatCompact(selected.population)}
                  </span>
                  {selected.density != null ? (
                    <>
                      {" · "}
                      <span className="tabular-nums text-foreground">
                        {formatNumber(selected.density, 0)}
                      </span>
                      /km²
                    </>
                  ) : null}
                  {selected.areaKm2 != null ? (
                    <>
                      {" · "}
                      <span className="tabular-nums">
                        {formatNumber(selected.areaKm2, 0)}
                      </span>{" "}
                      km²
                    </>
                  ) : null}
                </p>
              ) : null}

              {selectedBreakdown.length > 0 ? (
                <>
                  <p className="mt-3 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    {metric === "religion"
                      ? "Faith mix in this district"
                      : "Groups in this district"}
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {selectedBreakdown.map((row) => (
                      <li
                        key={row.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-sm border border-black/10"
                            style={{
                              background:
                                row.group?.color ?? "#95a5a6",
                            }}
                          />
                          <span className="truncate">
                            {row.group?.shortLabel ?? row.id}
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {(row.share * 100).toFixed(0)}%
                          {row.pop > 0 ? (
                            <span className="ml-1.5 text-[0.7rem]">
                              ({formatCompact(row.pop)})
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[0.65rem] leading-snug text-muted-foreground">
                    Illustrative mother-tongue mix for dig-in — not an official
                    1910 county table.
                  </p>
                </>
              ) : null}
            </div>
          ) : (
            <p className="mb-3 text-xs text-muted-foreground">
              Click a district for its group mix and population.
            </p>
          )}

          {(metric === "nationality" || metric === "religion") &&
          scopeEthnicRows.length > 0 ? (
            <>
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                {metric === "religion"
                  ? scope === "empire"
                    ? `Empire religion (${pack.year})`
                    : scopeHeading.replace("population", "religion")
                  : scopeHeading}
                {scopePop ? (
                  <span className="ml-1.5 font-normal normal-case tracking-normal text-muted-foreground/80">
                    · {formatCompact(scopePop)}
                  </span>
                ) : null}
              </p>
              <ul className="mt-2 space-y-1">
                {scopeEthnicRows.map(({ group, share }) => (
                  <li
                    key={group.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm border border-black/10"
                        style={{ background: group.color }}
                      />
                      <span className="truncate">{group.shortLabel}</span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {(share * 100).toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
              {isAh && scope === "empire" && pack.halfTotals ? (
                <div className="mt-3 border-t border-border/70 pt-2">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Dual Monarchy halves
                  </p>
                  <ul className="mt-1.5 space-y-1 text-xs">
                    {(
                      [
                        "cisleithania",
                        "transleithania",
                        "bosnia",
                      ] as const
                    ).map((h) => (
                      <li
                        key={h}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-muted-foreground">
                          {HALF_LABEL[h]}
                        </span>
                        <span className="tabular-nums">
                          {formatCompact(pack.halfTotals?.[h] ?? 0)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : metric === "population" || metric === "density" ? (
            <>
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                {metric === "population"
                  ? "Population layer"
                  : "Density layer"}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {metric === "population"
                  ? "Five equal-count classes (light → dark wine). Numbers toggle on by default. Totals scaled to ~51.4 million empire-wide."
                  : "Five equal-count density classes (people/km²). Cities and industrial belts fall in the darkest bin."}
                {scopePop ? (
                  <>
                    {" "}
                    Visible total:{" "}
                    <span className="tabular-nums text-foreground">
                      {formatCompact(scopePop)}
                    </span>
                    .
                  </>
                ) : null}
              </p>
            </>
          ) : (
            <>
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Legend
              </p>
              <ul className="mt-2 space-y-1.5">
                {pack.groups.map((g) => (
                  <li key={g.id} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-3 w-3 shrink-0 rounded-sm border border-black/10"
                      style={{ background: g.color }}
                    />
                    {g.shortLabel}
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="mt-4 text-xs text-muted-foreground">
            Source:{" "}
            <a
              href={pack.sourceUrl}
              className="link-editorial"
              target="_blank"
              rel="noreferrer"
            >
              {pack.source}
            </a>
          </p>
        </div>

        <div className="border-t border-border px-4 py-2.5 text-xs">
          <Link href="/maps/historic" className="link-editorial font-medium">
            ← All historic maps
          </Link>
        </div>
      </aside>
    </div>
  );
}
