import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { ExplorerTable } from "@/components/explorer-table";
import {
  getIndicatorsUpdatedAt,
  getRanking,
} from "@/lib/queries";
import { SLUG } from "@/lib/indicators";
import { safe } from "@/lib/safe";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Population rankings — Size, growth, density & urbanisation",
  description:
    "Country rankings for population, growth, density, age dependency, rural share, and urban population growth.",
  alternates: { canonical: "/population/rankings" },
};

export default async function PopulationRankingsPage() {
  const [
    popRanking,
    growthRanking,
    densityRanking,
    dependencyRanking,
    ruralRanking,
    urbanGrowthRanking,
    updatedAt,
  ] = await Promise.all([
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

  return (
    <div>
      <PageHeader
        title="Population rankings"
        description="Size, growth, density, dependency, and urban–rural structure — World Bank / UN series used across birthrate.io."
      >
        {updatedAt ? (
          <p className="text-xs text-muted-foreground">
            Updated {new Date(updatedAt).toISOString().slice(0, 10)}
          </p>
        ) : null}
      </PageHeader>

      <div className="container space-y-14 py-8">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Back to the{" "}
          <Link href="/population" className="link-editorial">
            population hub
          </Link>
          {" · "}
          <Link href="/population/world-shares" className="link-editorial">
            share of world
          </Link>
          .
        </p>

        <section>
          <SectionHeading
            id="size-growth"
            title="Size and growth"
            tocLabel="Size & growth"
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
      </div>
    </div>
  );
}
