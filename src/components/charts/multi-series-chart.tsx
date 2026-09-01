"use client";

import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colorAt } from "./palette";
import { formatCompact } from "@/lib/utils";
import {
  chartTooltipProps,
  MultiSeriesTooltip,
} from "./chart-tooltip";
import { computeDomain } from "./axis";

export interface MultiSeries {
  key: string;
  label: string;
  color?: string;
  dashed?: boolean;
}

function lastNumericIndex(
  data: Record<string, number | null>[],
  key: string,
): number {
  for (let i = data.length - 1; i >= 0; i--) {
    if (typeof data[i][key] === "number") return i;
  }
  return -1;
}

function lastNumericValue(
  data: Record<string, number | null>[],
  key: string,
): number | null {
  const i = lastNumericIndex(data, key);
  if (i < 0) return null;
  const v = data[i][key];
  return typeof v === "number" ? v : null;
}

/** First year where `to` rises above `from` (e.g. deaths overtaking births). */
function firstCrossYear(
  data: Record<string, number | null>[],
  fromKey: string,
  toKey: string,
): number | null {
  for (let i = 1; i < data.length; i++) {
    const a0 = data[i - 1][fromKey];
    const b0 = data[i - 1][toKey];
    const a1 = data[i][fromKey];
    const b1 = data[i][toKey];
    if (
      typeof a0 === "number" &&
      typeof b0 === "number" &&
      typeof a1 === "number" &&
      typeof b1 === "number" &&
      a0 >= b0 &&
      a1 < b1
    ) {
      const y = data[i].year;
      return typeof y === "number" ? y : null;
    }
  }
  return null;
}

/**
 * Generic overlay line chart. `data` is an array of objects keyed by `year`
 * plus one numeric field per series key. Powers compare overlays and
 * projection scenarios.
 */
export function MultiSeriesChart({
  data,
  series,
  height = 320,
  unit,
  decimals = 2,
  referenceY,
  referenceLabel,
  markCrossing,
}: {
  data: Record<string, number | null>[];
  series: MultiSeries[];
  height?: number;
  unit?: string;
  decimals?: number;
  referenceY?: number;
  referenceLabel?: string;
  /** Draw a year marker where one series overtakes another. */
  markCrossing?: { from: string; to: string };
}) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  const fmt = (v: number) =>
    Math.abs(v) >= 10000
      ? formatCompact(v)
      : v.toLocaleString("en-US", { maximumFractionDigits: decimals });

  const domain = computeDomain(
    data.flatMap((row) =>
      series
        .map((s) => row[s.key])
        .filter((v): v is number => typeof v === "number"),
    ),
    referenceY,
  );

  // A handful of annual points shouldn't be smoothed into a fabricated
  // continuous trend — draw straight segments between honest, visible
  // data points instead (see time-series-chart.tsx for the same rule).
  const sparse = data.length <= 5;

  const lastIdx = Object.fromEntries(
    series.map((s) => [s.key, lastNumericIndex(data, s.key)]),
  );

  const rankedEnds = series
    .map((s) => ({ key: s.key, value: lastNumericValue(data, s.key) ?? 0 }))
    .sort((a, b) => b.value - a.value);
  const endDy: Record<string, number> = {};
  const span = domain ? domain[1] - domain[0] : 1;
  for (let i = 1; i < rankedEnds.length; i++) {
    const gap = rankedEnds[i - 1].value - rankedEnds[i].value;
    if (span > 0 && gap / span < 0.08) {
      endDy[rankedEnds[i - 1].key] = (endDy[rankedEnds[i - 1].key] ?? 0) - 8;
      endDy[rankedEnds[i].key] = (endDy[rankedEnds[i].key] ?? 0) + 8;
    }
  }

  const longestLabel = Math.max(...series.map((s) => s.label.length), 8);
  const rightPad = Math.min(148, 28 + longestLabel * 7.2);

  const crossYear = markCrossing
    ? firstCrossYear(data, markCrossing.from, markCrossing.to)
    : null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 10, right: rightPad, left: 0, bottom: 4 }}
        style={{ cursor: "crosshair" }}
      >
        <CartesianGrid
          vertical={false}
          stroke="hsl(var(--border))"
          strokeOpacity={0.85}
        />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--foreground) / 0.28)", strokeWidth: 1 }}
          minTickGap={28}
        />
        <YAxis
          tickFormatter={fmt}
          domain={domain ?? ["auto", "auto"]}
          allowDataOverflow={false}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          {...chartTooltipProps}
          content={(props) => (
            <MultiSeriesTooltip
              {...props}
              unit={unit}
              decimals={decimals}
            />
          )}
        />
        {referenceY !== undefined && (
          <ReferenceLine
            y={referenceY}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="4 4"
            label={{
              value: referenceLabel,
              position: "insideTopRight",
              fontSize: 11,
              fill: "hsl(var(--muted-foreground))",
            }}
          />
        )}
        {crossYear != null && (
          <ReferenceLine
            x={crossYear}
            stroke="hsl(var(--foreground) / 0.28)"
            strokeDasharray="3 3"
            label={{
              value: String(crossYear),
              position: "insideTop",
              fontSize: 11,
              fontWeight: 600,
              fill: "hsl(var(--foreground))",
            }}
          />
        )}
        {series.map((s, i) => {
          const stroke = s.color ?? colorAt(i);
          const end = lastIdx[s.key];
          const dy = endDy[s.key] ?? 0;
          return (
            <Line
              key={s.key}
              type={sparse ? "linear" : "monotone"}
              dataKey={s.key}
              name={s.label}
              stroke={stroke}
              strokeWidth={2.4}
              strokeDasharray={s.dashed ? "5 4" : undefined}
              dot={sparse ? { r: 3, strokeWidth: 0, fill: stroke } : false}
              connectNulls
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive={false}
            >
              <LabelList
                dataKey={s.key}
                content={(p) => {
                  if (p.index !== end || p.x == null || p.y == null) return null;
                  return (
                    <text
                      x={Number(p.x) + 8}
                      y={Number(p.y) + 4 + dy}
                      fontSize={11}
                      fontWeight={500}
                      fill={stroke}
                    >
                      {s.label}
                    </text>
                  );
                }}
              />
            </Line>
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
