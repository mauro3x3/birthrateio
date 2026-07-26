"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/stat-card";
import { ChartCard } from "@/components/charts/chart-card";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { PopulationPyramid } from "@/components/charts/population-pyramid";
import { CountrySelect } from "@/components/country-select";
import { AnimationExportButton } from "@/components/animation-export-button";
import type { CountryOption } from "@/components/country-multi-select";
import {
  AGE_GROUPS,
  AGE_STARTS,
  buildStablePopulation,
  project,
  summarize,
} from "@/lib/demography";
import { formatCompact } from "@/lib/utils";

const TFR_PRESETS = [
  { label: "1.0 — Ultra-low", value: 1.0 },
  { label: "1.5 — Low", value: 1.5 },
  { label: "2.1 — Replacement", value: 2.1 },
  { label: "3.0 — High", value: 3.0 },
  { label: "5.0 — Very high", value: 5.0 },
];

const SPEED_PRESETS = [
  { label: "0.5×", ms: 900 },
  { label: "1×", ms: 450 },
  { label: "2×", ms: 220 },
  { label: "4×", ms: 110 },
];

interface CountryStats {
  name: string;
  flagEmoji: string | null;
  population: number | null;
  fertility: number | null;
  lifeExpectancy: number | null;
  netMigration: number | null;
  gdpPerCapita: number | null;
  ageShares?: {
    youth: number | null;
    working: number | null;
    old: number | null;
  };
  pyramid?: { male: number[]; female: number[]; year: number } | null;
}

type AgeShares = { youth: number; working: number; old: number };
type RealPyramid = { male: number[]; female: number[] };

interface Frame {
  year: number;
  male: number[];
  female: number[];
  total: number;
}

export function Simulator({ countries }: { countries: CountryOption[] }) {
  const [popMode, setPopMode] = React.useState<"country" | "custom">("country");
  const [countrySlug, setCountrySlug] = React.useState<string | null>("japan");
  const [countryLabel, setCountryLabel] = React.useState<string | null>("Japan");
  const [loadingCountry, setLoadingCountry] = React.useState(false);

  const [startPop, setStartPop] = React.useState(10_000_000);
  const [tfr, setTfr] = React.useState(1.5);
  const [lifeExp, setLifeExp] = React.useState(80);
  const [migration, setMigration] = React.useState(0);
  const [horizon, setHorizon] = React.useState(80);
  const [gdpStart, setGdpStart] = React.useState(30_000);
  const [gdpGrowth, setGdpGrowth] = React.useState(2);
  // Real current age structure for the selected country. The full 5-year
  // pyramid (when available) is the most accurate projection base; broad age
  // shares are a fallback. Both preserve demographic momentum.
  const [ageShares, setAgeShares] = React.useState<AgeShares | null>(null);
  const [realPyramid, setRealPyramid] = React.useState<RealPyramid | null>(null);

  const [frameIdx, setFrameIdx] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [stepYears, setStepYears] = React.useState(1);
  const [speedMs, setSpeedMs] = React.useState(450);

  // Overrides parsed from the URL (e.g. /simulator?country=italy&tfr=1.2).
  // These win over the values auto-loaded from a country, but only for the
  // initial deep-linked scenario — changing country afterwards loads fresh data.
  type Overrides = Partial<{
    tfr: number;
    lifeExp: number;
    migration: number;
    horizon: number;
    gdpStart: number;
    gdpGrowth: number;
    startPop: number;
  }>;
  const pendingOverrides = React.useRef<Overrides | null>(null);
  const didInit = React.useRef(false);

  React.useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const clamp = (n: number, lo: number, hi: number) =>
      Math.max(lo, Math.min(hi, n));
    const p = new URLSearchParams(window.location.search);
    const num = (k: string) => {
      const v = p.get(k);
      if (v == null || v === "") return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    const o: Overrides = {};
    const tfrQ = num("tfr");
    if (tfrQ !== undefined) o.tfr = clamp(tfrQ, 0.5, 8);
    const lifeQ = num("life");
    if (lifeQ !== undefined) o.lifeExp = clamp(Math.round(lifeQ), 40, 95);
    const migQ = num("migration");
    if (migQ !== undefined) o.migration = Math.round(migQ);
    const yrsQ = num("years");
    if (yrsQ !== undefined) o.horizon = clamp(Math.round(yrsQ / 5) * 5, 20, 150);
    const gdpQ = num("gdp");
    if (gdpQ !== undefined) o.gdpStart = Math.max(100, Math.round(gdpQ));
    const growthQ = num("growth");
    if (growthQ !== undefined) o.gdpGrowth = clamp(growthQ, -2, 10);
    const popQ = num("pop");
    if (popQ !== undefined) o.startPop = Math.max(1000, Math.round(popQ));

    const country = p.get("country");
    const mode = p.get("mode");
    if (country) {
      setPopMode("country");
      setCountrySlug(country);
      pendingOverrides.current = o; // re-applied after the country loads
    } else if (mode === "custom" || popQ !== undefined) {
      setPopMode("custom");
    }

    // Apply immediately. For the country path the stats fetch may overwrite
    // some of these, so we also stash them in pendingOverrides above.
    if (o.tfr !== undefined) setTfr(o.tfr);
    if (o.lifeExp !== undefined) setLifeExp(o.lifeExp);
    if (o.migration !== undefined) setMigration(o.migration);
    if (o.horizon !== undefined) setHorizon(o.horizon);
    if (o.gdpStart !== undefined) setGdpStart(o.gdpStart);
    if (o.gdpGrowth !== undefined) setGdpGrowth(o.gdpGrowth);
    if (o.startPop !== undefined) setStartPop(o.startPop);
  }, []);

  // Load real-world stats when a country is selected.
  React.useEffect(() => {
    if (popMode !== "country" || !countrySlug) return;
    let cancelled = false;
    setLoadingCountry(true);
    fetch(`/api/country-stats/${countrySlug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((stats: CountryStats | null) => {
        if (cancelled || !stats) return;
        setCountryLabel(stats.name);
        if (stats.population != null) setStartPop(Math.round(stats.population));
        if (stats.fertility != null) setTfr(stats.fertility);
        if (stats.lifeExpectancy != null)
          setLifeExp(Math.round(stats.lifeExpectancy));
        // stats.netMigration is an annual mean; the model steps every 5 years.
        if (stats.netMigration != null)
          setMigration(Math.round(stats.netMigration * 5));
        if (stats.gdpPerCapita != null)
          setGdpStart(Math.round(stats.gdpPerCapita));
        const a = stats.ageShares;
        if (a && a.youth != null && a.working != null && a.old != null) {
          setAgeShares({ youth: a.youth, working: a.working, old: a.old });
        } else {
          setAgeShares(null);
        }
        if (
          stats.pyramid &&
          stats.pyramid.male?.length === 21 &&
          stats.pyramid.female?.length === 21
        ) {
          setRealPyramid({
            male: stats.pyramid.male,
            female: stats.pyramid.female,
          });
        } else {
          setRealPyramid(null);
        }

        // Re-apply any URL overrides on top of the loaded country values, once.
        const o = pendingOverrides.current;
        if (o) {
          if (o.tfr !== undefined) setTfr(o.tfr);
          if (o.lifeExp !== undefined) setLifeExp(o.lifeExp);
          if (o.migration !== undefined) setMigration(o.migration);
          if (o.gdpStart !== undefined) setGdpStart(o.gdpStart);
          if (o.startPop !== undefined) setStartPop(o.startPop);
          pendingOverrides.current = null;
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCountry(false);
      });
    return () => {
      cancelled = true;
    };
  }, [popMode, countrySlug]);

  const snapshots = React.useMemo(() => {
    let base;
    if (popMode === "country" && realPyramid) {
      // Most accurate: scale the real 5-year pyramid to the chosen population
      // (keeps the true age-structure shape, including the working-age bulge).
      const sum =
        realPyramid.male.reduce((a, b) => a + b, 0) +
        realPyramid.female.reduce((a, b) => a + b, 0);
      const k = sum > 0 ? startPop / sum : 1;
      base = {
        male: realPyramid.male.map((v) => v * k),
        female: realPyramid.female.map((v) => v * k),
      };
    } else {
      const shares = popMode === "country" && ageShares ? ageShares : undefined;
      base = buildStablePopulation(startPop, tfr, lifeExp, shares);
    }
    const steps = Math.round(horizon / 5);
    return project(
      base,
      { tfr, lifeExpectancy: lifeExp, netMigrationPerStep: migration },
      new Date().getFullYear(),
      steps,
    );
  }, [startPop, tfr, lifeExp, migration, horizon, popMode, ageShares, realPyramid]);

  // The cohort model steps every 5 years; interpolate to yearly frames so the
  // animation can advance smoothly year by year.
  const frames = React.useMemo<Frame[]>(() => {
    if (snapshots.length === 0) return [];
    const baseYear = snapshots[0].year;
    const out: Frame[] = [];
    for (let y = 0; y <= horizon; y++) {
      const pos = y / 5;
      const lo = Math.floor(pos);
      const hi = Math.min(lo + 1, snapshots.length - 1);
      const f = pos - lo;
      const a = snapshots[lo];
      const b = snapshots[hi];
      if (!a) break;
      const male = a.male.map((m, i) => m + ((b.male[i] ?? m) - m) * f);
      const female = a.female.map((m, i) => m + ((b.female[i] ?? m) - m) * f);
      const total =
        male.reduce((s, v) => s + v, 0) + female.reduce((s, v) => s + v, 0);
      out.push({ year: baseYear + y, male, female, total });
    }
    return out;
  }, [snapshots, horizon]);

  // Keep the horizontal axis steady while playing — scale to the largest band.
  const maxBand = React.useMemo(() => {
    let m = 0;
    for (const fr of frames)
      for (let i = 0; i < fr.male.length; i++)
        m = Math.max(m, fr.male[i], fr.female[i]);
    return m;
  }, [frames]);

  React.useEffect(() => {
    setFrameIdx(frames.length - 1);
  }, [frames.length]);

  // Auto-advance through time when "play" is active.
  React.useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setFrameIdx((i) => {
        const next = i + stepYears;
        if (next >= frames.length - 1) {
          setPlaying(false);
          return frames.length - 1;
        }
        return next;
      });
    }, speedMs);
    return () => clearInterval(t);
  }, [playing, frames.length, stepYears, speedMs]);

  const togglePlay = () => {
    if (frameIdx >= frames.length - 1) setFrameIdx(0);
    setPlaying((p) => !p);
  };

  // --- Animation export (video / gif) ------------------------------------
  const captureRef = React.useRef<HTMLDivElement>(null);
  const [recording, setRecording] = React.useState(false);
  const startIdxRef = React.useRef(0);

  // Frame indices respecting the chosen step granularity.
  const exportIndices = React.useMemo(() => {
    const idxs: number[] = [];
    for (let i = 0; i < frames.length; i += stepYears) idxs.push(i);
    if (frames.length > 0 && idxs[idxs.length - 1] !== frames.length - 1)
      idxs.push(frames.length - 1);
    return idxs;
  }, [frames.length, stepYears]);

  const renderExportFrame = React.useCallback(
    (i: number) =>
      new Promise<void>((resolve) => {
        setFrameIdx(exportIndices[i] ?? 0);
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
    [exportIndices],
  );

  const baseYear = frames[0]?.year ?? new Date().getFullYear();
  const totalSeries = frames.map((fr) => ({
    year: fr.year,
    value: Math.round(fr.total),
  }));

  // Economic projection: GDP per capita compounds; total GDP rides on top of
  // the projected population trajectory.
  const gdpPerCapitaSeries = frames.map((fr) => ({
    year: fr.year,
    value: Math.round(gdpStart * Math.pow(1 + gdpGrowth / 100, fr.year - baseYear)),
  }));
  const totalGdpSeries = frames.map((fr) => ({
    year: fr.year,
    value: Math.round(
      gdpStart * Math.pow(1 + gdpGrowth / 100, fr.year - baseYear) * fr.total,
    ),
  }));
  const endGdpPerCapita = gdpPerCapitaSeries[gdpPerCapitaSeries.length - 1];
  const endTotalGdp = totalGdpSeries[totalGdpSeries.length - 1];

  const current = frames[Math.min(frameIdx, frames.length - 1)];
  const summary = current
    ? summarize({ ...current, births: 0, deaths: 0 })
    : null;
  const first = frames[0];
  const last = frames[frames.length - 1];
  const totalChangePct =
    first && last ? ((last.total - first.total) / first.total) * 100 : 0;

  const pyramidRows = current
    ? AGE_GROUPS.map((ageGroup, i) => ({
        ageGroup,
        ageStart: AGE_STARTS[i],
        male: current.male[i],
        female: current.female[i],
      }))
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit lg:sticky lg:top-20">
        <CardHeader>
          <CardTitle className="text-base">Assumptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Starting population: country or custom */}
          <div className="space-y-2">
            <Label>Starting population</Label>
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <Button
                type="button"
                variant={popMode === "country" ? "default" : "ghost"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setPopMode("country")}
              >
                From country
              </Button>
              <Button
                type="button"
                variant={popMode === "custom" ? "default" : "ghost"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setPopMode("custom")}
              >
                Custom value
              </Button>
            </div>

            {popMode === "country" ? (
              <div className="space-y-2">
                <CountrySelect
                  options={countries}
                  value={countrySlug}
                  onChange={setCountrySlug}
                  placeholder="Pick a country…"
                />
                {loadingCountry ? (
                  <p className="text-xs text-muted-foreground">
                    Loading {countryLabel ?? "country"} data…
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Loads population, TFR, life expectancy &amp; migration from
                    World Bank data for{" "}
                    <span className="font-medium text-foreground">
                      {countryLabel ?? "selected country"}
                    </span>
                    . You can still adjust any value below.
                  </p>
                )}
                <Input
                  id="sim-pop-country"
                  type="number"
                  value={startPop}
                  min={1000}
                  onChange={(e) => setStartPop(Number(e.target.value))}
                  className="tabular-nums"
                />
              </div>
            ) : (
              <Input
                id="sim-pop"
                type="number"
                value={startPop}
                min={1000}
                onChange={(e) => setStartPop(Number(e.target.value))}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Total fertility rate (TFR)</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {TFR_PRESETS.map((p) => (
                <Button
                  key={p.value}
                  type="button"
                  variant={tfr === p.value ? "default" : "outline"}
                  size="sm"
                  className="justify-start text-xs"
                  onClick={() => setTfr(p.value)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Slider
                value={[tfr]}
                min={0.5}
                max={8}
                step={0.1}
                onValueChange={([v]) => setTfr(v)}
              />
              <span className="w-10 text-right text-sm font-medium tabular-nums">
                {tfr.toFixed(1)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Life expectancy (mortality)</Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[lifeExp]}
                min={40}
                max={95}
                step={1}
                onValueChange={([v]) => setLifeExp(v)}
              />
              <span className="w-12 text-right text-sm font-medium tabular-nums">
                {lifeExp}y
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sim-mig">Net migration / 5-year step</Label>
            <Input
              id="sim-mig"
              type="number"
              value={migration}
              onChange={(e) => setMigration(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Projection horizon</Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[horizon]}
                min={20}
                max={150}
                step={5}
                onValueChange={([v]) => setHorizon(v)}
              />
              <span className="w-14 text-right text-sm font-medium tabular-nums">
                {horizon}y
              </span>
            </div>
          </div>

          <div className="space-y-4 border-t pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Economy
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="sim-gdp">GDP per capita (start, US$)</Label>
              <Input
                id="sim-gdp"
                type="number"
                value={gdpStart}
                min={100}
                onChange={(e) => setGdpStart(Number(e.target.value))}
                className="tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label>Real growth / year</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[gdpGrowth]}
                  min={-2}
                  max={10}
                  step={0.1}
                  onValueChange={([v]) => setGdpGrowth(v)}
                />
                <span className="w-14 text-right text-sm font-medium tabular-nums">
                  {gdpGrowth > 0 ? "+" : ""}
                  {gdpGrowth.toFixed(1)}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 5, 8].map((g) => (
                  <Button
                    key={g}
                    type="button"
                    variant={gdpGrowth === g ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => setGdpGrowth(g)}
                  >
                    {g}%
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label={`Population (${last?.year ?? ""})`}
            value={formatCompact(last?.total ?? 0)}
            trend={totalChangePct}
          />
          <StatCard
            label="Median age"
            value={summary ? `${summary.medianAgeApprox.toFixed(0)}y` : "—"}
          />
          <StatCard
            label="65+ share"
            value={summary ? `${summary.elderlyShare.toFixed(0)}%` : "—"}
          />
          <StatCard
            label="Dependency ratio"
            value={summary ? `${summary.dependencyRatio.toFixed(0)}%` : "—"}
          />
        </div>

        <ChartCard
          title="Projected population"
          description={`${tfr.toFixed(1)} TFR · ${lifeExp}y life expectancy · ${
            migration >= 0 ? "+" : ""
          }${formatCompact(migration)} net migration / step${
            popMode === "country" && countryLabel ? ` · based on ${countryLabel}` : ""
          }`}
          csvRows={totalSeries}
          csvName="simulation-population"
        >
          <TimeSeriesChart data={totalSeries} type="area" decimals={0} />
        </ChartCard>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>Age structure</span>
              <span className="rounded-md bg-muted px-2.5 py-1 text-sm tabular-nums">
                {current?.year}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={captureRef} className="rounded-md bg-card p-1">
              <div className="mb-1 flex items-end justify-between px-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Total population
                  </p>
                  <p className="font-serif text-2xl font-bold leading-tight tabular-nums">
                    {formatCompact(current?.total ?? 0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {countryLabel ?? "Simulation"}
                  </p>
                  <p className="text-xl font-semibold tabular-nums">
                    {current?.year}
                  </p>
                </div>
              </div>
              <PopulationPyramid
                rows={pyramidRows}
                height={420}
                maxValue={maxBand}
                showSummary={false}
                showPercentages={false}
              />
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={togglePlay}
                  disabled={recording}
                  aria-label={playing ? "Pause" : "Play"}
                  title={playing ? "Pause" : "Play through time"}
                >
                  {playing ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>

                <Select
                  value={String(stepYears)}
                  onValueChange={(v) => setStepYears(Number(v))}
                  disabled={recording}
                >
                  <SelectTrigger className="h-9 w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 yr / step</SelectItem>
                    <SelectItem value="5">5 yr / step</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={String(speedMs)}
                  onValueChange={(v) => setSpeedMs(Number(v))}
                  disabled={recording}
                >
                  <SelectTrigger className="h-9 w-[90px]">
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

                <div className="ml-auto">
                  <AnimationExportButton
                    getNode={() => captureRef.current}
                    frameCount={exportIndices.length}
                    renderFrame={renderExportFrame}
                    holdMs={speedMs}
                    fileBase={`${(countryLabel ?? "population")
                      .toLowerCase()
                      .replace(/\s+/g, "-")}-pyramid`}
                    disabled={recording}
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
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs tabular-nums text-muted-foreground">
                  {first?.year}
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
                  className="flex-1"
                />
                <span className="text-xs tabular-nums text-muted-foreground">
                  {last?.year}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Economic projection */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label={`GDP / capita (${last?.year ?? ""})`}
            value={endGdpPerCapita ? `$${formatCompact(endGdpPerCapita.value)}` : "—"}
            sub={`from $${formatCompact(gdpStart)}`}
          />
          <StatCard
            label={`Total GDP (${last?.year ?? ""})`}
            value={endTotalGdp ? `$${formatCompact(endTotalGdp.value)}` : "—"}
          />
          <StatCard
            label="Real growth"
            value={`${gdpGrowth > 0 ? "+" : ""}${gdpGrowth.toFixed(1)}%/yr`}
          />
          <StatCard
            label="Economy size ×"
            value={
              endTotalGdp && totalGdpSeries[0]
                ? `${(endTotalGdp.value / totalGdpSeries[0].value).toFixed(1)}×`
                : "—"
            }
            sub="vs. today"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="Projected GDP per capita"
            description={`${gdpGrowth > 0 ? "+" : ""}${gdpGrowth.toFixed(1)}% real growth/yr`}
            csvRows={gdpPerCapitaSeries}
            csvName="simulation-gdp-per-capita"
          >
            <TimeSeriesChart
              data={gdpPerCapitaSeries}
              decimals={0}
              unit="US$"
              color="hsl(190 90% 38%)"
            />
          </ChartCard>
          <ChartCard
            title="Projected total GDP"
            description="GDP per capita × projected population"
            csvRows={totalGdpSeries}
            csvName="simulation-total-gdp"
          >
            <TimeSeriesChart
              data={totalGdpSeries}
              type="area"
              decimals={0}
              unit="US$"
              color="hsl(142 60% 38%)"
            />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
