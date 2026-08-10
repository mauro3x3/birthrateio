"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { AnimationExportButton } from "@/components/animation-export-button";
import { buildColorScale, type ScaleType } from "@/lib/color-scale";
import { formatByUnit, slugify } from "@/lib/utils";
import type { ChoroplethDatum } from "./choropleth-map";

const ChoroplethMap = dynamic(
  () => import("./choropleth-map").then((m) => m.ChoroplethMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[480px] w-full items-center justify-center bg-black text-sm text-white/30">
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
  if (scaleType?.includes("diverging")) {
    return "Colours diverge around the midpoint — lighter near the middle, stronger toward the extremes.";
  }
  if (unit === "US$" || unit === "$") {
    return "Darker = higher GDP per capita. Hover a country for its value.";
  }
  if (unit?.includes("%")) {
    return "Darker = higher value. Hover a country for its figure.";
  }
  return "Darker areas show higher values. Hover a country for details.";
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
  height = 480,
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
      <header className="border-b border-border px-5 py-4">
        <h2 className="font-serif text-xl font-semibold tracking-tight text-primary">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </header>

      {/* Context strip — year, world figure, colour meaning */}
      <div className="grid gap-5 border-b border-border bg-muted/35 px-5 py-4 sm:grid-cols-3">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Year shown
          </p>
          <p className="mt-1 font-serif text-3xl font-semibold tabular-nums text-primary">
            {current?.year ?? "—"}
          </p>
          {animatable && firstYear != null && lastYear != null && (
            <p className="mt-1 text-xs text-muted-foreground">
              Timeline {firstYear}–{lastYear}. Use play or the slider below.
            </p>
          )}
        </div>

        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {frameStats?.length ? "World figure" : "Selected year"}
          </p>
          <p className="mt-1 font-serif text-2xl font-semibold tracking-tight text-foreground">
            {currentStat ??
              (current
                ? `${current.data.length.toLocaleString()} countries`
                : "—")}
          </p>
          {unit && (
            <p className="mt-1 text-xs text-muted-foreground">
              Unit: {unit}
              {decimals === 0 ? " (rounded)" : ""}
            </p>
          )}
        </div>

        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Colour scale
          </p>
          {gradientCss && (
            <div className="mt-2 space-y-1.5">
              <div
                className="h-2.5 w-full max-w-[14rem] rounded-sm"
                style={{ background: gradientCss }}
                aria-hidden
              />
              <div className="flex max-w-[14rem] justify-between text-xs tabular-nums text-muted-foreground">
                <span>{fmt(scale.min)}</span>
                {scale.mid !== undefined && (
                  <span className="text-foreground/70">{fmt(scale.mid)}</span>
                )}
                <span>{fmt(scale.max)}</span>
              </div>
              <p className="text-xs leading-snug text-muted-foreground">
                {scaleHint(unit, cinemaScale)}
              </p>
            </div>
          )}
        </div>
      </div>

      <div ref={captureRef} className="bg-black">
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

      {animatable && (
        <div className="flex flex-col gap-3 border-t border-border bg-card px-5 py-3.5 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            size="sm"
            disabled={recording}
            className="shrink-0 gap-1.5 rounded-none"
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
            {playing ? "Pause" : "Play over time"}
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="hidden w-10 shrink-0 text-xs tabular-nums text-muted-foreground sm:block">
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
            <span className="hidden w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:block">
              {lastYear}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="font-serif text-lg font-semibold tabular-nums text-primary sm:w-14 sm:text-right">
              {current?.year}
            </span>
            <AnimationExportButton
              getNode={() => captureRef.current}
              frameCount={frames.length}
              renderFrame={renderExportFrame}
              holdMs={650}
              fileBase={`${slugify(title)}-map`}
              disabled={recording}
              className="rounded-none"
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
        </div>
      )}

      {source && (
        <p className="border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
          Source: {source}
          {current ? ` · Map year ${current.year}` : ""}
          {unit ? ` · Values in ${unit}` : ""}
        </p>
      )}
    </section>
  );
}
