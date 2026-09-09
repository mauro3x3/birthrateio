"use client";

import Link from "next/link";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  shareSlices,
  type RegionalShareSet,
  type ShareSlice,
} from "@/lib/regional-shares";
import { formatCompact } from "@/lib/utils";

const SLICE_COLORS = [
  "#1d4ed8",
  "#0f766e",
  "#65a30d",
  "#7c3aed",
  "#dc2626",
  "#ea580c",
  "#0891b2",
  "#ca8a04",
  "#64748b",
];
const OTHER_FILL = "#e2e8f0";

type ColoredSlice = ShareSlice & { color: string };

/** Same country, same fill on both pies — keyed by iso3, not by rank. */
function colorSlices(
  primary: ShareSlice[],
  secondary: ShareSlice[],
): { left: ColoredSlice[]; right: ColoredSlice[] } {
  const fills = new Map<string, string>();
  let next = 0;
  for (const s of [...primary, ...secondary]) {
    const key = s.iso3 ?? s.name;
    if (s.name === "Other" || fills.has(key)) continue;
    fills.set(key, SLICE_COLORS[next % SLICE_COLORS.length]);
    next += 1;
  }
  const paint = (s: ShareSlice): ColoredSlice => ({
    ...s,
    color: s.name === "Other" ? OTHER_FILL : (fills.get(s.iso3 ?? s.name) ?? SLICE_COLORS[0]),
  });
  return { left: primary.map(paint), right: secondary.map(paint) };
}

function SliceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: { name?: string; value?: number; pct?: number } }[];
}) {
  if (!active || !payload?.[0]?.payload) return null;
  const p = payload[0].payload;
  if (p.name == null || p.value == null) return null;
  return (
    <div className="rounded-sm border border-border bg-white px-2.5 py-1.5 text-sm shadow-md">
      <p className="font-medium text-foreground">{p.name}</p>
      <p className="tabular-nums text-muted-foreground">
        {formatCompact(p.value)}
        {p.pct != null ? ` · ${(p.pct * 100).toFixed(1)}%` : ""}
      </p>
    </div>
  );
}

function PieBlock({
  title,
  totalLabel,
  slices,
  total,
  layout = "fill",
  showSliceNames = false,
}: {
  title: string;
  totalLabel: string;
  slices: ColoredSlice[];
  total: number;
  layout?: "fill" | "page";
  showSliceNames?: boolean;
}) {
  const data = slices.map((s) => ({ ...s }));
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <h2 className="text-center font-serif text-lg font-semibold tracking-tight sm:text-xl">
        {title}
      </h2>
      <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {totalLabel}
      </p>
      <div
        className={
          layout === "page"
            ? "h-[280px] w-full max-w-[320px] sm:h-[340px] sm:max-w-[380px]"
            : "h-[240px] w-full max-w-[280px] sm:h-[280px] sm:max-w-[320px]"
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<SliceTooltip />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={showSliceNames ? "72%" : "88%"}
              paddingAngle={0.6}
              isAnimationActive={false}
              stroke="#fff"
              strokeWidth={1}
              label={
                showSliceNames
                  ? ({ name, percent }) =>
                      percent >= 0.04 ? String(name) : ""
                  : false
              }
              labelLine={showSliceNames}
            >
              {data.map((s) => (
                <Cell key={s.iso3 ?? s.name} fill={s.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-1 grid w-full max-w-sm grid-cols-1 gap-x-4 gap-y-1 text-[13px] sm:grid-cols-2">
        {slices.map((s) => (
          <li key={s.iso3 ?? s.name} className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 truncate">
              <span
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ background: s.color }}
              />
              <span className="truncate">{s.name}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {(s.pct * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] tabular-nums text-muted-foreground">
        Total {formatCompact(total)}
      </p>
    </div>
  );
}

export function RegionSharePies({
  region,
  layout = "fill",
  showSliceNames = false,
}: {
  region: RegionalShareSet;
  layout?: "fill" | "page";
  showSliceNames?: boolean;
}) {
  const pop = shareSlices(region.countries, "population");
  const births = shareSlices(region.countries, "births");
  const { left, right } = colorSlices(pop.slices, births.slices);
  return (
    <div
      className={
        layout === "fill"
          ? "flex h-full flex-col overflow-auto px-4 py-10 sm:px-10"
          : "flex flex-col"
      }
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 lg:flex-row lg:items-start lg:justify-center lg:gap-16">
        <PieBlock
          title={`${region.name} population by country`}
          totalLabel={`Share of residents · ${region.year ?? ""}`}
          slices={left}
          total={pop.total}
          layout={layout}
          showSliceNames={showSliceNames}
        />
        <PieBlock
          title={`Where ${region.name} births come from`}
          totalLabel={`Share of estimated births · ${region.year ?? ""}`}
          slices={right}
          total={births.total}
          layout={layout}
          showSliceNames={showSliceNames}
        />
      </div>
      <p className="mx-auto mt-8 max-w-2xl text-center text-[11px] leading-relaxed text-muted-foreground">
        World Bank population (SP.POP.TOTL) and crude birth rate (SP.DYN.CBRT.IN),
        latest year per country. Births are estimated as population × CBR / 1,000
        — not a civil-registration count.
        {region.id === "OCEANIA"
          ? " Oceania here is sovereign states only, not Hawaii or Western New Guinea."
          : ""}
        {layout === "fill" ? (
          <>
            {" "}
            <Link
              href={`/population/shares?region=${region.id.toLowerCase()}`}
              className="underline underline-offset-2"
            >
              Open on Where the births are
            </Link>
            .
          </>
        ) : null}
      </p>
    </div>
  );
}
