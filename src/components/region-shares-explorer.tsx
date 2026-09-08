"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  allRegionalShares,
  regionalShareSlug,
  tidyCountryName,
  type RegionalShareSet,
} from "@/lib/regional-shares";
import { RegionSharePies } from "@/components/region-share-pies";
import { cn, formatCompact, formatNumber, toCSV, downloadFile } from "@/lib/utils";

const REGIONS = allRegionalShares();

type CountryRow = {
  iso3: string;
  name: string;
  population: number;
  births: number;
  popPct: number;
  birthPct: number;
  delta: number;
};

function rowsFor(region: RegionalShareSet): {
  rows: CountryRow[];
  popTotal: number;
  birthTotal: number;
} {
  const popTotal = region.countries.reduce((s, c) => s + c.population, 0);
  const birthTotal = region.countries.reduce((s, c) => s + (c.births ?? 0), 0);
  const rows = region.countries
    .map((c) => {
      const births = c.births ?? 0;
      const popPct = popTotal > 0 ? c.population / popTotal : 0;
      const birthPct = birthTotal > 0 ? births / birthTotal : 0;
      return {
        iso3: c.iso3,
        name: tidyCountryName(c.name),
        population: c.population,
        births,
        popPct,
        birthPct,
        delta: birthPct - popPct,
      };
    })
    .sort((a, b) => b.population - a.population);
  return { rows, popTotal, birthTotal };
}

export function RegionSharesExplorer({
  initialId = "AFRICA",
}: {
  initialId?: string;
}) {
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("region")?.toUpperCase();
  const id =
    REGIONS.find((r) => r.id === fromUrl)?.id ??
    REGIONS.find((r) => r.id === initialId.toUpperCase())?.id ??
    REGIONS[0]?.id;
  const region = REGIONS.find((r) => r.id === id) ?? REGIONS[0];
  const { rows, popTotal, birthTotal } = rowsFor(region);
  const younger = [...rows].sort((a, b) => b.delta - a.delta).slice(0, 5);
  const older = [...rows].sort((a, b) => a.delta - b.delta).slice(0, 5);
  const mapHref = `/maps/${regionalShareSlug(region.id)}`;
  const slug = regionalShareSlug(region.id);
  const exportRef = React.useRef<HTMLDivElement>(null);
  const [showSliceNames, setShowSliceNames] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  const downloadPng = React.useCallback(async () => {
    const node = exportRef.current;
    if (!node) return;
    setExporting(true);
    node.classList.add("br-exporting");
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, {
        backgroundColor: "#faf7f2",
        pixelRatio: 2,
        cacheBust: true,
        filter: (el) => {
          if (!(el instanceof HTMLElement)) return true;
          return el.dataset.exportIgnore == null;
        },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `birthrate-${slug}-shares.png`;
      a.click();
    } finally {
      node.classList.remove("br-exporting");
      setExporting(false);
    }
  }, [slug]);

  const downloadCsv = React.useCallback(() => {
    const body = toCSV(
      rows.map((r) => ({
        country: r.name,
        iso3: r.iso3,
        population: r.population,
        pop_share_pct: Number((r.popPct * 100).toFixed(2)),
        births: Math.round(r.births),
        birth_share_pct: Number((r.birthPct * 100).toFixed(2)),
        delta_pp: Number((r.delta * 100).toFixed(2)),
      })),
      [
        { key: "country", label: "country" },
        { key: "iso3", label: "iso3" },
        { key: "population", label: "population" },
        { key: "pop_share_pct", label: "pop_share_pct" },
        { key: "births", label: "births" },
        { key: "birth_share_pct", label: "birth_share_pct" },
        { key: "delta_pp", label: "delta_pp" },
      ],
    );
    downloadFile(
      `birthrate-${slug}-shares.csv`,
      `# ${region.name} population and birth shares\n# birthrate.io/population/shares?region=${slug}\n# Births estimated as population × crude birth rate / 1,000 (World Bank)\n${body}`,
    );
  }, [rows, region.name, slug]);

  return (
    <div className="container space-y-10 py-8 md:py-12">
      <div>
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Region
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {REGIONS.map((r) => {
            const on = r.id === region.id;
            return (
              <Link
                key={r.id}
                href={`/population/shares?region=${regionalShareSlug(r.id)}`}
                scroll={false}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm transition-colors",
                  on
                    ? "bg-foreground text-background"
                    : "border border-border bg-white text-muted-foreground hover:text-foreground",
                )}
              >
                {r.name}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">
            {region.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Share of residents and of estimated births
            {region.year != null ? ` · ${region.year}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <button
            type="button"
            role="switch"
            aria-checked={showSliceNames}
            onClick={() => setShowSliceNames((v) => !v)}
            className="text-muted-foreground hover:text-foreground"
          >
            Names on slices{" "}
            <span className="text-[10px] uppercase tracking-[0.14em]">
              {showSliceNames ? "On" : "Off"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => void downloadPng()}
            disabled={exporting}
            className="link-editorial font-medium disabled:opacity-60"
          >
            {exporting ? "Saving…" : "Download PNG"}
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            className="link-editorial font-medium"
          >
            Download CSV
          </button>
          <Link
            href={mapHref}
            className="text-primary underline-offset-2 hover:underline"
          >
            {region.name} fertility map
          </Link>
        </div>
      </div>

      <div ref={exportRef} className="space-y-8 bg-[hsl(40_28%_97%)]">
        <div className="flex items-baseline justify-between border-b border-border/80 pb-2">
          <p className="font-serif text-sm font-semibold tracking-tight text-primary">
            {region.name} · Where the births are
          </p>
          <p className="text-[0.7rem] text-muted-foreground">birthrate.io</p>
        </div>
        <div className="grid gap-px border border-border/80 bg-border/80 sm:grid-cols-2">
          <div className="bg-white px-5 py-6">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              People
            </p>
            <p className="mt-2 font-sans text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
              {formatCompact(popTotal)}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {formatNumber(popTotal, 0)} residents
            </p>
          </div>
          <div className="bg-white px-5 py-6">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Estimated births
            </p>
            <p className="mt-2 font-sans text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
              {formatCompact(birthTotal)}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {formatNumber(birthTotal, 0)} births that year
            </p>
          </div>
        </div>
        <RegionSharePies
          region={region}
          layout="page"
          showSliceNames={showSliceNames}
        />
        <p className="text-center text-[11px] text-muted-foreground">
          birthrate.io/population/shares?region={slug}
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <InsightList
          title="More of the births than of the people"
          caption="Younger age structures punch above their population share."
          rows={younger.filter((r) => r.delta > 0.002)}
        />
        <InsightList
          title="Fewer births than their population share"
          caption="Lower crude birth rates — older, or further through the fertility decline."
          rows={older.filter((r) => r.delta < -0.002)}
        />
      </div>

      <div>
        <h3 className="font-serif text-xl font-semibold tracking-tight">
          Every country in {region.name}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Δ is birth share minus population share, in percentage points.
        </p>
        <div className="mt-4 overflow-x-auto border border-border bg-white">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b border-border text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Country</th>
                <th className="px-3 py-2 text-right font-semibold">People</th>
                <th className="px-3 py-2 text-right font-semibold">Pop %</th>
                <th className="px-3 py-2 text-right font-semibold">Births</th>
                <th className="px-3 py-2 text-right font-semibold">Birth %</th>
                <th className="px-3 py-2 text-right font-semibold">Δ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.iso3}
                  className="border-t border-border/70 tabular-nums"
                >
                  <td className="px-3 py-2 font-normal">{r.name}</td>
                  <td className="px-3 py-2 text-right">
                    {formatCompact(r.population)}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {(r.popPct * 100).toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatCompact(r.births)}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {(r.birthPct * 100).toFixed(1)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right",
                      r.delta > 0.002 && "text-[hsl(155_45%_28%)]",
                      r.delta < -0.002 && "text-[hsl(4_65%_42%)]",
                    )}
                  >
                    {r.delta >= 0 ? "+" : ""}
                    {(r.delta * 100).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InsightList({
  title,
  caption,
  rows,
}: {
  title: string;
  caption: string;
  rows: CountryRow[];
}) {
  return (
    <div>
      <h3 className="font-serif text-xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{caption}</p>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Shares line up closely in this region.
        </p>
      ) : (
        <ol className="mt-4 border border-border bg-white text-sm">
          {rows.map((r, i) => (
            <li
              key={r.iso3}
              className="flex items-baseline justify-between gap-3 border-t border-border/70 px-3 py-2 first:border-t-0"
            >
              <span className="min-w-0 truncate">
                <span className="mr-1.5 font-mono text-[10px] text-muted-foreground/60">
                  {i + 1}.
                </span>
                {r.name}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {(r.popPct * 100).toFixed(1)}% people →{" "}
                {(r.birthPct * 100).toFixed(1)}% births
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
