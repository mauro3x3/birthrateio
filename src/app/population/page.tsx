import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExplorerTable } from "@/components/explorer-table";
import { PopulationCalculator } from "@/components/population-calculator";
import { TimelineExplorer } from "@/components/maps/timeline-explorer";
import {
  getMapFrames,
  getRanking,
  getWeightedGlobalByYear,
  getWorldByYear,
  getWorldLatestValue,
} from "@/lib/queries";
import { SLUG } from "@/lib/indicators";
import { safe } from "@/lib/safe";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Population Explorer — World Population Rankings & Projections",
  description:
    "Explore world population by country: rankings, growth rates, an animated population growth map, and a population growth calculator.",
  alternates: { canonical: "/population" },
};

export default async function PopulationPage() {
  const [growthFrames, popRanking, growthRanking] = await Promise.all([
    safe(getMapFrames(SLUG.populationGrowth, { step: 1, maxFrames: 60 }), []),
    safe(getRanking(SLUG.population, { order: "desc" }), []),
    safe(getRanking(SLUG.populationGrowth, { order: "desc" }), []),
  ]);

  const years = growthFrames.map((f) => f.year);
  const world = await safe(
    getWorldByYear(SLUG.populationGrowth, years),
    {} as Record<number, number>,
  );
  const globalGrowth = Object.keys(world).length
    ? world
    : await safe(
        getWeightedGlobalByYear(SLUG.populationGrowth, SLUG.population, years),
        {} as Record<number, number>,
      );

  const timelineFrames = growthFrames.map((f) => ({
    year: f.year,
    data: f.data.map((d) => ({
      iso3: d.iso3,
      slug: d.slug,
      name: d.name,
      value: d.value,
      continent: d.continent,
    })),
  }));

  const growthBySlug = new Map(growthRanking.map((r) => [r.slug, r]));
  const calcCountries = popRanking
    .map((p) => {
      const g = growthBySlug.get(p.slug);
      if (!g) return null;
      return {
        slug: p.slug,
        name: p.name,
        flagEmoji: p.flagEmoji,
        population: p.value,
        growth: g.value,
        year: Math.max(p.year, g.year),
      };
    })
    .filter((c): c is NonNullable<typeof c> => c != null);

  const worldPopLatest = await safe(getWorldLatestValue(SLUG.population), null);
  const worldPop = worldPopLatest?.value ?? 8_000_000_000;
  const latestGrowthYear = years[years.length - 1];
  const worldGrowth =
    (latestGrowthYear != null ? globalGrowth[latestGrowthYear] : undefined) ??
    0.9;

  return (
    <div>
      <TimelineExplorer
        frames={timelineFrames}
        globalByYear={globalGrowth}
        unit="% annual"
        decimals={2}
        scaleType="diverging-growth-dark"
        mid={0}
        source="World Bank"
        headline="Global"
        metricLabel="% annual growth"
      />

      <div className="container space-y-10 py-10">
        <div className="space-y-2">
          <PopulationCalculator
            countries={calcCountries}
            defaultPopulation={Math.round(worldPop)}
            defaultGrowth={Number(worldGrowth.toFixed(2))}
          />
          <p className="text-xs text-muted-foreground">
            Illustrative compound-growth calculator — not a demographic
            projection. For country forecasts see the{" "}
            <a
              href="/simulator"
              className="underline underline-offset-2 hover:text-foreground"
            >
              demographic simulator
            </a>
            .
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Most Populous Countries</CardTitle>
            </CardHeader>
            <CardContent>
              <ExplorerTable
                rows={popRanking}
                unit="people"
                decimals={0}
                valueLabel="Population"
                csvName="population-rankings"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Population Growth Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ExplorerTable
                rows={growthRanking}
                unit="% annual"
                decimals={2}
                valueLabel="Growth"
                csvName="population-growth-rankings"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
