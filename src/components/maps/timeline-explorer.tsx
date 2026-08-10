"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { formatNumber, cn } from "@/lib/utils";
import type { ScaleType } from "@/lib/color-scale";
import {
  MAP_REGIONS,
  REGION_CAMERA,
  REGION_VIEW_CLAMP,
  countryInMapRegion,
  mapRegionMaskIso3s,
  type MapRegionId,
} from "@/lib/map-regions";

const ChoroplethMap = dynamic(
  () => import("@/components/maps/choropleth-map").then((m) => m.ChoroplethMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[520px] items-center justify-center bg-black text-sm text-white/30">
        Loading map…
      </div>
    ),
  },
);

export type TimelineFramePoint = {
  iso3: string;
  slug: string;
  name: string;
  value: number;
  continent?: string | null;
};

export type TimelineFrame = {
  year: number;
  data: TimelineFramePoint[];
};

const REGIONS = MAP_REGIONS;

function Sparkline({
  values,
  activeIndex,
}: {
  values: (number | null)[];
  activeIndex: number;
}) {
  const pts = values
    .map((v, i) => ({ i, v }))
    .filter((p): p is { i: number; v: number } => p.v != null && Number.isFinite(p.v));
  if (pts.length < 2) return null;
  const nums = pts.map((p) => p.v);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const w = 260;
  const h = 64;
  const path = pts
    .map((p, j) => {
      const x = (p.i / (values.length - 1 || 1)) * w;
      const y = h - ((p.v - min) / span) * (h - 6) - 3;
      return `${j === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const active = pts.find((p) => p.i === activeIndex) ?? pts[pts.length - 1];
  const ax = (active.i / (values.length - 1 || 1)) * w;
  const ay = h - ((active.v - min) / span) * (h - 6) - 3;
  const first = pts[0];
  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full overflow-visible" aria-hidden>
      <path
        d={path}
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2 3"
      />
      <text x={0} y={12} fill="rgba(255,255,255,0.35)" fontSize="9">
        {first.v.toFixed(1)}
      </text>
      <text
        x={w}
        y={ay - 6}
        textAnchor="end"
        fill="rgba(210,170,120,0.9)"
        fontSize="9"
      >
        {last.v.toFixed(1)}
      </text>
      <circle cx={ax} cy={ay} r="3" fill="rgb(196, 150, 96)" />
    </svg>
  );
}

export function TimelineExplorer({
  frames,
  globalByYear,
  unit = "births/woman",
  decimals = 2,
  scaleType = "diverging-dark",
  mid = 2.1,
  source,
  headline = "Global",
  metricLabel = "Fertility",
  playMs = 320,
}: {
  frames: TimelineFrame[];
  globalByYear: Record<number, number>;
  unit?: string;
  decimals?: number;
  scaleType?: ScaleType;
  mid?: number;
  source?: string;
  headline?: string;
  metricLabel?: string;
  playMs?: number;
}) {
  const [idx, setIdx] = React.useState(() =>
    frames.length ? frames.length - 1 : 0,
  );
  const [playing, setPlaying] = React.useState(false);
  const [region, setRegion] = React.useState<MapRegionId>("all");

  React.useEffect(() => {
    if (!playing || frames.length < 2) return;
    const t = setInterval(() => {
      setIdx((i) => {
        if (i >= frames.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, playMs);
    return () => clearInterval(t);
  }, [playing, frames.length, playMs]);

  const domain = React.useMemo(() => {
    const vals: number[] = [];
    for (const f of frames)
      for (const d of f.data) if (Number.isFinite(d.value)) vals.push(d.value);
    if (!vals.length) return undefined;
    vals.sort((a, b) => a - b);
    const q = (p: number) =>
      vals[Math.min(vals.length - 1, Math.floor(p * (vals.length - 1)))];
    return { min: q(0.02), max: q(0.98) };
  }, [frames]);

  const current = frames[Math.min(idx, Math.max(0, frames.length - 1))];
  const year = current?.year ?? 0;
  const world = globalByYear[year];

  const visibleData = React.useMemo(() => {
    const rows = current?.data ?? [];
    if (region === "all") return rows;
    return rows.filter((d) =>
      countryInMapRegion(region, {
        iso3: d.iso3,
        continent: d.continent ?? null,
      }),
    );
  }, [current, region]);

  const mapData = React.useMemo(() => {
    // Dim non-selected continents by omitting them — cinema map paints
    // missing countries near-black so the focus region pops.
    return visibleData.map((d) => ({
      iso3: d.iso3,
      slug: d.slug,
      name: d.name,
      value: d.value,
    }));
  }, [visibleData]);

  const { highest, lowest, mean } = React.useMemo(() => {
    const rows = [...visibleData].filter((d) => Number.isFinite(d.value));
    if (!rows.length)
      return { highest: null, lowest: null, mean: null as number | null };
    rows.sort((a, b) => b.value - a.value);
    const avg = rows.reduce((s, r) => s + r.value, 0) / rows.length;
    return { highest: rows[0], lowest: rows[rows.length - 1], mean: avg };
  }, [visibleData]);

  const focusIso3s = React.useMemo(
    () => (region === "all" ? null : mapData.map((d) => d.iso3)),
    [region, mapData],
  );

  const regionMaskIso3s = React.useMemo(() => {
    if (region === "all") return null;
    // One pass over the latest frame is enough for continent tagging;
    // Europe uses a fixed ISO list internally.
    const catalog = (current?.data ?? []).map((d) => ({
      iso3: d.iso3,
      continent: d.continent ?? null,
    }));
    return mapRegionMaskIso3s(region, catalog);
  }, [region, current]);

  const sparkValues = React.useMemo(
    () => frames.map((f) => globalByYear[f.year] ?? null),
    [frames, globalByYear],
  );


  const yearTicks = React.useMemo(() => {
    if (frames.length < 2) return [];
    const first = frames[0].year;
    const last = frames[frames.length - 1].year;
    const want = [first, 1980, 2000, 2020, last];
    const uniq = [...new Set(want.filter((y) => y >= first && y <= last))];
    return uniq.map((y) => {
      const i = frames.findIndex((f) => f.year >= y);
      return { year: frames[i]?.year ?? y, index: Math.max(0, i) };
    });
  }, [frames]);

  if (!frames.length || !current) {
    return (
      <div className="bg-black p-10 text-center text-sm text-white/40">
        No map frames available yet.
      </div>
    );
  }

  return (
    <section className="bg-black text-white">
      <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="flex flex-col justify-between border-b border-white/[0.06] px-6 py-7 lg:min-h-[720px] lg:border-b-0 lg:border-r lg:border-white/[0.06]">
          <div className="space-y-8">
            <div>
              <p
                className="font-mono text-[42px] leading-none tracking-[0.12em] text-white/90 sm:text-[52px]"
                style={{
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontWeight: 500,
                }}
                key={`y-${year}`}
              >
                {String(year)
                  .split("")
                  .map((ch, i) => (
                    <span key={`${year}-${i}`} className="inline-block w-[0.62em] text-center">
                      {ch}
                    </span>
                  ))}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/40">
                {region === "all" ? headline : REGIONS.find((r) => r.id === region)?.label}
              </p>
              <p
                className="mt-2 text-5xl font-semibold tabular-nums tracking-tight text-white"
                key={`v-${year}-${region}`}
              >
                {region === "all"
                  ? world != null
                    ? formatNumber(world, decimals)
                    : "—"
                  : mean != null
                    ? formatNumber(mean, decimals)
                    : "—"}
              </p>
              <p className="mt-1.5 text-[11px] uppercase tracking-[0.16em] text-white/35">
                {metricLabel}
              </p>
            </div>

            <dl className="space-y-0 text-[13px]">
              {(
                [
                  ["Highest", highest],
                  ["Lowest", lowest],
                ] as const
              ).map(([label, row]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-3 border-t border-white/[0.08] py-3"
                >
                  <dt className="text-[10px] uppercase tracking-[0.16em] text-white/35">
                    {label}
                  </dt>
                  <dd className="text-right">
                    <span className="text-white/90">{row?.name ?? "—"}</span>
                    {row && (
                      <span className="ml-2 tabular-nums text-[#c49660]">
                        {formatNumber(row.value, decimals)}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
              {mean != null && (
                <div className="flex items-baseline justify-between gap-3 border-t border-white/[0.08] py-3">
                  <dt className="text-[10px] uppercase tracking-[0.16em] text-white/35">
                    Mean
                  </dt>
                  <dd className="tabular-nums text-white/80">
                    {formatNumber(mean, decimals)}
                  </dd>
                </div>
              )}
            </dl>

            <div>
              <p className="mb-3 text-[10px] uppercase tracking-[0.16em] text-white/35">
                {frames[0]?.year}–{frames[frames.length - 1]?.year} global trend
              </p>
              <Sparkline values={sparkValues} activeIndex={idx} />
            </div>
          </div>

          {source && (
            <p className="mt-10 text-[10px] leading-relaxed text-white/25">
              Source: {source}
            </p>
          )}
        </aside>

        {/* Map stage */}
        <div className="relative flex min-h-[520px] flex-col lg:min-h-[720px]">
          <div className="relative min-h-0 flex-1">
            <ChoroplethMap
              data={mapData}
              unit={unit}
              decimals={decimals}
              scaleType={scaleType}
              mid={mid}
              domain={domain}
              height={640}
              variant="cinema"
              hideLegend
              focusIso3s={focusIso3s}
              regionMaskIso3s={regionMaskIso3s}
              focusClamp={REGION_VIEW_CLAMP[region] ?? null}
              focusCamera={REGION_CAMERA[region] ?? null}
            />
          </div>

          {/* Region pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 px-4 pb-3 pt-1">
            {REGIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRegion(r.id)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] transition-colors",
                  region === r.id
                    ? "bg-white text-black"
                    : "border border-white/15 text-white/50 hover:border-white/35 hover:text-white/80",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Timeline */}
          <div className="border-t border-white/[0.06] px-5 py-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 text-white/80 transition-colors hover:bg-white/10"
                onClick={() => {
                  if (idx >= frames.length - 1) setIdx(0);
                  setPlaying((p) => !p);
                }}
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
                onClick={() => {
                  setPlaying(false);
                  setIdx(0);
                }}
                aria-label="Reset"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              <div className="min-w-0 flex-1 space-y-1.5">
                <Slider
                  value={[idx]}
                  min={0}
                  max={frames.length - 1}
                  step={1}
                  onValueChange={([v]) => {
                    setPlaying(false);
                    setIdx(v);
                  }}
                  className="w-full [&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&_[role=slider]]:border-white/50 [&_[role=slider]]:bg-white [&_.bg-primary]:bg-white [&_.bg-primary\/20]:bg-white/15"
                />
                <div className="relative h-3.5">
                  {yearTicks.map((t) => (
                    <button
                      key={t.year}
                      type="button"
                      className="absolute top-0 -translate-x-1/2 text-[9px] tabular-nums text-white/30 transition-colors hover:text-white/70"
                      style={{
                        left: `${(t.index / Math.max(1, frames.length - 1)) * 100}%`,
                      }}
                      onClick={() => {
                        setPlaying(false);
                        setIdx(t.index);
                      }}
                    >
                      {t.year}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
