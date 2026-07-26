"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import { formatCompact } from "@/lib/utils";
import { colorAt } from "./palette";
import type { EthnicityPyramidRow } from "@/lib/ethnicity-pyramid";

/** Round up to a clean 1 / 1.5 / 2 / 3 / 5 / 7.5 × 10ⁿ bound for a tidy axis. */
function niceCeil(x: number): number {
  if (!(x > 0)) return 1;
  const exp = Math.floor(Math.log10(x));
  const base = Math.pow(10, exp);
  const f = x / base;
  const nice =
    f <= 1 ? 1 : f <= 1.5 ? 1.5 : f <= 2 ? 2 : f <= 3 ? 3 : f <= 5 ? 5 : f <= 7.5 ? 7.5 : 10;
  return nice * base;
}

function EthnicityPyramidTooltip({
  active,
  payload,
  label,
  groups,
}: TooltipProps<number, string> & { groups: string[] }) {
  if (!active || !payload?.length) return null;
  const totals = groups.map((g) => {
    const male = Math.abs(
      Number(payload.find((p) => p.dataKey === `m::${g}`)?.value ?? 0),
    );
    const female = Math.abs(
      Number(payload.find((p) => p.dataKey === `f::${g}`)?.value ?? 0),
    );
    return { g, total: male + female };
  });
  return (
    <div
      className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md"
      style={{ pointerEvents: "none" }}
    >
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
        Age {label}
      </p>
      <ul className="space-y-1 text-xs">
        {totals.map(({ g, total }, i) => (
          <li key={g} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: colorAt(i) }}
            />
            <span className="flex-1">{g}</span>
            <span className="font-medium tabular-nums">
              {formatCompact(total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EthnicityPyramid({
  rows,
  groups,
  maxValue,
  height = 460,
}: {
  rows: EthnicityPyramidRow[];
  groups: string[];
  maxValue?: number;
  height?: number;
}) {
  if (!rows?.length) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  // Males negative (left), females positive (right). One field per group/side.
  const data = [...rows]
    .sort((a, b) => b.ageStart - a.ageStart)
    .map((r) => {
      const row: Record<string, number | string> = { ageGroup: r.ageGroup };
      for (const g of groups) {
        row[`m::${g}`] = -Math.abs(r.m[g] ?? 0);
        row[`f::${g}`] = Math.abs(r.f[g] ?? 0);
      }
      return row;
    });

  // Symmetric, zero-centered axis. Recharts' auto ticks produce an off-center,
  // non-round axis here, so we pin a clean nice-rounded bound and 5 ticks.
  const peak =
    maxValue ??
    rows.reduce((mx, r) => {
      const m = groups.reduce((s, g) => s + Math.abs(r.m[g] ?? 0), 0);
      const f = groups.reduce((s, g) => s + Math.abs(r.f[g] ?? 0), 0);
      return Math.max(mx, m, f);
    }, 0);
  const bound = niceCeil(peak);
  const half = bound / 2;
  const axisTicks = [-bound, -half, 0, half, bound];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        stackOffset="sign"
        margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
        barCategoryGap={1}
        style={{ cursor: "crosshair" }}
      >
        <XAxis
          type="number"
          domain={[-bound, bound]}
          ticks={axisTicks}
          allowDataOverflow
          tickFormatter={(v) => formatCompact(Math.abs(Number(v)))}
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          className="fill-muted-foreground"
        />
        <YAxis
          type="category"
          dataKey="ageGroup"
          tick={{ fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={42}
          interval={0}
          className="fill-muted-foreground"
        />
        <Tooltip
          content={<EthnicityPyramidTooltip groups={groups} />}
          cursor={{ fill: "hsl(var(--muted-foreground) / 0.12)" }}
          wrapperStyle={{ outline: "none", pointerEvents: "none", zIndex: 50 }}
          isAnimationActive={false}
        />
        {groups.map((g, i) => (
          <Bar
            key={`m-${g}`}
            dataKey={`m::${g}`}
            stackId="male"
            fill={colorAt(i)}
            isAnimationActive={false}
          />
        ))}
        {groups.map((g, i) => (
          <Bar
            key={`f-${g}`}
            dataKey={`f::${g}`}
            stackId="female"
            fill={colorAt(i)}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
