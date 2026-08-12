"use client";

import * as React from "react";
import { toPng } from "html-to-image";
import {
  Treemap,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { CountrySelect } from "@/components/country-select";
import { useChartBrand } from "@/components/charts/chart-brand";
import { siteConfig } from "@/lib/site";
import { cn, downloadFile, formatCompact, toCSV } from "@/lib/utils";
import type { CountryTrade, TradeProduct } from "@/lib/oec-types";

function tradeCsvPreamble(opts: {
  subject?: string;
  title: string;
  description?: string;
  source?: string;
  path?: string;
}) {
  const lines: string[] = [];
  if (opts.subject) lines.push(`# ${opts.subject}`);
  lines.push(`# ${opts.title}`);
  if (opts.description) {
    lines.push(`# ${opts.description.replace(/\s+/g, " ").trim()}`);
  }
  if (opts.source) lines.push(`# Source: ${opts.source}`);
  lines.push(`# ${opts.path ? `birthrate.io${opts.path}` : siteConfig.name}`);
  return `${lines.join("\n")}\n`;
}

function productsToCsvRows(
  products: TradeProduct[],
  meta: { country: string; flow: string; year: number },
) {
  return products.map((p, i) => ({
    country: meta.country,
    flow: meta.flow,
    year: meta.year,
    rank: i + 1,
    product: p.name,
    section: p.section,
    value_usd: Math.round(p.value),
    share_pct: Number(p.share.toFixed(4)),
  }));
}

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

const COMPARE_COLORS = ["hsl(211 62% 45%)", "hsl(24 85% 48%)", "hsl(155 45% 36%)"];

function colorForSection(section: string): string {
  if (SECTION_COLORS[section]) return SECTION_COLORS[section];
  let h = 0;
  for (let i = 0; i < section.length; i++) h = (h * 31 + section.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 42% 42%)`;
}

export type TradeCompareOption = {
  slug: string;
  name: string;
  flagEmoji: string | null;
  iso3: string;
};

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

function TradeTreemap({
  products,
  heightClass = "h-[360px] sm:h-[420px]",
}: {
  products: TradeProduct[];
  heightClass?: string;
}) {
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
      <div className={cn("w-full", heightClass)}>
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

function sectionShares(trade: CountryTrade): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of trade.products) {
    m.set(p.section, (m.get(p.section) ?? 0) + p.share);
  }
  return m;
}

function CompareSectionChart({
  series,
}: {
  series: { key: string; label: string; trade: CountryTrade }[];
}) {
  const sections = React.useMemo(() => {
    const totals = new Map<string, number>();
    for (const s of series) {
      for (const [sec, share] of sectionShares(s.trade)) {
        totals.set(sec, (totals.get(sec) ?? 0) + share);
      }
    }
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name);
  }, [series]);

  const data = sections.map((section) => {
    const row: Record<string, string | number> = { section };
    for (const s of series) {
      row[s.key] = Number((sectionShares(s.trade).get(section) ?? 0).toFixed(2));
    }
    return row;
  });

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
          <XAxis
            type="number"
            unit="%"
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            type="category"
            dataKey="section"
            width={118}
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(1)}%`, ""]}
            contentStyle={{
              borderRadius: 2,
              border: "1px solid hsl(var(--border))",
              fontSize: 12,
            }}
          />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={COMPARE_COLORS[i % COMPARE_COLORS.length]}
              maxBarSize={18}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CountryTradeSection({
  countryName,
  iso3,
  compareOptions = [],
}: {
  countryName: string;
  iso3: string;
  compareOptions?: TradeCompareOption[];
}) {
  const brand = useChartBrand();
  const exportRef = React.useRef<HTMLDivElement>(null);
  const [exports, setExports] = React.useState<CountryTrade | null>(null);
  const [imports, setImports] = React.useState<CountryTrade | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [flow, setFlow] = React.useState<"export" | "import">("export");
  const [compareSlug, setCompareSlug] = React.useState<string | null>(null);
  const [compareTrade, setCompareTrade] = React.useState<{
    exports: CountryTrade | null;
    imports: CountryTrade | null;
  } | null>(null);
  const [compareStatus, setCompareStatus] = React.useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  const compareCountry = compareOptions.find((c) => c.slug === compareSlug) ?? null;
  const selectOptions = React.useMemo(
    () =>
      compareOptions
        .filter((c) => c.iso3.toUpperCase() !== iso3.toUpperCase())
        .map((c) => ({
          slug: c.slug,
          name: c.name,
          flagEmoji: c.flagEmoji,
        })),
    [compareOptions, iso3],
  );

  React.useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    void (async () => {
      const { fetchCountryTradePair, oecIdForIso3 } = await import(
        "@/lib/oec-fetch"
      );
      if (!oecIdForIso3(iso3)) {
        if (!cancelled) setStatus("error");
        return;
      }
      const pair = await fetchCountryTradePair(iso3);
      if (cancelled) return;
      setExports(pair.exports);
      setImports(pair.imports);
      if (pair.exports || pair.imports) {
        setFlow(pair.exports ? "export" : "import");
        setStatus("ready");
      } else {
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [iso3]);

  React.useEffect(() => {
    if (!compareCountry) {
      setCompareTrade(null);
      setCompareStatus("idle");
      return;
    }
    let cancelled = false;
    setCompareStatus("loading");
    void (async () => {
      const { fetchCountryTradePair } = await import("@/lib/oec-fetch");
      const pair = await fetchCountryTradePair(compareCountry.iso3);
      if (cancelled) return;
      setCompareTrade(pair);
      setCompareStatus(pair.exports || pair.imports ? "ready" : "error");
    })();
    return () => {
      cancelled = true;
    };
  }, [compareCountry]);

  const available = [
    exports ? ("export" as const) : null,
    imports ? ("import" as const) : null,
  ].filter(Boolean) as Array<"export" | "import">;

  const active = flow === "export" ? exports : imports;
  const compareActive =
    flow === "export" ? compareTrade?.exports : compareTrade?.imports;
  const oecId = active?.oecId ?? null;
  const oecProfile = oecId
    ? `https://oec.world/en/profile/country/${oecId}`
    : `https://oec.world/en/search/${encodeURIComponent(countryName)}`;

  const comparing =
    compareCountry != null &&
    compareStatus === "ready" &&
    active != null &&
    compareActive != null;

  const flowLabel = flow === "export" ? "exports" : "imports";
  const chartTitle =
    active != null
      ? comparing && compareCountry
        ? `${countryName} vs ${compareCountry.name} — ${flowLabel} (${active.year})`
        : `${countryName} ${flowLabel} (${active.year})`
      : `Exports & imports`;
  const chartDescription =
    status === "ready" && active
      ? comparing && compareCountry
        ? `Product mix comparison for ${flowLabel}, top products by value (${active.year}), from the Observatory of Economic Complexity (BACI / CEPII).`
        : `What ${countryName} ${flowLabel} — top products by value (${active.year}), from the Observatory of Economic Complexity (BACI / CEPII).`
      : `International trade for ${countryName} — product exports and imports from OEC / BACI.`;

  const fileSlug =
    brand.path?.split("/").filter(Boolean).pop() ?? iso3.toLowerCase();
  const csvName = comparing
    ? `${fileSlug}-${flowLabel}-vs-${compareSlug}`
    : `${fileSlug}-${flowLabel}`;

  const csvRows = React.useMemo(() => {
    if (!active) return [];
    const rows = productsToCsvRows(active.products, {
      country: countryName,
      flow: flowLabel,
      year: active.year,
    });
    if (comparing && compareCountry && compareActive) {
      rows.push(
        ...productsToCsvRows(compareActive.products, {
          country: compareCountry.name,
          flow: flowLabel,
          year: compareActive.year,
        }),
      );
    }
    return rows;
  }, [
    active,
    compareActive,
    compareCountry,
    comparing,
    countryName,
    flowLabel,
  ]);

  const handleCsv = React.useCallback(() => {
    if (csvRows.length === 0 || !active) return;
    downloadFile(
      `${csvName}.csv`,
      `${tradeCsvPreamble({
        subject: brand.subject ?? countryName,
        title: chartTitle,
        description: chartDescription,
        source: active.source,
        path: brand.path,
      })}${toCSV(csvRows)}`,
    );
  }, [
    active,
    brand.path,
    brand.subject,
    chartDescription,
    chartTitle,
    countryName,
    csvName,
    csvRows,
  ]);

  const handlePng = React.useCallback(async () => {
    if (!exportRef.current) return;
    const bg = getComputedStyle(document.body).backgroundColor || "#ffffff";
    const dataUrl = await toPng(exportRef.current, {
      backgroundColor: bg,
      pixelRatio: 2,
      filter: (node) => {
        if (!(node instanceof HTMLElement)) return true;
        return node.dataset.exportIgnore == null;
      },
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${csvName}.png`;
    a.click();
  }, [csvName]);

  const shareUrl = brand.path
    ? `birthrate.io${brand.path}`
    : siteConfig.name;

  return (
    <div id="trade" className="scroll-mt-28 space-y-4 border-t border-border pt-8">
      <div className="section-rule">
        <div className="min-w-0 space-y-1">
          <h3 className="font-serif text-lg font-semibold tracking-tight text-primary md:text-xl">
            Exports &amp; imports
          </h3>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {chartDescription}
          </p>
        </div>
        <div
          data-export-ignore
          className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs"
        >
          {status === "ready" && csvRows.length > 0 ? (
            <>
              <button
                type="button"
                onClick={handleCsv}
                className="link-editorial font-medium"
              >
                Download CSV
              </button>
              <button
                type="button"
                onClick={handlePng}
                className="link-editorial font-medium"
              >
                Download PNG
              </button>
            </>
          ) : null}
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

      {selectOptions.length > 0 ? (
        <div data-export-ignore className="max-w-md space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Compare with another country
          </p>
          <CountrySelect
            options={selectOptions}
            value={compareSlug}
            onChange={setCompareSlug}
            placeholder="Select a country…"
          />
        </div>
      ) : null}

      {status === "loading" ? (
        <p className="py-10 text-sm text-muted-foreground">
          Loading export and import product mix…
        </p>
      ) : status === "error" || !active ? (
        <p className="py-6 text-sm text-muted-foreground">
          Trade product data could not be loaded right now.{" "}
          <a
            href={oecProfile}
            target="_blank"
            rel="noopener noreferrer"
            className="link-editorial"
          >
            View {countryName} on OEC
          </a>
          .
        </p>
      ) : (
        <div ref={exportRef} className="space-y-4 bg-background px-0.5">
          <div className="flex items-baseline justify-between gap-3 border-b border-border/80 pb-2">
            <p className="min-w-0 truncate font-serif text-sm font-semibold tracking-tight text-primary md:text-base">
              {brand.subject ?? countryName}
            </p>
            <p className="shrink-0 text-[0.7rem] font-medium text-muted-foreground">
              {siteConfig.name}
            </p>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div
              data-export-ignore
              className="flex gap-1 border-b border-border"
            >
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
            <p className="font-serif text-base font-semibold tracking-tight text-primary md:text-lg">
              {flow === "export" ? "Exports" : "Imports"}
              <span className="ml-2 font-serif text-lg font-semibold tabular-nums">
                ${formatCompact(active.total)}
              </span>
              <span className="ml-2 text-sm font-sans font-normal text-muted-foreground">
                · {active.year}
                {comparing && compareCountry
                  ? ` · vs ${compareCountry.name}`
                  : ""}
              </span>
            </p>
          </div>

          {compareSlug && compareStatus === "loading" ? (
            <p data-export-ignore className="text-sm text-muted-foreground">
              Loading comparison…
            </p>
          ) : null}

          {comparing && compareCountry && compareActive ? (
            <div className="space-y-6">
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">
                  Product-section mix (% of shown trade)
                </p>
                <CompareSectionChart
                  series={[
                    { key: "a", label: countryName, trade: active },
                    {
                      key: "b",
                      label: compareCountry.name,
                      trade: compareActive,
                    },
                  ]}
                />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium">
                    {countryName}{" "}
                    <span className="font-normal text-muted-foreground">
                      · ${formatCompact(active.total)}
                    </span>
                  </p>
                  <TradeTreemap
                    products={active.products}
                    heightClass="h-[280px] sm:h-[320px]"
                  />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">
                    {compareCountry.name}{" "}
                    <span className="font-normal text-muted-foreground">
                      · ${formatCompact(compareActive.total)}
                    </span>
                  </p>
                  <TradeTreemap
                    products={compareActive.products}
                    heightClass="h-[280px] sm:h-[320px]"
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <TradeTreemap products={active.products} />
              <TradeTable products={active.products} />
            </>
          )}

          <div className="space-y-1">
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
              . Product classification: HS 2022 (4-digit). Shares are of the
              products shown (top {active.products.length} by value), not
              necessarily of all trade.
            </p>
            <p className="text-[0.7rem] text-muted-foreground/80">{shareUrl}</p>
          </div>
        </div>
      )}
    </div>
  );
}
