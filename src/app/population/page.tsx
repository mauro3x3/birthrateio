import type { Metadata } from "next";
import Link from "next/link";
import { TopicShell } from "@/components/topic-shell";
import { SectionHeading } from "@/components/section-heading";
import { ExploreDestinationGrid } from "@/components/explore-destination-grid";
import { PopulationCalculator } from "@/components/population-calculator";
import { featuredById } from "@/lib/featured-destinations";
import {
  getIndicatorsUpdatedAt,
  getRanking,
  getWorldLatestValue,
} from "@/lib/queries";
import { SLUG } from "@/lib/indicators";
import { safe } from "@/lib/safe";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Population Explorer — World Population Rankings & Projections",
  description:
    "Population directory: share of world births, growth map, Europe change, rankings, and a growth calculator.",
  alternates: { canonical: "/population" },
};

export default async function PopulationPage() {
  const [popRanking, growthRanking, popAll, growthAll, updatedAt] =
    await Promise.all([
      safe(getRanking(SLUG.population, { order: "desc", limit: 15 }), []),
      safe(getRanking(SLUG.populationGrowth, { order: "desc", limit: 15 }), []),
      safe(getRanking(SLUG.population, { order: "desc" }), []),
      safe(getRanking(SLUG.populationGrowth, { order: "desc" }), []),
      safe(
        getIndicatorsUpdatedAt([SLUG.population, SLUG.populationGrowth]),
        null,
      ),
    ]);

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
  const worldGrowthLatest = await safe(
    getWorldLatestValue(SLUG.populationGrowth),
    null,
  );
  const worldPop = worldPopLatest?.value ?? 8_000_000_000;
  const worldGrowth = worldGrowthLatest?.value ?? 0.9;

  const charts = [
    featuredById("world-shares"),
    featuredById("birth-shares"),
  ].filter((d): d is NonNullable<typeof d> => d != null);

  const maps = [
    featuredById("population-growth"),
    featuredById("europe-change"),
    featuredById("region-compare"),
  ].filter((d): d is NonNullable<typeof d> => d != null);

  const tables = [
    featuredById("population-rankings"),
    featuredById("workers-retirees"),
  ].filter((d): d is NonNullable<typeof d> => d != null);

  return (
    <TopicShell
      title="Population"
      path="/population"
      updatedAt={updatedAt}
      description="Pick a chart or map — each tool is its own page. The growth timeline is no longer dumped on this hub."
      intro={
        <>
          <p>
            Population is a stock; growth is a flow. Fertility, mortality, and
            net migration all move the total, but age structure decides how many
            of those people are children, workers, or of retirement age. Two
            countries with the same headcount can face opposite pressures if one
            is a youth bulge and the other is a rectangle with a heavy top.
          </p>
          <p>
            This hub is a directory of explorers, not a single dump of every
            chart. Use share-of-world series for who will hold the next
            generation of births, the growth map for where stock is rising or
            falling, and the workers–retirees view for the pension arithmetic.
            Country profiles still carry the full national time series and UN
            projection variants.
          </p>
          <p>
            Figures come from World Bank and UN World Population Prospects
            unless a page names a national office. Projections are scenarios —
            medium is the conventional reference, not a promise. Definitions:{" "}
            <Link href="/glossary" className="link-editorial">
              glossary
            </Link>
            .
          </p>
        </>
      }
    >
      <section>
        <SectionHeading
          id="charts"
          title="Charts"
          description="Country shares of world people and babies — history and UN forecast."
          tocLabel="Charts"
        />
        <div className="mt-5">
          <ExploreDestinationGrid items={charts} />
        </div>
      </section>

      <section>
        <SectionHeading
          id="maps"
          title="Maps"
          description="Growth timeline, Europe change, and paint-your-own regions."
          tocLabel="Maps"
        />
        <div className="mt-5">
          <ExploreDestinationGrid items={maps} />
        </div>
      </section>

      <section>
        <SectionHeading
          id="tables"
          title="Rankings and ageing"
          description="League tables and the workers-vs-retirees projection."
          tocLabel="Tables"
        />
        <div className="mt-5">
          <ExploreDestinationGrid
            items={tables}
            className="sm:grid-cols-2 lg:grid-cols-2"
          />
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
            defaultGrowth={Number(Number(worldGrowth).toFixed(2))}
          />
        </div>
      </section>

      <section>
        <SectionHeading
          id="quick-rankings"
          title="Quick rankings"
          description={
            <>
              Top of the league tables. Full lists:{" "}
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
