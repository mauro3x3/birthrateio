import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExplorerTable } from "@/components/explorer-table";
import { FertilityMovers } from "@/components/fertility-movers";
import { TimelineExplorer } from "@/components/maps/timeline-explorer";
import {
  getFertilityChanges,
  getMapFrames,
  getRanking,
  getWeightedGlobalByYear,
  getWorldByYear,
  getFertilityNowcasts,
} from "@/lib/queries";
import { FertilityNowcastTable } from "@/components/fertility-nowcast-table";
import { SLUG } from "@/lib/indicators";
import { safe } from "@/lib/safe";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Fertility Explorer — Global Fertility Rates & Trends",
  description:
    "Explore total fertility rates for every country. Interactive timeline map, 2026 provisional nowcast, rankings, and the biggest fertility movers.",
  alternates: { canonical: "/fertility" },
};

export default async function FertilityPage() {
  const [frames, ranking, changes, nowcasts] = await Promise.all([
    safe(getMapFrames(SLUG.fertility, { step: 1, maxFrames: 66 }), []),
    safe(getRanking(SLUG.fertility, { order: "desc" }), []),
    safe(getFertilityChanges(10, 8), { increases: [], declines: [] }),
    safe(getFertilityNowcasts("2026"), []),
  ]);

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

  const timelineFrames = frames.map((f) => ({
    year: f.year,
    data: f.data.map((d) => ({
      iso3: d.iso3,
      slug: d.slug,
      name: d.name,
      value: d.value,
      continent: d.continent,
    })),
  }));

  return (
    <div>
      <TimelineExplorer
        frames={timelineFrames}
        globalByYear={globalTfr}
        unit="births/woman"
        decimals={2}
        scaleType="diverging-dark"
        mid={2.1}
        source="World Bank"
        headline="Global"
        metricLabel="Births / woman"
      />

      <div className="container space-y-10 py-10">
        <FertilityMovers
          declines={changes.declines}
          increases={changes.increases}
        />

        {nowcasts.length > 0 && (
          <FertilityNowcastTable
            compiledBy={nowcasts[0]?.compiledBy ?? "BirthGauge"}
            compiledByUrl={nowcasts[0]?.compiledByUrl}
            sourceNote={
              nowcasts[0]?.sourceNote ??
              "National Statistical Offices or Ministries of Health / Interior"
            }
            rows={nowcasts.map((r) => ({
              label: r.label,
              iso3: r.iso3,
              slug: r.slug,
              countrySlug: r.country?.slug ?? null,
              flagEmoji: r.country?.flagEmoji ?? null,
              birthsPrior: r.birthsPrior,
              birthsCurrent: r.birthsCurrent,
              changePct: r.changePct,
              months: r.months,
              tfr2015: r.tfr2015,
              tfr2020: r.tfr2020,
              tfr2024: r.tfr2024,
              tfr2025: r.tfr2025,
              tfr2026: r.tfr2026,
              lessReliable: r.lessReliable,
              flags: r.flags,
            }))}
          />
        )}

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
