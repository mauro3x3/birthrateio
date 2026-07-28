"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import { colorAt } from "./palette";
import { formatCompact } from "@/lib/utils";

function StackedBarTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
  return (
    <div
      className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md"
      style={{ pointerEvents: "none" }}
    >
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <ul className="space-y-1 text-xs">
        {[...payload].reverse().map((p) => (
          <li key={String(p.dataKey)} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: p.color }}
            />
            <span className="flex-1">{p.name}</span>
            <span className="font-medium tabular-nums">
              {formatCompact(Number(p.value))}
            </span>
          </li>
        ))}
        <li className="mt-1 flex justify-between border-t border-border/60 pt-1 font-medium">
          <span>Total</span>
          <span className="tabular-nums">{formatCompact(total)}</span>
        </li>
      </ul>
    </div>
  );
}

/**
 * Absolute stacked bar chart (Denmark-style conviction counts by group).
 * `data` rows are keyed by `year` plus one numeric field per group.
 */
export function StackedBarChart({
  data,
  groups,
  height = 340,
}: {
  data: Record<string, number>[];
  groups: string[];
  height?: number;
}) {
  if (!data?.length || !groups.length) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
        style={{ cursor: "crosshair" }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-border"
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
          tickFormatter={(v) => formatCompact(Number(v))}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={48}
          className="fill-muted-foreground"
        />
        <Tooltip
          content={<StackedBarTooltip />}
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }}
          wrapperStyle={{ outline: "none", pointerEvents: "none", zIndex: 50 }}
          isAnimationActive={false}
        />
        {groups.map((g, i) => (
          <Bar
            key={g}
            dataKey={g}
            name={g}
            stackId="a"
            fill={colorAt(i)}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
