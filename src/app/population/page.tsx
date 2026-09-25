import type { Metadata } from "next";
import Link from "next/link";
import { TopicShell } from "@/components/topic-shell";
import { SectionHeading } from "@/components/section-heading";
import { ExplorerTable } from "@/components/explorer-table";
import { PopulationCalculator } from "@/components/population-calculator";
import { TimelineExplorer } from "@/components/maps/timeline-explorer";
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
    "Explore world population by country: rankings, growth rates, an animated population growth map, and a population growth calculator.",
  alternates: { canonical: "/population" },
};

export default async function PopulationPage() {
  const [
    growthFrames,
    popRanking,
    growthRanking,
    densityRanking,
    dependencyRanking,
    ruralRanking,
    urbanGrowthRanking,
    updatedAt,
  ] = await Promise.all([
    safe(getMapFrames(SLUG.populationGrowth, { step: 1, maxFrames: 60 }), []),
    safe(getRanking(SLUG.population, { order: "desc" }), []),
    safe(getRanking(SLUG.populationGrowth, { order: "desc" }), []),
    safe(getRanking(SLUG.populationDensity, { order: "desc" }), []),
    safe(getRanking(SLUG.ageDependencyRatio, { order: "desc" }), []),
    safe(getRanking(SLUG.ruralPopulation, { order: "desc" }), []),
    safe(getRanking(SLUG.urbanPopulationGrowth, { order: "desc" }), []),
    safe(
      getIndicatorsUpdatedAt([
        SLUG.population,
        SLUG.populationGrowth,
        SLUG.populationDensity,
        SLUG.ageDependencyRatio,
        SLUG.ruralPopulation,
        SLUG.urbanPopulationGrowth,
      ]),
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
    <TopicShell
      title="Population"
      path="/population"
      updatedAt={updatedAt}
      description="World population by country — rankings, growth rates, age structure, and an animated growth map."
      intro={
        <>
          <p>
            Population is a stock; growth is a flow. Fertility, mortality, and
            net migration all move the total, but age structure decides how many
            of those people are children, workers, or of retirement age. A
            country can grow in headcount while its workforce shrinks, or shrink
            while GDP per worker rises.
          </p>
          <p>
            The map below tracks annual population growth. Rankings and the
            calculator further down use the same World Bank / UN series as the
            country profiles. Medium-variant projections on country pages are
            scenarios — labelled as such — not official forecasts.
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
        <SectionHeading id="where-births-are" title="Where the births are" />
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Which countries make up a region’s people, and which make up its
          babies. A younger country can account for more of the births than of
          the residents.
        </p>
        <p className="mt-3">
          <Link href="/population/shares" className="link-editorial font-medium">
            Africa, Europe, Oceania, and the rest
          </Link>
        </p>
      </section>

      <section>
        <SectionHeading
          id="india-dots"
          title="India as population dots"
        />
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          WorldPop 2025 grid → MapLibre + PMTiles. Each glowing point is a
          modeled cluster of people; zoom in and the tiles stream without a
          tile server.
        </p>
        <p className="mt-3">
          <Link
            href="/population/india-dots"
            className="link-editorial font-medium"
          >
            Open the India population map
          </Link>
        </p>
      </section>

      <section>
        <SectionHeading
          id="europe-change"
          title="Europe: who grew, who shrank"
        />
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          GHSL population grids, 2000 vs 2025. Every inhabited cell is green
          (growth) or pink (decline) — cities and sunbelt coasts versus
          emptying interiors.
        </p>
        <p className="mt-3">
          <Link
            href="/population/europe-change"
            className="link-editorial font-medium"
          >
            Open the Europe change map
          </Link>
        </p>
      </section>

      <section>
        <SectionHeading
          id="compare-regions"
          title="Compare regions yourself"
        />
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Paint provinces, oblasts, or states into color groups, sum their
          populations, and download a social-ready image — the Far East vs
          northern China contrast, or your own.
        </p>
        <p className="mt-3">
          <Link
            href="/population/compare"
            className="link-editorial font-medium"
          >
            Open the region compare map
          </Link>
        </p>
      </section>

      <section>
        <SectionHeading id="growth-calculator" title="Growth calculator" />
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
          id="population-rankings"
          title="Population rankings"
          tocLabel="All countries ranked"
        />
        <div className="mt-5 grid gap-8 xl:grid-cols-2">
          <div>
            <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Most populous countries
            </h3>
            <ExplorerTable
              rows={popRanking}
              unit="people"
              decimals={0}
              valueLabel="Population"
              csvName="population-rankings"
            
              linkTopic="population"
            />
          </div>
          <div>
            <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Fastest population growth
            </h3>
            <ExplorerTable
              rows={growthRanking}
              unit="% annual"
              decimals={2}
              valueLabel="Growth"
              csvName="population-growth-rankings"
            
              linkTopic="population"
            />
          </div>
        </div>
      </section>

      {(densityRanking.length > 0 || dependencyRanking.length > 0) && (
        <section>
          <SectionHeading
            id="density-dependency"
            title="Density and dependency"
          />
          <div className="mt-5 grid gap-8 xl:grid-cols-2">
            {densityRanking.length > 0 && (
              <div>
                <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Highest population density
                </h3>
                <ExplorerTable
                  rows={densityRanking}
                  unit="per km²"
                  decimals={1}
                  valueLabel="Density"
                  csvName="population-density-rankings"
                
              linkTopic="population"
            />
              </div>
            )}
            {dependencyRanking.length > 0 && (
              <div>
                <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Highest age dependency ratio
                </h3>
                <ExplorerTable
                  rows={dependencyRanking}
                  unit="per 100"
                  decimals={1}
                  valueLabel="Dependency"
                  csvName="age-dependency-rankings"
                
              linkTopic="population"
            />
              </div>
            )}
          </div>
        </section>
      )}

      {(ruralRanking.length > 0 || urbanGrowthRanking.length > 0) && (
        <section>
          <SectionHeading id="urban-rural" title="Urban and rural" />
          <div className="mt-5 grid gap-8 xl:grid-cols-2">
            {ruralRanking.length > 0 && (
              <div>
                <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Most rural countries
                </h3>
                <ExplorerTable
                  rows={ruralRanking}
                  unit="% rural"
                  decimals={1}
                  valueLabel="Rural"
                  csvName="rural-population-rankings"
                
              linkTopic="population"
            />
              </div>
            )}
            {urbanGrowthRanking.length > 0 && (
              <div>
                <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Fastest urban growth
                </h3>
                <ExplorerTable
                  rows={urbanGrowthRanking}
                  unit="% annual"
                  decimals={2}
                  valueLabel="Urban growth"
                  csvName="urban-population-growth-rankings"
                
              linkTopic="population"
            />
              </div>
            )}
          </div>
        </section>
      )}
    </TopicShell>
  );
}
