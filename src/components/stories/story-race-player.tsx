"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";
import { AnimationExportButton } from "@/components/animation-export-button";
import { BarChartRaceFrame } from "@/components/stories/bar-chart-race";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ASPECTS,
  type AspectId,
  type StoryPack,
} from "@/lib/stories";
import { cn } from "@/lib/utils";

const SPEEDS = [
  { label: "0.5×", ms: 1400 },
  { label: "1×", ms: 900 },
  { label: "2×", ms: 500 },
];

function lerpYearIndex(years: number[], t: number): number {
  if (years.length <= 1) return 0;
  return Math.min(years.length - 1, Math.max(0, Math.round(t)));
}

export function StoryRacePlayer({ pack }: { pack: StoryPack }) {
  const [yearIdx, setYearIdx] = React.useState(0);
  const [playing, setPlaying] = React.useState(true);
  const [speedMs, setSpeedMs] = React.useState(900);
  const [aspect, setAspect] = React.useState<AspectId>("landscape");
  const frameRef = React.useRef<HTMLDivElement>(null);
  const year = pack.years[yearIdx] ?? pack.years[0];
  const aspectDef = ASPECTS.find((a) => a.id === aspect) ?? ASPECTS[0];
  const compact = aspect !== "landscape";

  React.useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setYearIdx((i) => {
        if (i >= pack.years.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, speedMs);
    return () => window.clearInterval(id);
  }, [playing, speedMs, pack.years.length]);

  const renderFrame = React.useCallback(
    async (i: number) => {
      setPlaying(false);
      setYearIdx(lerpYearIndex(pack.years, i));
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );
      await new Promise((r) => setTimeout(r, 40));
    },
    [pack.years],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            if (yearIdx >= pack.years.length - 1) setYearIdx(0);
            setPlaying((p) => !p);
          }}
        >
          {playing ? (
            <>
              <Pause className="h-4 w-4" /> Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> Play
            </>
          )}
        </Button>

        <div className="flex items-center gap-1 rounded-sm border border-border p-0.5">
          {SPEEDS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setSpeedMs(s.ms)}
              className={cn(
                "rounded-sm px-2 py-1 text-xs",
                speedMs === s.ms
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-sm border border-border p-0.5">
          {ASPECTS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAspect(a.id)}
              title={a.hint}
              className={cn(
                "rounded-sm px-2 py-1 text-xs",
                aspect === a.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {a.label}
            </button>
          ))}
        </div>

        <AnimationExportButton
          getNode={() => frameRef.current}
          frameCount={pack.years.length}
          renderFrame={renderFrame}
          holdMs={Math.max(450, Math.round(speedMs * 0.85))}
          fileBase={`birthrate-story-${pack.slug}-${aspect}`}
          onStart={() => setPlaying(false)}
          className="ml-auto"
        />
      </div>

      <div className="flex justify-center overflow-auto rounded-sm border border-border bg-muted/30 p-3 sm:p-5">
        <div
          ref={frameRef}
          className="overflow-hidden rounded-sm shadow-md"
          style={{
            width: aspectDef.width,
            height: aspectDef.height,
            maxWidth: "100%",
          }}
        >
          <BarChartRaceFrame pack={pack} year={year} compact={compact} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="w-12 shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
          {year}
        </span>
        <Slider
          min={0}
          max={pack.years.length - 1}
          step={1}
          value={[yearIdx]}
          onValueChange={(v) => {
            setPlaying(false);
            setYearIdx(v[0] ?? 0);
          }}
          className="flex-1"
        />
        <span className="w-12 shrink-0 text-right font-mono text-sm tabular-nums text-muted-foreground">
          {pack.years[pack.years.length - 1]}
        </span>
      </div>
    </div>
  );
}
