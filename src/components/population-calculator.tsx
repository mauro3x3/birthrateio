"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { formatCompact } from "@/lib/utils";

export function PopulationCalculator({
  defaultPopulation = 10_000_000,
  defaultGrowth = 1.0,
}: {
  defaultPopulation?: number;
  defaultGrowth?: number;
}) {
  const [pop, setPop] = React.useState(defaultPopulation);
  const [growth, setGrowth] = React.useState(defaultGrowth);
  const [years, setYears] = React.useState(50);

  const data = React.useMemo(() => {
    const out: { year: number; value: number }[] = [];
    const startYear = new Date().getFullYear();
    let current = pop;
    for (let i = 0; i <= years; i++) {
      out.push({ year: startYear + i, value: Math.round(current) });
      current *= 1 + growth / 100;
    }
    return out;
  }, [pop, growth, years]);

  const final = data[data.length - 1]?.value ?? pop;
  const doublingTime =
    growth > 0 ? Math.log(2) / Math.log(1 + growth / 100) : Infinity;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Population Growth Calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="calc-pop">Starting population</Label>
            <Input
              id="calc-pop"
              type="number"
              value={pop}
              min={0}
              onChange={(e) => setPop(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="calc-growth">Annual growth (%)</Label>
            <Input
              id="calc-growth"
              type="number"
              step="0.1"
              value={growth}
              onChange={(e) => setGrowth(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="calc-years">Years</Label>
            <Input
              id="calc-years"
              type="number"
              value={years}
              min={1}
              max={200}
              onChange={(e) => setYears(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">In {years} years</p>
            <p className="text-xl font-bold">{formatCompact(final)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Net change</p>
            <p className="text-xl font-bold">
              {final >= pop ? "+" : ""}
              {formatCompact(final - pop)}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Doubling time</p>
            <p className="text-xl font-bold">
              {Number.isFinite(doublingTime)
                ? `${doublingTime.toFixed(0)} yrs`
                : "—"}
            </p>
          </div>
        </div>

        <TimeSeriesChart data={data} type="area" decimals={0} height={240} />
      </CardContent>
    </Card>
  );
}
