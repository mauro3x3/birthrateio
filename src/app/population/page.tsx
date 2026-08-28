import type { Metadata } from "next";
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
