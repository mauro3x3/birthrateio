"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { AnimationExportButton } from "@/components/animation-export-button";
import { HelpImproveData } from "@/components/help-improve-data";
import { buildColorScale, type ScaleType } from "@/lib/color-scale";
import { cn, formatByUnit, slugify } from "@/lib/utils";
import type { ChoroplethDatum } from "./choropleth-map";

const ChoroplethMap = dynamic(
  () => import("./choropleth-map").then((m) => m.ChoroplethMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[380px] w-full items-center justify-center bg-muted/40 text-sm text-muted-foreground">
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
    return "Teal = net in, copper = net out.";
  }
  if (unit === "US$" || unit === "$") {
    return "Darker = higher GDP per capita.";
  }
  return "Darker = higher value. Hover a country for details.";
}

export function MapCard({
  id,
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
  appearance = "cinema",
}: {
  /** Anchor target; also picked up by the in-page table of contents. */
  id?: string;
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
  /** Cinema = dark stage. Light = atlas paper (readable for learning). */
  appearance?: "cinema" | "light";
}) {
  const lastIdx = Math.max(0, frames.length - 1);
  const [idx, setIdx] = React.useState(lastIdx);
  const [playing, setPlaying] = React.useState(false);
  const [recording, setRecording] = React.useState(false);
  const captureRef = React.useRef<HTMLDivElement>(null);
  const startIdxRef = React.useRef(0);
  const cinema = appearance === "cinema";

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

  const resolvedScale = React.useMemo((): ScaleType => {
    if (!cinema) {
      if (scaleType === "diverging-growth-dark") return "diverging-growth";
      if (scaleType === "diverging-dark") return "diverging";
      if (scaleType === "sequential-dark") return "sequential";
      return scaleType;
    }
    if (scaleType === "diverging-growth" || scaleType === "diverging-growth-dark")
      return "diverging-growth-dark";
    if (scaleType === "diverging" || scaleType === "diverging-dark")
      return "diverging-dark";
    if (scaleType === "sequential" || scaleType === "sequential-dark")
      return "sequential-dark";
    return scaleType;
  }, [cinema, scaleType]);

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
    return buildColorScale(sample, resolvedScale, mid, domain);
  }, [resolvedScale, current?.data, domain, mid]);

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
      <header className="flex flex-col gap-2 border-b border-border px-4 py-2.5 sm:px-5 lg:flex-row lg:items-center lg:gap-4">
        <div className="min-w-0 shrink-0 lg:max-w-sm">
          <h2
            id={id}
            className="scroll-mt-24 font-serif text-lg font-semibold tracking-tight text-primary sm:text-xl"
          >
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {animatable ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
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

            <span className="w-11 shrink-0 text-sm font-semibold tabular-nums text-primary">
              {current?.year ?? "—"}
            </span>

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
        ) : (
          <p className="text-sm font-semibold tabular-nums text-primary lg:ml-auto">
            {current?.year ?? "—"}
          </p>
        )}
      </header>

      <div
        ref={captureRef}
        className={cn(
          "relative",
          cinema ? "bg-black" : "bg-[hsl(40_22%_94%)]",
        )}
      >
        {current && (
          <div
            className={cn(
              "pointer-events-none absolute left-3 top-3 z-[500] px-2 py-1 font-sans text-sm font-semibold tabular-nums backdrop-blur-sm",
              cinema
                ? "rounded-sm bg-black/55 text-white"
                : "rounded-sm border border-border/70 bg-card/95 text-primary shadow-sm",
            )}
          >
            {current.year}
            {currentStat ? (
              <span
                className={cn(
                  "ml-2 font-sans text-[0.7rem] font-normal",
                  cinema ? "text-white/70" : "text-muted-foreground",
                )}
              >
                {currentStat}
              </span>
            ) : null}
          </div>
        )}
        {gradientCss && (
          <div
            className={cn(
              "pointer-events-none absolute bottom-3 left-3 z-[500] px-3 py-2 backdrop-blur-sm",
              cinema
                ? "rounded-sm bg-black/55"
                : "rounded-sm border border-border/70 bg-card/95 shadow-sm",
            )}
            aria-label={scaleHint(unit, resolvedScale)}
          >
            <div
              className="h-1.5 w-36 rounded-full"
              style={{ background: gradientCss }}
              aria-hidden
            />
            <div
              className={cn(
                "mt-1.5 flex w-36 justify-between text-[10px] tabular-nums",
                cinema ? "text-white/50" : "text-muted-foreground",
              )}
            >
              <span>{fmt(scale.min)}</span>
              {scale.mid !== undefined && (
                <span className={cinema ? "text-white/75" : "text-foreground/80"}>
                  {fmt(scale.mid)}
                </span>
              )}
              <span>{fmt(scale.max)}</span>
            </div>
            {!cinema && resolvedScale.includes("diverging") && (
              <p className="mt-1 text-[9px] text-muted-foreground">
                Copper = net out · Teal = net in
              </p>
            )}
          </div>
        )}
        <ChoroplethMap
          data={current?.data ?? []}
          unit={unit}
          decimals={decimals}
          scaleType={resolvedScale}
          mid={mid}
          domain={domain}
          height={height}
          variant={cinema ? "cinema" : "immersive"}
          hideLegend
        />
      </div>

      {source && (
        <div className="space-y-1.5 border-t border-border px-4 py-2 sm:px-5">
          <p className="text-[0.7rem] text-muted-foreground">
            Source: {source}
            {current ? ` · ${current.year}` : ""}
            {current
              ? ` · ${current.data.length.toLocaleString()} countries`
              : ""}
            {unit ? ` · ${unit}` : ""}
          </p>
          <HelpImproveData context={title} />
        </div>
      )}
    </section>
  );
}
