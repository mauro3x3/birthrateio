"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  UK_CENSUS_META,
  UK_ETHNIC_GROUPS,
  UK_LAD_ETHNICITY,
  getUkEthnicGroup,
  ukPctColor,
  ukPctDomain,
  ukPctLegend,
  type UkAreaEthnicityRow,
  type UkEthnicGroupId,
  type UkGeographyLevel,
  type UkMsoaFile,
} from "@/lib/sources/uk-census-data";
import { formatCompact, formatNumber, cn } from "@/lib/utils";

const RegionChoroplethMap = dynamic(
  () =>
    import("@/components/maps/region-choropleth-map").then(
      (m) => m.RegionChoroplethMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[620px] items-center justify-center border bg-muted/30 text-sm text-muted-foreground">
        Loading map…
      </div>
    ),
  },
);

export function UkCensusExplorer({
  initialGroup = "white",
  initialLevel = "msoa",
}: {
  initialGroup?: UkEthnicGroupId;
  initialLevel?: UkGeographyLevel;
}) {
  const [groupId, setGroupId] = React.useState<UkEthnicGroupId>(initialGroup);
  const [level, setLevel] = React.useState<UkGeographyLevel>(initialLevel);
  const [ladCode, setLadCode] = React.useState<string | null>(null);
  const [msoaAreas, setMsoaAreas] = React.useState<UkAreaEthnicityRow[] | null>(
    null,
  );
  const [msoaError, setMsoaError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setMsoaError(null);
    void fetch(UK_CENSUS_META.msoaDataUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<UkMsoaFile>;
      })
      .then((json) => {
        if (cancelled) return;
        const rows = Object.values(json.areas).sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        setMsoaAreas(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        setMsoaError(
          err instanceof Error ? err.message : "Failed to load MSOA data",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const group = getUkEthnicGroup(groupId);
  const ewShare = UK_CENSUS_META.englandAndWales.shares[groupId];

  const areas = React.useMemo(() => {
    if (level === "lad") {
      if (!ladCode) return UK_LAD_ETHNICITY;
      return UK_LAD_ETHNICITY.filter((a) => a.code === ladCode);
    }
    if (!msoaAreas) return [];
    if (!ladCode) return msoaAreas;
    return msoaAreas.filter((a) => a.ladCode === ladCode);
  }, [level, ladCode, msoaAreas]);

  const values = React.useMemo(
    () => areas.map((a) => a.shares[groupId]),
    [areas, groupId],
  );
  const domain = React.useMemo(() => ukPctDomain(values), [values]);
  const legend = React.useMemo(() => ukPctLegend(domain), [domain]);

  const mapData = React.useMemo(
    () =>
      areas.map((a) => ({
        id: a.code,
        slug: a.slug,
        name: a.name,
        value: a.shares[groupId],
      })),
    [areas, groupId],
  );

  const filterIds = React.useMemo(() => {
    if (level === "msoa" && ladCode) return areas.map((a) => a.code);
    if (level === "lad" && ladCode) return [ladCode];
    return null;
  }, [level, ladCode, areas]);

  const ranked = React.useMemo(
    () =>
      [...areas].sort((a, b) => b.shares[groupId] - a.shares[groupId]),
    [areas, groupId],
  );
  const highest = ranked[0];
  const lowest = ranked[ranked.length - 1];

  const colorFor = React.useCallback(
    (v: number) => ukPctColor(v, domain),
    [domain],
  );

  const selectedLad = UK_LAD_ETHNICITY.find((a) => a.code === ladCode) ?? null;
  const geoUrl =
    level === "msoa" ? UK_CENSUS_META.msoaGeoUrl : UK_CENSUS_META.ladGeoUrl;
  const fitMaxZoom = level === "msoa" ? (ladCode ? 11 : 7) : ladCode ? 9 : 7;

  const levelLabel = level === "msoa" ? "MSOA" : "LAD";
  const areaLabel = selectedLad?.name ?? "England & Wales";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
            Geography
          </p>
          <div className="flex gap-1 border-b border-border">
            {(
              [
                ["lad", "LAD"],
                ["msoa", "MSOA"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setLevel(id)}
                className={cn(
                  "px-3 py-2 text-sm font-medium transition-colors",
                  level === id
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-[220px] space-y-1.5">
          <label
            htmlFor="uk-lad-filter"
            className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Area
          </label>
          <select
            id="uk-lad-filter"
            className="flex h-9 w-full rounded-sm border border-input bg-background px-3 text-sm"
            value={ladCode ?? ""}
            onChange={(e) => setLadCode(e.target.value || null)}
          >
            <option value="">England and Wales</option>
            {UK_LAD_ETHNICITY.map((a) => (
              <option key={a.code} value={a.code}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {UK_ETHNIC_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGroupId(g.id)}
            className={cn(
              "rounded-sm px-3 py-1.5 text-sm transition-colors",
              g.id === groupId
                ? "bg-foreground text-background"
                : "border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground",
            )}
          >
            {g.shortLabel}
            <span
              className={cn(
                "ml-1.5 tabular-nums text-xs",
                g.id === groupId
                  ? "text-background/65"
                  : "text-muted-foreground/80",
              )}
            >
              {formatNumber(UK_CENSUS_META.englandAndWales.shares[g.id], 1)}%
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl font-semibold tracking-tight">
                {group.label}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {areaLabel} · {levelLabel} · Census {UK_CENSUS_META.year}
                {level === "msoa" && !msoaAreas
                  ? " · loading neighbourhoods…"
                  : ""}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              England &amp; Wales{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {formatNumber(ewShare, 1)}%
              </span>
            </p>
          </div>

          {msoaError && level === "msoa" ? (
            <p className="rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              Could not load MSOA data ({msoaError}). Try LAD view instead.
            </p>
          ) : null}

          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-sm border bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground shadow-sm">
              {levelLabel}
              {ladCode ? ` · ${areas.length} areas` : ""}
            </div>
            <RegionChoroplethMap
              geoUrl={geoUrl}
              data={mapData}
              colorFor={colorFor}
              unit="%"
              decimals={1}
              height={620}
              fit="bounds"
              fitMaxZoom={fitMaxZoom}
              navigate={false}
              legend={legend}
              legendTitle={`${areaLabel}: ${group.shortLabel}`}
              revision={`${level}-${groupId}-${ladCode ?? "ew"}`}
              filterIds={filterIds}
            />
          </div>
          <p className="text-xs text-muted-foreground">{group.description}</p>
        </div>

        <aside className="space-y-5">
          <div className="border-t border-border pt-3">
            <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Highest
            </p>
            <p className="mt-1 font-medium">{highest?.name ?? "—"}</p>
            <p className="tabular-nums text-primary">
              {highest ? formatNumber(highest.shares[groupId], 1) : "—"}%
              <span className="ml-2 text-xs text-muted-foreground">
                {highest ? formatCompact(highest.population) : ""} residents
              </span>
            </p>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Lowest
            </p>
            <p className="mt-1 font-medium">{lowest?.name ?? "—"}</p>
            <p className="tabular-nums text-primary">
              {lowest ? formatNumber(lowest.shares[groupId], 1) : "—"}%
              <span className="ml-2 text-xs text-muted-foreground">
                {lowest ? formatCompact(lowest.population) : ""} residents
              </span>
            </p>
          </div>

          <div className="border-t border-border pt-3">
            <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Top {levelLabel === "MSOA" ? "neighbourhoods" : "authorities"}
            </p>
            <ol className="max-h-[28rem] space-y-1.5 overflow-y-auto text-sm">
              {ranked.slice(0, level === "msoa" && !ladCode ? 25 : 40).map(
                (a, i) => (
                  <li
                    key={a.code}
                    className="flex items-baseline justify-between gap-2"
                  >
                    <span className="min-w-0 truncate">
                      <span className="mr-1.5 font-mono text-xs text-muted-foreground">
                        {i + 1}.
                      </span>
                      {a.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatNumber(a.shares[groupId], 1)}%
                    </span>
                  </li>
                ),
              )}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
