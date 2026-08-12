"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { CountrySelect } from "@/components/country-select";
import { formatCompact, formatNumber } from "@/lib/utils";

export type PopulationCalcCountry = {
  slug: string;
  name: string;
  flagEmoji: string | null;
  population: number;
  growth: number;
  year: number;
};

const WORLD_SLUG = "__world__";

export function PopulationCalculator({
  countries = [],
  defaultPopulation = 10_000_000,
  defaultGrowth = 1.0,
  worldLabel = "World",
}: {
  countries?: PopulationCalcCountry[];
  defaultPopulation?: number;
  defaultGrowth?: number;
  worldLabel?: string;
}) {
  const [selected, setSelected] = React.useState<string | null>(WORLD_SLUG);
  const [pop, setPop] = React.useState(defaultPopulation);
  const [growth, setGrowth] = React.useState(defaultGrowth);
  const [years, setYears] = React.useState(50);

  const options = React.useMemo(
    () => [
      { slug: WORLD_SLUG, name: worldLabel, flagEmoji: "🌍" },
      ...countries.map((c) => ({
        slug: c.slug,
        name: c.name,
        flagEmoji: c.flagEmoji,
      })),
    ],
    [countries, worldLabel],
  );

  const bySlug = React.useMemo(
    () => new Map(countries.map((c) => [c.slug, c])),
    [countries],
  );

  const active = selected && selected !== WORLD_SLUG ? bySlug.get(selected) : null;

  const applyCountry = React.useCallback(
    (slug: string | null) => {
      const next = slug ?? WORLD_SLUG;
      setSelected(next);
      if (next === WORLD_SLUG) {
        setPop(defaultPopulation);
        setGrowth(defaultGrowth);
        return;
      }
      const c = bySlug.get(next);
      if (!c) return;
      setPop(Math.round(c.population));
      setGrowth(Number(c.growth.toFixed(2)));
    },
    [bySlug, defaultGrowth, defaultPopulation],
  );

  const data = React.useMemo(() => {
    const out: { year: number; value: number }[] = [];
    const startYear = new Date().getFullYear();
    // Keep floating values so the chart stays smooth; round only for display.
    let current = Math.max(0, pop);
    for (let i = 0; i <= years; i++) {
      out.push({ year: startYear + i, value: current });
      current *= 1 + growth / 100;
    }
    return out;
  }, [pop, growth, years]);

  const final = data[data.length - 1]?.value ?? pop;
  const doublingTime =
    growth > 0 ? Math.log(2) / Math.log(1 + growth / 100) : Infinity;

  return (
    <section className="border-t border-border pt-5">
      <div className="mb-4 space-y-1">
        <h2 className="font-serif text-xl font-semibold tracking-tight text-primary md:text-[1.35rem]">
          Population growth calculator
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Pick a country to load its latest population and growth rate, or keep
          World and edit the numbers yourself. Compound growth only — not a full
          demographic projection.
        </p>
      </div>

      <div className="space-y-5">
        {options.length > 1 ? (
          <div className="max-w-md space-y-1.5">
            <Label>Country</Label>
            <CountrySelect
              options={options}
              value={selected}
              onChange={applyCountry}
              placeholder="Select country…"
            />
            {active ? (
              <p className="text-xs text-muted-foreground">
                Loaded {active.name} · {formatCompact(active.population)} people ·{" "}
                {formatNumber(active.growth, 2)}% annual ({active.year})
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Starting from world totals — adjust freely below.
              </p>
            )}
          </div>
        ) : null}

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

        <div className="grid grid-cols-2 gap-6 border-y border-border py-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">In {years} years</p>
            <p className="mt-1 font-serif text-2xl font-semibold tracking-tight">
              {formatCompact(final)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Net change</p>
            <p className="mt-1 font-serif text-2xl font-semibold tracking-tight">
              {final >= pop ? "+" : ""}
              {formatCompact(final - pop)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Doubling time</p>
            <p className="mt-1 font-serif text-2xl font-semibold tracking-tight">
              {Number.isFinite(doublingTime)
                ? `${doublingTime.toFixed(0)} yrs`
                : "—"}
            </p>
          </div>
        </div>

        <TimeSeriesChart
          data={data}
          decimals={0}
          height={280}
          color="hsl(211 62% 45%)"
        />
      </div>
    </section>
  );
}
