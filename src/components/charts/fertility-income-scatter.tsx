"use client";

import * as React from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  ReferenceLine,
} from "recharts";
import { useRouter } from "next/navigation";
import { ChartCard } from "@/components/charts/chart-card";
import { formatCompact, formatNumber } from "@/lib/utils";

export type FertilityIncomePoint = {
  iso3: string;
  slug: string;
  name: string;
  continent: string | null;
  flagEmoji: string | null;
  tfr: number;
  tfrYear: number;
  gdp: number;
  gdpYear: number;
};

const CONTINENT_COLOR: Record<string, string> = {
  Africa: "#b4532a",
  Asia: "#1d4f91",
  Europe: "#2f6b4f",
  "North America": "#7a4a8a",
  "South America": "#b8860b",
  Oceania: "#4a6fa5",
};

function colorFor(continent: string | null) {
  if (!continent) return "#64748b";
  return CONTINENT_COLOR[continent] ?? "#64748b";
}

export function FertilityIncomeScatter({
  points,
}: {
  points: FertilityIncomePoint[];
}) {
  const router = useRouter();
  const data = React.useMemo(
    () =>
      points.map((p) => ({
        ...p,
        x: p.gdp,
        y: p.tfr,
        fill: colorFor(p.continent),
      })),
    [points],
  );

  return (
    <ChartCard
      title="Fertility vs income"
      description="Each point is a country: GDP per capita (PPP) on the x-axis, period TFR on the y-axis. Hover for the figures; click to open the country page."
      source="World Bank"
    >
      <div className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 16, bottom: 8, left: 4 }}>
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
            <XAxis
              type="number"
              dataKey="x"
              name="GDP per capita"
              scale="log"
              domain={["auto", "auto"]}
              tickFormatter={(v) => formatCompact(Number(v))}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
              label={{
                value: "GDP per capita (PPP), log scale",
                position: "insideBottom",
                offset: -2,
                fontSize: 11,
                fill: "#64748b",
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="TFR"
              domain={[0, "auto"]}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              width={36}
              label={{
                value: "TFR",
                angle: -90,
                position: "insideLeft",
                fontSize: 11,
                fill: "#64748b",
              }}
            />
            <ZAxis range={[40, 40]} />
            <ReferenceLine
              y={2.1}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={{
                value: "Replacement ≈ 2.1",
                position: "insideTopRight",
                fontSize: 10,
                fill: "#64748b",
              }}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0]?.payload as FertilityIncomePoint & {
                  fill: string;
                };
                if (!p) return null;
                return (
                  <div className="rounded-sm border border-border bg-card px-3 py-2 text-xs shadow-sm">
                    <p className="font-medium text-foreground">
                      {p.flagEmoji ? `${p.flagEmoji} ` : ""}
                      {p.name}
                    </p>
                    <p className="mt-1 tabular-nums text-muted-foreground">
                      TFR {formatNumber(p.tfr, 2)} ({p.tfrYear})
                    </p>
                    <p className="tabular-nums text-muted-foreground">
                      GDP/capita PPP {formatCompact(p.gdp)} ({p.gdpYear})
                    </p>
                  </div>
                );
              }}
            />
            <Scatter
              data={data}
              fill="#64748b"
              shape={(props: unknown) => {
                const { cx, cy, payload } = props as {
                  cx?: number;
                  cy?: number;
                  payload?: FertilityIncomePoint & { fill: string };
                };
                if (cx == null || cy == null || !payload) return <g />;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4.5}
                    fill={payload.fill}
                    fillOpacity={0.75}
                    stroke="#fff"
                    strokeWidth={1}
                    style={{ cursor: "pointer" }}
                    onClick={() => router.push(`/country/${payload.slug}`)}
                  />
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.7rem] text-muted-foreground">
        {Object.entries(CONTINENT_COLOR).map(([name, color]) => (
          <li key={name} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: color }}
              aria-hidden
            />
            {name}
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}
