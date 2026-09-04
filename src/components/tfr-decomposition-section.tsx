"use client";

import * as React from "react";
import Link from "next/link";
import { ChartCard } from "@/components/charts/chart-card";
import { TfrDecompositionChart } from "@/components/charts/tfr-decomposition-chart";
import { CollapsibleSection } from "@/components/collapsible-section";
import { SectionHeading } from "@/components/section-heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TfrDecompositionRow } from "@/lib/sources/tfr-decomposition-data";

type SortKey = "tfr" | "tmrPct" | "cpm" | "name";

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
  const [sortKey, setSortKey] = React.useState<SortKey>("tmrPct");
  const [asc, setAsc] = React.useState(false);

  const sorted = React.useMemo(() => {
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
        description="Every country's total fertility rate is the product of two very different forces: how many women become mothers at all, and how many children those mothers go on to have. Two countries can post the same TFR for opposite reasons."
        source="Eurostat (demo_find); US CDC/NCHS; Japan MHLW; Statistics Korea; Australian Bureau of Statistics; Rosstat via HSE; Israel CBS"
        csvRows={rows.map((r) => ({
          country: r.name,
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
        <TfrDecompositionChart rows={rows} />
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
            country&apos;s first births as a share of all births of known
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
        </div>
      </CollapsibleSection>

      <div>
        <SectionHeading
          title="All countries in this dataset"
          description="Sortable — tap a column to reorder."
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => setSort("name")}
              >
                Country{arrow("name")}
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
            {sorted.map((r) => (
              <TableRow key={r.iso3}>
                <TableCell>
                  <Link
                    href={`/country/${r.slug}`}
                    className="flex items-center gap-2 font-medium hover:text-primary"
                  >
                    <span className="text-lg">{countryFlag(r.iso2)}</span>
                    {r.name}
                  </Link>
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
      </div>
    </div>
  );
}
