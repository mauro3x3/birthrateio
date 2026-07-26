"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CountryMultiSelect,
  type CountryOption,
} from "@/components/country-multi-select";
import { MultiSeriesChart } from "@/components/charts/multi-series-chart";
import { ChartCard } from "@/components/charts/chart-card";
import { colorAt } from "@/components/charts/palette";
import { formatByUnit } from "@/lib/utils";

const METRICS = [
  { slug: "fertility-rate", label: "Fertility Rate" },
  { slug: "population", label: "Population" },
  { slug: "population-growth", label: "Population Growth" },
  { slug: "gdp", label: "GDP" },
  { slug: "gdp-per-capita", label: "GDP per Capita" },
  { slug: "net-migration", label: "Net Migration" },
  { slug: "life-expectancy", label: "Life Expectancy" },
];

interface CompareData {
  countries: CountryOption[];
  rows: Record<string, number | null>[];
  meta: { name: string; unit: string; decimals: number } | null;
}

export function CompareTool({
  options,
  initial,
}: {
  options: CountryOption[];
  initial: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = React.useState<string[]>(
    initial.length ? initial : ["japan", "united-states", "india"],
  );
  const [metric, setMetric] = React.useState("fertility-rate");
  const [data, setData] = React.useState<CompareData>({
    countries: [],
    rows: [],
    meta: null,
  });
  const [loading, setLoading] = React.useState(false);

  // Keep URL in sync for shareable links.
  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("countries", selected.join(","));
    params.set("metric", metric);
    router.replace(`/compare?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, metric]);

  React.useEffect(() => {
    if (selected.length === 0) {
      setData({ countries: [], rows: [], meta: null });
      return;
    }
    setLoading(true);
    fetch(
      `/api/compare?countries=${selected.join(",")}&indicator=${metric}`,
    )
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [selected, metric]);

  const series = data.countries.map((c, i) => ({
    key: c.slug,
    label: c.name,
    color: colorAt(i),
  }));

  // Latest value per country for the ranking table.
  const latest = data.countries.map((c, i) => {
    let val: number | null = null;
    let year: number | null = null;
    for (const row of data.rows) {
      const v = row[c.slug];
      if (typeof v === "number") {
        val = v;
        year = row.year as number;
      }
    }
    return { ...c, value: val, year, color: colorAt(i) };
  });
  const sortedLatest = [...latest].sort(
    (a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity),
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <CountryMultiSelect
            options={options}
            selected={selected}
            onChange={setSelected}
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Metric</span>
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRICS.map((m) => (
                  <SelectItem key={m.slug} value={m.slug}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <ChartCard
        title={`${data.meta?.name ?? "Metric"} — overlay`}
        description={loading ? "Loading…" : "Compare trends over time"}
        source="World Bank"
        csvRows={data.rows}
        csvName={`compare-${metric}`}
      >
        <MultiSeriesChart
          data={data.rows}
          series={series}
          unit={data.meta?.unit}
          decimals={data.meta?.decimals ?? 2}
          height={360}
          referenceY={metric === "fertility-rate" ? 2.1 : undefined}
          referenceLabel={
            metric === "fertility-rate" ? "Replacement" : undefined
          }
        />
      </ChartCard>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Latest values &amp; ranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">
                  {data.meta?.name ?? "Value"}
                </TableHead>
                <TableHead className="w-20 text-right">Year</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLatest.map((c, i) => (
                <TableRow key={c.slug}>
                  <TableCell className="font-mono text-muted-foreground">
                    {i + 1}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2 font-medium">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: c.color }}
                      />
                      <span className="text-lg">{c.flagEmoji}</span>
                      {c.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatByUnit(
                      c.value,
                      data.meta?.unit,
                      data.meta?.decimals ?? 2,
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {c.year ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
              {sortedLatest.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Add countries to compare.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
