"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Pause, Play } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimationExportButton } from "@/components/animation-export-button";
import { slugify } from "@/lib/utils";
import type { ChoroplethDatum } from "./choropleth-map";
import type { ScaleType } from "@/lib/color-scale";

const ChoroplethMap = dynamic(
  () => import("./choropleth-map").then((m) => m.ChoroplethMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[480px] w-full rounded-lg" />,
  },
);

export interface MapFrame {
  year: number;
  data: ChoroplethDatum[];
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
  /** Optional per-year readout (e.g. world average) shown in the header. */
  frameStats?: { year: number; label: string }[];
  height?: number;
}) {
  const [idx, setIdx] = React.useState(frames.length - 1);
  const [playing, setPlaying] = React.useState(false);
  const [recording, setRecording] = React.useState(false);
  const captureRef = React.useRef<HTMLDivElement>(null);
  const startIdxRef = React.useRef(0);

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

  const current = frames[Math.min(idx, frames.length - 1)] ?? frames[0];
  const animatable = frames.length > 1;

  // One fixed colour domain across every frame so "low" and "high" mean the
  // same thing in every year (2nd–98th percentile of all values pooled).
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

  const statByYear = React.useMemo(() => {
    const m = new Map<number, string>();
    for (const s of frameStats ?? []) m.set(s.year, s.label);
    return m;
  }, [frameStats]);
  const currentStat = current ? statByYear.get(current.year) : undefined;

  // Leaflet re-paints the choropleth when the year changes; give it a beat.
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
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {current && (
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-md bg-muted px-2.5 py-1 text-sm font-semibold tabular-nums">
              {current.year}
            </span>
            {currentStat && (
              <span className="text-xs font-medium text-muted-foreground">
                {currentStat}
              </span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div ref={captureRef} className="rounded-lg bg-card">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="font-serif text-sm font-semibold">{title}</p>
            <span className="text-sm font-semibold tabular-nums text-muted-foreground">
              {currentStat ? `${currentStat} · ` : ""}
              {current?.year}
            </span>
          </div>
          <ChoroplethMap
            data={current?.data ?? []}
            unit={unit}
            decimals={decimals}
            scaleType={scaleType}
            mid={mid}
            domain={domain}
            height={height}
          />
        </div>

        {animatable && (
          <div className="mt-4 flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              disabled={recording}
              onClick={() => {
                if (idx >= frames.length - 1) setIdx(0);
                setPlaying((p) => !p);
              }}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Slider
              value={[idx]}
              min={0}
              max={frames.length - 1}
              step={1}
              disabled={recording}
              onValueChange={([v]) => {
                setPlaying(false);
                setIdx(v);
              }}
              className="flex-1"
            />
            <span className="w-12 text-right text-sm tabular-nums text-muted-foreground">
              {current?.year}
            </span>
            <AnimationExportButton
              getNode={() => captureRef.current}
              frameCount={frames.length}
              renderFrame={renderExportFrame}
              holdMs={650}
              fileBase={`${slugify(title)}-map`}
              disabled={recording}
              onStart={() => {
                startIdxRef.current = idx;
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

        {source && (
          <p className="mt-3 text-xs text-muted-foreground">Source: {source}</p>
        )}
      </CardContent>
    </Card>
  );
}
