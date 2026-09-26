import type { Metadata } from "next";
import Link from "next/link";
import { TopicShell } from "@/components/topic-shell";
import { SectionHeading } from "@/components/section-heading";
import { ExploreDestinationGrid } from "@/components/explore-destination-grid";
import { PopulationCalculator } from "@/components/population-calculator";
import { TimelineExplorer } from "@/components/maps/timeline-explorer";
import { featuredById } from "@/lib/featured-destinations";
import {
  getIndicatorsUpdatedAt,
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
    "World population hub: growth map, share of world births, India dots, Europe change, rankings, and a growth calculator.",
  alternates: { canonical: "/population" },
};

export default async function PopulationPage() {
  const [growthFrames, popRanking, growthRanking, popAll, growthAll, updatedAt] =
    await Promise.all([
      safe(getMapFrames(SLUG.populationGrowth, { step: 1, maxFrames: 60 }), []),
      safe(getRanking(SLUG.population, { order: "desc", limit: 15 }), []),
      safe(getRanking(SLUG.populationGrowth, { order: "desc", limit: 15 }), []),
      safe(getRanking(SLUG.population, { order: "desc" }), []),
      safe(getRanking(SLUG.populationGrowth, { order: "desc" }), []),
      safe(
        getIndicatorsUpdatedAt([SLUG.population, SLUG.populationGrowth]),
        null,
      ),
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

  // Calculator needs broader coverage than the hub top-15 preview.
  const growthAllBySlug = new Map(growthAll.map((r) => [r.slug, r]));
  const calcCountries = popAll
    .map((p) => {
      const g = growthAllBySlug.get(p.slug);
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

  const destinations = [
    featuredById("world-shares"),
    featuredById("birth-shares"),
    featuredById("india-dots"),
    featuredById("europe-change"),
    featuredById("region-compare"),
    featuredById("population-rankings"),
  ].filter((d): d is NonNullable<typeof d> => d != null);

  return (
    <TopicShell
      title="Population"
      path="/population"
      updatedAt={updatedAt}
      description="World population by country — pick a map or chart below, or scrub the growth timeline."
      intro={
        <>
          <p>
            Population is a stock; growth is a flow. Fertility, mortality, and
            net migration all move the total, but age structure decides how many
            of those people are children, workers, or of retirement age.
          </p>
          <p>
            Use the cards for dedicated explorers (world shares, India dots,
            Europe change). Rankings and denser tables live on their own page so
            this hub stays scannable.
          </p>
        </>
      }
      hero={
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
      }
    >
      <section>
        <SectionHeading
          id="explorers"
          title="Maps and charts"
          description="Each tool is its own page — open one instead of scrolling forever."
          tocLabel="Explorers"
        />
        <div className="mt-5">
          <ExploreDestinationGrid items={destinations} />
        </div>
      </section>

      <section>
        <SectionHeading
          id="growth-calculator"
          title="Growth calculator"
          description="Compound today’s stock at a constant annual rate — illustrative, not a projection."
        />
        <div className="mt-5">
          <PopulationCalculator
            countries={calcCountries}
            defaultPopulation={Math.round(worldPop)}
            defaultGrowth={Number(worldGrowth.toFixed(2))}
          />
        </div>
      </section>

      <section>
        <SectionHeading
          id="quick-rankings"
          title="Quick rankings"
          description={
            <>
              Top of the league tables. Full density, dependency, rural, and
              urban lists:{" "}
              <Link href="/population/rankings" className="link-editorial">
                all population rankings
              </Link>
              .
            </>
          }
        />
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <div className="border border-border p-4">
            <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Most populous
            </h3>
            <ol className="mt-3 space-y-1.5 text-sm">
              {popRanking.slice(0, 8).map((r, i) => (
                <li key={r.slug} className="flex justify-between gap-3">
                  <Link
                    href={`/population/${r.slug}`}
                    className="min-w-0 truncate link-editorial"
                  >
                    <span className="mr-1.5 tabular-nums text-muted-foreground">
                      {i + 1}.
                    </span>
                    {r.flagEmoji ? `${r.flagEmoji} ` : ""}
                    {r.name}
                  </Link>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {(r.value / 1e9).toFixed(2)}B
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="border border-border p-4">
            <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Fastest growth
            </h3>
            <ol className="mt-3 space-y-1.5 text-sm">
              {growthRanking.slice(0, 8).map((r, i) => (
                <li key={r.slug} className="flex justify-between gap-3">
                  <Link
                    href={`/population/${r.slug}`}
                    className="min-w-0 truncate link-editorial"
                  >
                    <span className="mr-1.5 tabular-nums text-muted-foreground">
                      {i + 1}.
                    </span>
                    {r.flagEmoji ? `${r.flagEmoji} ` : ""}
                    {r.name}
                  </Link>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {r.value.toFixed(1)}%
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </TopicShell>
  );
}
