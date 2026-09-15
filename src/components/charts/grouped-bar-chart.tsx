"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colorAt } from "./palette";
import { formatCompact } from "@/lib/utils";
import { niceStep } from "./axis";
import { MultiSeriesTooltip } from "./chart-tooltip";
import { ChartFrame } from "./chart-frame";
import { useChartExporting, useChartShowValues } from "./chart-display";
import type { MultiSeries } from "./multi-series-chart";

function domainFromZero(
  values: number[],
  referenceY?: number,
  headroom = 1.04,
): [number, number] {
  const finite = values.filter((v) => Number.isFinite(v));
  const hi = Math.max(0, ...finite, referenceY ?? 0);
  if (!Number.isFinite(hi) || hi === 0) return [0, 1];
  const step = niceStep(hi / 5);
  const top = Math.ceil((hi * headroom) / step) * step;
  return [0, Number.isFinite(top) && top > 0 ? top : hi * 1.1];
}

export function GroupedBarLegend({
  series,
  large = false,
}: {
  series: MultiSeries[];
  large?: boolean;
}) {
  return (
    <div
      className={
        large
          ? "mb-4 flex flex-wrap justify-center gap-x-5 gap-y-2"
          : "mb-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5"
      }
    >
      {series.map((s, i) => (
        <span
          key={s.key}
          className={
            large
              ? "flex items-center gap-2 text-sm font-medium text-foreground"
              : "flex items-center gap-1.5 text-xs text-foreground"
          }
        >
          <span
            className={large ? "h-3 w-3 shrink-0" : "h-2.5 w-2.5 shrink-0"}
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
  xKey = "year",
  xTickFormatter,
  tooltipLabelFormatter,
  showValues: showValuesProp,
}: {
  data: Record<string, number | string | null>[];
  series: MultiSeries[];
  height?: number;
  unit?: string;
  decimals?: number;
  referenceY?: number;
  referenceLabel?: string;
  xKey?: string;
  xTickFormatter?: (value: number | string) => string;
  tooltipLabelFormatter?: (value: number | string) => string;
  /** Override ChartCard “Show numbers” context. */
  showValues?: boolean;
}) {
  const showValues = useChartShowValues(showValuesProp);
  const exporting = useChartExporting();

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

  const plotHeight = exporting ? Math.max(height, 460) : height;

  const domain = domainFromZero(
    data.flatMap((row) =>
      series
        .map((s) => row[s.key])
        .filter((v): v is number => typeof v === "number"),
    ),
    referenceY,
    showValues || exporting ? 1.22 : 1.04,
  );

  const longLabels = data.some(
    (row) => String(row[xKey] ?? "").length > 10,
  );
  const crowded = series.length >= 5 || data.length * series.length > 16;
  const labelSize = exporting
    ? crowded
      ? 11
      : 13
    : crowded
      ? 8
      : series.length >= 3
        ? 9
        : 10;
  const tickSize = exporting ? 13 : longLabels ? 10 : 11;

  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      <GroupedBarLegend series={series} large={exporting} />
      <ChartFrame height={plotHeight}>
        {(width) => (
          <BarChart
            width={width}
            height={plotHeight}
            data={data}
            barGap={exporting ? 3 : 2}
            barCategoryGap={exporting ? "22%" : "18%"}
            margin={{
              top: showValues || exporting ? 28 : 8,
              right: 10,
              left: 4,
              bottom: longLabels ? 40 : exporting ? 8 : 4,
            }}
            style={{ cursor: "crosshair" }}
          >
            <CartesianGrid
              vertical={false}
              stroke="#e5e7eb"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: tickSize, fill: "#475569", fontWeight: exporting ? 600 : 400 }}
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
              interval={0}
              angle={longLabels ? -28 : 0}
              textAnchor={longLabels ? "end" : "middle"}
              height={longLabels ? 52 : exporting ? 34 : 28}
              tickFormatter={xTickFormatter}
            />
            <YAxis
              tickFormatter={fmt}
              domain={domain}
              tick={{ fontSize: tickSize, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              width={exporting ? 56 : 52}
            />
            <Tooltip
              cursor={{ fill: "#f1f5f9", opacity: 0.8 }}
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
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={
                  referenceLabel
                    ? {
                        value: referenceLabel,
                        position: "insideTopRight",
                        fontSize: 11,
                        fill: "#64748b",
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
                maxBarSize={exporting ? 64 : 52}
              >
                {showValues ? (
                  <LabelList
                    dataKey={s.key}
                    position="top"
                    offset={exporting ? 6 : 4}
                    formatter={(v) =>
                      typeof v === "number" && Number.isFinite(v) ? fmt(v) : ""
                    }
                    style={{
                      fontSize: labelSize,
                      fontWeight: 700,
                      fill: "#1e293b",
                    }}
                  />
                ) : null}
              </Bar>
            ))}
          </BarChart>
        )}
      </ChartFrame>
    </div>
  );
}
