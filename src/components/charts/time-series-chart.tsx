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
}: {
  data: SeriesPoint[];
  type?: "line" | "area";
  color?: string;
  unit?: string;
  height?: number;
  decimals?: number;
  referenceY?: number;
  referenceLabel?: string;
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
          strokeDasharray="2 4"
          className="stroke-border/60"
          vertical={false}
        />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
          className="fill-muted-foreground"
        />
        <YAxis
          tickFormatter={fmt}
          domain={domain ?? ["auto", "auto"]}
          allowDataOverflow={false}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={52}
          className="fill-muted-foreground"
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
        {type === "area" ? (
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
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
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        )}
      </Chart>
    </ResponsiveContainer>
  );
}
