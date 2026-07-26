"use client";

import {
  Bar,
  BarChart,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import { formatCompact } from "@/lib/utils";
import { niceStep } from "./axis";

export interface PyramidRow {
  ageGroup: string;
  ageStart: number;
  male: number;
  female: number;
}

const MALE = "hsl(211 62% 45%)";
const FEMALE = "hsl(344 62% 52%)";

function PyramidTooltip({
  active,
  payload,
  label,
  total,
}: TooltipProps<number, string> & { total: number }) {
  if (!active || !payload?.length) return null;
  const male = Math.abs(Number(payload.find((p) => p.dataKey === "male")?.value ?? 0));
  const female = Math.abs(
    Number(payload.find((p) => p.dataKey === "female")?.value ?? 0),
  );
  const sum = male + female;
  const pct = (n: number) =>
    total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "—";
  return (
    <div
      className="rounded-sm border bg-popover px-3 py-2 text-popover-foreground shadow-md"
      style={{ pointerEvents: "none" }}
    >
      <p className="mb-1.5 text-xs font-semibold">Age {label}</p>
      <ul className="space-y-1 text-xs">
        <li className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm" style={{ background: MALE }} />
          <span className="flex-1">Male</span>
          <span className="font-medium tabular-nums">{formatCompact(male)}</span>
          <span className="w-10 text-right tabular-nums text-muted-foreground">
            {pct(male)}
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm" style={{ background: FEMALE }} />
          <span className="flex-1">Female</span>
          <span className="font-medium tabular-nums">{formatCompact(female)}</span>
          <span className="w-10 text-right tabular-nums text-muted-foreground">
            {pct(female)}
          </span>
        </li>
        <li className="flex items-center gap-2 border-t pt-1">
          <span className="flex-1 text-muted-foreground">Total</span>
          <span className="font-medium tabular-nums">{formatCompact(sum)}</span>
        </li>
      </ul>
    </div>
  );
}

export function PopulationPyramid({
  rows,
  height = 460,
  maxValue,
  showPercentages = true,
  showSummary = true,
}: {
  rows: PyramidRow[];
  height?: number;
  /** Fix the horizontal axis to this magnitude (keeps scale steady while animating). */
  maxValue?: number;
  /** Show a % of total label at the inner end of each bar (PopulationPyramid.net style). */
  showPercentages?: boolean;
  /** Show the Male / Total / Female summary strip above the chart. */
  showSummary?: boolean;
}) {
  if (!rows || rows.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        No age-structure data available
      </div>
    );
  }

  const total = rows.reduce(
    (s, r) => s + Math.abs(r.male) + Math.abs(r.female),
    0,
  );
  const pctLabel = (v: number) => {
    const p = total > 0 ? (Math.abs(Number(v)) / total) * 100 : 0;
    // Hide labels on negligible cohorts to avoid clutter at the apex.
    return p >= 0.6 ? `${p.toFixed(1)}%` : "";
  };

  const maleTotal = rows.reduce((s, r) => s + Math.abs(r.male), 0);
  const femaleTotal = rows.reduce((s, r) => s + Math.abs(r.female), 0);

  // Symmetric horizontal bound so the pyramid is centred (PopulationPyramid.net
  // style). Round up to a clean step for tidy ticks.
  const dataMax = rows.reduce(
    (m, r) => Math.max(m, Math.abs(r.male), Math.abs(r.female)),
    0,
  );
  const rawBound = maxValue ?? dataMax;
  const step = niceStep(rawBound);
  const bound = Math.max(step, Math.ceil(rawBound / step) * step);
  const ticks = [-bound, -bound / 2, 0, bound / 2, bound];
  const xFmt = (v: number) => {
    const a = Math.abs(Number(v));
    return showPercentages && total > 0
      ? `${((a / total) * 100).toFixed(a / total < 0.1 ? 1 : 0)}%`
      : formatCompact(a);
  };

  // Males rendered as negative so they extend left.
  const data = [...rows]
    .sort((a, b) => b.ageStart - a.ageStart)
    .map((r) => ({
      ageGroup: r.ageGroup,
      male: -Math.abs(r.male),
      female: Math.abs(r.female),
    }));

  return (
    <div>
      {showSummary && (
        <div className="mb-2 flex items-center justify-between px-1 text-xs">
          <span
            className="flex items-center gap-1.5 font-medium"
            style={{ color: MALE }}
          >
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: MALE }} />
            Male
            <span className="tabular-nums text-muted-foreground">
              {formatCompact(maleTotal)}
            </span>
          </span>
          <span className="text-muted-foreground">
            Total{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {formatCompact(total)}
            </span>
          </span>
          <span
            className="flex items-center gap-1.5 font-medium"
            style={{ color: FEMALE }}
          >
            <span className="tabular-nums text-muted-foreground">
              {formatCompact(femaleTotal)}
            </span>
            Female
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: FEMALE }}
            />
          </span>
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          stackOffset="sign"
          margin={{ top: 4, right: 12, left: 12, bottom: 0 }}
          barCategoryGap={2}
          style={{ cursor: "crosshair" }}
        >
          <XAxis
            type="number"
            domain={[-bound, bound]}
            ticks={ticks}
            allowDataOverflow
            tickFormatter={(v) => xFmt(Number(v))}
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
            width={40}
            interval={0}
            className="fill-muted-foreground"
          />
          <ReferenceLine x={0} stroke="hsl(var(--border))" strokeWidth={1} />
          <Tooltip
            content={<PyramidTooltip total={total} />}
            cursor={{ fill: "hsl(var(--muted-foreground) / 0.1)" }}
            wrapperStyle={{ outline: "none", pointerEvents: "none", zIndex: 50 }}
            isAnimationActive={false}
          />
          <Bar dataKey="male" fill={MALE} radius={[2, 0, 0, 2]} isAnimationActive={false}>
            {showPercentages && (
              <LabelList
                dataKey="male"
                position="insideRight"
                formatter={pctLabel}
                fill="#ffffff"
                fontSize={9}
                fontWeight={600}
              />
            )}
          </Bar>
          <Bar
            dataKey="female"
            fill={FEMALE}
            radius={[0, 2, 2, 0]}
            isAnimationActive={false}
          >
            {showPercentages && (
              <LabelList
                dataKey="female"
                position="insideLeft"
                formatter={pctLabel}
                fill="#ffffff"
                fontSize={9}
                fontWeight={600}
              />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
