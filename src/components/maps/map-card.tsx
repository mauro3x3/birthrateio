"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { AnimationExportButton } from "@/components/animation-export-button";
import { HelpImproveData } from "@/components/help-improve-data";
import { buildColorScale, type ScaleType } from "@/lib/color-scale";
import { formatByUnit, slugify } from "@/lib/utils";
import type { ChoroplethDatum } from "./choropleth-map";

const ChoroplethMap = dynamic(
  () => import("./choropleth-map").then((m) => m.ChoroplethMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[380px] w-full items-center justify-center bg-black text-sm text-white/30">
        Loading map…
      </div>
    ),
  },
);

export interface MapFrame {
  year: number;
  data: ChoroplethDatum[];
}

function scaleHint(unit?: string, scaleType?: ScaleType): string {
  if (scaleType?.includes("growth")) {
    return "Blue = growing, red = shrinking.";
  }
  if (scaleType?.includes("diverging")) {
    return "Stronger colours = farther from the midpoint.";
  }
  if (unit === "US$" || unit === "$") {
    return "Darker = higher GDP per capita.";
  }
  return "Darker = higher value. Hover a country for details.";
}

export function MapCard({
  title,
  description,
  source,
  frames,
  unit,
  decimals = 2,
  scaleType = "sequential",
  mid,
  frameStats,
  height = 400,
}: {
  title: string;
  description?: string;
  source?: string;
  frames: MapFrame[];
  unit?: string;
  decimals?: number;
  scaleType?: ScaleType;
  mid?: number;
  /** Optional per-year readout (e.g. world average) shown in the context strip. */
  frameStats?: { year: number; label: string }[];
  height?: number;
}) {
  const lastIdx = Math.max(0, frames.length - 1);
  const [idx, setIdx] = React.useState(lastIdx);
  const [playing, setPlaying] = React.useState(false);
  const [recording, setRecording] = React.useState(false);
  const captureRef = React.useRef<HTMLDivElement>(null);
  const startIdxRef = React.useRef(0);

  React.useEffect(() => {
    setIdx(Math.max(0, frames.length - 1));
  }, [frames.length]);

  React.useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setIdx((i) => {
        if (i >= frames.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 450);
    return () => clearInterval(t);
  }, [playing, frames.length]);

  const safeIdx = Math.min(Math.max(idx, 0), lastIdx);
  const current = frames[safeIdx] ?? frames[0];
  const animatable = frames.length > 1;
  const firstYear = frames[0]?.year;
  const lastYear = frames[lastIdx]?.year;

  const cinemaScale = React.useMemo((): ScaleType => {
    if (scaleType === "diverging-growth" || scaleType === "diverging-growth-dark")
      return "diverging-growth-dark";
    if (scaleType === "diverging" || scaleType === "diverging-dark")
      return "diverging-dark";
    if (scaleType === "sequential" || scaleType === "sequential-dark")
      return "sequential-dark";
    return scaleType;
  }, [scaleType]);

  const domain = React.useMemo(() => {
    const vals: number[] = [];
    for (const f of frames)
      for (const d of f.data) if (Number.isFinite(d.value)) vals.push(d.value);
    if (vals.length === 0) return undefined;
    vals.sort((a, b) => a - b);
    const q = (p: number) =>
      vals[Math.min(vals.length - 1, Math.floor(p * (vals.length - 1)))];
    return { min: q(0.02), max: q(0.98) };
  }, [frames]);

  const scale = React.useMemo(() => {
    const sample = current?.data.map((d) => d.value) ?? [];
    return buildColorScale(sample, cinemaScale, mid, domain);
  }, [cinemaScale, current?.data, domain, mid]);

  const gradientCss = React.useMemo(() => {
    if (scale.legend.length < 2) return undefined;
    return `linear-gradient(90deg, ${scale.legend
      .map((s, i, arr) => `${s.color} ${(i / (arr.length - 1)) * 100}%`)
      .join(", ")})`;
  }, [scale.legend]);

  const statByYear = React.useMemo(() => {
    const m = new Map<number, string>();
    for (const s of frameStats ?? []) m.set(s.year, s.label);
    return m;
  }, [frameStats]);
  const currentStat = current ? statByYear.get(current.year) : undefined;

  const fmt = (v: number) => formatByUnit(v, unit, decimals);

  const renderExportFrame = React.useCallback(
    (i: number) =>
      new Promise<void>((resolve) => {
        setIdx(i);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => setTimeout(resolve, 160)),
        );
      }),
    [],
  );

  return (
    <section className="overflow-hidden border border-border bg-card">
      {/* Title + key figures — one compact band */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="min-w-0 max-w-xl">
          <h2 className="font-serif text-lg font-semibold tracking-tight text-primary sm:text-xl">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Year
            </p>
            <p className="font-serif text-2xl font-semibold tabular-nums leading-none text-primary">
              {current?.year ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {frameStats?.length ? "World" : "Coverage"}
            </p>
            <p className="font-serif text-lg font-semibold leading-tight tabular-nums">
              {currentStat ??
                (current
                  ? `${current.data.length.toLocaleString()} countries`
                  : "—")}
            </p>
            {unit && (
              <p className="text-[0.7rem] text-muted-foreground">
                {unit}
                {decimals === 0 ? " · rounded" : ""}
              </p>
            )}
          </div>
          {gradientCss && (
            <div className="min-w-[10rem]">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Scale
              </p>
              <div
                className="mt-1 h-2 w-full max-w-[12rem] rounded-sm"
                style={{ background: gradientCss }}
                aria-hidden
              />
              <div className="mt-1 flex max-w-[12rem] justify-between text-[0.7rem] tabular-nums text-muted-foreground">
                <span>{fmt(scale.min)}</span>
                {scale.mid !== undefined && <span>{fmt(scale.mid)}</span>}
                <span>{fmt(scale.max)}</span>
              </div>
              <p className="mt-0.5 max-w-[14rem] text-[0.7rem] leading-snug text-muted-foreground">
                {scaleHint(unit, cinemaScale)}
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Timeline ABOVE the map — always in view with the figures */}
      {animatable && (
        <div className="flex flex-col gap-2 border-b border-border bg-muted/30 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-3 sm:px-5">
          <Button
            variant="outline"
            size="sm"
            disabled={recording}
            className="h-8 shrink-0 gap-1.5 rounded-none px-2.5"
            onClick={() => {
              if (safeIdx >= frames.length - 1) setIdx(0);
              setPlaying((p) => !p);
            }}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {playing ? "Pause" : "Play"}
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="w-9 shrink-0 text-[0.7rem] tabular-nums text-muted-foreground">
              {firstYear}
            </span>
            <Slider
              value={[safeIdx]}
              min={0}
              max={lastIdx}
              step={1}
              disabled={recording}
              onValueChange={([v]) => {
                setPlaying(false);
                setIdx(v);
              }}
              className="flex-1"
              aria-label="Year"
            />
            <span className="w-9 shrink-0 text-right text-[0.7rem] tabular-nums text-muted-foreground">
              {lastYear}
            </span>
          </div>

          <AnimationExportButton
            getNode={() => captureRef.current}
            frameCount={frames.length}
            renderFrame={renderExportFrame}
            holdMs={650}
            fileBase={`${slugify(title)}-map`}
            disabled={recording}
            className="h-8 rounded-none"
            onStart={() => {
              startIdxRef.current = safeIdx;
              setPlaying(false);
              setRecording(true);
            }}
            onDone={() => {
              setRecording(false);
              setIdx(startIdxRef.current);
            }}
          />
        </div>
      )}

      <div ref={captureRef} className="relative bg-black">
        {/* Year badge burned into export frames */}
        {current && (
          <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-sm bg-black/55 px-2 py-1 font-serif text-sm font-semibold tabular-nums text-white backdrop-blur-sm">
            {current.year}
            {currentStat ? (
              <span className="ml-2 font-sans text-[0.7rem] font-normal text-white/70">
                {currentStat}
              </span>
            ) : null}
          </div>
        )}
        <ChoroplethMap
          data={current?.data ?? []}
          unit={unit}
          decimals={decimals}
          scaleType={cinemaScale}
          mid={mid}
          domain={domain}
          height={height}
          variant="cinema"
          hideLegend
        />
      </div>

      {source && (
        <div className="space-y-1.5 border-t border-border px-4 py-2 sm:px-5">
          <p className="text-[0.7rem] text-muted-foreground">
            Source: {source}
            {current ? ` · ${current.year}` : ""}
            {unit ? ` · ${unit}` : ""}
          </p>
          <HelpImproveData context={title} />
        </div>
      )}
    </section>
  );
}
