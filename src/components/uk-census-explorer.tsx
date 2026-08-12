"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  UK_CENSUS_META,
  UK_ETHNIC_GROUPS,
  UK_LAD_ETHNICITY,
  getUkEthnicGroup,
  ukPctBreaks,
  ukPctClassColor,
  ukPctLegendFromBreaks,
  type UkAreaEthnicityRow,
  type UkEthnicGroupId,
  type UkGeographyLevel,
  type UkMsoaFile,
} from "@/lib/sources/uk-census-data";
import { formatNumber, cn } from "@/lib/utils";

const RegionChoroplethMap = dynamic(
  () =>
    import("@/components/maps/region-choropleth-map").then(
      (m) => m.RegionChoroplethMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[24rem] items-center justify-center bg-black text-sm text-white/30">
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
  const [panelOpen, setPanelOpen] = React.useState(true);

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
  const breaks = React.useMemo(() => ukPctBreaks(values, 5), [values]);
  const legend = React.useMemo(
    () => ukPctLegendFromBreaks(breaks),
    [breaks],
  );

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
    () => [...areas].sort((a, b) => b.shares[groupId] - a.shares[groupId]),
    [areas, groupId],
  );
  const highest = ranked[0];
  const lowest = ranked[ranked.length - 1];

  const colorFor = React.useCallback(
    (v: number) => ukPctClassColor(v, breaks),
    [breaks],
  );

  const selectedLad = UK_LAD_ETHNICITY.find((a) => a.code === ladCode) ?? null;
  const geoUrl =
    level === "msoa" ? UK_CENSUS_META.msoaGeoUrl : UK_CENSUS_META.ladGeoUrl;
  const fitMaxZoom = level === "msoa" ? (ladCode ? 12 : 9.75) : ladCode ? 10.5 : 9.5;
  const levelLabel = level === "msoa" ? "MSOA" : "LAD";
  const areaLabel = selectedLad?.name ?? "England & Wales";
  const fitPaddingTopLeft = React.useMemo<[number, number]>(
    () => (panelOpen ? [8, 328] : [8, 8]),
    [panelOpen],
  );
  const fitPaddingBottomRight = React.useMemo<[number, number]>(
    () => [40, 8],
    [],
  );

  return (
    <div className="relative h-[calc(100dvh-3.75rem)] min-h-[32rem] overflow-hidden bg-[#9aa8b5] text-foreground">
      {/* Full-bleed map — light ONS-style stage */}
      <div className="absolute inset-0">
        <RegionChoroplethMap
          geoUrl={geoUrl}
          data={mapData}
          colorFor={colorFor}
          unit="%"
          decimals={1}
          height="100%"
          className="h-full border-0 bg-[#9aa8b5]"
          fit="bounds"
          fitMaxZoom={fitMaxZoom}
          fitPaddingTopLeft={fitPaddingTopLeft}
          fitPaddingBottomRight={fitPaddingBottomRight}
          navigate={false}
          legend={legend}
          legendTitle={`${areaLabel}: ${group.shortLabel}`}
          legendPlacement="bottom-right"
          revision={`${level}-${groupId}-${ladCode ?? "ew"}-${panelOpen ? "p" : "f"}`}
          filterIds={filterIds}
          adaptiveStroke={level === "msoa"}
          oceanColor="#9aa8b5"
          variant="light"
        />
      </div>

      <div className="pointer-events-none absolute right-3 top-3 z-[1100] rounded-sm border border-black/10 bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground shadow-sm backdrop-blur-sm">
        {levelLabel}
        {ladCode ? ` · ${areas.length}` : ""}
      </div>

      {/* Floating controls */}
      {panelOpen ? (
        <aside className="absolute bottom-3 left-3 top-3 z-[1100] flex w-[min(100%-1.5rem,20rem)] flex-col overflow-hidden rounded-sm border border-black/10 bg-white/95 shadow-xl backdrop-blur-md sm:w-[20rem]">
          <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                UK Census {UK_CENSUS_META.year}
              </p>
              <h1 className="mt-0.5 font-serif text-xl font-semibold tracking-tight text-foreground">
                Ethnic group
              </h1>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {areaLabel} · {levelLabel}
                {level === "msoa" && !msoaAreas ? " · loading…" : ""}
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
              <p
                className="text-4xl font-semibold tabular-nums tracking-tight text-foreground"
                key={`ew-${groupId}`}
              >
                {formatNumber(ewShare, 1)}%
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                England &amp; Wales · {group.shortLabel}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Geography
              </p>
              <div className="flex gap-2">
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
                      "rounded-full px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] transition-colors",
                      level === id
                        ? "bg-foreground text-background"
                        : "border border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <select
                aria-label="Area"
                className="flex h-9 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
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

            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Ethnic group
              </p>
              {UK_ETHNIC_GROUPS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGroupId(g.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-left text-sm transition-colors",
                    g.id === groupId
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span>{g.shortLabel}</span>
                  <span
                    className={cn(
                      "tabular-nums text-xs",
                      g.id === groupId
                        ? "text-background/70"
                        : "text-muted-foreground/80",
                    )}
                  >
                    {formatNumber(
                      UK_CENSUS_META.englandAndWales.shares[g.id],
                      1,
                    )}
                    %
                  </span>
                </button>
              ))}
            </div>

            <dl className="text-[13px]">
              <div className="border-t border-border py-2.5">
                <dt className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Highest
                </dt>
                <dd className="mt-0.5">
                  <span className="text-foreground">{highest?.name ?? "—"}</span>
                  {highest ? (
                    <span className="ml-2 tabular-nums text-primary">
                      {formatNumber(highest.shares[groupId], 1)}%
                    </span>
                  ) : null}
                </dd>
              </div>
              <div className="border-t border-border py-2.5">
                <dt className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Lowest
                </dt>
                <dd className="mt-0.5">
                  <span className="text-foreground">{lowest?.name ?? "—"}</span>
                  {lowest ? (
                    <span className="ml-2 tabular-nums text-primary">
                      {formatNumber(lowest.shares[groupId], 1)}%
                    </span>
                  ) : null}
                </dd>
              </div>
            </dl>

            <div>
              <p className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Top {level === "msoa" ? "neighbourhoods" : "authorities"}
              </p>
              <ol className="space-y-0 text-[13px]">
                {ranked
                  .slice(0, level === "msoa" && !ladCode ? 12 : 20)
                  .map((a, i) => (
                    <li
                      key={a.code}
                      className="flex items-baseline justify-between gap-2 border-t border-border/70 py-1.5"
                    >
                      <span className="min-w-0 truncate text-foreground/85">
                        <span className="mr-1.5 font-mono text-[10px] text-muted-foreground/60">
                          {i + 1}.
                        </span>
                        {a.name}
                      </span>
                      <span className="shrink-0 tabular-nums text-primary">
                        {formatNumber(a.shares[groupId], 1)}%
                      </span>
                    </li>
                  ))}
              </ol>
            </div>

            {msoaError && level === "msoa" ? (
              <p className="text-xs text-destructive">
                Could not load MSOA data ({msoaError}). Try LAD view.
              </p>
            ) : null}

            <p className="pb-1 text-[10px] leading-relaxed text-muted-foreground/70">
              Source:{" "}
              <a
                href={UK_CENSUS_META.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                ONS Census 2021 (TS021)
              </a>
              .{" "}
              <Link
                href="/demographics"
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
