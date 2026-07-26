"use client";

import * as React from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCompact } from "@/lib/utils";

export interface CityRow {
  slug: string;
  name: string;
  population: number | null;
  isCapital: boolean;
  country: { name: string; slug: string; flagEmoji: string | null };
}

export function CitiesList({ cities }: { cities: CityRow[] }) {
  const [q, setQ] = React.useState("");
  const filtered = cities.filter(
    (c) =>
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      c.country.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search cities or countries…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-sm"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Country</TableHead>
            <TableHead className="text-right">Population (metro)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((c, i) => (
            <TableRow key={c.slug}>
              <TableCell className="font-mono text-muted-foreground">
                {i + 1}
              </TableCell>
              <TableCell>
                <Link
                  href={`/city/${c.slug}`}
                  className="font-medium hover:text-primary"
                >
                  {c.name}
                  {c.isCapital && (
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      capital
                    </span>
                  )}
                </Link>
              </TableCell>
              <TableCell>
                <Link
                  href={`/country/${c.country.slug}`}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <span>{c.country.flagEmoji}</span> {c.country.name}
                </Link>
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatCompact(c.population ?? 0)}
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="py-8 text-center text-muted-foreground"
              >
                No cities found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
