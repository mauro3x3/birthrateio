"use client";

import * as React from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartFrame } from "./chart-frame";

export interface CitizenFlowRow {
  slug: string;
  name: string;
  flagEmoji: string | null;
  efta: boolean;
  year: number;
  emigrants: number;
  returnImmigrants: number;
  citizenPopulation: number;
  leavePer1000: number;
  returnPer1000: number;
}

const COLOR_NET_RETURN = "#2f7d75";
const COLOR_NET_LEAVE = "#b07040";
const COLOR_EFTA_STROKE = "#1e293b";

function radiusFor(emigrants: number, maxEmi: number) {
  const v = Math.max(emigrants, 50);
  const t = Math.sqrt(v) / Math.sqrt(Math.max(maxEmi, 1));
  return 5 + 22 * Math.max(0, Math.min(1, t));
}

function niceCeil(v: number, step = 1) {
  return Math.ceil(v / step) * step;
}

type DotPayload = CitizenFlowRow & { x: number; y: number; netReturn: boolean };

function ScatterDot({
  cx,
  cy,
  payload,
  maxEmi,
  labeled,
}: {
  cx?: number;
  cy?: number;
  payload?: DotPayload;
  maxEmi: number;
  labeled: boolean;
}) {
  if (cx == null || cy == null || !payload) return null;
  const r = radiusFor(payload.emigrants, maxEmi);
  const color = payload.netReturn ? COLOR_NET_RETURN : COLOR_NET_LEAVE;
  const label = payload.efta ? `${payload.name}*` : payload.name;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={color}
        fillOpacity={0.72}
        stroke={payload.efta ? COLOR_EFTA_STROKE : "#fff"}
        strokeWidth={payload.efta ? 1.4 : 1}
      />
      {labeled && (
        <text
          x={cx}
          y={cy - r - 4}
          textAnchor="middle"
          fontSize={10.5}
          fontWeight={600}
          fill="#1e293b"
        >
          {label}
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
  const p = payload.find(
    (item) =>
      typeof item.payload?.leavePer1000 === "number" &&
      typeof item.payload?.returnPer1000 === "number" &&
      item.payload.name,
  )?.payload;
  if (
    !p ||
    typeof p.leavePer1000 !== "number" ||
    typeof p.returnPer1000 !== "number" ||
    !p.name
  ) {
    return null;
  }
  const net = p.returnPer1000 - p.leavePer1000;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1 flex items-center gap-1.5 font-medium">
        <span className="text-base leading-none">{p.flagEmoji ?? "🏳️"}</span>
        {p.name}
        {p.efta ? <span className="text-muted-foreground">· EFTA</span> : null}
      </p>
      <p className="text-muted-foreground">{p.year}</p>
      <div className="mt-1.5 space-y-0.5">
        <p>
          Left:{" "}
          <span className="font-semibold tabular-nums">
            {p.leavePer1000.toFixed(2)}
          </span>{" "}
          per 1,000
          {typeof p.emigrants === "number" && (
            <span className="text-muted-foreground">
              {" "}
              ({p.emigrants.toLocaleString()} people)
            </span>
          )}
        </p>
        <p>
          Returned:{" "}
          <span className="font-semibold tabular-nums">
            {p.returnPer1000.toFixed(2)}
          </span>{" "}
          per 1,000
        </p>
        <p
          className={
            net >= 0
              ? "font-medium text-teal-800"
              : "font-medium text-amber-800"
          }
        >
          {net >= 0 ? "Net return +" : "Net leave "}
          {net.toFixed(2)} per 1,000
        </p>
      </div>
    </div>
  );
}

function SizeLegend({ maxEmi }: { maxEmi: number }) {
  const refs = [10_000, 50_000, 150_000].filter((n) => n <= maxEmi * 1.15);
  if (refs.length === 0) refs.push(Math.round(maxEmi));
  return (
    <div className="flex flex-wrap items-end gap-5 text-[11px] text-muted-foreground">
      <span className="self-center font-medium text-foreground/80">
        Citizens who left
      </span>
      {refs.map((n) => {
        const r = radiusFor(n, maxEmi);
        return (
          <span key={n} className="flex flex-col items-center gap-1">
            <svg width={r * 2 + 2} height={r * 2 + 2} aria-hidden>
              <circle
                cx={r + 1}
                cy={r + 1}
                r={r}
                fill="#94a3b8"
                fillOpacity={0.35}
                stroke="#64748b"
                strokeWidth={1}
              />
            </svg>
            <span className="tabular-nums">{(n / 1000).toFixed(0)}k</span>
          </span>
        );
      })}
    </div>
  );
}

/**
 * Frontpages-style bubble scatter: nationals leaving vs returning home,
 * per 1,000 citizens. Bubble area ∝ absolute leavers. Diagonal = balance.
 */
export function CitizenFlowsScatter({
  rows,
  height = 560,
}: {
  rows: CitizenFlowRow[];
  height?: number;
}) {
  const valid = rows.filter(
    (r) =>
      Number.isFinite(r.leavePer1000) &&
      r.leavePer1000 >= 0 &&
      Number.isFinite(r.returnPer1000) &&
      r.returnPer1000 >= 0 &&
      Number.isFinite(r.emigrants),
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

  const maxRate = Math.max(
    ...valid.map((r) => Math.max(r.leavePer1000, r.returnPer1000)),
  );
  const domainMax = Math.max(10, niceCeil(maxRate * 1.08, 1));
  const domain: [number, number] = [0, domainMax];
  const maxEmi = Math.max(...valid.map((r) => r.emigrants), 1);

  const labeledSlugs = new Set<string>();
  [...valid]
    .sort((a, b) => b.emigrants - a.emigrants)
    .slice(0, 8)
    .forEach((r) => labeledSlugs.add(r.slug));
  [...valid]
    .sort(
      (a, b) =>
        Math.abs(b.returnPer1000 - b.leavePer1000) -
        Math.abs(a.returnPer1000 - a.leavePer1000),
    )
    .slice(0, 10)
    .forEach((r) => labeledSlugs.add(r.slug));
  [...valid]
    .sort(
      (a, b) =>
        Math.max(b.leavePer1000, b.returnPer1000) -
        Math.max(a.leavePer1000, a.returnPer1000),
    )
    .slice(0, 6)
    .forEach((r) => labeledSlugs.add(r.slug));

  const points: DotPayload[] = valid.map((r) => ({
    ...r,
    x: r.leavePer1000,
    y: r.returnPer1000,
    netReturn: r.returnPer1000 >= r.leavePer1000,
  }));

  const above = points.filter((p) => p.netReturn);
  const below = points.filter((p) => !p.netReturn);

  const diagonal = [
    { x: 0, y: 0 },
    { x: domainMax, y: domainMax },
  ];

  const ticks = Array.from(
    { length: Math.floor(domainMax) + 1 },
    (_, i) => i,
  ).filter((t) => t === 0 || t % 2 === 0 || t === Math.floor(domainMax));

  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: COLOR_NET_RETURN }}
            />
            More came back than left
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: COLOR_NET_LEAVE }}
            />
            More left than came back
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="inline-block h-2 w-5 border-t border-dashed border-slate-400" />
            Equal rates
          </span>
        </div>
        <SizeLegend maxEmi={maxEmi} />
      </div>
      <ChartFrame height={height}>
        {(width) => (
          <div className="relative" style={{ width, height }}>
            <p
              className="pointer-events-none absolute left-[14%] top-[10%] z-10 text-[11px] font-semibold tracking-wide"
              style={{ color: COLOR_NET_RETURN }}
            >
              More came back than left
            </p>
            <p
              className="pointer-events-none absolute bottom-[18%] right-[8%] z-10 text-[11px] font-semibold tracking-wide"
              style={{ color: COLOR_NET_LEAVE }}
            >
              More left than came back
            </p>
            <ComposedChart
            width={width}
            height={height}
            margin={{ top: 28, right: 28, left: 8, bottom: 36 }}
            style={{ cursor: "crosshair" }}
          >
            <CartesianGrid stroke="#e8eaed" strokeDasharray="2 3" />
            <XAxis
              type="number"
              dataKey="x"
              domain={domain}
              ticks={ticks}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
              label={{
                value: "Citizens who moved abroad, per 1,000 citizens",
                position: "insideBottom",
                offset: -22,
                fontSize: 11.5,
                fill: "#475569",
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={domain}
              ticks={ticks}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              width={36}
              label={{
                value: "Citizens who moved back, per 1,000 citizens",
                angle: -90,
                position: "insideLeft",
                offset: 8,
                fontSize: 11.5,
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
              strokeWidth={1.35}
              strokeDasharray="5 4"
              dot={false}
              legendType="none"
              tooltipType="none"
              isAnimationActive={false}
              activeDot={false}
            />
            {[
              { key: "above", data: above, color: COLOR_NET_RETURN },
              { key: "below", data: below, color: COLOR_NET_LEAVE },
            ].map(({ key, data, color }) => (
              <Scatter
                key={key}
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
                      maxEmi={maxEmi}
                      labeled={
                        p.payload ? labeledSlugs.has(p.payload.slug) : false
                      }
                    />
                  );
                }}
                fill={color}
              />
            ))}
          </ComposedChart>
          </div>
        )}
      </ChartFrame>
      <p className="mt-2 text-[11px] text-muted-foreground">
        * Outside the EU (EFTA). Foreign residents are not counted.
      </p>
    </div>
  );
}
