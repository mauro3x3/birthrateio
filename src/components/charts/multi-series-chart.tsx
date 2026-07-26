"use client";

import {
  CartesianGrid,
  Legend,
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
}: {
  data: Record<string, number | null>[];
  series: MultiSeries[];
  height?: number;
  unit?: string;
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
    data.flatMap((row) =>
      series
        .map((s) => row[s.key])
        .filter((v): v is number => typeof v === "number"),
    ),
    referenceY,
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
        style={{ cursor: "crosshair" }}
      >
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
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color ?? colorAt(i)}
            strokeWidth={2}
            strokeDasharray={s.dashed ? "5 4" : undefined}
            dot={false}
            connectNulls
            activeDot={{ r: 5, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
