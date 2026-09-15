"use client";

import * as React from "react";
import { toPng } from "html-to-image";
import { Download } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colorAt } from "./charts/palette";
import { MultiSeriesChart } from "./charts/multi-series-chart";
import { GroupedBarChart } from "./charts/grouped-bar-chart";
import { ChartFrame } from "./charts/chart-frame";
import {
  ChartDisplayProvider,
  useChartShowValues,
} from "./charts/chart-display";
import { niceStep } from "./charts/axis";
import { formatCompact } from "@/lib/utils";

export type AssistantChartType =
  | "bar"
  | "line"
  | "area"
  | "stackedArea"
  | "stackedBar"
  | "pie";

export interface AssistantChartSpec {
  type: AssistantChartType;
  title: string;
  subtitle?: string;
  xKey: string;
  series: { key: string; label: string; color?: string; dashed?: boolean }[];
  data: Record<string, number | string | null>[];
  unit?: string;
  note?: string;
  id?: string;
  after?: string;
  decimals?: number;
  referenceY?: number;
  referenceLabel?: string;
  /** Optional initial start year for long time-series line charts. */
  defaultFromYear?: number;
  /** Horizontal bars (good for long category labels). */
  layout?: "vertical" | "horizontal";
}

function fmt(v: unknown) {
  return typeof v === "number" ? formatCompact(v) : String(v);
}

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

export function AssistantChart({
  spec,
  preview = false,
}: {
  spec: AssistantChartSpec;
  preview?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { type, title, subtitle, xKey, series, data, unit, note } = spec;
  const horizontal = spec.layout === "horizontal";

  const lineData = React.useMemo(() => {
    const numeric = data.every((row) => {
      const x = row[xKey];
      return (
        typeof x === "number" ||
        (typeof x === "string" && /^-?\d+(\.\d+)?$/.test(x))
      );
    });
    if (!numeric) return data;
    return data.map((row) => ({ ...row, [xKey]: Number(row[xKey]) }));
  }, [data, xKey]);

  const yearOptions = React.useMemo(() => {
    if (type !== "line") return [];
    const years = lineData
      .map((row) => row[xKey])
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (years.length < 3) return [];
    const min = Math.min(...years);
    const max = Math.max(...years);
    if (max - min < 15) return [];
    const observed = [...new Set(years)].sort((a, b) => a - b);
    return observed.filter((y) => observed.filter((z) => z >= y).length >= 2);
  }, [type, lineData, xKey]);

  const [fromYear, setFromYear] = React.useState<number | null>(
    () => spec.defaultFromYear ?? null,
  );
  const [showValues, setShowValues] = React.useState(false);

  React.useEffect(() => {
    setFromYear(spec.defaultFromYear ?? null);
  }, [spec.defaultFromYear, spec.id, title]);

  const visibleLineData = React.useMemo(() => {
    if (fromYear == null || yearOptions.length === 0) return lineData;
    return lineData.filter((row) => {
      const y = row[xKey];
      return typeof y !== "number" || y >= fromYear;
    });
  }, [lineData, fromYear, yearOptions.length, xKey]);

  const download = React.useCallback(async () => {
    if (!ref.current) return;
    const url = await toPng(ref.current, {
      backgroundColor: "#ffffff",
      pixelRatio: 2,
      filter: (el) => {
        if (!(el instanceof HTMLElement)) return true;
        return el.dataset.exportIgnore == null;
      },
    });
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50)}.png`;
    a.click();
  }, [title]);

  const stacked = type === "stackedArea" || type === "stackedBar";
  const isComposition = type === "stackedArea";
  const height = preview
    ? type === "line" && series.length > 1
      ? 220
      : isComposition
        ? 200
        : horizontal
          ? Math.max(160, data.length * 28)
          : type === "bar"
            ? 180
            : 140
    : type === "line" && series.length > 1
      ? 300
      : isComposition
        ? 300
        : horizontal
          ? Math.max(220, data.length * 34)
          : type === "bar"
            ? 280
            : 260;

  const pctFmt = (v: unknown) =>
    typeof v === "number" ? `${v.toFixed(spec.decimals ?? 1)}%` : String(v);

  const chart =
    type === "line" || type === "bar"
      ? null
      : type === "pie"
        ? (
            <PieChart>
              <Tooltip formatter={(v) => fmt(v)} />
              <Pie
                data={data}
                dataKey={series[0]?.key ?? "value"}
                nameKey={xKey}
                outerRadius={90}
                innerRadius={45}
                paddingAngle={1}
                isAnimationActive={false}
                label={(e: { name?: string }) => e.name ?? ""}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colorAt(i)} />
                ))}
              </Pie>
            </PieChart>
          )
        : type === "area" || type === "stackedArea"
          ? (
            <AreaChart
              data={data}
              margin={{
                top: 8,
                right: 12,
                left: 0,
                bottom: series.length > 3 ? 8 : 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey={xKey}
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
              />
              <YAxis
                tickFormatter={isComposition ? (v) => `${v}%` : (v) => fmt(v)}
                domain={isComposition ? [0, 100] : ["auto", "auto"]}
                ticks={isComposition ? [0, 25, 50, 75, 100] : undefined}
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                formatter={(v, name) => [
                  isComposition ? pctFmt(v) : fmt(v),
                  name,
                ]}
                labelFormatter={(l) =>
                  typeof l === "number" || /^\d{4}$/.test(String(l))
                    ? `Year ${l}`
                    : String(l)
                }
              />
              {series.length > 1 && (
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "#475569", paddingTop: 4 }}
                />
              )}
              {series.map((s, i) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stackId={stacked ? "a" : undefined}
                  stroke={s.color ?? colorAt(i)}
                  fill={s.color ?? colorAt(i)}
                  fillOpacity={stacked ? 0.9 : 0.25}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          )
          : (
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} width={44} />
              <Tooltip formatter={(v) => fmt(v)} />
              {series.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stackId={stacked ? "a" : undefined}
                  fill={s.color ?? colorAt(i)}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          );

  const spanMin = yearOptions[0];
  const effectiveFrom =
    fromYear != null && yearOptions.includes(fromYear)
      ? fromYear
      : (spanMin ?? null);
  const zoomed =
    effectiveFrom != null && spanMin != null && effectiveFrom > spanMin;

  const renderBars = () => {
    if (horizontal) {
      return <HorizontalBars spec={spec} data={data} height={height} />;
    }

    return (
      <GroupedBarChart
        data={data}
        series={series.map((s, i) => ({
          key: s.key,
          label: s.label,
          color: s.color ?? colorAt(i),
        }))}
        height={height}
        unit={unit}
        decimals={spec.decimals ?? 2}
        referenceY={spec.referenceY}
        referenceLabel={spec.referenceLabel}
        xKey={xKey}
      />
    );
  };

  return (
    <ChartDisplayProvider showValues={showValues} setShowValues={setShowValues}>
    <div
      className={
        preview
          ? "overflow-hidden rounded-sm border border-slate-200 bg-white"
          : "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      }
    >
      <div
        ref={ref}
        className={
          preview
            ? "bg-white px-2.5 pb-1.5 pt-2 text-slate-900"
            : "bg-white px-3.5 pb-2 pt-3.5 text-slate-900"
        }
      >
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <div>
            <p
              className={
                preview
                  ? "font-sans text-xs font-semibold leading-tight text-slate-900"
                  : "font-sans text-sm font-semibold leading-tight text-slate-900"
              }
            >
              {title}
            </p>
            {!preview && subtitle ? (
              <p className="text-xs text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          {unit && (
            <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
              {unit}
            </span>
          )}
        </div>
        {type === "line" ? (
          <MultiSeriesChart
            data={visibleLineData}
            series={series.map((s, i) => ({
              key: s.key,
              label: s.label,
              color: s.color ?? colorAt(i),
              dashed: s.dashed,
            }))}
            height={height}
            unit={unit}
            decimals={spec.decimals ?? 2}
            referenceY={spec.referenceY}
            referenceLabel={spec.referenceLabel}
            xKey={xKey}
          />
        ) : type === "bar" ? (
          renderBars()
        ) : (
          <div style={{ width: "100%", height }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              {chart!}
            </ResponsiveContainer>
          </div>
        )}
        {yearOptions.length > 0 && effectiveFrom != null ? (
          <div
            data-export-ignore
            className="mt-1.5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-1.5"
          >
            <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
              From
              <select
                aria-label="Start year"
                className="h-7 rounded-sm border border-slate-200 bg-white px-1.5 text-[11px] tabular-nums text-slate-800 outline-none focus:border-slate-400"
                value={effectiveFrom}
                onChange={(e) => setFromYear(Number(e.target.value))}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            {zoomed ? (
              <button
                type="button"
                className="text-[11px] font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
                onClick={() => setFromYear(spanMin ?? null)}
              >
                Full series
              </button>
            ) : null}
          </div>
        ) : null}
        {!preview ? (
          <div className="mt-1.5 flex items-center justify-between border-t border-slate-200 pt-1.5">
            <span className="text-[10px] text-slate-400">
              {note || "AI estimate — for illustration"}
            </span>
            <span className="font-serif text-[11px] font-semibold text-slate-900">
              birthrate<span className="text-primary">.io</span>
            </span>
          </div>
        ) : null}
      </div>
      {!preview ? (
        <div
          data-export-ignore
          className="flex w-full items-center justify-center gap-3 border-t border-slate-200 bg-slate-50 py-2 text-xs font-medium text-slate-600"
        >
          <button
            type="button"
            role="switch"
            aria-checked={showValues}
            onClick={() => setShowValues((v) => !v)}
            className="transition hover:text-slate-900"
          >
            {showValues ? "Hide numbers" : "Show numbers"}
          </button>
          <span className="text-slate-300" aria-hidden>
            ·
          </span>
          <button
            type="button"
            onClick={download}
            className="inline-flex items-center gap-1.5 transition hover:text-slate-900"
          >
            <Download className="h-3.5 w-3.5" /> Download image
          </button>
        </div>
      ) : null}
    </div>
    </ChartDisplayProvider>
  );
}

function HorizontalBars({
  spec,
  data,
  height,
}: {
  spec: AssistantChartSpec;
  data: Record<string, number | string | null>[];
  height: number;
}) {
  const showValues = useChartShowValues();
  const { xKey, series, unit } = spec;
  const valueKey = series[0]?.key ?? "value";
  const barDomain = domainFromZero(
    data
      .map((row) => row[valueKey])
      .filter((v): v is number => typeof v === "number"),
    spec.referenceY,
    showValues ? 1.18 : 1.04,
  );

  return (
    <ChartFrame height={height}>
      {(width) => (
        <BarChart
          width={width}
          height={height}
          layout="vertical"
          data={data}
          margin={{
            top: 4,
            right: showValues ? 44 : 28,
            left: 4,
            bottom: 4,
          }}
        >
          <CartesianGrid
            horizontal={false}
            stroke="#e5e7eb"
            strokeDasharray="3 3"
          />
          <XAxis
            type="number"
            domain={barDomain}
            tickFormatter={(v) => fmt(v)}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey={xKey}
            width={Math.min(
              168,
              Math.max(
                96,
                ...data.map((row) => String(row[xKey] ?? "").length * 7.2),
              ),
            )}
            tick={{ fontSize: 11, fill: "#334155" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(v) => [
              `${fmt(v)}${unit ? ` ${unit}` : ""}`,
              series[0]?.label ?? "Value",
            ]}
          />
          {spec.referenceY !== undefined && (
            <ReferenceLine
              x={spec.referenceY}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={
                spec.referenceLabel
                  ? {
                      value: spec.referenceLabel,
                      position: "insideTopRight",
                      fontSize: 10,
                      fill: "#64748b",
                    }
                  : undefined
              }
            />
          )}
          <Bar
            dataKey={valueKey}
            radius={[0, 3, 3, 0]}
            isAnimationActive={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={series[0]?.color ?? colorAt(i)} />
            ))}
            {showValues ? (
              <LabelList
                dataKey={valueKey}
                position="right"
                offset={6}
                formatter={(v: number | string) =>
                  typeof v === "number" && Number.isFinite(v) ? fmt(v) : ""
                }
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  fill: "#334155",
                }}
              />
            ) : null}
          </Bar>
        </BarChart>
      )}
    </ChartFrame>
  );
}
