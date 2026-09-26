"use client";

import * as React from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { formatCompact } from "@/lib/utils";
import type { WorldShareCountry } from "@/lib/sources/world-shares-data";

type Metric = "population" | "births";

type Node = {
  name: string;
  size?: number;
  share?: number;
  iso3?: string;
  fill?: string;
  children?: Node[];
};

function treemapData(
  countries: WorldShareCountry[],
  metric: Metric,
  continentColors: Record<string, string>,
): Node[] {
  const byCont = new Map<string, WorldShareCountry[]>();
  for (const c of countries) {
    const cont = c.continent || "Other";
    const list = byCont.get(cont) ?? [];
    list.push(c);
    byCont.set(cont, list);
  }

  const order = [
    "Asia",
    "Africa",
    "Europe",
    "North America",
    "South America",
    "Oceania",
    "Other",
  ];

  return order
    .filter((cont) => byCont.has(cont))
    .map((cont) => {
      const list = byCont.get(cont)!;
      const children = list
        .map((c) => {
          const latest =
            metric === "population" ? c.latestPopulation : c.latestBirths;
          if (!latest?.absolute) return null;
          return {
            name: c.name,
            iso3: c.iso3,
            size: latest.absolute,
            share: latest.value,
            fill: continentColors[cont] ?? "#95a5a6",
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null)
        .sort((a, b) => b.size - a.size);
      return {
        name: cont,
        fill: continentColors[cont] ?? "#95a5a6",
        children,
      };
    })
    .filter((n) => (n.children?.length ?? 0) > 0);
}

function Cell(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  share?: number;
  fill?: string;
  depth?: number;
}) {
  const { x = 0, y = 0, width = 0, height = 0, name, share, fill, depth } = props;
  if (width < 2 || height < 2) return null;
  const isLeaf = depth === 2;
  const showLabel = isLeaf && width > 36 && height > 22;
  const showShare = isLeaf && width > 52 && height > 34 && share != null;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill ?? "#ccc"}
        stroke="#fff"
        strokeWidth={isLeaf ? 1 : 2}
        opacity={isLeaf ? 0.92 : 0.35}
      />
      {showLabel ? (
        <text
          x={x + 4}
          y={y + 14}
          fill="#fff"
          fontSize={width > 80 ? 12 : 10}
          fontWeight={600}
          style={{ textShadow: "0 1px 2px rgba(0,0,0,.45)" }}
        >
          {name}
        </text>
      ) : null}
      {showShare ? (
        <text
          x={x + 4}
          y={y + 28}
          fill="rgba(255,255,255,.9)"
          fontSize={10}
          style={{ textShadow: "0 1px 2px rgba(0,0,0,.45)" }}
        >
          {share.toFixed(1)}%
        </text>
      ) : null}
    </g>
  );
}

export function WorldSharesTreemap({
  countries,
  continentColors,
  populationYear,
  birthsYear,
  height = 520,
}: {
  countries: WorldShareCountry[];
  continentColors: Record<string, string>;
  populationYear: number;
  birthsYear: number;
  height?: number;
}) {
  const [metric, setMetric] = React.useState<Metric>("population");
  const data = React.useMemo(
    () => treemapData(countries, metric, continentColors),
    [countries, metric, continentColors],
  );
  const year = metric === "population" ? populationYear : birthsYear;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex border border-border">
          {(
            [
              ["population", `Population · ${populationYear}`],
              ["births", `Births · ${birthsYear}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMetric(id)}
              className={
                metric === id
                  ? "bg-foreground px-3 py-1.5 text-xs font-medium text-background"
                  : "bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              }
            >
              {label}
            </button>
          ))}
        </div>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {Object.entries(continentColors).map(([name, color]) => (
            <li key={name} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: color }}
                aria-hidden
              />
              {name}
            </li>
          ))}
        </ul>
      </div>

      <div className="border border-border bg-[#0b1220]" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="size"
            stroke="#fff"
            fill="#888"
            content={<Cell />}
            isAnimationActive={false}
          >
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const p = payload[0].payload as Node & {
                  root?: unknown;
                };
                if (!p.size || p.children) return null;
                return (
                  <div className="border border-border bg-card px-2.5 py-1.5 text-xs shadow-md">
                    <p className="font-medium text-foreground">{p.name}</p>
                    <p className="tabular-nums text-muted-foreground">
                      {formatCompact(p.size)}
                      {metric === "births" ? " births" : " people"}
                      {p.share != null ? ` · ${p.share.toFixed(1)}% of world` : ""}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{year}</p>
                  </div>
                );
              }}
            />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
