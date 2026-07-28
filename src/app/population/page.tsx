import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { MapCard } from "@/components/maps/map-card";
import { ExplorerTable } from "@/components/explorer-table";
import { PopulationCalculator } from "@/components/population-calculator";
import {
  getMapFrames,
  getRanking,
  getWeightedGlobalByYear,
  getWorldByYear,
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
  const growthStats = years
    .filter((y) => globalGrowth[y] != null)
    .map((y) => ({ year: y, label: `World ${globalGrowth[y].toFixed(2)}%` }));

  return (
    <div>
      <PageHeader
        title="Population Explorer"
        description="Population size, growth and projections for every country. Most populous nations, fastest-growing and fastest-shrinking populations."
      />
      <div className="container space-y-8 py-8">
        <MapCard
          title="Population Growth Map"
          description="Annual population growth rate (%). Blue = growing, red = shrinking."
          source="World Bank"
          frames={growthFrames}
          unit="% annual"
          decimals={2}
          scaleType="diverging"
          mid={0}
          frameStats={growthStats}
          height={540}
        />

        <div className="space-y-2">
          <PopulationCalculator defaultPopulation={8_000_000_000} defaultGrowth={0.9} />
          <p className="text-xs text-muted-foreground">
            Illustrative compound-growth calculator — not a demographic projection.
            For country forecasts see the{" "}
            <a href="/simulator" className="underline underline-offset-2 hover:text-foreground">
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
