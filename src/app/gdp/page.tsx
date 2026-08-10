import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { MapCard } from "@/components/maps/map-card";
import { ExplorerTable } from "@/components/explorer-table";
import {
  getMapFrames,
  getRanking,
  getWeightedGlobalByYear,
  getWorldByYear,
} from "@/lib/queries";
import { SLUG } from "@/lib/indicators";
import { safe } from "@/lib/safe";
import { formatCompact } from "@/lib/utils";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "GDP Explorer — Economic Output, GDP per Capita & Growth",
  description:
    "Explore GDP, GDP per capita and economic growth for every country. Rankings, an animated GDP-per-capita map and comparisons.",
  alternates: { canonical: "/gdp" },
};

export default async function GdpPage() {
  const [frames, gdpRanking, perCapita, growth] = await Promise.all([
    safe(getMapFrames(SLUG.gdpPerCapita, { step: 1, maxFrames: 60 }), []),
    safe(getRanking(SLUG.gdp, { order: "desc" }), []),
    safe(getRanking(SLUG.gdpPerCapita, { order: "desc" }), []),
    safe(getRanking(SLUG.gdpGrowth, { order: "desc" }), []),
  ]);

  const years = frames.map((f) => f.year);
  const world = await safe(
    getWorldByYear(SLUG.gdpPerCapita, years),
    {} as Record<number, number>,
  );
  const globalGdpPc = Object.keys(world).length
    ? world
    : await safe(
        getWeightedGlobalByYear(SLUG.gdpPerCapita, SLUG.population, years),
        {} as Record<number, number>,
      );
  const gdpStats = years
    .filter((y) => globalGdpPc[y] != null)
    .map((y) => ({ year: y, label: `World $${formatCompact(globalGdpPc[y])}` }));

  return (
    <div>
      <PageHeader
        title="GDP Explorer"
        description="Gross domestic product, GDP per capita and growth rates across the world economy."
      />
      <div className="container space-y-8 py-8">
        <MapCard
          title="GDP per capita"
          description="Gross domestic product divided by population (current US$). Scrub the year timeline to see how incomes changed — darker countries are richer on a per-person basis."
          source="World Bank"
          frames={frames}
          unit="US$"
          decimals={0}
          scaleType="sequential-log"
          frameStats={gdpStats}
          height={540}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">GDP Rankings (total)</CardTitle>
          </CardHeader>
          <CardContent>
            <ExplorerTable
              rows={gdpRanking}
              unit="US$"
              decimals={0}
              valueLabel="GDP"
              csvName="gdp-rankings"
            />
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">GDP per Capita</CardTitle>
            </CardHeader>
            <CardContent>
              <ExplorerTable
                rows={perCapita}
                unit="US$"
                decimals={0}
                valueLabel="GDP/capita"
                csvName="gdp-per-capita-rankings"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">GDP Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <ExplorerTable
                rows={growth}
                unit="% annual"
                decimals={2}
                valueLabel="Growth"
                csvName="gdp-growth-rankings"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
