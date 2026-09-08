"use client";

import * as React from "react";
import Link from "next/link";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionHeading } from "@/components/section-heading";
import { PyramidExportDialog, type AxisScale } from "@/components/pyramid-export-dialog";
import {
  CinematicPyramid,
  CINEMA_BG,
  PyramidLegend,
} from "@/components/charts/cinematic-pyramid";
import { HelpImproveData } from "@/components/help-improve-data";
import {
  buildYearlyPyramidFrames,
  maxSingleYearBand,
  type PyramidFrame,
} from "@/lib/pyramid-animation";
import { pyramidReading, type Un2100 } from "@/lib/demography-brief";
import { downloadFile, toCSV } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

const SPEED_PRESETS = [
  { label: "0.5×", ms: 400 },
  { label: "1×", ms: 220 },
  { label: "2×", ms: 110 },
  { label: "4×", ms: 55 },
];

export function PopulationPyramidPlayer({
  countryName,
  countrySlug,
  year,
  male,
  female,
  tfr,
  lifeExpectancy,
  netMigrationAnnual,
  endYear = 2100,
  migrationHeldAtZero = false,
  un2100,
}: {
  countryName: string;
  countrySlug: string;
  year: number;
  male: number[];
  female: number[];
  tfr: number | null;
  lifeExpectancy: number | null;
  netMigrationAnnual: number | null;
  endYear?: number;
  migrationHeldAtZero?: boolean;
  un2100?: Un2100 | null;
}) {
  const canProject = tfr != null && tfr > 0 && lifeExpectancy != null && lifeExpectancy > 0;
  const captureRef = React.useRef<HTMLDivElement>(null);
  const [frameIdx, setFrameIdx] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [speedMs, setSpeedMs] = React.useState(220);
  const [recording, setRecording] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [axisScale, setAxisScale] = React.useState<AxisScale>("fixed");
  const [copied, setCopied] = React.useState(false);
  const startIdxRef = React.useRef(0);

  const frames = React.useMemo<PyramidFrame[]>(() => {
    if (!canProject) {
      const total = male.reduce((s, v, i) => s + v + (female[i] ?? 0), 0);
      return [{ year, male, female, total }];
    }
    return buildYearlyPyramidFrames({
      male,
      female,
      startYear: year,
      endYear,
      params: {
        tfr,
        lifeExpectancy,
        netMigrationPerStep: (netMigrationAnnual ?? 0) * 5,
      },
    });
  }, [male, female, year, endYear, tfr, lifeExpectancy, netMigrationAnnual, canProject]);

  const maxValue = React.useMemo(() => maxSingleYearBand(frames), [frames]);
  const current = frames[Math.min(frameIdx, frames.length - 1)] ?? frames[0];
  const chartMax =
    (recording || exportOpen) && axisScale === "fit" && current
      ? maxSingleYearBand([current])
      : maxValue;

  React.useEffect(() => {
    setFrameIdx(0);
  }, [frames.length, year]);

  React.useEffect(() => {
    if (!playing || frames.length < 2) return;
    const t = setInterval(() => {
      setFrameIdx((i) => {
        if (i >= frames.length - 1) {
          setPlaying(false);
          return frames.length - 1;
        }
        return i + 1;
      });
    }, speedMs);
    return () => clearInterval(t);
  }, [playing, frames.length, speedMs]);

  const togglePlay = () => {
    if (frameIdx >= frames.length - 1) setFrameIdx(0);
    setPlaying((p) => !p);
  };

  const applyExportFrame = React.useCallback(
    (i: number) =>
      new Promise<void>((resolve) => {
        setFrameIdx(i);
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
    [],
  );

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/country/${countrySlug}#demography`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const handleCsv = () => {
    const rows = frames.map((fr) => ({
      year: fr.year,
      total: Math.round(fr.total),
      male: Math.round(fr.male.reduce((s, v) => s + v, 0)),
      female: Math.round(fr.female.reduce((s, v) => s + v, 0)),
    }));
    downloadFile(
      `${countrySlug}-pyramid-projection.csv`,
      `# ${countryName}\n# Population pyramid projection\n# birthrate.io/country/${countrySlug}\n${toCSV(rows)}`,
    );
  };

  const handlePng = async () => {
    const node = captureRef.current;
    if (!node) return;
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(node, {
      pixelRatio: 2,
      backgroundColor: CINEMA_BG,
      cacheBust: true,
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${countrySlug}-pyramid-${current?.year ?? year}.png`;
    a.click();
  };

  if (!current) {
    return (
      <p className="text-sm text-muted-foreground">No age-structure data available.</p>
    );
  }

  const first = frames[0];
  const last = frames[frames.length - 1];
  const reading =
    first && last && last.year > first.year
      ? pyramidReading({
          country: countryName,
          startYear: first.year,
          startPop: first.total,
          endYear: last.year,
          endPop: last.total,
          tfr,
          un: un2100,
          migrationHeldAtZero,
        })
      : null;
  const maleTotal = current.male.reduce((s, v) => s + v, 0);
  const femaleTotal = current.female.reduce((s, v) => s + v, 0);
  const sharePath = `/country/${countrySlug}`;

  return (
    <section className="scroll-mt-28 border-t border-border pt-5">
      <div className="br-chart-share bg-background px-0.5">
        <div className="br-share-masthead mb-3 flex items-baseline justify-between gap-3 border-b border-border/80 pb-2">
          <p className="br-share-subject min-w-0 truncate font-serif text-sm font-semibold tracking-tight text-primary md:text-base">
            {countryName}
          </p>
          <p className="br-share-site shrink-0 text-[0.7rem] font-medium text-muted-foreground">
            {siteConfig.name}
          </p>
        </div>
        <SectionHeading
          className="br-share-heading"
          title={`Population pyramid to ${endYear}`}
          description={
            reading?.headline ??
            `World Bank ${year} age–sex structure.`
          }
          actions={
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <button type="button" onClick={handleCsv} className="link-editorial font-medium">
                Download CSV
              </button>
              <button type="button" onClick={handlePng} className="link-editorial font-medium">
                Download PNG
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="link-editorial font-medium"
              >
                {copied ? "Copied" : "Copy link"}
              </button>
              <button
                type="button"
                disabled={recording || frames.length < 2}
                className="link-editorial font-medium disabled:opacity-50"
                onClick={() => {
                  setPlaying(false);
                  setExportOpen(true);
                }}
              >
                Export animation
              </button>
              <Link href={`/simulator?country=${countrySlug}`} className="link-editorial font-medium">
                Custom scenario
              </Link>
            </div>
          }
        />
        {reading ? (
          <p className="mb-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {reading.body}
          </p>
        ) : null}

        <div className="mx-auto w-full max-w-2xl">
          <div ref={captureRef} className="bg-background">
            <PyramidLegend
              year={current.year}
              total={current.total}
              maleTotal={maleTotal}
              femaleTotal={femaleTotal}
            />
            <CinematicPyramid
              country={countryName}
              year={current.year}
              male={current.male}
              female={current.female}
              maxValue={chartMax}
            />
          </div>

          {frames.length > 1 && (
            <div className="sticky bottom-0 z-10 mt-3 flex flex-wrap items-center gap-3 border-t border-border bg-background/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <Button
                variant="outline"
                size="icon"
                onClick={togglePlay}
                disabled={recording}
                aria-label={playing ? "Pause" : "Play"}
                title={playing ? "Pause" : "Play through time"}
                className="h-8 w-8 shrink-0"
              >
                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </Button>
              <Select
                value={String(speedMs)}
                onValueChange={(v) => setSpeedMs(Number(v))}
                disabled={recording}
              >
                <SelectTrigger className="h-8 w-[4.5rem] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPEED_PRESETS.map((s) => (
                    <SelectItem key={s.ms} value={String(s.ms)}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="w-10 text-xs tabular-nums text-muted-foreground">
                {frames[0]?.year}
              </span>
              <Slider
                value={[frameIdx]}
                min={0}
                max={Math.max(0, frames.length - 1)}
                step={1}
                disabled={recording}
                onValueChange={([v]) => {
                  setPlaying(false);
                  setFrameIdx(v);
                }}
                className="min-w-[8rem] flex-1"
              />
              <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                {frames[frames.length - 1]?.year}
              </span>
            </div>
          )}
        </div>

        <div className="br-share-footer mt-3 space-y-1">
          <p className="br-share-source text-xs text-muted-foreground">
            Source: World Bank population by age and sex (starting pyramid) · birthrate.io
            cohort model (future years)
          </p>
          <p className="br-share-url text-[0.7rem] text-muted-foreground/80">
            birthrate.io{sharePath}
          </p>
        </div>
      </div>
      <div className="mt-1.5">
        <HelpImproveData context={`${countryName} — Population pyramid`} />
      </div>

      {first && last && (
        <PyramidExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          minYear={first.year}
          maxYear={last.year}
          fileBase={`${countrySlug}-pyramid`}
          getNode={() => captureRef.current}
          frameYears={frames.map((fr) => fr.year)}
          applyFrameIndex={applyExportFrame}
          axisScale={axisScale}
          onAxisScaleChange={setAxisScale}
          onStart={() => {
            startIdxRef.current = frameIdx;
            setPlaying(false);
            setRecording(true);
          }}
          onDone={() => {
            setRecording(false);
            setFrameIdx(startIdxRef.current);
          }}
        />
      )}
    </section>
  );
}
