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
import { ChartCard } from "@/components/charts/chart-card";
import { GroupedBarChart } from "@/components/charts/grouped-bar-chart";
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
    () =>
      DEFAULT_COMPARE.find((s) => bySlug.has(s)) ?? rows[0]?.slug ?? "",
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

  const periodLabels = React.useMemo(() => {
    const sample = compareRows[0] ?? rows[0];
    if (!sample) return [] as string[];
    return [
      String(sample.now.year),
      String(sample.at2040.year),
      String(sample.at2060.year),
    ];
  }, [compareRows, rows]);

  const compareData = periodLabels.map((period, i) => {
    const row: Record<string, number | string | null> = { period };
    for (const c of compareRows) {
      const band = i === 0 ? c.now : i === 1 ? c.at2040 : c.at2060;
      row[c.slug] = ratio(band.workersPerRetiree);
    }
    return row;
  });

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

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setDesc((d) => !d);
    else {
      setSortKey(key);
      setDesc(key !== "name");
    }
  };

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-2xl tracking-tight text-foreground">
            Compare countries
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Workers per retiree (ages 15–64 ÷ 65+), modeled from today’s pyramid.
            Pick countries to see how the ratio moves toward 2060.
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
            <GroupedBarChart
              data={compareData}
              series={compareSeries}
              xKey="period"
              unit="workers per retiree"
              decimals={2}
              height={420}
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
              Absolute headcount
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Same model as the country briefing chart — working-age and 65+ in
              millions for one country.
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
              height={400}
            />
            <p className="mt-3 text-sm text-muted-foreground">
              <Link
                href={`/country/${spot.slug}/brief`}
                className="link-editorial font-medium"
              >
                Open {spot.name} briefing
              </Link>
              {" · "}
              {ratio(spot.now.workersPerRetiree)} workers per retiree now →{" "}
              {ratio(spot.at2060.workersPerRetiree)} in {spot.at2060.year}
            </p>
          </ChartCard>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-2xl tracking-tight text-foreground">
            All countries
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Ranked by workers per retiree. Δ is the change from today to the
            ~2060 projection under current fertility.
          </p>
        </div>

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
              return (
                <TableRow key={row.iso3}>
                  <TableCell className="font-mono text-muted-foreground">
                    {i + 1}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      className="flex items-center gap-2 font-medium hover:text-primary"
                      onClick={() => {
                        setSpotlight(row.slug);
                        if (!selected.includes(row.slug) && selected.length < 6) {
                          setSelected([...selected, row.slug]);
                        }
                      }}
                    >
                      <span className="text-lg">{row.flagEmoji ?? "🏳️"}</span>
                      {row.name}
                    </button>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {row.continent ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {ratio(row.now.workersPerRetiree).toFixed(2)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">
                    {ratio(row.at2040.workersPerRetiree).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {ratio(row.at2060.workersPerRetiree).toFixed(2)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums text-muted-foreground lg:table-cell">
                    {ratio(row.at2060Replacement.workersPerRetiree).toFixed(2)}
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
      </section>
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
