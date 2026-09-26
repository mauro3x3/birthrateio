"use client";

import * as React from "react";
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceArea,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colorAt } from "@/components/charts/palette";
import { ChartFrame } from "@/components/charts/chart-frame";
import {
  chartTooltipProps,
  MultiSeriesTooltip,
} from "@/components/charts/chart-tooltip";
import {
  computeDomain,
  niceTicks,
  niceYearTicks,
} from "@/components/charts/axis";
import { useChartExporting } from "@/components/charts/chart-display";
import { cn } from "@/lib/utils";
import type { WorldShareCountry } from "@/lib/sources/world-shares-data";

const MAX_SERIES = 8;

type Metric = "population" | "births";

export function WorldSharesSeriesChart({
  countries,
  defaultIso3s,
  forecastFrom,
  height = 400,
}: {
  countries: WorldShareCountry[];
  defaultIso3s: string[];
  forecastFrom: number;
  height?: number;
}) {
  const exporting = useChartExporting();
  const [metric, setMetric] = React.useState<Metric>("population");
  const [selected, setSelected] = React.useState<string[]>(() =>
    defaultIso3s
      .filter((iso) => countries.some((c) => c.iso3 === iso))
      .slice(0, MAX_SERIES),
  );

  const byIso = React.useMemo(
    () => new Map(countries.map((c) => [c.iso3, c])),
    [countries],
  );

  const series = selected
    .map((iso, i) => {
      const c = byIso.get(iso);
      if (!c) return null;
      return { key: c.iso3, label: c.name, color: colorAt(i) };
    })
    .filter((s): s is NonNullable<typeof s> => s != null);

  const years = React.useMemo(() => {
    const ys = new Set<number>();
    for (const iso of selected) {
      const c = byIso.get(iso);
      if (!c) continue;
      for (const p of c[metric]) ys.add(p.year);
    }
    return [...ys].sort((a, b) => a - b);
  }, [selected, byIso, metric]);

  const data = years.map((year) => {
    const row: Record<string, number | string | null> = { year };
    for (const iso of selected) {
      const c = byIso.get(iso);
      const hit = c?.[metric].find((p) => p.year === year);
      row[iso] = hit?.value ?? null;
    }
    return row;
  });

  const domain = computeDomain(
    data.flatMap((row) =>
      series
        .map((s) => row[s.key])
        .filter((v): v is number => typeof v === "number"),
    ),
  );

  function toggle(iso3: string) {
    setSelected((prev) => {
      if (prev.includes(iso3)) {
        if (prev.length <= 1) return prev;
        return prev.filter((x) => x !== iso3);
      }
      if (prev.length >= MAX_SERIES) return [...prev.slice(1), iso3];
      return [...prev, iso3];
    });
  }

  const endYear = years[years.length - 1] ?? forecastFrom;
  const startYear = years[0] ?? 1950;
  const yearTicks = niceYearTicks(startYear, endYear);

  const lastNumericIndex = (key: string) => {
    for (let i = data.length - 1; i >= 0; i--) {
      if (typeof data[i][key] === "number") return i;
    }
    return -1;
  };

  const metricLabel =
    metric === "population" ? "Population share" : "Births share";

  return (
    <div className="space-y-4">
      {exporting ? (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-sm font-medium text-foreground">{metricLabel}</p>
          <p className="text-[12px] text-muted-foreground">
            Shaded area = UN medium forecast from {forecastFrom}.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2" data-export-ignore>
            <div className="inline-flex border border-border">
              {(
                [
                  ["population", "Population share"],
                  ["births", "Births share"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMetric(id)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium transition-colors",
                    metric === id
                      ? "bg-foreground text-background"
                      : "bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Shaded area = UN medium forecast from {forecastFrom}.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5" data-export-ignore>
            {countries.slice(0, 60).map((c) => {
              const on = selected.includes(c.iso3);
              return (
                <button
                  key={c.iso3}
                  type="button"
                  onClick={() => toggle(c.iso3)}
                  className={cn(
                    "border px-2 py-0.5 text-[11px] transition-colors",
                    on
                      ? "border-foreground/40 bg-foreground text-background"
                      : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                  )}
                  aria-pressed={on}
                >
                  {c.flag ? `${c.flag} ` : ""}
                  {c.name}
                </button>
              );
            })}
          </div>
        </>
      )}

      <ChartFrame height={height}>
        {(width) => (
          <LineChart
            width={width}
            height={height}
            data={data}
            margin={{ top: 12, right: 88, left: 4, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e5e7eb"
            />
            {endYear >= forecastFrom ? (
              <ReferenceArea
                x1={forecastFrom}
                x2={endYear}
                fill="hsl(40 30% 90%)"
                fillOpacity={0.9}
                strokeOpacity={0}
                label={{
                  value: "Forecast",
                  position: "insideTopRight",
                  fill: "hsl(25 20% 45%)",
                  fontSize: 11,
                }}
              />
            ) : null}
            <XAxis
              dataKey="year"
              type="number"
              domain={[startYear, endYear]}
              ticks={yearTicks}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
            />
            <YAxis
              domain={domain ?? [0, "auto"]}
              ticks={domain ? niceTicks(domain) : undefined}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickFormatter={(v) => `${v}%`}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              {...chartTooltipProps}
              content={({ active, payload, label }) => (
                <MultiSeriesTooltip
                  active={active}
                  payload={payload}
                  label={label}
                  unit="% of world"
                  decimals={1}
                />
              )}
            />
            {series.map((s) => {
              const lastIdx = lastNumericIndex(s.key);
              return (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={s.key === "CHN" ? 2.5 : 1.75}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                >
                  {lastIdx >= 0 ? (
                    <LabelList
                      dataKey={s.key}
                      content={(props: {
                        x?: number | string;
                        y?: number | string;
                        index?: number;
                        value?: number | string;
                      }) => {
                        if (props.index !== lastIdx) return null;
                        const x = Number(props.x);
                        const y = Number(props.y);
                        const v = Number(props.value);
                        if (!Number.isFinite(x) || !Number.isFinite(y))
                          return null;
                        return (
                          <text
                            x={x + 6}
                            y={y}
                            fill={s.color}
                            fontSize={11}
                            dominantBaseline="middle"
                          >
                            {s.label} {v.toFixed(0)}%
                          </text>
                        );
                      }}
                    />
                  ) : null}
                </Line>
              );
            })}
          </LineChart>
        )}
      </ChartFrame>

      {exporting ? null : (
        <p className="text-[11px] text-muted-foreground" data-export-ignore>
          Select up to {MAX_SERIES} countries. Values are percent of the world
          total that year (
          {metric === "population" ? "residents" : "births"}).
        </p>
      )}
    </div>
  );
}
