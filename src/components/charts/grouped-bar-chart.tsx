"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colorAt } from "./palette";
import { formatCompact } from "@/lib/utils";
import { niceStep } from "./axis";
import {
  chartTooltipProps,
  MultiSeriesTooltip,
} from "./chart-tooltip";
import type { MultiSeries } from "./multi-series-chart";

function domainFromZero(
  values: number[],
  referenceY?: number,
): [number, number] {
  const hi = Math.max(0, ...values, referenceY ?? 0);
  if (hi === 0) return [0, 1];
  const step = niceStep(hi / 5);
  return [0, Math.ceil((hi * 1.04) / step) * step];
}

export function GroupedBarLegend({ series }: { series: MultiSeries[] }) {
  return (
    <div className="mb-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
      {series.map((s, i) => (
        <span
          key={s.key}
          className="flex items-center gap-1.5 text-xs text-foreground"
        >
          <span
            className="h-2.5 w-2.5 shrink-0"
            style={{ background: s.color ?? colorAt(i) }}
          />
          {s.label}
        </span>
      ))}
    </div>
  );
}

/**
 * Grouped bars by year/survey — one cluster per category, no gap inside
 * a cluster, a gap between clusters. Legend sits above the plot.
 */
export function GroupedBarChart({
  data,
  series,
  height = 380,
  unit,
  decimals = 2,
  referenceY,
  referenceLabel,
  xTickFormatter,
  tooltipLabelFormatter,
}: {
  data: Record<string, number | string | null>[];
  series: MultiSeries[];
  height?: number;
  unit?: string;
  decimals?: number;
  referenceY?: number;
  referenceLabel?: string;
  xTickFormatter?: (value: number | string) => string;
  tooltipLabelFormatter?: (value: number | string) => string;
}) {
  if (!data?.length || !series.length) {
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

  const domain = domainFromZero(
    data.flatMap((row) =>
      series
        .map((s) => row[s.key])
        .filter((v): v is number => typeof v === "number"),
    ),
    referenceY,
  );

  return (
    <div>
      <GroupedBarLegend series={series} />
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          barGap={0}
          barCategoryGap="22%"
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
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
            interval={0}
            tickFormatter={xTickFormatter}
          />
          <YAxis
            tickFormatter={fmt}
            domain={domain}
            allowDataOverflow={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            {...chartTooltipProps}
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }}
            content={(props) => (
              <MultiSeriesTooltip
                {...props}
                unit={unit}
                decimals={decimals}
                labelFormatter={tooltipLabelFormatter}
              />
            )}
          />
          {referenceY !== undefined && (
            <ReferenceLine
              y={referenceY}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              label={
                referenceLabel
                  ? {
                      value: referenceLabel,
                      position: "insideTopRight",
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }
                  : undefined
              }
            />
          )}
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color ?? colorAt(i)}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
