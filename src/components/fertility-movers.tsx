"use client";

import * as React from "react";
import Link from "next/link";
import { LineChart } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChangeList, type ChangeItem } from "@/components/change-list";
import { MultiSeriesChart } from "@/components/charts/multi-series-chart";
import { colorAt } from "@/components/charts/palette";
import type { CountryOption } from "@/components/country-multi-select";

interface MoversChartProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: ChangeItem[];
}

function MoversChartDialog({
  open,
  onOpenChange,
  title,
  items,
}: MoversChartProps) {
  const [rows, setRows] = React.useState<Record<string, number | null>[]>([]);
  const [countries, setCountries] = React.useState<CountryOption[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || items.length === 0) return;
    setLoading(true);
    const slugs = items.map((i) => i.slug).join(",");
    fetch(`/api/compare?countries=${slugs}&indicator=fertility-rate`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.rows ?? []);
        setCountries(d.countries ?? []);
      })
      .finally(() => setLoading(false));
  }, [open, items]);

  const series = countries.map((c, i) => ({
    key: c.slug,
    label: c.name,
    color: colorAt(i),
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Total fertility rate over time for all {items.length} countries.
            Hover the chart to inspect values by year.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
            Loading chart…
          </div>
        ) : (
          <MultiSeriesChart
            data={rows}
            series={series}
            unit="births per woman"
            decimals={2}
            height={360}
          />
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" asChild>
            <Link
              href={`/compare?countries=${items.map((i) => i.slug).join(",")}&metric=fertility-rate`}
            >
              Open in Compare tool
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MoverCard({
  title,
  items,
  direction,
  chartTitle,
}: {
  title: string;
  items: ChangeItem[];
  direction: "up" | "down";
  chartTitle: string;
}) {
  const [chartOpen, setChartOpen] = React.useState(false);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChartOpen(true)}
            >
              <LineChart className="h-4 w-4" />
              Graph
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <ChangeList items={items} direction={direction} decimals={2} />
        </CardContent>
      </Card>
      <MoversChartDialog
        open={chartOpen}
        onOpenChange={setChartOpen}
        title={chartTitle}
        items={items}
      />
    </>
  );
}

export function FertilityMovers({
  declines,
  increases,
}: {
  declines: ChangeItem[];
  increases: ChangeItem[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <MoverCard
        title="Fastest declines (10y)"
        items={declines}
        direction="down"
        chartTitle="Fertility trends — largest declines"
      />
      <MoverCard
        title="Fastest increases (10y)"
        items={increases}
        direction="up"
        chartTitle="Fertility trends — largest increases"
      />
    </div>
  );
}
