"use client";

import * as React from "react";
import type { Feature, FeatureCollection, GeoJsonObject } from "geojson";
import type { CountryMapEntry } from "@/lib/country-map-atlas";
import { buildColorScale } from "@/lib/color-scale";
import { downloadMapSharePng } from "@/lib/map-share-export";
import {
  CountryMultiSelect,
  type CountryOption,
} from "@/components/country-multi-select";
import { cn, formatNumber } from "@/lib/utils";

type MapComponent = typeof import("@/components/maps/region-choropleth-map").RegionChoroplethMap;

type GroupDef = {
  id: string;
  name: string;
  color: string;
};

type BaseMode = "density" | "population" | "blank";

const DEFAULT_GROUPS: GroupDef[] = [
  { id: "a", name: "Group A", color: "#1e3a5f" },
  { id: "b", name: "Group B", color: "#c23b2e" },
  { id: "c", name: "Group C", color: "#c9a227" },
];

const PRESETS: {
  id: string;
  label: string;
  iso3s: string[];
  title: string;
  groups?: GroupDef[];
}[] = [
  {
    id: "rus-chn",
    label: "Russia ↔ China",
    iso3s: ["RUS", "CHN"],
    title: "Russia’s Far East vs northern China",
    groups: [
      { id: "a", name: "Eastern Siberia / Far East", color: "#1e3a5f" },
      { id: "b", name: "Northern China", color: "#c23b2e" },
      { id: "c", name: "Other", color: "#c9a227" },
    ],
  },
  {
    id: "usa",
    label: "United States",
    iso3s: ["USA"],
    title: "US states — paint your own groups",
  },
  {
    id: "chn",
    label: "China",
    iso3s: ["CHN"],
    title: "Chinese provinces — paint your own groups",
  },
  {
    id: "deu",
    label: "Germany",
    iso3s: ["DEU"],
    title: "German Länder — paint your own groups",
  },
  {
    id: "rus",
    label: "Russia",
    iso3s: ["RUS"],
    title: "Russian federal subjects — paint your own groups",
  },
];

function latestPopulation(entry: CountryMapEntry): {
  year: number;
  regions: { id: string; slug: string; name: string; value: number }[];
  source: string | null;
} | null {
  const metric = entry.metrics.find((m) => m.id === "population");
  if (!metric?.years.length) return null;
  const year = metric.years[0]!;
  const regions = (metric.valuesByYear[year] ?? [])
    .filter((r) => r.value != null && Number.isFinite(r.value))
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      value: r.value as number,
    }));
  if (regions.length === 0) return null;
  return {
    year,
    regions,
    source: metric.sourceByYear[year] ?? null,
  };
}

function formatPeople(n: number): string {
  if (n >= 1_000_000_000) return `${formatNumber(n / 1_000_000_000, 1)}b`;
  if (n >= 1_000_000) return `${formatNumber(n / 1_000_000, 1)}m`;
  if (n >= 10_000) return `${formatNumber(n / 1000, 0)}k`;
  return formatNumber(n, 0);
}

function ringAreaKm2(ring: number[][]): number {
  if (ring.length < 3) return 0;
  let a = 0;
  let latSum = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[(i + 1) % n]!;
    a += x1 * y2 - x2 * y1;
    latSum += y1;
  }
  const meanLat = latSum / ring.length;
  const kmPerDegLat = 110.574;
  const kmPerDegLng = 111.32 * Math.cos((meanLat * Math.PI) / 180);
  return (Math.abs(a) / 2) * kmPerDegLat * Math.abs(kmPerDegLng);
}

function featureAreaKm2(feature: Feature): number {
  const g = feature.geometry as { type?: string; coordinates?: unknown } | null;
  if (!g?.coordinates) return 0;
  if (g.type === "Polygon") {
    const ring = (g.coordinates as number[][][])[0];
    return ring ? ringAreaKm2(ring) : 0;
  }
  if (g.type === "MultiPolygon") {
    return (g.coordinates as number[][][][]).reduce(
      (sum, poly) => sum + (poly[0] ? ringAreaKm2(poly[0]) : 0),
      0,
    );
  }
  return 0;
}

function featureSlug(feature: Feature): string | undefined {
  const p = (feature.properties ?? {}) as Record<string, unknown>;
  if (typeof p.slug === "string" && p.slug) return p.slug;
  return undefined;
}

export function PopulationRegionCompare({
  atlas,
  countryOptions,
}: {
  atlas: CountryMapEntry[];
  countryOptions: CountryOption[];
}) {
  const byIso = React.useMemo(
    () => new Map(atlas.map((c) => [c.iso3, c])),
    [atlas],
  );

  const availableIso3 = React.useMemo(
    () =>
      atlas
        .filter((c) => latestPopulation(c))
        .map((c) => c.iso3)
        .sort(),
    [atlas],
  );

  const optionByIso = React.useMemo(() => {
    const m = new Map<string, CountryOption>();
    for (const o of countryOptions) {
      // options use iso3 as slug
      m.set(o.slug, o);
    }
    for (const iso of availableIso3) {
      if (!m.has(iso)) {
        const entry = byIso.get(iso);
        m.set(iso, {
          slug: iso,
          name: entry?.country ?? iso,
          flagEmoji: null,
        });
      }
    }
    return m;
  }, [countryOptions, availableIso3, byIso]);

  const selectOptions = React.useMemo(
    () =>
      availableIso3
        .map((iso) => optionByIso.get(iso)!)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [availableIso3, optionByIso],
  );

  const [selectedIso3s, setSelectedIso3s] = React.useState<string[]>(() =>
    availableIso3.includes("RUS") && availableIso3.includes("CHN")
      ? ["RUS", "CHN"]
      : availableIso3.slice(0, 2),
  );
  const [groups, setGroups] = React.useState<GroupDef[]>(() =>
    DEFAULT_GROUPS.map((g) => ({ ...g })),
  );
  const [activeGroupId, setActiveGroupId] = React.useState("a");
  const [membership, setMembership] = React.useState<Record<string, string>>(
    {},
  );
  const [title, setTitle] = React.useState(
    "Russia’s Far East vs northern China",
  );
  const [baseMode, setBaseMode] = React.useState<BaseMode>("density");
  const [showNumbers, setShowNumbers] = React.useState(false);
  const [MapView, setMapView] = React.useState<MapComponent | null>(null);
  const [geoData, setGeoData] = React.useState<FeatureCollection | null>(null);
  const [areaById, setAreaById] = React.useState<Record<string, number>>({});
  const [exporting, setExporting] = React.useState(false);
  const frameRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let cancelled = false;
    import("@/components/maps/region-choropleth-map").then((m) => {
      if (!cancelled) setMapView(() => m.RegionChoroplethMap);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (selectedIso3s.length === 0) {
      setGeoData(null);
      setAreaById({});
      return;
    }
    let cancelled = false;
    const entries = selectedIso3s
      .map((iso) => byIso.get(iso))
      .filter((e): e is CountryMapEntry => e != null);

    Promise.all(
      entries.map(async (e) => {
        const res = await fetch(e.geoUrl);
        return (await res.json()) as FeatureCollection;
      }),
    ).then((fcs) => {
      if (cancelled) return;
      const features = fcs
        .flatMap((fc) => fc.features ?? [])
        .filter((f) => Boolean(featureSlug(f)));
      const areas: Record<string, number> = {};
      for (const f of features) {
        const slug = featureSlug(f);
        if (!slug) continue;
        const a = featureAreaKm2(f);
        if (a > 0) areas[slug] = a;
      }
      setAreaById(areas);
      setGeoData({ type: "FeatureCollection", features });
    });

    return () => {
      cancelled = true;
    };
  }, [selectedIso3s, byIso]);

  const popPack = React.useMemo(() => {
    const regions: {
      id: string;
      slug: string;
      name: string;
      value: number;
    }[] = [];
    let year: number | null = null;
    const sources: string[] = [];
    for (const iso of selectedIso3s) {
      const entry = byIso.get(iso);
      if (!entry) continue;
      const pack = latestPopulation(entry);
      if (!pack) continue;
      year = year == null ? pack.year : Math.min(year, pack.year);
      regions.push(...pack.regions);
      if (pack.source) sources.push(`${entry.country}: ${pack.source}`);
    }
    if (!regions.length || year == null) return null;
    return { year, regions, sources };
  }, [selectedIso3s, byIso]);

  const densityById = React.useMemo(() => {
    const out = new Map<string, number>();
    if (!popPack) return out;
    for (const r of popPack.regions) {
      const area = areaById[r.id];
      if (area && area > 1) out.set(r.id, r.value / area);
    }
    return out;
  }, [popPack, areaById]);

  const popScale = React.useMemo(() => {
    const vals = popPack?.regions.map((r) => r.value) ?? [];
    return buildColorScale(vals, "sequential-log");
  }, [popPack]);

  const densityScale = React.useMemo(() => {
    const vals = [...densityById.values()];
    return buildColorScale(vals, "sequential-log");
  }, [densityById]);

  const groupTotals = React.useMemo(() => {
    const byId = new Map(popPack?.regions.map((r) => [r.id, r]) ?? []);
    return groups.map((g) => {
      const ids = Object.entries(membership)
        .filter(([, gid]) => gid === g.id)
        .map(([id]) => id);
      const members = ids
        .map((id) => byId.get(id))
        .filter((r): r is NonNullable<typeof r> => r != null);
      const total = members.reduce((s, r) => s + r.value, 0);
      return { ...g, count: members.length, total, members };
    });
  }, [groups, membership, popPack]);

  const fillForId = React.useCallback(
    (id: string) => {
      const gid = membership[id];
      if (gid) return groups.find((g) => g.id === gid)?.color;
      if (baseMode === "blank") return undefined;
      if (baseMode === "density") {
        const d = densityById.get(id);
        return d != null ? densityScale.color(d) : undefined;
      }
      const pop = popPack?.regions.find((r) => r.id === id)?.value;
      return pop != null ? popScale.color(pop) : undefined;
    },
    [
      membership,
      groups,
      baseMode,
      densityById,
      densityScale,
      popPack,
      popScale,
    ],
  );

  const onRegionActivate = React.useCallback(
    (datum: { id: string }) => {
      setMembership((prev) => {
        const cur = prev[datum.id];
        if (cur === activeGroupId) {
          const next = { ...prev };
          delete next[datum.id];
          return next;
        }
        return { ...prev, [datum.id]: activeGroupId };
      });
    },
    [activeGroupId],
  );

  const colorFor = React.useCallback(() => "#dce2e8", []);

  const applyPreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const iso3s = preset.iso3s.filter((iso) => availableIso3.includes(iso));
    if (!iso3s.length) return;
    setSelectedIso3s(iso3s);
    setMembership({});
    setTitle(preset.title);
    setGroups(
      (preset.groups ?? DEFAULT_GROUPS).map((g) => ({ ...g })),
    );
    setActiveGroupId("a");
  };

  const onCountriesChange = (iso3s: string[]) => {
    setSelectedIso3s(iso3s);
    setMembership({});
    if (iso3s.length === 0) {
      setTitle("Compare regional populations");
      return;
    }
    const names = iso3s.map((iso) => optionByIso.get(iso)?.name ?? iso);
    setTitle(
      names.length === 1
        ? `${names[0]} — paint your own groups`
        : `${names.join(" · ")} — paint groups`,
    );
    setGroups(DEFAULT_GROUPS.map((g) => ({ ...g })));
    setActiveGroupId("a");
  };

  const renameGroup = (id: string, name: string) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name } : g)));
  };

  const clearGroup = (id: string) => {
    setMembership((prev) => {
      const next = { ...prev };
      for (const [rid, gid] of Object.entries(next)) {
        if (gid === id) delete next[rid];
      }
      return next;
    });
  };

  const clearAll = () => setMembership({});

  const onExport = async () => {
    if (!frameRef.current || exporting) return;
    setExporting(true);
    try {
      await downloadMapSharePng({
        node: frameRef.current,
        iso3: selectedIso3s.join("-") || "compare",
        background: "#f8fafc",
      });
    } finally {
      setExporting(false);
    }
  };

  const activePresetId = PRESETS.find(
    (p) =>
      p.iso3s.length === selectedIso3s.length &&
      p.iso3s.every((iso) => selectedIso3s.includes(iso)),
  )?.id;

  if (availableIso3.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Population-by-region data is not available yet.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Presets
          </span>
          {PRESETS.filter((p) =>
            p.iso3s.every((iso) => availableIso3.includes(iso)),
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={cn(
                "border px-2.5 py-1 text-xs transition-colors",
                activePresetId === p.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Countries
            </p>
            <CountryMultiSelect
              options={selectOptions}
              selected={selectedIso3s}
              onChange={onCountriesChange}
              max={4}
              colored={false}
              addLabel="Add country"
              searchPlaceholder="Type a country…"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 border border-border p-0.5">
            {(
              [
                ["density", "Density"],
                ["population", "Population"],
                ["blank", "Paint only"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setBaseMode(id)}
                className={cn(
                  "px-2.5 py-1 text-xs transition-colors",
                  baseMode === id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="size-3.5 accent-foreground"
              checked={showNumbers}
              onChange={(e) => setShowNumbers(e.target.checked)}
            />
            Show numbers on map
          </label>
          {popPack && (
            <span className="text-xs text-muted-foreground">
              Year {popPack.year} · click a region to paint
            </span>
          )}
        </div>
      </div>

      {!popPack || selectedIso3s.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add at least one country with regional population data.
        </p>
      ) : (
        <>
          <div
            ref={frameRef}
            className="relative overflow-hidden border border-border bg-slate-50"
          >
            <div className="flex flex-col gap-3 border-b border-border bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                className="w-full border-0 bg-transparent text-lg font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-label="Map title"
              />
              <div
                className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 text-sm"
                data-export-keep
              >
                {groupTotals
                  .filter((g) => g.count > 0)
                  .map((g) => (
                    <span key={g.id} className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0"
                        style={{ background: g.color }}
                      />
                      <span className="text-muted-foreground">{g.name}:</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatPeople(g.total)}
                      </span>
                    </span>
                  ))}
              </div>
            </div>

            <div className="relative min-h-[420px] lg:min-h-[560px]">
              {MapView && geoData ? (
                <MapView
                  geoData={geoData as GeoJsonObject}
                  data={popPack.regions}
                  colorFor={colorFor}
                  fillForId={fillForId}
                  unit="people"
                  decimals={0}
                  height="100%"
                  className="absolute inset-0 min-h-[420px] lg:min-h-[560px]"
                  navigate={false}
                  showLabels={showNumbers}
                  legend={undefined}
                  revision={`${selectedIso3s.join("-")}-${baseMode}-${Object.keys(membership).length}`}
                  fitMaxZoom={selectedIso3s.includes("RUS") ? 4.2 : 5.2}
                  fitClamp={
                    selectedIso3s.includes("RUS") &&
                    selectedIso3s.includes("CHN") &&
                    selectedIso3s.length === 2
                      ? { west: 70, south: 20, east: 145, north: 72 }
                      : selectedIso3s.length === 1 && selectedIso3s[0] === "RUS"
                        ? { west: 25, south: 41, east: 145, north: 72 }
                        : null
                  }
                  onRegionActivate={onRegionActivate}
                  formatValue={(v) => formatPeople(v)}
                  oceanColor="#eef2f6"
                />
              ) : (
                <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground lg:h-[560px]">
                  Loading map…
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-white px-4 py-2 text-[0.7rem] text-muted-foreground">
              <span>
                birthrate.io/population/compare · {popPack.year} ·{" "}
                {baseMode === "density"
                  ? "base: density"
                  : baseMode === "population"
                    ? "base: population"
                    : "base: blank"}
              </span>
              <span className="max-w-md truncate">
                {popPack.sources[0] ?? "National statistical offices"}
              </span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
            <div className="space-y-3">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Paint groups
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {groups.map((g) => {
                  const tot = groupTotals.find((t) => t.id === g.id);
                  const active = activeGroupId === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setActiveGroupId(g.id)}
                      className={cn(
                        "border px-3 py-2 text-left transition-colors",
                        active
                          ? "border-foreground bg-foreground/5"
                          : "border-border hover:border-foreground/40",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0"
                          style={{ background: g.color }}
                        />
                        <input
                          className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium outline-none"
                          value={g.name}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => renameGroup(g.id, e.target.value)}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {tot?.count ?? 0} regions ·{" "}
                        <span className="tabular-nums text-foreground">
                          {formatPeople(tot?.total ?? 0)}
                        </span>
                      </p>
                    </button>
                  );
                })}
              </div>
              {baseMode === "density" && densityById.size > 0 && (
                <p className="text-xs text-muted-foreground">
                  Unpainted regions show population density (people/km²). Painted
                  colours override. Hover for headcount
                  {showNumbers ? "; numbers are headcount" : ""}.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onExport}
                disabled={exporting}
                className="h-10 border border-foreground bg-foreground px-4 text-sm font-medium text-background disabled:opacity-60"
              >
                {exporting ? "Saving…" : "Download image"}
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="h-9 border border-border px-4 text-sm text-muted-foreground hover:text-foreground"
              >
                Clear all paints
              </button>
              {groups.map((g) => (
                <button
                  key={`clear-${g.id}`}
                  type="button"
                  onClick={() => clearGroup(g.id)}
                  className="text-left text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear {g.name}
                </button>
              ))}
            </div>
          </div>

          {groupTotals.some((g) => g.count > 0) && (
            <div className="overflow-x-auto border border-border">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-[0.7rem] uppercase tracking-[0.08em] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Group</th>
                    <th className="px-3 py-2 font-semibold">Regions</th>
                    <th className="px-3 py-2 font-semibold">Population</th>
                  </tr>
                </thead>
                <tbody>
                  {groupTotals
                    .filter((g) => g.count > 0)
                    .map((g) => (
                      <tr key={g.id} className="border-b border-border/70">
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5"
                              style={{ background: g.color }}
                            />
                            {g.name}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {g.members.map((m) => m.name).join(", ")}
                        </td>
                        <td className="px-3 py-2 font-medium tabular-nums">
                          {formatNumber(g.total, 0)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
