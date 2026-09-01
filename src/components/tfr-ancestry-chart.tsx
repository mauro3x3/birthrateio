"use client";

import * as React from "react";
import { ChartCard } from "@/components/charts/chart-card";
import { MultiSeriesChart } from "@/components/charts/multi-series-chart";
import { Slider } from "@/components/ui/slider";
import { CollapsibleSection } from "@/components/collapsible-section";
import {
  tfrAncestryOverlay,
  type TfrAncestryPack,
} from "@/lib/sources/tfr-by-ancestry-data";
import { cn } from "@/lib/utils";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function TfrAncestryChart({
  pack,
  className,
}: {
  pack: TfrAncestryPack;
  className?: string;
}) {
  const { rows, series } = React.useMemo(
    () => tfrAncestryOverlay(pack),
    [pack],
  );
  const spanMin = rows[0]?.year as number | undefined;
  const spanMax = rows[rows.length - 1]?.year as number | undefined;
  const [fromYear, setFromYear] = React.useState<number | null>(
    pack.defaultFrom ?? null,
  );
  const [toYear, setToYear] = React.useState<number | null>(null);

  if (spanMin == null || spanMax == null) return null;

  const start = fromYear == null ? spanMin : clamp(fromYear, spanMin, spanMax);
  const end = toYear == null ? spanMax : clamp(toYear, spanMin, spanMax);
  const windowStart = Math.min(start, end);
  const windowEnd = Math.max(start, end);
  const zoomed = windowStart > spanMin || windowEnd < spanMax;

  const visible = rows.filter((row) => {
    const y = row.year;
    return typeof y === "number" && y >= windowStart && y <= windowEnd;
  });

  const setWindow = (a: number, b: number) => {
    const lo = clamp(Math.min(a, b), spanMin, spanMax);
    const hi = clamp(Math.max(a, b), spanMin, spanMax);
    setFromYear(lo === spanMin ? null : lo);
    setToYear(hi === spanMax ? null : hi);
  };

  return (
    <div className={className}>
      <ChartCard
        title={
          pack.headline ??
          `Total fertility rate by ancestry — ${pack.country}`
        }
        description={`Children per woman · ${windowStart}–${windowEnd}. Drag the handles to stretch the dates.`}
        source={pack.source}
        csvRows={visible}
        csvName={`${pack.slug}-tfr-by-ancestry-${windowStart}-${windowEnd}`}
      >
        <MultiSeriesChart
          data={visible}
          series={series}
          unit={pack.unit}
          decimals={pack.decimals}
          height={380}
          referenceY={2.1}
          referenceLabel="Replacement"
        />
        {spanMax > spanMin ? (
          <div
            data-export-ignore
            className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
          >
            <select
              aria-label="Start year"
              className="h-8 w-[5.5rem] shrink-0 rounded-none border border-input bg-background px-2 text-sm tabular-nums outline-none focus:border-ring"
              value={windowStart}
              onChange={(e) => setWindow(Number(e.target.value), windowEnd)}
            >
              {Array.from(
                { length: spanMax - spanMin + 1 },
                (_, i) => spanMin + i,
              ).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <Slider
              className="min-w-0 flex-1"
              min={spanMin}
              max={spanMax}
              step={1}
              value={[windowStart, windowEnd]}
              onValueChange={([a, b]) => {
                if (a == null || b == null) return;
                setWindow(a, b);
              }}
              aria-label="Year range"
            />
            <select
              aria-label="End year"
              className="h-8 w-[5.5rem] shrink-0 rounded-none border border-input bg-background px-2 text-sm tabular-nums outline-none focus:border-ring"
              value={windowEnd}
              onChange={(e) => setWindow(windowStart, Number(e.target.value))}
            >
              {Array.from(
                { length: spanMax - spanMin + 1 },
                (_, i) => spanMin + i,
              ).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <div className="flex shrink-0 items-center gap-3 text-xs">
              {pack.defaultFrom != null && spanMin < pack.defaultFrom ? (
                <button
                  type="button"
                  className={cn(
                    "font-medium",
                    windowStart === pack.defaultFrom && windowEnd === spanMax
                      ? "text-foreground"
                      : "link-editorial",
                  )}
                  onClick={() => setWindow(pack.defaultFrom!, spanMax)}
                >
                  Since {pack.defaultFrom}
                </button>
              ) : null}
              {zoomed ? (
                <button
                  type="button"
                  className="link-editorial font-medium"
                  onClick={() => {
                    setFromYear(null);
                    setToYear(null);
                  }}
                >
                  Full series
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          <a
            href={pack.statbank}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            Open the source table
          </a>
          {pack.sourceUrl !== pack.statbank ? (
            <>
              {" "}
              ·{" "}
              <a
                href={pack.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                Statistical office
              </a>
            </>
          ) : null}
        </p>
        <CollapsibleSection title="More about the figure">
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {pack.definition}{" "}
            Replacement-level fertility is marked at 2.1 children per woman.
            Group sizes differ sharply — descendant series in particular can
            jump around when the number of women is small.
          </p>
        </CollapsibleSection>
      </ChartCard>
    </div>
  );
}
