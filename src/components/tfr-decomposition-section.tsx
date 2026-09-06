"use client";

import * as React from "react";
import Link from "next/link";
import { ChartCard } from "@/components/charts/chart-card";
import {
  DEFAULT_FEATURED_ISO3,
  TfrDecompositionChart,
} from "@/components/charts/tfr-decomposition-chart";
import { CollapsibleSection } from "@/components/collapsible-section";
import {
  CountryMultiSelect,
  type CountryOption,
} from "@/components/country-multi-select";
import { SectionHeading } from "@/components/section-heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DEFAULT_FEATURED_GROUPS,
  type TfrDecompositionRow,
} from "@/lib/sources/tfr-decomposition-data";

type SortKey = "tfr" | "tmrPct" | "cpm" | "name";

const MAX_LABELLED = 28;

function countryFlag(iso2: string): string {
  if (!/^[A-Z]{2}$/i.test(iso2)) return "🏳️";
  const A = 0x1f1e6;
  const code = iso2.toUpperCase();
  return String.fromCodePoint(
    A + (code.charCodeAt(0) - 65),
    A + (code.charCodeAt(1) - 65),
  );
}

export function TfrDecompositionSection({
  rows,
}: {
  rows: TfrDecompositionRow[];
}) {
  const countries = React.useMemo(
    () => rows.filter((r) => r.kind !== "group"),
    [rows],
  );
  const groups = React.useMemo(
    () => rows.filter((r) => r.kind === "group"),
    [rows],
  );

  const [sortKey, setSortKey] = React.useState<SortKey>("tmrPct");
  const [asc, setAsc] = React.useState(false);
  const [labelled, setLabelled] = React.useState<string[]>(() => [
    ...countries
      .filter((r) => DEFAULT_FEATURED_ISO3.includes(r.iso3))
      .map((r) => r.id),
    ...DEFAULT_FEATURED_GROUPS.filter((id) => groups.some((g) => g.id === id)),
  ]);

  const pickerOptions = React.useMemo<CountryOption[]>(() => {
    const countryOpts: CountryOption[] = [...countries]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((r) => ({
        slug: r.id,
        name: r.name,
        flagEmoji: countryFlag(r.iso2),
        group: "Countries",
      }));
    const groupOpts: CountryOption[] = groups.map((r) => ({
      slug: r.id,
      name: r.name,
      flagEmoji: countryFlag(r.iso2),
      group: r.group ?? "Within-country groups",
    }));
    return [...countryOpts, ...groupOpts];
  }, [countries, groups]);

  const featuredIds = React.useMemo(() => new Set(labelled), [labelled]);

  const toggleFeatured = (id: string) => {
    setLabelled((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= MAX_LABELLED) return prev;
      return [...prev, id];
    });
  };

  const sortedCountries = useSorted(countries, sortKey, asc);
  const sortedGroups = useSorted(groups, sortKey, asc);

  const setSort = (key: SortKey) => {
    if (key === sortKey) setAsc((a) => !a);
    else {
      setSortKey(key);
      setAsc(key === "name");
    }
  };

  const arrow = (key: SortKey) =>
    sortKey === key ? (asc ? " ↑" : " ↓") : "";

  return (
    <div className="space-y-8">
      <ChartCard
        title="Many mothers, or large families?"
        description="Every country's total fertility rate is the product of two very different forces: how many women become mothers at all, and how many children those mothers go on to have. Two countries can post the same TFR for opposite reasons. Diamonds are official within-country groups — US race and Hispanic origin — using the same split."
        source="Eurostat (demo_find); US CDC/NCHS (including Births: Final Data for 2023, Tables 2–3 by race and Hispanic origin); Japan MHLW; Statistics Korea; Australian Bureau of Statistics; Rosstat via HSE; Israel CBS"
        csvRows={rows.map((r) => ({
          id: r.id,
          name: r.name,
          kind: r.kind,
          iso3: r.iso3,
          year: r.year,
          total_fertility_rate: r.tfr,
          total_maternal_rate_pct: r.tmrPct,
          children_per_mother: r.cpm,
          first_birth_share_pct: r.orderOneSharePct,
          source: r.source,
        }))}
        csvName="tfr-decomposition-by-country"
      >
        <div data-export-ignore className="mb-3">
          <CountryMultiSelect
            options={pickerOptions}
            selected={labelled}
            onChange={setLabelled}
            max={MAX_LABELLED}
            colored={false}
            addLabel="Add country or group"
            searchPlaceholder="Search countries or groups…"
          />
        </div>
        <TfrDecompositionChart
          rows={rows}
          featuredIds={featuredIds}
          onToggleFeatured={toggleFeatured}
        />
      </ChartCard>

      <CollapsibleSection title="How “Total Maternal Rate” and “Children per Mother” are calculated">
        <div className="max-w-3xl space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            The total fertility rate (TFR) answers one question — average
            children per woman — by blending two independent ones together.
            This chart splits it back apart:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-foreground">
                Total Maternal Rate (TMR)
              </strong>{" "}
              — the share of women who become mothers at all, estimated as
              the country&apos;s period total fertility rate counting first
              births only.
            </li>
            <li>
              <strong className="text-foreground">
                Children per Mother (CPM)
              </strong>{" "}
              — the average family size among mothers, i.e. TFR ÷ TMR.
            </li>
          </ul>
          <p>
            Both are derived from the same published input — each
            series&apos; first births as a share of all births of known
            order in one calendar year — so the identity{" "}
            <span className="font-mono text-foreground">
              TFR = TMR × CPM
            </span>{" "}
            always holds exactly. Like the TFR itself, TMR and CPM are period
            measures: they describe one year&apos;s age-specific birth rates,
            not the eventual family size of any real cohort of women. A
            country where childbearing is being postponed — South Korea is
            the sharpest example in this dataset — can show a temporarily
            depressed TMR even if most women there will eventually have a
            child. Figures are the latest available per country (mostly
            2023–2024) and are not perfectly harmonised: birth-order
            reporting conventions vary slightly by statistical office.
          </p>
          <p>
            Within-country points use the same identity on official
            subgroup tables. US race and Hispanic-origin groups are NCHS
            2023 categories (non-Hispanic single race, plus Hispanic of any
            race). They are not comparable to Denmark-style ancestry or to
            country-of-birth series elsewhere — only a handful of offices
            publish both a TFR and births by live-birth order for the same
            groups, which is what this scatter requires.
          </p>
        </div>
      </CollapsibleSection>

      <div>
        <SectionHeading
          title="All countries in this dataset"
          description="Sortable — tap a column to reorder."
        />
        <DecompositionTable
          rows={sortedCountries}
          arrow={arrow}
          setSort={setSort}
        />
      </div>

      {sortedGroups.length > 0 ? (
        <div>
          <SectionHeading
            title="US race and Hispanic origin"
            description="Same TMR × CPM split, from NCHS Births: Final Data for 2023 (Tables 2 and 3). Non-Hispanic groups are single race."
          />
          <DecompositionTable
            rows={sortedGroups}
            arrow={arrow}
            setSort={setSort}
            nameAsText
          />
        </div>
      ) : null}
    </div>
  );
}

function useSorted(
  rows: TfrDecompositionRow[],
  sortKey: SortKey,
  asc: boolean,
) {
  return React.useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const cmp =
        typeof va === "string"
          ? va.localeCompare(vb as string)
          : (va as number) - (vb as number);
      return asc ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, asc]);
}

function DecompositionTable({
  rows,
  arrow,
  setSort,
  nameAsText = false,
}: {
  rows: TfrDecompositionRow[];
  arrow: (key: SortKey) => string;
  setSort: (key: SortKey) => void;
  nameAsText?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead
            className="cursor-pointer select-none"
            onClick={() => setSort("name")}
          >
            {nameAsText ? "Group" : "Country"}
            {arrow("name")}
          </TableHead>
          <TableHead
            className="cursor-pointer select-none text-right"
            onClick={() => setSort("tfr")}
          >
            TFR{arrow("tfr")}
          </TableHead>
          <TableHead
            className="cursor-pointer select-none text-right"
            onClick={() => setSort("tmrPct")}
          >
            Total maternal rate{arrow("tmrPct")}
          </TableHead>
          <TableHead
            className="cursor-pointer select-none text-right"
            onClick={() => setSort("cpm")}
          >
            Children per mother{arrow("cpm")}
          </TableHead>
          <TableHead className="hidden text-right sm:table-cell">
            Year
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>
              {nameAsText ? (
                <span className="flex items-center gap-2 font-medium">
                  <span className="text-lg">{countryFlag(r.iso2)}</span>
                  {r.name}
                </span>
              ) : (
                <Link
                  href={`/country/${r.slug}`}
                  className="flex items-center gap-2 font-medium hover:text-primary"
                >
                  <span className="text-lg">{countryFlag(r.iso2)}</span>
                  {r.name}
                </Link>
              )}
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {r.tfr.toFixed(2)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {r.tmrPct.toFixed(1)}%
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {r.cpm.toFixed(2)}
            </TableCell>
            <TableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">
              {r.year}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
