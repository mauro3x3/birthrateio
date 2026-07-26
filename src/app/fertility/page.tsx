import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { MapCard } from "@/components/maps/map-card";
import { ExplorerTable } from "@/components/explorer-table";
import { FertilityMovers } from "@/components/fertility-movers";
import {
  getFertilityChanges,
  getMapFrames,
  getRanking,
  getWeightedGlobalByYear,
  getWorldByYear,
} from "@/lib/queries";
import { SLUG } from "@/lib/indicators";
import { safe } from "@/lib/safe";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Fertility Explorer — Global Fertility Rates & Trends",
  description:
    "Explore total fertility rates for every country. Animated global fertility map, rankings, historical trends and the biggest fertility movers.",
  alternates: { canonical: "/fertility" },
};

export default async function FertilityPage() {
  const [frames, ranking, changes] = await Promise.all([
    safe(getMapFrames(SLUG.fertility, { step: 1, maxFrames: 60 }), []),
    safe(getRanking(SLUG.fertility, { order: "desc" }), []),
    safe(getFertilityChanges(10, 8), { increases: [], declines: [] }),
  ]);

  // Official World fertility (World Bank "World" aggregate) per animated year,
  // falling back to a population-weighted estimate if unavailable.
  const years = frames.map((f) => f.year);
  const world = await safe(
    getWorldByYear(SLUG.fertility, years),
    {} as Record<number, number>,
  );
  const globalTfr = Object.keys(world).length
    ? world
    : await safe(
        getWeightedGlobalByYear(SLUG.fertility, SLUG.population, years),
        {} as Record<number, number>,
      );
  const fertilityStats = years
    .filter((y) => globalTfr[y] != null)
    .map((y) => ({ year: y, label: `World ${globalTfr[y].toFixed(2)}` }));

  return (
    <div>
      <PageHeader
        title="Fertility Explorer"
        description="Total fertility rate (average births per woman) across the world. The replacement level is 2.1. Animate the map to watch the global fertility transition."
      />
      <div className="container space-y-8 py-8">
        <MapCard
          title="Global Fertility Map"
          description="Births per woman. Red = below replacement, blue = above. Drag the slider or press play."
          source="World Bank"
          frames={frames}
          unit="births/woman"
          decimals={2}
          scaleType="diverging"
          mid={2.1}
          frameStats={fertilityStats}
          height={540}
        />

        <FertilityMovers
          declines={changes.declines}
          increases={changes.increases}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fertility Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <ExplorerTable
              rows={ranking}
              unit="births/woman"
              decimals={2}
              valueLabel="Fertility"
              csvName="fertility-rankings"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
