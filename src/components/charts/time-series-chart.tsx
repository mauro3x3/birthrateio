"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
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
import { chartTooltipProps } from "./chart-tooltip";
import { computeDomain } from "./axis";

export interface SeriesPoint {
  year: number;
  value: number;
  kind?: string;
}

export function TimeSeriesChart({
  data,
  type = "line",
  color = colorAt(0),
  unit,
  height = 280,
  decimals = 2,
  referenceY,
  referenceLabel,
  highlightYear,
}: {
  data: SeriesPoint[];
  type?: "line" | "area";
  color?: string;
  unit?: string;
  height?: number;
  decimals?: number;
  referenceY?: number;
  referenceLabel?: string;
  /** Vertical marker for the selected year (homepage scrubber). */
  highlightYear?: number;
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

  // One observation is a key figure, not a trend — avoid an empty chart with a
  // zoomed Y-axis around a single point.
  if (data.length === 1) {
    const point = data[0];
    return (
      <div
        className="flex flex-col justify-center gap-1 py-2"
        style={{ minHeight: Math.min(height, 140) }}
      >
        <p
          className="text-4xl font-semibold tabular-nums tracking-tight"
          style={{ color }}
        >
          {fmt(point.value)}
          {unit ? (
            <span className="ml-2 text-base font-normal text-muted-foreground">
              {unit}
            </span>
          ) : null}
        </p>
        <p className="text-sm text-muted-foreground">{point.year}</p>
        <p className="text-xs text-muted-foreground">
          Only one year available — not enough points for a trend line.
        </p>
      </div>
    );
  }

  const domain = computeDomain(
    data.map((d) => d.value),
    referenceY,
  );

  const Chart = type === "area" ? AreaChart : LineChart;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart
        data={data}
        margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
        style={{ cursor: "crosshair" }}
      >
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.16} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
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
          formatter={(v: number) => [
            `${fmt(v)}${unit ? ` ${unit}` : ""}`,
            "Value",
          ]}
          labelFormatter={(l) => `Year ${l}`}
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
        {highlightYear !== undefined && (
          <ReferenceLine
            x={highlightYear}
            stroke="hsl(var(--foreground) / 0.35)"
            strokeDasharray="3 3"
          />
        )}
        {type === "area" ? (
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.4}
            fill={`url(#grad-${color})`}
            baseValue={domain ? domain[0] : "dataMin"}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        ) : (
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.4}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        )}
      </Chart>
    </ResponsiveContainer>
  );
}
