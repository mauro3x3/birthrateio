"use client";

import * as React from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  Scatter,
  Tooltip,
} from "recharts";
import { XAxis, YAxis } from "recharts";
import { ChartFrame } from "./chart-frame";

export interface AgingScatterRow {
  slug: string;
  name: string;
  flagEmoji: string | null;
  continent: string | null;
  /** Workers per retiree, today. */
  now: number;
  /** Workers per retiree, ~2060 projection. */
  at2060: number;
  /** Working-age population today, in millions — drives bubble size. */
  sizeMil: number;
}

export const CONTINENT_COLORS: Record<string, string> = {
  Africa: "#c9822b",
  Americas: "#2f7d75",
  Asia: "#b1483f",
  Europe: "#3a5a8c",
  "Middle East & North Africa": "#8a5fb0",
};
const FALLBACK_COLOR = "#94a3b8";

export function colorForContinent(continent: string | null | undefined) {
  return (continent && CONTINENT_COLORS[continent]) || FALLBACK_COLOR;
}

const TICKS = [1, 2, 3, 5, 10, 20, 30, 50, 80, 120];

function niceLogDomain(values: number[]): [number, number] {
  const finite = values.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (finite.length === 0) return [1, 10];
  const q = (p: number) =>
    finite[Math.min(finite.length - 1, Math.floor(p * (finite.length - 1)))];
  // 2nd–98th percentile so Gulf migrant outliers don’t squash the cloud.
  const lo = q(0.02);
  const hi = q(0.98);
  const domLo = lo < 1.2 ? 0.8 : 1;
  let domHi = TICKS[TICKS.length - 1];
  for (const t of TICKS) {
    if (t >= hi) {
      domHi = t;
      break;
    }
  }
  return [domLo, Math.max(domHi, 10)];
}

function radiusFor(sizeMil: number, maxSizeMil: number) {
  const v = Math.max(sizeMil, 0.02);
  const t = Math.log1p(v) / Math.log1p(Math.max(maxSizeMil, 1));
  return 4 + 15 * Math.max(0, Math.min(1, t));
}

type DotPayload = AgingScatterRow & { x: number; y: number };

function ScatterDot({
  cx,
  cy,
  payload,
  color,
  maxSizeMil,
  labeled,
  highlighted,
  onSelect,
}: {
  cx?: number;
  cy?: number;
  payload?: DotPayload;
  color: string;
  maxSizeMil: number;
  labeled: boolean;
  highlighted: boolean;
  onSelect?: (slug: string) => void;
}) {
  if (cx == null || cy == null || !payload) return null;
  const r = radiusFor(payload.sizeMil, maxSizeMil);
  return (
    <g
      style={{ cursor: onSelect ? "pointer" : undefined }}
      onClick={onSelect ? () => onSelect(payload.slug) : undefined}
    >
      {highlighted && (
        <circle
          cx={cx}
          cy={cy}
          r={r + 5}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeDasharray="2 2"
        />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={color}
        fillOpacity={0.75}
        stroke="#fff"
        strokeWidth={1}
      />
      {labeled && (
        <text
          x={cx}
          y={cy - r - 5}
          textAnchor="middle"
          fontSize={10.5}
          fontWeight={600}
          fill="#1e293b"
        >
          {payload.flagEmoji ? `${payload.flagEmoji} ` : ""}
          {payload.name}
        </text>
      )}
    </g>
  );
}

function ScatterTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: Partial<DotPayload> }[];
}) {
  if (!active || !payload?.length) return null;
  // ComposedChart also hits the dashed diagonal (only {x,y}) — skip those.
  const p = payload.find(
    (item) =>
      typeof item.payload?.now === "number" &&
      typeof item.payload?.at2060 === "number" &&
      item.payload.name,
  )?.payload;
  if (
    !p ||
    typeof p.now !== "number" ||
    typeof p.at2060 !== "number" ||
    !p.name
  ) {
    return null;
  }
  const delta = p.at2060 - p.now;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1 flex items-center gap-1.5 font-medium">
        <span className="text-base leading-none">{p.flagEmoji ?? "🏳️"}</span>
        {p.name}
      </p>
      <p className="text-muted-foreground">{p.continent ?? "—"}</p>
      <div className="mt-1.5 space-y-0.5">
        <p>
          Now:{" "}
          <span className="font-semibold tabular-nums">{p.now.toFixed(2)}</span>{" "}
          per retiree
        </p>
        <p>
          ~2060:{" "}
          <span className="font-semibold tabular-nums">
            {p.at2060.toFixed(2)}
          </span>
        </p>
        <p
          className={
            delta < 0 ? "font-medium text-rose-700" : "font-medium text-emerald-700"
          }
        >
          {delta > 0 ? "+" : ""}
          {delta.toFixed(2)} by 2060
        </p>
      </div>
    </div>
  );
}

/**
 * "Who's aging fastest" scatter: today's workers-per-retiree vs the ~2060
 * projection, on a shared log scale. Points below the dashed diagonal are
 * projected to have fewer workers per retiree in 2060 than today. Bubble
 * size ≈ working-age population today; colour = region.
 */
export function AgingScatterChart({
  rows,
  height = 460,
  highlightSlug,
  onSelect,
}: {
  rows: AgingScatterRow[];
  height?: number;
  highlightSlug?: string | null;
  onSelect?: (slug: string) => void;
}) {
  const valid = rows.filter(
    (r) =>
      Number.isFinite(r.now) &&
      r.now > 0 &&
      Number.isFinite(r.at2060) &&
      r.at2060 > 0,
  );

  if (valid.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  const domain = niceLogDomain(valid.flatMap((r) => [r.now, r.at2060]));
  const ticks = TICKS.filter((t) => t >= domain[0] && t <= domain[1]);
  const maxSizeMil = Math.max(...valid.map((r) => r.sizeMil), 1);
  const clamp = (v: number) => Math.min(Math.max(v, domain[0]), domain[1]);

  const labeledSlugs = new Set<string>();
  [...valid]
    .sort((a, b) => b.sizeMil - a.sizeMil)
    .slice(0, 6)
    .forEach((r) => labeledSlugs.add(r.slug));
  [...valid]
    .sort((a, b) => a.now - b.now)
    .slice(0, 2)
    .forEach((r) => labeledSlugs.add(r.slug));
  if (highlightSlug) labeledSlugs.add(highlightSlug);

  const groups = new Map<string, DotPayload[]>();
  for (const r of valid) {
    const key = r.continent ?? "Other";
    const list = groups.get(key) ?? [];
    list.push({ ...r, x: clamp(r.now), y: clamp(r.at2060) });
    groups.set(key, list);
  }

  const diagonal = [
    { x: domain[0], y: domain[0] },
    { x: domain[1], y: domain[1] },
  ];

  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      <div className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {Array.from(groups.keys())
          .sort()
          .map((continent) => (
            <span
              key={continent}
              className="flex items-center gap-1.5 text-xs text-foreground"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: colorForContinent(continent) }}
              />
              {continent}
            </span>
          ))}
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-5 border-t border-dashed border-slate-400" />
          No change by 2060
        </span>
      </div>
      <ChartFrame height={height}>
        {(width) => (
          <ComposedChart
            width={width}
            height={height}
            margin={{ top: 18, right: 16, left: 4, bottom: 22 }}
            style={{ cursor: "crosshair" }}
          >
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              scale="log"
              domain={domain}
              ticks={ticks}
              allowDataOverflow
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
              label={{
                value: "Workers per retiree — today",
                position: "insideBottom",
                offset: -14,
                fontSize: 11,
                fill: "#475569",
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              scale="log"
              domain={domain}
              ticks={ticks}
              allowDataOverflow
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              width={34}
              label={{
                value: "~2060",
                angle: -90,
                position: "insideLeft",
                fontSize: 11,
                fill: "#475569",
              }}
            />
            <Tooltip
              cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4" }}
              wrapperStyle={{ outline: "none", zIndex: 50 }}
              content={<ScatterTooltip />}
            />
            <Line
              data={diagonal}
              dataKey="y"
              stroke="#94a3b8"
              strokeWidth={1.25}
              strokeDasharray="5 4"
              dot={false}
              legendType="none"
              tooltipType="none"
              isAnimationActive={false}
              activeDot={false}
            />
            {Array.from(groups.entries()).map(([continent, data]) => {
              const color = colorForContinent(continent);
              return (
                <Scatter
                  key={continent}
                  data={data}
                  isAnimationActive={false}
                  shape={(props: unknown) => {
                    const p = props as {
                      cx?: number;
                      cy?: number;
                      payload?: DotPayload;
                    };
                    return (
                      <ScatterDot
                        cx={p.cx}
                        cy={p.cy}
                        payload={p.payload}
                        color={color}
                        maxSizeMil={maxSizeMil}
                        labeled={
                          p.payload ? labeledSlugs.has(p.payload.slug) : false
                        }
                        highlighted={
                          !!highlightSlug && p.payload?.slug === highlightSlug
                        }
                        onSelect={onSelect}
                      />
                    );
                  }}
                />
              );
            })}
          </ComposedChart>
        )}
      </ChartFrame>
    </div>
  );
}
