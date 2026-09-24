"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  CENSUS_COUNTRIES,
  defaultCensusGroup,
  getCensusCountry,
  loadCensusFile,
  loadUkMsoaAreas,
  ukCensusAsFile,
  type CensusArea,
  type CensusFile,
} from "@/lib/sources/census-maps-data";
import {
  ukPctBreaks,
  ukPctClassColor,
  ukPctLegendFromBreaks,
} from "@/lib/sources/uk-census-data";
import { CompositionDonut } from "@/components/composition-donut";
import { MAP_OCEAN } from "@/lib/map-path-style";
import { formatNumber, cn } from "@/lib/utils";

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

const FEATURED_SLUGS = [
  "brazil",
  "iran",
  "canada",
  "south-africa",
  "russia",
  "denmark",
  "uk",
];

export function CensusMapExplorer({
  initialSlug,
}: {
  initialSlug: string;
}) {
  const all = CENSUS_COUNTRIES;
  const [slug, setSlug] = React.useState(initialSlug);
  const country = getCensusCountry(slug) ?? all[0];
  const resolved = country;

  const [groupId, setGroupId] = React.useState(() =>
    defaultCensusGroup(resolved.groups),
  );
  const [levelId, setLevelId] = React.useState(resolved.levels.at(-1)?.id ?? "");
  const [parentCode, setParentCode] = React.useState<string | null>(null);
  const [file, setFile] = React.useState<CensusFile | null>(
    resolved.builtin === "uk" ? ukCensusAsFile() : null,
  );
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [panelOpen, setPanelOpen] = React.useState(true);
  const [showNames, setShowNames] = React.useState(
    () => resolved.slug === "canada" || resolved.mapMode !== "plurality",
  );
  const [showGroups, setShowGroups] = React.useState(
    () => resolved.mapMode === "plurality",
  );
  const [selectedCode, setSelectedCode] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSlug(initialSlug);
  }, [initialSlug]);

  React.useEffect(() => {
    const cfg = getCensusCountry(slug) ?? all[0];
    setGroupId(defaultCensusGroup(cfg.groups));
    setLevelId(cfg.levels.at(-1)?.id ?? "");
    setParentCode(null);
    setSelectedCode(null);
    setShowNames(cfg.slug === "canada" || cfg.mapMode !== "plurality");
    setShowGroups(cfg.mapMode === "plurality");
    setLoadError(null);
    if (cfg.builtin === "uk") {
      setFile(ukCensusAsFile());
      return;
    }
    setFile(null);
    let cancelled = false;
    void loadCensusFile(cfg.dataUrl)
      .then((json) => {
        if (!cancelled) setFile(json);
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError(err instanceof Error ? err.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [slug, all]);

  React.useEffect(() => {
    if (resolved.builtin !== "uk") return;
    let cancelled = false;
    void loadUkMsoaAreas()
      .then((rows) => {
        if (!cancelled) setFile(ukCensusAsFile(rows));
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError(err instanceof Error ? err.message : "Failed to load MSOA");
      });
    return () => {
      cancelled = true;
    };
  }, [resolved.builtin]);

  const group =
    resolved.groups.find((g) => g.id === groupId) ??
    resolved.groups.find((g) => g.id === defaultCensusGroup(resolved.groups)) ??
    resolved.groups[0];
  const level =
    resolved.levels.find((l) => l.id === levelId) ??
    resolved.levels.at(-1) ??
    resolved.levels[0];
  const coarse = resolved.levels[0];
  const fine = resolved.levels[resolved.levels.length - 1];
  const isPlurality =
    resolved.mapMode === "plurality" || file?.mapMode === "plurality";

  const groupColor = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const g of resolved.groups) {
      if (g.color) m.set(g.id, g.color);
    }
    return m;
  }, [resolved.groups]);

  const groupIndex = React.useMemo(() => {
    const m = new Map<string, number>();
    resolved.groups.forEach((g, i) => m.set(g.id, i + 1));
    return m;
  }, [resolved.groups]);

  const parentAreas = React.useMemo(() => {
    if (!file || !coarse) return [];
    const map = file.areas[coarse.id];
    if (!map) return [];
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [file, coarse]);

  const areas = React.useMemo(() => {
    if (!file || !level) return [] as CensusArea[];
    const map = file.areas[level.id];
    if (!map) return [];
    let list = Object.values(map);
    if (parentCode) {
      if (level.id === coarse?.id) {
        list = list.filter((a) => a.code === parentCode);
      } else {
        list = list.filter((a) => a.parent === parentCode);
      }
    }
    return list;
  }, [file, level, parentCode, coarse]);

  const values = React.useMemo(
    () => areas.map((a) => a.shares[group?.id] ?? 0),
    [areas, group],
  );
  const breaks = React.useMemo(() => ukPctBreaks(values, 5), [values]);
  const legend = React.useMemo(() => {
    if (isPlurality) {
      return resolved.groups
        .filter((g) => g.id !== "other" || (file?.national.shares[g.id] ?? 0) > 0)
        .map((g) => ({
          label: g.shortLabel,
          color: g.color ?? "#94a3b8",
        }));
    }
    return ukPctLegendFromBreaks(breaks);
  }, [isPlurality, resolved.groups, file?.national.shares, breaks]);

  const mapData = React.useMemo(
    () =>
      areas.map((a) => {
        const plural = a.plurality ?? group?.id ?? "";
        return {
          id: a.code,
          slug: a.slug,
          name: a.name,
          value: isPlurality
            ? (groupIndex.get(plural) ?? 0)
            : (a.shares[group?.id] ?? 0),
        };
      }),
    [areas, group, isPlurality, groupIndex],
  );

  const fillForId = React.useCallback(
    (id: string) => {
      if (!isPlurality) return undefined;
      const area = areas.find((a) => a.code === id || a.slug === id);
      const plural = area?.plurality;
      return plural ? groupColor.get(plural) : undefined;
    },
    [isPlurality, areas, groupColor],
  );

  const filterIds = React.useMemo(() => {
    if (!parentCode) return null;
    if (level?.id === coarse?.id) return [parentCode];
    return areas.map((a) => a.code);
  }, [parentCode, level, coarse, areas]);

  const ranked = React.useMemo(
    () =>
      [...areas].sort(
        (a, b) => (b.shares[group?.id] ?? 0) - (a.shares[group?.id] ?? 0),
      ),
    [areas, group],
  );
  const highest = ranked[0];
  const lowest = ranked[ranked.length - 1];

  const colorFor = React.useCallback(
    (v: number) =>
      isPlurality ? "#d7dde5" : ukPctClassColor(v, breaks),
    [breaks, isPlurality],
  );

  const formatValue = React.useCallback(
    (v: number) => {
      if (!isPlurality) return `${formatNumber(v, 1)}%`;
      const g = resolved.groups[Math.round(v) - 1];
      return g?.shortLabel ?? "—";
    },
    [isPlurality, resolved.groups],
  );

  const selectedParent =
    parentAreas.find((a) => a.code === parentCode) ?? null;
  const selectedArea =
    areas.find((a) => a.code === selectedCode || a.slug === selectedCode) ??
    null;
  const digInArea = selectedArea ?? selectedParent;
  const headline = digInArea ?? {
    name: resolved.nationalLabel,
    shares: file?.national.shares ?? {},
  };
  const areaLabel = digInArea?.name ?? resolved.nationalLabel;
  const fitMaxZoom = parentCode
    ? resolved.fitMaxZoom + 1.6
    : resolved.fitMaxZoom;
  const fitPaddingTopLeft = React.useMemo<[number, number]>(
    () => (panelOpen ? [8, 328] : [8, 8]),
    [panelOpen],
  );
  const labelMode = isPlurality
    ? showNames && showGroups
      ? "value-name"
      : showGroups
        ? "value"
        : "name"
    : showNames && showGroups
      ? "name-value"
      : showGroups
        ? "value"
        : "name";
  const showLabels = showNames || showGroups;
  const selectedIds = React.useMemo(
    () => (selectedCode ? [selectedCode] : []),
    [selectedCode],
  );

  const onRegionActivate = React.useCallback(
    (datum: { id: string; slug: string; name: string }) => {
      setSelectedCode((prev) => (prev === datum.id ? null : datum.id));
      setPanelOpen(true);
    },
    [],
  );

  const digInPluralityGroup = digInArea?.plurality
    ? resolved.groups.find((g) => g.id === digInArea.plurality)
    : null;

  const provincesByGroup = React.useMemo(() => {
    if (!isPlurality) return [];
    return resolved.groups
      .map((g) => ({
        group: g,
        provinces: areas
          .filter((a) => a.plurality === g.id)
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter((row) => row.provinces.length > 0);
  }, [isPlurality, resolved.groups, areas]);


  React.useEffect(() => {
    document.title = `${resolved.name} census map — ${resolved.title} · birthrate.io`;
  }, [resolved.name, resolved.title]);

  const selectCountry = (next: string) => {
    setSlug(next);
    window.history.replaceState(null, "", `/demographics/${next}`);
  };

  const msoaLoading =
    resolved.builtin === "uk" &&
    level?.id === "msoa" &&
    !(file && file.areas.msoa);

  return (
    <div
      className="relative h-[calc(100dvh-3.75rem)] min-h-[32rem] overflow-hidden text-foreground"
      style={{ background: MAP_OCEAN.atlas }}
    >
      <div className="absolute inset-0">
        {level && mapData.length > 0 ? (
          <RegionChoroplethMap
            geoUrl={level.geoUrl}
            data={mapData}
            colorFor={colorFor}
            fillForId={isPlurality ? fillForId : undefined}
            unit={isPlurality ? undefined : "%"}
            decimals={isPlurality ? 0 : 1}
            height="100%"
            className="h-full border-0"
            fit="bounds"
            fitMaxZoom={fitMaxZoom}
            fitClamp={resolved.fitClamp ?? null}
            fitPaddingTopLeft={fitPaddingTopLeft}
            fitPaddingBottomRight={[40, 8]}
            navigate={false}
            legend={legend}
            legendTitle={
              isPlurality
                ? "Dominant group (province)"
                : `${areaLabel}: ${group?.shortLabel ?? ""}`
            }
            legendPlacement="bottom-right"
            revision={`${resolved.slug}-${level.id}-${parentCode ?? "all"}-${isPlurality ? "pl" : "sh"}`}
            filterIds={filterIds}
            adaptiveStroke={areas.length > 80}
            oceanColor={MAP_OCEAN.atlas}
            variant="light"
            formatValue={formatValue}
            showLabels={showLabels}
            labelMode={labelMode}
            selectedIds={selectedIds}
            onRegionActivate={onRegionActivate}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-black/40">
            {loadError ?? (msoaLoading ? "Loading neighbourhoods…" : "Loading map…")}
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute right-3 top-3 z-[1100] rounded-sm border border-black/10 bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground shadow-sm backdrop-blur-sm">
        {level?.label}
        {parentCode ? ` · ${areas.length}` : ""}
      </div>

      {panelOpen ? (
        <aside className="absolute bottom-3 left-3 top-3 z-[1100] flex w-[min(100%-1.5rem,20rem)] flex-col overflow-hidden rounded-sm border border-black/10 bg-white/95 shadow-xl backdrop-blur-md sm:w-[20rem]">
          <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {resolved.kicker}
              </p>
              <h1 className="mt-0.5 font-serif text-xl font-semibold tracking-tight text-foreground">
                {resolved.title}
              </h1>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {areaLabel} · {level?.label}
                {msoaLoading ? " · loading…" : ""}
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
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Country
              </p>
              <select
                aria-label="Country"
                className="mt-1.5 flex h-9 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                value={resolved.slug}
                onChange={(e) => selectCountry(e.target.value)}
              >
                {all.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex flex-wrap gap-1">
                {FEATURED_SLUGS.map((s) => all.find((c) => c.slug === s))
                  .filter((c): c is NonNullable<typeof c> => Boolean(c))
                  .map((c) => (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => selectCountry(c.slug)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px]",
                        c.slug === resolved.slug
                          ? "bg-foreground text-background"
                          : "border border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Map labels
              </p>
              <div className="mt-1.5 space-y-1.5">
                <button
                  type="button"
                  role="switch"
                  aria-checked={showNames}
                  onClick={() => setShowNames((v) => !v)}
                  className={cn(
                    "flex h-9 w-full items-center justify-between rounded-sm border px-3 text-sm transition-colors",
                    showNames
                      ? "border-foreground bg-foreground text-background"
                      : "border-input bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>Province names</span>
                  <span className="text-[10px] uppercase tracking-[0.14em]">
                    {showNames ? "On" : "Off"}
                  </span>
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showGroups}
                  onClick={() => setShowGroups((v) => !v)}
                  className={cn(
                    "flex h-9 w-full items-center justify-between rounded-sm border px-3 text-sm transition-colors",
                    showGroups
                      ? "border-foreground bg-foreground text-background"
                      : "border-input bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{isPlurality ? "Ethnic groups" : "Values"}</span>
                  <span className="text-[10px] uppercase tracking-[0.14em]">
                    {showGroups ? "On" : "Off"}
                  </span>
                </button>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                Click a province on the map to inspect its demographics.
              </p>
            </div>

            {selectedArea ? (
              <div className="rounded-sm border border-border bg-muted/40 px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Selected province
                    </p>
                    <p className="mt-0.5 truncate font-medium text-foreground">
                      {selectedArea.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCode(null)}
                    className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
                {isPlurality ? (
                  <div className="mt-3 space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        Dominant group
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
                        <span
                          className="h-2.5 w-2.5 shrink-0"
                          style={{
                            background: digInPluralityGroup?.color ?? "#94a3b8",
                          }}
                        />
                        {digInPluralityGroup?.shortLabel ?? "—"}
                      </p>
                      {file?.groupBlurbs?.[selectedArea.plurality ?? ""] ? (
                        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                          {file.groupBlurbs[selectedArea.plurality!]}
                        </p>
                      ) : null}
                    </div>
                    {selectedArea.population > 0 ? (
                      <p className="text-[12px] text-muted-foreground">
                        Population{" "}
                        <span className="tabular-nums text-foreground">
                          {formatNumber(selectedArea.population, 0)}
                        </span>
                        <span className="text-muted-foreground/70"> · 2016</span>
                      </p>
                    ) : null}
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        {selectedArea.estimate
                          ? "Estimated ethnic shares"
                          : "Ethnic shares"}
                      </p>
                      <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto text-[12px]">
                        {resolved.groups
                          .map((g) => ({
                            g,
                            pct: selectedArea.shares[g.id] ?? 0,
                          }))
                          .filter((row) => row.pct > 0)
                          .sort((a, b) => b.pct - a.pct)
                          .map(({ g, pct }) => (
                            <li
                              key={g.id}
                              className="flex items-center justify-between gap-2"
                            >
                              <span className="flex min-w-0 items-center gap-1.5 truncate">
                                <span
                                  className="h-2 w-2 shrink-0"
                                  style={{ background: g.color ?? "#94a3b8" }}
                                />
                                <span className="truncate">{g.shortLabel}</span>
                              </span>
                              <span className="tabular-nums text-muted-foreground">
                                {formatNumber(pct, pct >= 10 ? 0 : 1)}%
                              </span>
                            </li>
                          ))}
                      </ul>
                    </div>
                    {selectedArea.note ? (
                      <p className="text-[11px] leading-relaxed text-foreground/80">
                        {selectedArea.note}
                      </p>
                    ) : null}
                    <p className="text-[10px] leading-relaxed text-muted-foreground">
                      {file?.estimatesDisclaimer ??
                        `${resolved.name} does not publish provincial ethnicity percentages — figures are estimates.`}
                    </p>
                  </div>
                ) : (
                  <div className="mt-3">
                    <p
                      className="text-3xl font-semibold tabular-nums tracking-tight text-foreground"
                      key={`${selectedArea.code}-${group?.id}`}
                    >
                      {formatNumber(selectedArea.shares[group?.id] ?? 0, 1)}%
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {group?.shortLabel}
                    </p>
                    {selectedArea.population > 0 ? (
                      <p className="mt-2 text-[12px] text-muted-foreground">
                        Population{" "}
                        <span className="tabular-nums text-foreground">
                          {formatNumber(selectedArea.population, 0)}
                        </span>
                      </p>
                    ) : null}
                    <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-[12px]">
                      {resolved.groups.map((g) => {
                        const pct = selectedArea.shares[g.id] ?? 0;
                        if (pct <= 0) return null;
                        return (
                          <li
                            key={g.id}
                            className="flex items-center justify-between gap-2"
                          >
                            <button
                              type="button"
                              onClick={() => setGroupId(g.id)}
                              className={cn(
                                "flex min-w-0 items-center gap-1.5 truncate text-left",
                                g.id === group?.id
                                  ? "font-medium text-foreground"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              <span
                                className="h-2 w-2 shrink-0"
                                style={{ background: g.color ?? "#94a3b8" }}
                              />
                              <span className="truncate">{g.shortLabel}</span>
                            </button>
                            <span className="tabular-nums text-muted-foreground">
                              {formatNumber(pct, 1)}%
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}

            <div>
              {isPlurality ? (
                <>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    People of {resolved.name} — ethnic shares
                  </p>
                  <div className="mt-3">
                    <CompositionDonut
                      shares={file?.national.shares ?? {}}
                      groups={resolved.groups}
                    />
                  </div>
                  <ul className="mt-3 space-y-1 text-[12px]">
                    {resolved.groups.map((g) => {
                      const pct = file?.national.shares[g.id] ?? 0;
                      if (pct <= 0 && g.id === "gilaki_mazani") return null;
                      return (
                        <li
                          key={g.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="flex min-w-0 items-center gap-1.5 truncate">
                            <span
                              className="h-2 w-2 shrink-0"
                              style={{ background: g.color ?? "#94a3b8" }}
                            />
                            <span className="truncate">{g.shortLabel}</span>
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {pct > 0 ? `${formatNumber(pct, 0)}%` : "map only"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                    National % from CIA World Factbook. Map colours are
                    province majority groups from academic classification — not
                    census percentages (Iran does not publish those).
                  </p>
                </>
              ) : selectedArea ? null : (
                <>
                  <p
                    className="text-4xl font-semibold tabular-nums tracking-tight text-foreground"
                    key={`${resolved.slug}-${group?.id}-${parentCode ?? "nat"}`}
                  >
                    {formatNumber(headline.shares[group?.id] ?? 0, 1)}%
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {headline.name} · {group?.shortLabel}
                  </p>
                </>
              )}
            </div>

            {isPlurality && file?.religion ? (
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {file.religion.label} of {resolved.name}
                </p>
                <div className="mt-3">
                  <CompositionDonut
                    shares={file.religion.shares}
                    groups={file.religion.groups}
                    size={112}
                  />
                </div>
                <ul className="mt-3 space-y-1 text-[12px]">
                  {file.religion.groups.map((g) => (
                    <li
                      key={g.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="flex min-w-0 items-center gap-1.5 truncate">
                        <span
                          className="h-2 w-2 shrink-0"
                          style={{ background: g.color ?? "#94a3b8" }}
                        />
                        <span className="truncate">{g.shortLabel}</span>
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatNumber(file.religion!.shares[g.id] ?? 0, 0)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {resolved.levels.length > 1 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Geography
                </p>
                <div className="flex gap-2">
                  {resolved.levels.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setLevelId(l.id)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] transition-colors",
                        level?.id === l.id
                          ? "bg-foreground text-background"
                          : "border border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                      )}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {parentAreas.length > 0 && (
              <select
                aria-label="Area"
                className="flex h-9 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                value={parentCode ?? ""}
                onChange={(e) => setParentCode(e.target.value || null)}
              >
                <option value="">{resolved.nationalLabel}</option>
                {parentAreas.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}

            {!isPlurality ? (
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {resolved.topicLabel}
                </p>
                {resolved.groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGroupId(g.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-left text-sm transition-colors",
                      g.id === group?.id
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span>{g.shortLabel}</span>
                    <span
                      className={cn(
                        "tabular-nums text-xs",
                        g.id === group?.id
                          ? "text-background/70"
                          : "text-muted-foreground/80",
                      )}
                    >
                      {formatNumber(file?.national.shares[g.id] ?? 0, 1)}%
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <p className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Provinces by dominant group
                </p>
                <div className="space-y-3">
                  {provincesByGroup.map(({ group: g, provinces }) => (
                    <div key={g.id}>
                      <p className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
                        <span
                          className="h-2 w-2 shrink-0"
                          style={{ background: g.color ?? "#94a3b8" }}
                        />
                        {g.shortLabel}
                        <span className="font-normal text-muted-foreground">
                          · {provinces.length}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                        {provinces.map((p, i) => (
                          <React.Fragment key={p.code}>
                            {i > 0 ? ", " : null}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCode(p.code);
                                setPanelOpen(true);
                              }}
                              className={cn(
                                "hover:text-foreground hover:underline",
                                selectedCode === p.code &&
                                  "font-medium text-foreground underline",
                              )}
                            >
                              {p.name}
                            </button>
                          </React.Fragment>
                        ))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isPlurality ? (
              <>
                <dl className="text-[13px]">
                  <div className="border-t border-border py-2.5">
                    <dt className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Highest
                    </dt>
                    <dd className="mt-0.5">
                      <span className="text-foreground">
                        {highest?.name ?? "—"}
                      </span>
                      {highest ? (
                        <span className="ml-2 tabular-nums text-primary">
                          {formatNumber(highest.shares[group?.id] ?? 0, 1)}%
                        </span>
                      ) : null}
                    </dd>
                  </div>
                  <div className="border-t border-border py-2.5">
                    <dt className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Lowest
                    </dt>
                    <dd className="mt-0.5">
                      <span className="text-foreground">
                        {lowest?.name ?? "—"}
                      </span>
                      {lowest ? (
                        <span className="ml-2 tabular-nums text-primary">
                          {formatNumber(lowest.shares[group?.id] ?? 0, 1)}%
                        </span>
                      ) : null}
                    </dd>
                  </div>
                </dl>

                <div>
                  <p className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Top {level?.kind.toLowerCase() ?? "areas"}
                  </p>
                  <ol className="space-y-0 text-[13px]">
                    {ranked
                      .slice(0, level?.id === fine?.id && !parentCode ? 12 : 20)
                      .map((a, i) => (
                        <li key={a.code}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCode(a.code);
                              setPanelOpen(true);
                            }}
                            className={cn(
                              "flex w-full items-baseline justify-between gap-2 border-t border-border/70 py-1.5 text-left transition-colors",
                              selectedCode === a.code
                                ? "bg-muted/60 text-foreground"
                                : "text-foreground/85 hover:bg-muted/40",
                            )}
                          >
                            <span className="min-w-0 truncate">
                              <span className="mr-1.5 font-mono text-[10px] text-muted-foreground/60">
                                {i + 1}.
                              </span>
                              {a.name}
                            </span>
                            <span className="shrink-0 tabular-nums text-primary">
                              {formatNumber(a.shares[group?.id] ?? 0, 1)}%
                            </span>
                          </button>
                        </li>
                      ))}
                  </ol>
                </div>
              </>
            ) : null}

            {loadError ? (
              <p className="text-xs text-destructive">{loadError}</p>
            ) : null}

            <p className="pb-1 text-[10px] leading-relaxed text-muted-foreground/70">
              Source:{" "}
              <a
                href={resolved.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                {resolved.source}
              </a>
              .{" "}
              <Link
                href="/demographics/us"
                className="underline underline-offset-2 hover:text-foreground"
              >
                US map
              </Link>
              .
            </p>
          </div>
        </aside>
      ) : (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="absolute left-3 top-3 z-[1100] rounded-sm border border-black/10 bg-white/95 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground shadow-sm backdrop-blur-md hover:border-foreground/25 hover:text-foreground"
        >
          Controls
        </button>
      )}
    </div>
  );
}
