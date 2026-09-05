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
import { formatNumber, cn } from "@/lib/utils";

const RegionChoroplethMap = dynamic(
  () =>
    import("@/components/maps/region-choropleth-map").then(
      (m) => m.RegionChoroplethMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[24rem] items-center justify-center bg-[#9aa8b5] text-sm text-black/40">
        Loading map…
      </div>
    ),
  },
);

const FEATURED_SLUGS = [
  "denmark",
  "germany",
  "spain",
  "russia",
  "france",
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

  React.useEffect(() => {
    setSlug(initialSlug);
  }, [initialSlug]);

  React.useEffect(() => {
    const cfg = getCensusCountry(slug) ?? all[0];
    setGroupId(defaultCensusGroup(cfg.groups));
    setLevelId(cfg.levels.at(-1)?.id ?? "");
    setParentCode(null);
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
        value: a.shares[group?.id] ?? 0,
      })),
    [areas, group],
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
    (v: number) => ukPctClassColor(v, breaks),
    [breaks],
  );

  const selectedParent =
    parentAreas.find((a) => a.code === parentCode) ?? null;
  const headline = selectedParent ?? {
    name: resolved.nationalLabel,
    shares: file?.national.shares ?? {},
  };
  const areaLabel = selectedParent?.name ?? resolved.nationalLabel;
  const fitMaxZoom = parentCode
    ? resolved.fitMaxZoom + 1.6
    : resolved.fitMaxZoom;
  const fitPaddingTopLeft = React.useMemo<[number, number]>(
    () => (panelOpen ? [8, 328] : [8, 8]),
    [panelOpen],
  );

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
    <div className="relative h-[calc(100dvh-3.75rem)] min-h-[32rem] overflow-hidden bg-[#9aa8b5] text-foreground">
      <div className="absolute inset-0">
        {level && mapData.length > 0 ? (
          <RegionChoroplethMap
            geoUrl={level.geoUrl}
            data={mapData}
            colorFor={colorFor}
            unit="%"
            decimals={1}
            height="100%"
            className="h-full border-0 bg-[#9aa8b5]"
            fit="bounds"
            fitMaxZoom={fitMaxZoom}
            fitPaddingTopLeft={fitPaddingTopLeft}
            fitPaddingBottomRight={[40, 8]}
            navigate={false}
            legend={legend}
            legendTitle={`${areaLabel}: ${group?.shortLabel ?? ""}`}
            legendPlacement="bottom-right"
            revision={`${resolved.slug}-${level.id}-${group?.id}-${parentCode ?? "all"}-${panelOpen ? "p" : "f"}`}
            filterIds={filterIds}
            adaptiveStroke={areas.length > 80}
            oceanColor="#9aa8b5"
            variant="light"
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
              <p
                className="text-4xl font-semibold tabular-nums tracking-tight text-foreground"
                key={`${resolved.slug}-${group?.id}-${parentCode ?? "nat"}`}
              >
                {formatNumber(headline.shares[group?.id] ?? 0, 1)}%
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {headline.name} · {group?.shortLabel}
              </p>
            </div>

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

            <dl className="text-[13px]">
              <div className="border-t border-border py-2.5">
                <dt className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Highest
                </dt>
                <dd className="mt-0.5">
                  <span className="text-foreground">{highest?.name ?? "—"}</span>
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
                  <span className="text-foreground">{lowest?.name ?? "—"}</span>
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
                        {formatNumber(a.shares[group?.id] ?? 0, 1)}%
                      </span>
                    </li>
                  ))}
              </ol>
            </div>

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
