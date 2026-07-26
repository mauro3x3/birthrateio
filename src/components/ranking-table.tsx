import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RankingRow } from "@/lib/queries";
import { formatByUnit } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function RankingTable({
  rows,
  unit,
  decimals = 2,
  valueLabel = "Value",
  startRank = 1,
}: {
  rows: RankingRow[];
  unit?: string;
  decimals?: number;
  valueLabel?: string;
  startRank?: number;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Country</TableHead>
          <TableHead className="hidden sm:table-cell">Region</TableHead>
          <TableHead className="text-right">{valueLabel}</TableHead>
          <TableHead className="w-16 text-right">Year</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={row.iso3}>
            <TableCell className="font-mono text-muted-foreground">
              {startRank + i}
            </TableCell>
            <TableCell>
              <Link
                href={`/country/${row.slug}`}
                className="flex items-center gap-2 font-medium hover:text-primary"
              >
                <span className="text-lg">{row.flagEmoji ?? "🏳️"}</span>
                {row.name}
              </Link>
            </TableCell>
            <TableCell className="hidden text-muted-foreground sm:table-cell">
              {row.continent ?? "—"}
            </TableCell>
            <TableCell
              className={cn("text-right font-medium tabular-nums")}
            >
              {formatByUnit(row.value, unit, decimals)}
            </TableCell>
            <TableCell className="text-right text-muted-foreground tabular-nums">
              {row.year}
            </TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
              No data available. Run <code>npm run ingest</code> to load data.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
