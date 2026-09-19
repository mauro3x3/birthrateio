"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDownUp, Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/stat-card";
import { CollapsibleSection } from "@/components/collapsible-section";
import { ChartCard } from "@/components/charts/chart-card";
import { GroupedBarChart } from "@/components/charts/grouped-bar-chart";
import { MultiSeriesChart } from "@/components/charts/multi-series-chart";
import {
  AgingScatterChart,
  colorForContinent,
} from "@/components/charts/aging-scatter-chart";
import {
  CountryMultiSelect,
  type CountryOption,
} from "@/components/country-multi-select";
import type { LaborExplorerRow } from "@/lib/briefing-labor";
import { downloadFile, toCSV, cn } from "@/lib/utils";

type SortKey =
  | "name"
  | "now"
  | "at2040"
  | "at2060"
  | "at2060r"
  | "delta";

const DEFAULT_COMPARE = [
  "japan",
  "italy",
  "israel",
  "nigeria",
  "united-states",
  "south-korea",
];

function ratio(n: number) {
  return Math.round(n * 100) / 100;
}

function ContinentBadge({ continent }: { continent: string | null }) {
  if (!continent) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: colorForContinent(continent) }}
      />
      {continent}
    </span>
  );
}

/** Ranked list with an inline "data bar" behind each value — a livelier,
 * more scannable alternative to a plain table for a top-N cut. */
function RankBarList({
  items,
  valueOf,
  formatValue,
  caption,
  onSelect,
  positiveIsGood = true,
  invertBars = false,
}: {
  items: LaborExplorerRow[];
  valueOf: (r: LaborExplorerRow) => number;
  formatValue: (v: number) => string;
  caption?: (r: LaborExplorerRow) => string;
  onSelect?: (slug: string) => void;
  positiveIsGood?: boolean;
  /** Longer bar = smaller value (e.g. oldest societies). */
  invertBars?: boolean;
}) {
  const max = Math.max(...items.map((r) => Math.abs(valueOf(r))), 1e-6);
  return (
    <ol className="divide-y divide-border/70">
      {items.map((r, i) => {
        const v = valueOf(r);
        const share = Math.abs(v) / max;
        const pct = Math.max(
          5,
          Math.min(100, (invertBars ? 1.05 - share : share) * 100),
        );
        const tone =
          v === 0
            ? "bg-muted-foreground/40"
            : v > 0 === positiveIsGood
              ? "bg-emerald-600/70"
              : "bg-rose-600/70";
        return (
          <li key={r.slug}>
            <button
              type="button"
              onClick={() => onSelect?.(r.slug)}
              className="group flex w-full items-center gap-3 py-2.5 text-left"
            >
              <span className="w-4 shrink-0 text-right font-mono text-xs text-muted-foreground">
                {i + 1}
              </span>
              <span className="shrink-0 text-lg leading-none">
                {r.flagEmoji ?? "🏳️"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground group-hover:text-primary">
                  {r.name}
                </span>
                {caption ? (
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {caption(r)}
                  </span>
                ) : null}
              </span>
              <span className="relative hidden h-4 w-20 shrink-0 overflow-hidden bg-muted sm:block sm:w-28">
                <span
                  className={cn("absolute inset-y-0 left-0", tone)}
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                {formatValue(v)}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function WorkersRetireesExplorer({
  rows,
}: {
  rows: LaborExplorerRow[];
}) {
  const continents = React.useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.continent).filter(Boolean) as string[]),
      ).sort(),
    [rows],
  );

  const options: CountryOption[] = React.useMemo(
    () =>
      rows.map((r) => ({
        slug: r.slug,
        name: r.name,
        flagEmoji: r.flagEmoji,
        group: r.continent ?? "Other",
      })),
    [rows],
  );

  const bySlug = React.useMemo(
    () => new Map(rows.map((r) => [r.slug, r])),
    [rows],
  );

  const [region, setRegion] = React.useState<string | "all">("all");
  const [query, setQuery] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("now");
  const [desc, setDesc] = React.useState(true);
  const [selected, setSelected] = React.useState<string[]>(() =>
    DEFAULT_COMPARE.filter((s) => bySlug.has(s)).slice(0, 6),
  );
  const [spotlight, setSpotlight] = React.useState(
    () => DEFAULT_COMPARE.find((s) => bySlug.has(s)) ?? rows[0]?.slug ?? "",
  );

  const selectSpotlight = React.useCallback(
    (slug: string) => {
      setSpotlight(slug);
      setSelected((prev) =>
        prev.includes(slug) || prev.length >= 6 ? prev : [...prev, slug],
      );
    },
    [],
  );

  const filtered = React.useMemo(() => {
    let list = rows;
    if (region !== "all") list = list.filter((x) => x.continent === region);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((x) => x.name.toLowerCase().includes(q));
    }
    const valueOf = (r: LaborExplorerRow) => {
      switch (sortKey) {
        case "name":
          return r.name.toLowerCase();
        case "now":
          return r.now.workersPerRetiree;
        case "at2040":
          return r.at2040.workersPerRetiree;
        case "at2060":
          return r.at2060.workersPerRetiree;
        case "at2060r":
          return r.at2060Replacement.workersPerRetiree;
        case "delta":
          return r.at2060.workersPerRetiree - r.now.workersPerRetiree;
      }
    };
    return [...list].sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      if (typeof av === "string" && typeof bv === "string") {
        return desc ? bv.localeCompare(av) : av.localeCompare(bv);
      }
      return desc ? Number(bv) - Number(av) : Number(av) - Number(bv);
    });
  }, [rows, region, query, sortKey, desc]);

  const compareRows = selected
    .map((s) => bySlug.get(s))
    .filter((r): r is LaborExplorerRow => r != null);

  const compareData = compareRows.length
    ? [
        Object.fromEntries([
          ["period", compareRows[0].now.year],
          ...compareRows.map((c) => [c.slug, ratio(c.now.workersPerRetiree)]),
        ]),
        Object.fromEntries([
          ["period", compareRows[0].at2040.year],
          ...compareRows.map((c) => [
            c.slug,
            ratio(c.at2040.workersPerRetiree),
          ]),
        ]),
        Object.fromEntries([
          ["period", compareRows[0].at2060.year],
          ...compareRows.map((c) => [
            c.slug,
            ratio(c.at2060.workersPerRetiree),
          ]),
        ]),
      ]
    : [];

  const compareSeries = compareRows.map((c) => ({
    key: c.slug,
    label: c.name,
  }));

  const spot = bySlug.get(spotlight);
  const spotData = spot
    ? [
        {
          period: String(spot.now.year),
          working: spot.now.workingMil,
          retirees: spot.now.oldMil,
        },
        {
          period: String(spot.at2040.year),
          working: spot.at2040.workingMil,
          retirees: spot.at2040.oldMil,
        },
        {
          period: String(spot.at2060.year),
          working: spot.at2060.workingMil,
          retirees: spot.at2060.oldMil,
        },
      ]
    : [];

  const spotSeries = [
    { key: "working", label: "Working age (15–64)" },
    { key: "retirees", label: "Age 65+" },
  ];

  const scatterRows = React.useMemo(
    () =>
      rows.map((r) => ({
        slug: r.slug,
        name: r.name,
        flagEmoji: r.flagEmoji,
        continent: r.continent,
        now: r.now.workersPerRetiree,
        at2060: r.at2060.workersPerRetiree,
        sizeMil: r.now.workingMil,
      })),
    [rows],
  );

  const leaderboardValid = React.useMemo(
    () =>
      rows.filter(
        (r) =>
          r.now.workersPerRetiree > 0.3 && r.at2060.workersPerRetiree > 0.3,
      ),
    [rows],
  );

  const oldestToday = React.useMemo(
    () =>
      [...leaderboardValid]
        .filter((r) => r.now.workingMil >= 3)
        .sort((a, b) => a.now.workersPerRetiree - b.now.workersPerRetiree)
        .slice(0, 8),
    [leaderboardValid],
  );

  const fastestAging = React.useMemo(() => {
    const large = leaderboardValid.filter(
      (r) => r.now.workingMil >= 10 && r.now.workersPerRetiree <= 12,
    );
    const pool = large.length >= 8 ? large : leaderboardValid;
    const pct = (r: LaborExplorerRow) =>
      r.now.workersPerRetiree > 0
        ? (r.at2060.workersPerRetiree / r.now.workersPerRetiree - 1) * 100
        : 0;
    return [...pool].sort((a, b) => pct(a) - pct(b)).slice(0, 8);
  }, [leaderboardValid]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setDesc((d) => !d);
    else {
      setSortKey(key);
      setDesc(key !== "name");
    }
  };

  const maxNow = Math.max(...rows.map((r) => r.now.workersPerRetiree), 1);

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-2xl tracking-tight text-foreground">
            Who&rsquo;s aging fastest?
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Each bubble is a country: today&rsquo;s workers-per-retiree ratio
            (x-axis) against the ~2060 projection (y-axis), both on a log
            scale. Bubble size is today&rsquo;s working-age population.
            Countries below the dashed line are projected to have{" "}
            <em>fewer</em> workers per retiree in 2060 than today.
          </p>
        </div>
        <ChartCard
          title="Workers per retiree: today vs ~2060"
          description="Log–log scatter. Below the diagonal = ratio falling by 2060."
          source="World Bank"
          csvName="workers-per-retiree-scatter"
          csvRows={rows.map((r) => ({
            country: r.name,
            iso3: r.iso3,
            region: r.continent ?? "",
            workers_per_retiree_now: ratio(r.now.workersPerRetiree),
            workers_per_retiree_2060: ratio(r.at2060.workersPerRetiree),
            working_age_now_millions: r.now.workingMil,
          }))}
          valueLabels={false}
        >
          <AgingScatterChart
            rows={scatterRows}
            height={480}
            highlightSlug={spotlight}
            onSelect={selectSpotlight}
          />
        </ChartCard>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-2xl tracking-tight text-foreground">
            Compare trajectories
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Workers per retiree (ages 15–64 ÷ 65+), modeled from today’s
            pyramid. Pick up to 6 countries to see how the ratio moves toward
            2060.
          </p>
        </div>
        <CountryMultiSelect
          options={options}
          selected={selected}
          onChange={setSelected}
          max={6}
        />
        <ChartCard
          title="Workers per retiree"
          description="Modeled 15–64 ÷ 65+. 2040 is mostly already born; TFR shows up more by 2060."
          source="World Bank"
          csvName="workers-per-retiree-compare"
          csvRows={compareData}
          defaultShowValues
        >
          {compareSeries.length > 0 ? (
            <MultiSeriesChart
              data={compareData}
              series={compareSeries}
              xKey="period"
              unit="workers per retiree"
              decimals={2}
              height={380}
            />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Add a country to compare.
            </p>
          )}
        </ChartCard>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl tracking-tight text-foreground">
              Spotlight
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Same model as the country briefing chart — working-age and 65+
              in millions for one country.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Country
            <select
              className="h-8 rounded-none border border-border bg-background px-2 text-foreground"
              value={spotlight}
              onChange={(e) => setSpotlight(e.target.value)}
            >
              {rows.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.flagEmoji ? `${r.flagEmoji} ` : ""}
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {spot && (
          <div className="grid gap-4 lg:grid-cols-[1fr_14rem]">
            <ChartCard
              title={`Working-age and retirees, ${spot.name}`}
              description="15–64 vs 65+, modeled from today’s pyramid"
              source="World Bank"
              subject={spot.name}
              csvName={`${spot.slug}-workers-retirees`}
              csvRows={spotData}
              defaultShowValues
            >
              <GroupedBarChart
                data={spotData}
                series={spotSeries}
                xKey="period"
                unit="millions of people"
                decimals={1}
                height={360}
              />
              <p className="mt-3 text-sm text-muted-foreground">
                <Link
                  href={`/country/${spot.slug}/brief`}
                  className="link-editorial font-medium"
                >
                  Open {spot.name} briefing
                </Link>
              </p>
            </ChartCard>
            <div className="grid gap-3 self-start pt-5 sm:grid-cols-2 lg:grid-cols-1">
              <StatCard
                label="Workers per retiree, now"
                value={ratio(spot.now.workersPerRetiree).toFixed(2)}
                sub={String(spot.now.year)}
              />
              <StatCard
                label={`Projected, ~${spot.at2060.year}`}
                value={ratio(spot.at2060.workersPerRetiree).toFixed(2)}
                trend={
                  ((spot.at2060.workersPerRetiree -
                    spot.now.workersPerRetiree) /
                    spot.now.workersPerRetiree) *
                  100
                }
                sub="vs. today"
              />
            </div>
          </div>
        )}
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="font-serif text-2xl tracking-tight text-foreground">
            Leaderboards
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Oldest age structures today, and the largest working-age
            populations whose support ratio is projected to fall the most by
            ~2060.
          </p>
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-1 text-sm font-semibold text-foreground">
              Oldest societies today
            </h3>
            <p className="mb-2 text-[11px] text-muted-foreground">
              Fewest working-age people (15–64) per person aged 65+.
            </p>
            <RankBarList
              items={oldestToday}
              valueOf={(r) => r.now.workersPerRetiree}
              formatValue={(v) => v.toFixed(2)}
              caption={(r) =>
                `→ ${ratio(r.at2060.workersPerRetiree)} in ${r.at2060.year}`
              }
              onSelect={selectSpotlight}
              invertBars
            />
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-foreground">
              Fastest aging by ~2060
            </h3>
            <p className="mb-2 text-[11px] text-muted-foreground">
              Percent change among countries with ≥10 million working-age
              people. Extreme migrant-labour pyramids omitted.
            </p>
            <RankBarList
              items={fastestAging}
              valueOf={(r) =>
                r.now.workersPerRetiree > 0
                  ? (r.at2060.workersPerRetiree / r.now.workersPerRetiree - 1) *
                    100
                  : 0
              }
              formatValue={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`}
              caption={(r) =>
                `${ratio(r.now.workersPerRetiree)} → ${ratio(r.at2060.workersPerRetiree)}`
              }
              onSelect={selectSpotlight}
              positiveIsGood={true}
            />
          </div>
        </div>
      </section>

      <CollapsibleSection title={`Browse the full ranking (${rows.length} countries)`}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-border pb-3">
            <button
              type="button"
              className={cn(
                "px-2.5 py-1 text-sm font-medium transition-colors",
                region === "all"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setRegion("all")}
            >
              All regions
            </button>
            {continents.map((c) => (
              <button
                key={c}
                type="button"
                className={cn(
                  "px-2.5 py-1 text-sm font-medium transition-colors",
                  region === c
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setRegion(c)}
              >
                {c}
              </button>
            ))}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Input
                placeholder="Filter countries…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 w-44 rounded-none"
              />
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setDesc((d) => !d)}
                title="Toggle sort order"
              >
                <ArrowDownUp className="h-3.5 w-3.5" />
                {desc ? "High→Low" : "Low→High"}
              </button>
              <button
                type="button"
                className="link-editorial inline-flex items-center gap-1 text-xs font-medium"
                onClick={() =>
                  downloadFile(
                    "workers-per-retiree.csv",
                    toCSV(
                      filtered.map((r, i) => ({
                        rank: i + 1,
                        country: r.name,
                        iso3: r.iso3,
                        region: r.continent ?? "",
                        workers_per_retiree_now: ratio(r.now.workersPerRetiree),
                        year_now: r.now.year,
                        workers_per_retiree_2040: ratio(
                          r.at2040.workersPerRetiree,
                        ),
                        year_2040: r.at2040.year,
                        workers_per_retiree_2060: ratio(
                          r.at2060.workersPerRetiree,
                        ),
                        year_2060: r.at2060.year,
                        workers_per_retiree_2060_at_2_1: ratio(
                          r.at2060Replacement.workersPerRetiree,
                        ),
                        delta_now_to_2060: ratio(
                          r.at2060.workersPerRetiree - r.now.workersPerRetiree,
                        ),
                        tfr: r.tfr,
                      })),
                    ),
                  )
                }
              >
                <Download className="h-3.5 w-3.5" />
                CSV
              </button>
            </div>
          </div>

          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>
                    <SortButton
                      active={sortKey === "name"}
                      onClick={() => toggleSort("name")}
                    >
                      Country
                    </SortButton>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">Region</TableHead>
                  <TableHead className="text-right">
                    <SortButton
                      active={sortKey === "now"}
                      onClick={() => toggleSort("now")}
                    >
                      Now
                    </SortButton>
                  </TableHead>
                  <TableHead className="hidden text-right md:table-cell">
                    <SortButton
                      active={sortKey === "at2040"}
                      onClick={() => toggleSort("at2040")}
                    >
                      ~2040
                    </SortButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton
                      active={sortKey === "at2060"}
                      onClick={() => toggleSort("at2060")}
                    >
                      ~2060
                    </SortButton>
                  </TableHead>
                  <TableHead className="hidden text-right lg:table-cell">
                    <SortButton
                      active={sortKey === "at2060r"}
                      onClick={() => toggleSort("at2060r")}
                    >
                      2060 @2.1
                    </SortButton>
                  </TableHead>
                  <TableHead className="hidden text-right sm:table-cell">
                    <SortButton
                      active={sortKey === "delta"}
                      onClick={() => toggleSort("delta")}
                    >
                      Δ →2060
                    </SortButton>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row, i) => {
                  const delta =
                    row.at2060.workersPerRetiree - row.now.workersPerRetiree;
                  const nowPct = Math.max(
                    3,
                    Math.min(100, (row.now.workersPerRetiree / maxNow) * 100),
                  );
                  return (
                    <TableRow key={row.iso3}>
                      <TableCell className="font-mono text-muted-foreground">
                        {i + 1}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="flex items-center gap-2 font-medium hover:text-primary"
                          onClick={() => selectSpotlight(row.slug)}
                        >
                          <span className="text-lg">
                            {row.flagEmoji ?? "🏳️"}
                          </span>
                          {row.name}
                        </button>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <ContinentBadge continent={row.continent} />
                      </TableCell>
                      <TableCell className="relative text-right font-medium tabular-nums">
                        <span
                          aria-hidden
                          className="absolute inset-y-1 right-0 bg-primary/10"
                          style={{ width: `${nowPct}%` }}
                        />
                        <span className="relative">
                          {ratio(row.now.workersPerRetiree).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">
                        {ratio(row.at2040.workersPerRetiree).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {ratio(row.at2060.workersPerRetiree).toFixed(2)}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums text-muted-foreground lg:table-cell">
                        {ratio(row.at2060Replacement.workersPerRetiree).toFixed(
                          2,
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "hidden text-right tabular-nums sm:table-cell",
                          delta < -0.15
                            ? "text-amber-800 dark:text-amber-200"
                            : delta > 0.15
                              ? "text-emerald-800 dark:text-emerald-300"
                              : "text-muted-foreground",
                        )}
                      >
                        {delta > 0 ? "+" : ""}
                        {ratio(delta).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No countries match.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
        </div>
      </CollapsibleSection>
    </div>
  );
}

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
