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
      description="How many people live in each country, how fast that number is changing, and the age structure underneath it."
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
        <SectionHeading
          id="growth-calculator"
          title="Growth calculator"
          description="Compound a starting population forward at a constant growth rate. Illustrative only — it holds the rate fixed, which no real population does."
        />
        <div className="mt-5 space-y-2">
          <PopulationCalculator
            countries={calcCountries}
            defaultPopulation={Math.round(worldPop)}
            defaultGrowth={Number(worldGrowth.toFixed(2))}
          />
          <p className="text-xs text-muted-foreground">
            For projections that account for age structure, fertility and
            migration, use the{" "}
            <Link href="/simulator" className="link-editorial">
              demographic simulator
            </Link>
            .
          </p>
        </div>
      </section>

      <section>
        <SectionHeading
          id="population-rankings"
          title="Population rankings"
          tocLabel="All countries ranked"
          description="Every country by total population and by annual growth rate. Filter by region or download as CSV."
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
            />
          </div>
        </div>
      </section>

      {(densityRanking.length > 0 || dependencyRanking.length > 0) && (
        <section>
          <SectionHeading
            id="density-dependency"
            title="Density and dependency"
            description="How tightly packed a population is, and how many children and pensioners each working-age person supports."
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
                />
              </div>
            )}
          </div>
          <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            A high dependency ratio can mean many children or many pensioners —
            fiscally opposite situations. Niger and Japan sit near each other on
            this measure for entirely different reasons, so read it alongside the
            age-structure shares on each country page.
          </p>
        </section>
      )}

      {(ruralRanking.length > 0 || urbanGrowthRanking.length > 0) && (
        <section>
          <SectionHeading
            id="urban-rural"
            title="Urban and rural"
            description="Where people live, and how fast cities are absorbing them."
          />
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
                />
              </div>
            )}
          </div>
          <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Each country sets its own definition of &ldquo;urban&rdquo;, so the
            rural share is best read within a country over time. Urban growth
            also rises when the authorities reclassify a village as a town, with
            nobody moving house.
          </p>
        </section>
      )}
    </TopicShell>
  );
}
