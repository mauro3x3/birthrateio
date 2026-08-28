import type { Metadata } from "next";
import { TopicShell } from "@/components/topic-shell";
import { SectionHeading } from "@/components/section-heading";
import { ExplorerTable } from "@/components/explorer-table";
import { TimelineExplorer } from "@/components/maps/timeline-explorer";
import {
  getIndicatorsUpdatedAt,
  getMapFrames,
  getRanking,
  getWeightedGlobalByYear,
  getWorldByYear,
} from "@/lib/queries";
import { SLUG } from "@/lib/indicators";
import { safe } from "@/lib/safe";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "GDP Explorer — Economic Output, GDP per Capita & Growth",
  description:
    "Explore GDP, GDP per capita and economic growth for every country. Rankings, an animated GDP-per-capita map and comparisons.",
  alternates: { canonical: "/gdp" },
};

export default async function GdpPage() {
  const [
    frames,
    gdpRanking,
    perCapita,
    growth,
    pppReal,
    realGdp,
    gniPerCapita,
    inflation,
    unemployment,
    updatedAt,
  ] = await Promise.all([
    safe(getMapFrames(SLUG.gdpPerCapita, { step: 1, maxFrames: 60 }), []),
    safe(getRanking(SLUG.gdp, { order: "desc" }), []),
    safe(getRanking(SLUG.gdpPerCapita, { order: "desc" }), []),
    safe(getRanking(SLUG.gdpGrowth, { order: "desc" }), []),
    safe(getRanking(SLUG.gdpPerCapitaPppReal, { order: "desc" }), []),
    safe(getRanking(SLUG.gdpReal, { order: "desc" }), []),
    safe(getRanking(SLUG.gniPerCapita, { order: "desc" }), []),
    safe(getRanking(SLUG.inflation, { order: "desc" }), []),
    safe(getRanking(SLUG.unemployment, { order: "desc" }), []),
    safe(
      getIndicatorsUpdatedAt([
        SLUG.gdp,
        SLUG.gdpPerCapita,
        SLUG.gdpGrowth,
        SLUG.gdpPerCapitaPppReal,
        SLUG.gdpReal,
        SLUG.gniPerCapita,
        SLUG.inflation,
        SLUG.unemployment,
      ]),
      null,
    ),
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
    <TopicShell
      title="GDP"
      path="/gdp"
      updatedAt={updatedAt}
      hero={
        <TimelineExplorer
          frames={timelineFrames}
          globalByYear={globalGdpPc}
          unit="US$"
          decimals={0}
          scaleType="sequential-log"
          source="World Bank"
          headline="Global"
          metricLabel="GDP / capita"
        />
      }
    >
      <section>
        <SectionHeading id="gdp-total" title="Largest economies" />
        <div className="mt-5">
          <ExplorerTable
            rows={gdpRanking}
            unit="US$"
            decimals={0}
            valueLabel="GDP"
            csvName="gdp-rankings"
          
              linkTopic="gdp"
            />
        </div>
      </section>

      <section>
        <SectionHeading
          id="gdp-per-capita"
          title="Output per person and growth"
          tocLabel="Per capita & growth"
        />
        <div className="mt-5 grid gap-8 xl:grid-cols-2">
          <div>
            <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              GDP per capita
            </h3>
            <ExplorerTable
              rows={perCapita}
              unit="US$"
              decimals={0}
              valueLabel="GDP/capita"
              csvName="gdp-per-capita-rankings"
            
              linkTopic="gdp"
            />
          </div>
          <div>
            <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              GDP growth
            </h3>
            <ExplorerTable
              rows={growth}
              unit="% annual"
              decimals={2}
              valueLabel="Growth"
              csvName="gdp-growth-rankings"
            
              linkTopic="gdp"
            />
          </div>
        </div>
      </section>

      {(pppReal.length > 0 || realGdp.length > 0) && (
        <section>
          <SectionHeading
            id="gdp-adjusted"
            title="Adjusted for inflation and price levels"
            tocLabel="Inflation & PPP adjusted"
          />
          <div className="mt-5 grid gap-8 xl:grid-cols-2">
            {pppReal.length > 0 && (
              <div>
                <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  GDP per capita, PPP (constant 2021 int&rsquo;l $)
                </h3>
                <ExplorerTable
                  rows={pppReal}
                  unit="int'l $"
                  decimals={0}
                  valueLabel="GDP/capita PPP"
                  csvName="gdp-per-capita-ppp-rankings"
                
              linkTopic="gdp"
            />
              </div>
            )}
            {realGdp.length > 0 && (
              <div>
                <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  GDP (constant 2015 US$)
                </h3>
                <ExplorerTable
                  rows={realGdp}
                  unit="US$"
                  decimals={0}
                  valueLabel="Real GDP"
                  csvName="gdp-real-rankings"
                
              linkTopic="gdp"
            />
              </div>
            )}
          </div>
        </section>
      )}

      {(gniPerCapita.length > 0 ||
        inflation.length > 0 ||
        unemployment.length > 0) && (
        <section>
          <SectionHeading
            id="income-prices"
            title="Income, prices and jobs"
            tocLabel="Income & prices"
          />
          <div className="mt-5 grid gap-8 xl:grid-cols-3">
            {gniPerCapita.length > 0 && (
              <div>
                <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  GNI per capita (Atlas)
                </h3>
                <ExplorerTable
                  rows={gniPerCapita}
                  unit="US$"
                  decimals={0}
                  valueLabel="GNI/capita"
                  csvName="gni-per-capita-rankings"
                
              linkTopic="gdp"
            />
              </div>
            )}
            {inflation.length > 0 && (
              <div>
                <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Inflation
                </h3>
                <ExplorerTable
                  rows={inflation}
                  unit="% annual"
                  decimals={1}
                  valueLabel="Inflation"
                  csvName="inflation-rankings"
                
              linkTopic="gdp"
            />
              </div>
            )}
            {unemployment.length > 0 && (
              <div>
                <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Unemployment
                </h3>
                <ExplorerTable
                  rows={unemployment}
                  unit="%"
                  decimals={1}
                  valueLabel="Unemployment"
                  csvName="unemployment-rankings"
                
              linkTopic="gdp"
            />
              </div>
            )}
          </div>
        </section>
      )}
    </TopicShell>
  );
}
