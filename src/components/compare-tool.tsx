"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CountryMultiSelect,
  type CountryOption,
} from "@/components/country-multi-select";
import { MultiSeriesChart } from "@/components/charts/multi-series-chart";
import { ChartCard } from "@/components/charts/chart-card";
import { SectionHeading } from "@/components/section-heading";
import { Slider } from "@/components/ui/slider";
import { colorAt } from "@/components/charts/palette";
import { cn, formatByUnit } from "@/lib/utils";
import { HISTORIC_FERTILITY_SOURCE } from "@/components/historic-fertility-note";

const METRICS = [
  { slug: "fertility-rate", label: "Fertility Rate" },
  { slug: "live-births", label: "Live births" },
  { slug: "birth-rate", label: "Crude Birth Rate" },
  { slug: "population", label: "Population" },
  { slug: "population-growth", label: "Population Growth" },
  { slug: "gdp", label: "GDP" },
  { slug: "gdp-per-capita", label: "GDP per Capita" },
  { slug: "net-migration", label: "Net Migration" },
  { slug: "life-expectancy", label: "Life Expectancy" },
];

/** One-click story setups people actually post. */
const PRESETS: Array<{
  id: string;
  label: string;
  countries: string[];
  metric: string;
  from?: number;
  blurb: string;
}> = [
  {
    id: "china-us-births",
    label: "China vs US births",
    countries: ["china", "united-states"],
    metric: "live-births",
    from: 1950,
    blurb: "Levels + how many Chinese births per American birth",
  },
  {
    id: "tfr-asia-americas",
    label: "Japan · US · India · Colombia",
    countries: ["japan", "united-states", "india", "colombia"],
    metric: "fertility-rate",
    from: 1960,
    blurb: "The viral TFR overlay, with 2024+ BirthGauge years",
  },
  {
    id: "eu-low",
    label: "Italy · Spain · France · Germany",
    countries: ["italy", "spain", "france", "germany"],
    metric: "fertility-rate",
    from: 1960,
    blurb: "Southern and Northern Europe on one frame",
  },
  {
    id: "korea-japan",
    label: "South Korea vs Japan",
    countries: ["south-korea", "japan"],
    metric: "fertility-rate",
    from: 1960,
    blurb: "The ultra-low East Asian pair",
  },
];

interface CompareData {
  countries: CountryOption[];
  rows: Record<string, number | null>[];
  meta: {
    name: string;
    unit: string;
    decimals: number;
    source?: string;
    freshened?: boolean;
  } | null;
}

function parseYearParam(value: string | null): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1500 && n <= 2100 ? n : null;
}

function yearSpan(rows: Record<string, number | null>[]) {
  let min = Infinity;
  let max = -Infinity;
  for (const row of rows) {
    const y = row.year;
    if (typeof y === "number") {
      if (y < min) min = y;
      if (y > max) max = y;
    }
  }
  if (!Number.isFinite(min)) return null;
  return { min, max };
}

function clampYear(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function CompareTool({
  options,
  initial,
}: {
  options: CountryOption[];
  initial: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = React.useState<string[]>(
    initial.length ? initial : ["japan", "united-states", "india"],
  );
  const [metric, setMetric] = React.useState(() => {
    const m = searchParams.get("metric");
    return METRICS.some((x) => x.slug === m) ? m! : "fertility-rate";
  });
  const [fromYear, setFromYear] = React.useState<number | null>(() =>
    parseYearParam(searchParams.get("from")),
  );
  const [toYear, setToYear] = React.useState<number | null>(() =>
    parseYearParam(searchParams.get("to")),
  );
  const [data, setData] = React.useState<CompareData>({
    countries: [],
    rows: [],
    meta: null,
  });
  const [loading, setLoading] = React.useState(false);

  const span = React.useMemo(() => yearSpan(data.rows), [data.rows]);
  const start =
    span == null
      ? null
      : fromYear == null
        ? span.min
        : clampYear(fromYear, span.min, span.max);
  const end =
    span == null
      ? null
      : toYear == null
        ? span.max
        : clampYear(toYear, span.min, span.max);
  const windowStart = start != null && end != null ? Math.min(start, end) : null;
  const windowEnd = start != null && end != null ? Math.max(start, end) : null;
  const zoomed =
    span != null &&
    windowStart != null &&
    windowEnd != null &&
    (windowStart > span.min || windowEnd < span.max);

  const visibleRows = React.useMemo(() => {
    if (windowStart == null || windowEnd == null) return data.rows;
    return data.rows.filter((row) => {
      const y = row.year;
      return typeof y === "number" && y >= windowStart && y <= windowEnd;
    });
  }, [data.rows, windowStart, windowEnd]);

  const setWindow = (nextFrom: number, nextTo: number) => {
    if (!span) {
      setFromYear(nextFrom);
      setToYear(nextTo);
      return;
    }
    const a = clampYear(Math.min(nextFrom, nextTo), span.min, span.max);
    const b = clampYear(Math.max(nextFrom, nextTo), span.min, span.max);
    setFromYear(a === span.min ? null : a);
    setToYear(b === span.max ? null : b);
  };

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("countries", selected.join(","));
      params.set("metric", metric);
      if (fromYear != null) params.set("from", String(fromYear));
      else params.delete("from");
      if (toYear != null) params.set("to", String(toYear));
      else params.delete("to");
      router.replace(`/compare?${params.toString()}`, { scroll: false });
    }, 180);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, metric, fromYear, toYear]);

  React.useEffect(() => {
    if (selected.length === 0) {
      setData({ countries: [], rows: [], meta: null });
      return;
    }
    setLoading(true);
    fetch(
      `/api/compare?countries=${selected.join(",")}&indicator=${metric}`,
    )
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData({ countries: [], rows: [], meta: null }))
      .finally(() => setLoading(false));
  }, [selected, metric]);

  const series = data.countries.map((c, i) => ({
    key: c.slug,
    label: c.name,
    color: colorAt(i),
  }));

  const ratioSeries = React.useMemo(() => {
    if (data.countries.length !== 2) return null;
    const [a, b] = data.countries;
    if (!a || !b) return null;
    const rows = visibleRows
      .map((row) => {
        const av = row[a.slug];
        const bv = row[b.slug];
        if (typeof av !== "number" || typeof bv !== "number" || bv === 0) {
          return null;
        }
        return { year: row.year as number, ratio: av / bv };
      })
      .filter(Boolean) as { year: number; ratio: number }[];
    if (rows.length < 2) return null;
    return {
      a,
      b,
      rows,
      series: [
        {
          key: "ratio",
          label: `${a.name} per ${b.name}`,
          color: colorAt(0),
        },
      ],
    };
  }, [data.countries, visibleRows]);

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setSelected(p.countries);
    setMetric(p.metric);
    setFromYear(p.from ?? null);
    setToYear(null);
  };

  const latest = data.countries.map((c, i) => {
    let val: number | null = null;
    let year: number | null = null;
    for (const row of data.rows) {
      const v = row[c.slug];
      if (typeof v === "number") {
        val = v;
        year = row.year as number;
      }
    }
    return { ...c, value: val, year, color: colorAt(i) };
  });
  const sortedLatest = [...latest].sort(
    (a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity),
  );

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Story presets
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const active =
              p.metric === metric &&
              p.countries.length === selected.length &&
              p.countries.every((s, i) => selected[i] === s);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                title={p.blurb}
                className={cn(
                  "rounded-none border px-3 py-1.5 text-left text-sm transition-colors",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground hover:border-foreground/40",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
        <CountryMultiSelect
          options={options}
          selected={selected}
          onChange={setSelected}
        />
        <div className="flex items-center gap-3">
          <label
            htmlFor="compare-metric"
            className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
          >
            Indicator
          </label>
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger id="compare-metric" className="w-52 rounded-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRICS.map((m) => (
                <SelectItem key={m.slug} value={m.slug}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ChartCard
        title={data.meta?.name ?? "Indicator"}
        description={
          loading
            ? "Loading series…"
            : windowStart != null && windowEnd != null
              ? `Overlay ${windowStart}–${windowEnd}. Drag the handles to stretch the dates. Download PNG to post.`
              : "Overlay time series for the selected countries."
        }
        source={
          data.meta?.source
            ? data.meta.source
            : metric === "fertility-rate" && span != null && span.min < 1960
              ? HISTORIC_FERTILITY_SOURCE
              : metric === "life-expectancy" && span != null && span.min < 1960
                ? "OWID / HMD / UN (pre-1960) · World Bank (from 1960)"
                : "World Bank"
        }
        csvRows={visibleRows}
        csvName={
          windowStart != null && windowEnd != null
            ? `compare-${metric}-${windowStart}-${windowEnd}`
            : `compare-${metric}`
        }
        defaultShowValues={data.countries.length <= 2}
      >
        <MultiSeriesChart
          data={visibleRows}
          series={series}
          unit={data.meta?.unit}
          decimals={data.meta?.decimals ?? 2}
          height={380}
          referenceY={metric === "fertility-rate" ? 2.1 : undefined}
          referenceLabel={
            metric === "fertility-rate" ? "Replacement" : undefined
          }
          endLabelStyle={data.countries.length <= 2 ? "datawrapper" : "auto"}
        />
        {span && span.max > span.min && windowStart != null && windowEnd != null ? (
          <div
            data-export-ignore
            className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
          >
            <label className="sr-only" htmlFor="compare-from">
              Start year
            </label>
            <select
              id="compare-from"
              className="h-8 w-[5.5rem] shrink-0 rounded-none border border-input bg-background px-2 text-sm tabular-nums outline-none focus:border-ring"
              value={windowStart}
              onChange={(e) => setWindow(Number(e.target.value), windowEnd)}
            >
              {Array.from(
                { length: span.max - span.min + 1 },
                (_, i) => span.min + i,
              ).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <Slider
              className="min-w-0 flex-1"
              min={span.min}
              max={span.max}
              step={1}
              value={[windowStart, windowEnd]}
              onValueChange={([a, b]) => {
                if (a == null || b == null) return;
                setWindow(a, b);
              }}
              aria-label="Year range"
            />
            <label className="sr-only" htmlFor="compare-to">
              End year
            </label>
            <select
              id="compare-to"
              className="h-8 w-[5.5rem] shrink-0 rounded-none border border-input bg-background px-2 text-sm tabular-nums outline-none focus:border-ring"
              value={windowEnd}
              onChange={(e) => setWindow(windowStart, Number(e.target.value))}
            >
              {Array.from(
                { length: span.max - span.min + 1 },
                (_, i) => span.min + i,
              ).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <div className="flex shrink-0 items-center gap-3 text-xs">
              {span.min <= 2000 && span.max >= 2000 ? (
                <button
                  type="button"
                  className={cn(
                    "font-medium",
                    windowStart === 2000 && windowEnd === span.max
                      ? "text-foreground"
                      : "link-editorial",
                  )}
                  onClick={() => setWindow(2000, span.max)}
                >
                  Since 2000
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
      </ChartCard>

      {ratioSeries ? (
        <ChartCard
          title={`${ratioSeries.a.name} per ${ratioSeries.b.name}`}
          description={
            metric === "live-births"
              ? `${ratioSeries.a.name} live births for every one in ${ratioSeries.b.name}. The shareable companion to the levels chart above.`
              : `How many ${data.meta?.name?.toLowerCase() ?? "units"} in ${ratioSeries.a.name} for each one in ${ratioSeries.b.name}.`
          }
          source={data.meta?.source ?? "World Bank"}
          csvRows={ratioSeries.rows}
          csvName={`compare-ratio-${ratioSeries.a.slug}-${ratioSeries.b.slug}`}
          defaultShowValues
        >
          <MultiSeriesChart
            data={ratioSeries.rows}
            series={ratioSeries.series}
            unit="ratio"
            decimals={2}
            height={280}
            endLabelStyle="datawrapper"
          />
        </ChartCard>
      ) : null}

      <section className="border-t border-border pt-5">
        <SectionHeading
          title="Latest values"
          description="Most recent observation for each selected country, ranked high to low."
          meta={
            sortedLatest[0]?.year != null
              ? `As of ${sortedLatest[0].year}`
              : undefined
          }
        />
        <Table className="table-stat">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">#</TableHead>
              <TableHead>Country</TableHead>
              <TableHead className="text-right">
                {data.meta?.name ?? "Value"}
              </TableHead>
              <TableHead className="w-20 text-right">Year</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLatest.map((c, i) => (
              <TableRow key={c.slug}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {i + 1}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2.5 font-medium">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: c.color }}
                    />
                    <span aria-hidden>{c.flagEmoji}</span>
                    {c.name}
                  </span>
                </TableCell>
                <TableCell className="text-right font-sans text-base font-semibold tabular-nums text-primary">
                  {formatByUnit(
                    c.value,
                    data.meta?.unit,
                    data.meta?.decimals ?? 2,
                  )}
                </TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {c.year ?? "—"}
                </TableCell>
              </TableRow>
            ))}
            {sortedLatest.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-muted-foreground"
                >
                  Add countries to compare.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
