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
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colorAt } from "./charts/palette";
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
  series: { key: string; label: string }[];
  data: Record<string, number | string>[];
  unit?: string;
  note?: string;
}

function fmt(v: unknown) {
  return typeof v === "number" ? formatCompact(v) : String(v);
}

export function AssistantChart({ spec }: { spec: AssistantChartSpec }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { type, title, subtitle, xKey, series, data, unit, note } = spec;

  const download = React.useCallback(async () => {
    if (!ref.current) return;
    const url = await toPng(ref.current, {
      backgroundColor: "#ffffff",
      pixelRatio: 2,
    });
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50)}.png`;
    a.click();
  }, [title]);

  const stacked = type === "stackedArea" || type === "stackedBar";
  const height = 260;

  const chart = (() => {
    if (type === "pie") {
      const valueKey = series[0]?.key ?? "value";
      return (
        <PieChart>
          <Tooltip formatter={(v) => fmt(v)} />
          <Pie
            data={data}
            dataKey={valueKey}
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
      );
    }

    if (type === "line") {
      return (
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} width={44} />
          <Tooltip formatter={(v) => fmt(v)} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: "#475569" }} />}
          {series.map((s, i) => (
            <Line key={s.key} dataKey={s.key} name={s.label} stroke={colorAt(i)} strokeWidth={2} dot={false} isAnimationActive={false} />
          ))}
        </LineChart>
      );
    }

    if (type === "area" || type === "stackedArea") {
      return (
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} width={44} />
          <Tooltip formatter={(v) => fmt(v)} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: "#475569" }} />}
          {series.map((s, i) => (
            <Area
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId={stacked ? "a" : undefined}
              stroke={colorAt(i)}
              fill={colorAt(i)}
              fillOpacity={stacked ? 0.85 : 0.25}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      );
    }

    // bar / stackedBar
    return (
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} width={44} />
        <Tooltip formatter={(v) => fmt(v)} cursor={{ fill: "hsl(var(--muted-foreground) / 0.1)" }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: "#475569" }} />}
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} stackId={stacked ? "a" : undefined} fill={colorAt(i)} isAnimationActive={false} radius={stacked ? 0 : [3, 3, 0, 0]} />
        ))}
      </BarChart>
    );
  })();

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div ref={ref} className="bg-white px-3.5 pb-2 pt-3.5 text-slate-900">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <p className="font-sans text-sm font-semibold leading-tight text-slate-900">
              {title}
            </p>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          {unit && (
            <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
              {unit}
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={height}>
          {chart}
        </ResponsiveContainer>
        <div className="mt-1.5 flex items-center justify-between border-t border-slate-200 pt-1.5">
          <span className="text-[10px] text-slate-400">
            {note || "AI estimate — for illustration"}
          </span>
          <span className="font-serif text-[11px] font-semibold text-slate-900">
            birthrate<span className="text-primary">.io</span>
          </span>
        </div>
      </div>
      <button
        onClick={download}
        className="flex w-full items-center justify-center gap-1.5 border-t border-slate-200 bg-slate-50 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <Download className="h-3.5 w-3.5" /> Download image
      </button>
    </div>
  );
}
