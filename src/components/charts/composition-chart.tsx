"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import { colorAt } from "./palette";

function CompositionTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
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
              {Number(p.value).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Color-keyed legend matching the stacked area order. */
export function CompositionLegend({ groups }: { groups: string[] }) {
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {groups.map((g, i) => (
        <span key={g} className="flex items-center gap-1.5 text-xs">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ background: colorAt(i) }}
          />
          {g}
        </span>
      ))}
    </div>
  );
}

/**
 * 100%-stacked area chart showing how group shares evolve over time.
 * `data` rows are keyed by `year` plus one numeric field per group.
 */
export function CompositionChart({
  data,
  groups,
  height = 340,
}: {
  data: Record<string, number>[];
  groups: string[];
  height?: number;
}) {
  if (!data || data.length === 0 || groups.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        No composition data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={data}
        margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
        stackOffset="expand"
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
          minTickGap={20}
          className="fill-muted-foreground"
        />
        <YAxis
          tickFormatter={(v) => `${Math.round(Number(v) * 100)}%`}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={44}
          className="fill-muted-foreground"
        />
        <Tooltip
          content={<CompositionTooltip />}
          cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "4 4" }}
          wrapperStyle={{ outline: "none", pointerEvents: "none", zIndex: 50 }}
          isAnimationActive={false}
        />
        {groups.map((g, i) => (
          <Area
            key={g}
            type="monotone"
            dataKey={g}
            name={g}
            stackId="1"
            stroke={colorAt(i)}
            fill={colorAt(i)}
            fillOpacity={0.75}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
