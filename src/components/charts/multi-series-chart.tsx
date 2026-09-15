"use client";

import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
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
import { computeDomain, niceTicks, niceYearTicks } from "./axis";
import { ChartFrame } from "./chart-frame";
import { useChartShowValues } from "./chart-display";

export interface MultiSeries {
  key: string;
  label: string;
  color?: string;
  dashed?: boolean;
}

function lastNumericIndex(
  data: Record<string, number | string | null>[],
  key: string,
): number {
  for (let i = data.length - 1; i >= 0; i--) {
    if (typeof data[i][key] === "number") return i;
  }
  return -1;
}

function lastNumericValue(
  data: Record<string, number | string | null>[],
  key: string,
): number | null {
  const i = lastNumericIndex(data, key);
  if (i < 0) return null;
  const v = data[i][key];
  return typeof v === "number" ? v : null;
}

/** First year where `to` rises above `from` (e.g. deaths overtaking births). */
function firstCrossYear(
  data: Record<string, number | string | null>[],
  fromKey: string,
  toKey: string,
  xKey: string,
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
      const y = data[i][xKey];
      return typeof y === "number" ? y : null;
    }
  }
  return null;
}

function numericXs(
  data: Record<string, number | string | null>[],
  xKey: string,
): number[] {
  return data
    .map((row) => row[xKey])
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
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
  /** Draw a year marker where one series overtakes another. */
  markCrossing?: { from: string; to: string };
  xKey?: string;
  xTickFormatter?: (value: number | string) => string;
  tooltipLabelFormatter?: (value: number | string) => string;
  /** Override ChartCard “Show numbers” context. */
  showValues?: boolean;
}) {
  const showValues = useChartShowValues(showValuesProp);
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

  const xs = numericXs(data, xKey);
  const numericX = xs.length === data.length && xs.length >= 2;
  const xMin = numericX ? Math.min(...xs) : undefined;
  const xMax = numericX ? Math.max(...xs) : undefined;
  const avgGap =
    numericX && xs.length >= 2 && xMin != null && xMax != null
      ? (xMax - xMin) / (xs.length - 1)
      : 1;
  // Sparse / gappy official points (religion TFR, NFHS rounds) should show
  // as straight segments between honest observations, not a smoothed curve.
  const sparse = data.length <= 8 || (data.length <= 12 && avgGap > 2);

  const lastIdx = Object.fromEntries(
    series.map((s) => [s.key, lastNumericIndex(data, s.key)]),
  );

  const rankedEnds = series
    .map((s) => ({ key: s.key, value: lastNumericValue(data, s.key) ?? 0 }))
    .sort((a, b) => b.value - a.value);
  const plotH = Math.max(80, height - 40);
  const endDy: Record<string, number> = {};
  if (domain) {
    const yOf = (v: number) =>
      ((domain[1] - v) / Math.max(domain[1] - domain[0], 1e-6)) * plotH;
    let lastY = -Infinity;
    const minSep = 14;
    for (const item of rankedEnds) {
      const natural = yOf(item.value);
      const placed = lastY === -Infinity ? natural : Math.max(natural, lastY + minSep);
      endDy[item.key] = placed - natural;
      lastY = placed;
    }
  }

  const longestLabel = Math.max(...series.map((s) => s.label.length), 8);
  const rightPad = Math.min(156, 32 + longestLabel * 7.2);

  const crossYear = markCrossing
    ? firstCrossYear(data, markCrossing.from, markCrossing.to, xKey)
    : null;

  const yearTicks =
    numericX && xMin != null && xMax != null ? niceYearTicks(xMin, xMax) : undefined;

  return (
    <ChartFrame height={height}>
      {(width) => (
        <LineChart
          width={width}
          height={height}
          data={data}
          margin={{
            top: showValues ? 18 : 10,
            right: rightPad,
            left: 4,
            bottom: 4,
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
            type={numericX ? "number" : undefined}
            domain={numericX ? [xMin!, xMax!] : undefined}
            ticks={yearTicks}
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
            minTickGap={28}
            interval={sparse && !numericX ? 0 : undefined}
            tickFormatter={xTickFormatter}
          />
          <YAxis
            tickFormatter={fmt}
            domain={domain ?? ["auto", "auto"]}
            ticks={domain ? niceTicks(domain) : undefined}
            allowDataOverflow={false}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip
            {...chartTooltipProps}
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
              label={{
                value: referenceLabel,
                position: "insideBottomLeft",
                fontSize: 10,
                fill: "#64748b",
              }}
            />
          )}
          {crossYear != null && (
            <ReferenceLine
              x={crossYear}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              label={{
                value: String(crossYear),
                position: "insideTop",
                fontSize: 11,
                fontWeight: 600,
                fill: "#334155",
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
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={s.dashed ? "5 4" : undefined}
                dot={
                  sparse || (showValues && data.length <= 10)
                    ? {
                        r: sparse ? 3.25 : 2.5,
                        strokeWidth: 1.5,
                        stroke: "#fff",
                        fill: stroke,
                      }
                    : false
                }
                connectNulls
                activeDot={{ r: 5, strokeWidth: 0, fill: stroke }}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey={s.key}
                  content={(p) => {
                    if (p.x == null || p.y == null) return null;
                    const raw = p.value;
                    const num =
                      typeof raw === "number"
                        ? raw
                        : typeof raw === "string"
                          ? Number(raw)
                          : NaN;
                    if (!Number.isFinite(num)) return null;

                    // End-of-line series name (legend substitute).
                    if (p.index === end) {
                      return (
                        <g>
                          {showValues && (sparse || data.length <= 10) ? (
                            <text
                              x={Number(p.x)}
                              y={Number(p.y) - 8}
                              textAnchor="middle"
                              fontSize={10}
                              fontWeight={600}
                              fill={stroke}
                            >
                              {fmt(num)}
                            </text>
                          ) : null}
                          <text
                            x={Number(p.x) + 8}
                            y={Number(p.y) + 4 + dy}
                            fontSize={11}
                            fontWeight={500}
                            fill={stroke}
                          >
                            {showValues && !sparse
                              ? `${s.label} · ${fmt(num)}`
                              : s.label}
                          </text>
                        </g>
                      );
                    }

                    // Sparse / short series: number every interior point.
                    if (showValues && (sparse || data.length <= 10)) {
                      return (
                        <text
                          x={Number(p.x)}
                          y={Number(p.y) - 8}
                          textAnchor="middle"
                          fontSize={10}
                          fontWeight={600}
                          fill={stroke}
                        >
                          {fmt(num)}
                        </text>
                      );
                    }

                    return null;
                  }}
                />
              </Line>
            );
          })}
        </LineChart>
      )}
    </ChartFrame>
  );
}
