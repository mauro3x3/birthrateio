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
import type { RankingRow } from "@/lib/queries";
import { downloadFile, formatByUnit, toCSV } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function ExplorerTable({
  rows,
  unit,
  decimals = 2,
  valueLabel = "Value",
  csvName = "rankings",
}: {
  rows: RankingRow[];
  unit?: string;
  decimals?: number;
  valueLabel?: string;
  csvName?: string;
}) {
  const continents = React.useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.continent).filter(Boolean) as string[]),
      ).sort(),
    [rows],
  );
  const [region, setRegion] = React.useState<string | "all">("all");
  const [query, setQuery] = React.useState("");
  const [desc, setDesc] = React.useState(true);

  const filtered = React.useMemo(() => {
    let r = rows;
    if (region !== "all") r = r.filter((x) => x.continent === region);
    if (query.trim())
      r = r.filter((x) =>
        x.name.toLowerCase().includes(query.trim().toLowerCase()),
      );
    return [...r].sort((a, b) => (desc ? b.value - a.value : a.value - b.value));
  }, [rows, region, query, desc]);

  return (
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
                `${csvName}.csv`,
                toCSV(
                  filtered.map((r, i) => ({
                    rank: i + 1,
                    country: r.name,
                    iso3: r.iso3,
                    region: r.continent ?? "",
                    value: r.value,
                    year: r.year,
                  })),
                ),
              )
            }
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        </div>
      </div>

      <Table className="table-stat">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-12">#</TableHead>
            <TableHead>Country</TableHead>
            <TableHead className="hidden sm:table-cell">Region</TableHead>
            <TableHead className="text-right">{valueLabel}</TableHead>
            <TableHead className="w-16 text-right">Year</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((row, i) => (
            <TableRow key={row.iso3}>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {i + 1}
              </TableCell>
              <TableCell>
                <Link
                  href={`/country/${row.slug}`}
                  className="flex items-center gap-2 font-medium hover:text-primary"
                >
                  <span className="text-base">{row.flagEmoji ?? "🏳️"}</span>
                  {row.name}
                </Link>
              </TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell">
                {row.continent ?? "—"}
              </TableCell>
              <TableCell className="text-right font-serif text-base font-semibold tabular-nums text-primary">
                {formatByUnit(row.value, unit, decimals)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground tabular-nums">
                {row.year}
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-8 text-center text-muted-foreground"
              >
                No matching countries.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
