"use client";

import * as React from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { cn, formatCompact } from "@/lib/utils";
import type { CountryTrade, TradeProduct } from "@/lib/oec-types";

/** OEC-inspired section palette (stable by name). */
const SECTION_COLORS: Record<string, string> = {
  Transportation: "#3b82c4",
  Machines: "#5b8def",
  "Electronic Equipment": "#7aa2f7",
  "Chemical Products": "#c45c8a",
  "Mineral Products": "#b07a4a",
  Metals: "#8b7355",
  "Precious Metals": "#c9a227",
  "Plastics and Rubbers": "#6b9b8a",
  Textiles: "#3d9b6e",
  "Animal Products": "#d4a017",
  "Vegetable Products": "#c4a35a",
  Foodstuffs: "#e0b84e",
  "Animal and Vegetable Bi-Products": "#a68b4b",
  "Animal Hides": "#9a7b5a",
  Footwear: "#5a8f7b",
  "Stone And Glass": "#7d8b99",
  "Instruments & Apparatus": "#6d7cff",
  "Weapons & Firearms": "#8a4a4a",
  Miscellaneous: "#7a7a7a",
  "Arts and Antiques": "#9b6b9b",
  Papergoods: "#8a9a6b",
  "Wood Products": "#6b8f5a",
};

function colorForSection(section: string): string {
  if (SECTION_COLORS[section]) return SECTION_COLORS[section];
  let h = 0;
  for (let i = 0; i < section.length; i++) h = (h * 31 + section.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 42% 42%)`;
}

type CellProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  share?: number;
  section?: string;
  value?: number;
  payload?: TradeProduct;
};

function TreemapCell(props: CellProps) {
  const x = props.x ?? 0;
  const y = props.y ?? 0;
  const width = props.width ?? 0;
  const height = props.height ?? 0;
  const name = props.name ?? props.payload?.name;
  const share = props.share ?? props.payload?.share;
  const section = props.section ?? props.payload?.section;
  if (width < 2 || height < 2 || !name) return null;
  const fill = colorForSection(section ?? "Other");
  const showLabel = width > 56 && height > 34;
  const showShare = width > 72 && height > 48;
  const label =
    name.length > 42 && width < 160 ? `${name.slice(0, 40)}…` : name;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke="hsl(var(--background))"
        strokeWidth={2}
      />
      {showLabel && (
        <foreignObject x={x + 4} y={y + 4} width={width - 8} height={height - 8}>
          <div className="pointer-events-none h-full overflow-hidden text-[11px] leading-tight text-white">
            <div className="font-semibold drop-shadow-sm">{label}</div>
            {showShare && share != null && (
              <div className="mt-0.5 tabular-nums text-white/85">
                {share.toFixed(share >= 10 ? 1 : 2)}%
              </div>
            )}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

function TradeTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TradeProduct & { fill?: string } }>;
}) {
  if (!active || !payload?.[0]) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-sm border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-foreground">{p.name}</p>
      <p className="text-muted-foreground">{p.section}</p>
      <p className="mt-1 tabular-nums text-primary">
        ${formatCompact(p.value)} · {p.share.toFixed(2)}%
      </p>
    </div>
  );
}

function TradeTreemap({ products }: { products: TradeProduct[] }) {
  const data = products.map((p) => ({
    ...p,
    fill: colorForSection(p.section),
  }));

  const sections = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) m.set(p.section, (m.get(p.section) ?? 0) + p.value);
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name);
  }, [products]);

  return (
    <div>
      <div className="h-[360px] w-full sm:h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="value"
            nameKey="name"
            stroke="hsl(var(--background))"
            aspectRatio={4 / 3}
            content={<TreemapCell />}
            isAnimationActive={false}
          >
            <Tooltip content={<TradeTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {sections.map((s) => (
          <li key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: colorForSection(s) }}
              aria-hidden
            />
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TradeTable({ products }: { products: TradeProduct[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="table-stat w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="h-9 px-2 text-left text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
              #
            </th>
            <th className="h-9 px-2 text-left text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Product
            </th>
            <th className="h-9 px-2 text-left text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Section
            </th>
            <th className="h-9 px-2 text-right text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Value
            </th>
            <th className="h-9 px-2 text-right text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Share
            </th>
          </tr>
        </thead>
        <tbody>
          {products.slice(0, 25).map((p, i) => (
            <tr key={`${p.name}-${i}`} className="border-b border-border/70">
              <td className="px-2 py-2 font-mono text-xs text-muted-foreground">
                {i + 1}
              </td>
              <td className="px-2 py-2 font-medium">{p.name}</td>
              <td className="px-2 py-2 text-muted-foreground">{p.section}</td>
              <td className="px-2 py-2 text-right font-serif tabular-nums text-primary">
                ${formatCompact(p.value)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                {p.share.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CountryTradeSection({
  countryName,
  exports,
  imports,
}: {
  countryName: string;
  exports: CountryTrade | null;
  imports: CountryTrade | null;
}) {
  const available = [
    exports ? ("export" as const) : null,
    imports ? ("import" as const) : null,
  ].filter(Boolean) as Array<"export" | "import">;

  const [flow, setFlow] = React.useState<"export" | "import">(
    available[0] ?? "export",
  );

  if (available.length === 0) return null;

  const active = flow === "export" ? exports : imports;
  if (!active) return null;

  const year = active.year;
  const oecProfile = `https://oec.world/en/profile/country/${active.oecId}`;

  return (
    <section className="space-y-4 border-t border-border pt-8">
      <div className="section-rule">
        <div className="min-w-0 space-y-1">
          <h2 className="font-serif text-xl font-semibold tracking-tight text-primary md:text-[1.35rem]">
            International trade
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            What {countryName} {flow === "export" ? "exports" : "imports"} — top
            products by value ({year}), from the Observatory of Economic
            Complexity (BACI / CEPII).
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs">
          <a
            href={oecProfile}
            target="_blank"
            rel="noopener noreferrer"
            className="link-editorial font-medium"
          >
            Open on OEC →
          </a>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex gap-1 border-b border-border">
          {available.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFlow(f)}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors",
                flow === f
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "export" ? "Exports" : "Imports"}
            </button>
          ))}
        </div>
        <p className="font-serif text-lg font-semibold tabular-nums text-primary">
          ${formatCompact(active.total)}
          <span className="ml-2 text-sm font-sans font-normal text-muted-foreground">
            total {flow === "export" ? "exports" : "imports"} · {year}
          </span>
        </p>
      </div>

      <TradeTreemap products={active.products} />
      <TradeTable products={active.products} />

      <p className="text-xs text-muted-foreground">
        Source:{" "}
        <a
          href={active.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="link-editorial"
        >
          {active.source}
        </a>
        . Product classification: HS 2022 (4-digit). Shares are of the products
        shown (top {active.products.length} by value), not necessarily of all
        trade.
      </p>
    </section>
  );
}
