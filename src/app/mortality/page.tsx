import type { Metadata } from "next";
import { TopicShell } from "@/components/topic-shell";
import { SectionHeading } from "@/components/section-heading";
import { MapCard } from "@/components/maps/map-card";
import { ExplorerTable } from "@/components/explorer-table";
import { RankingTable } from "@/components/ranking-table";
import { getIndicatorsUpdatedAt, getMapFrames, getRanking } from "@/lib/queries";
import { SLUG } from "@/lib/indicators";
import { safe } from "@/lib/safe";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Mortality Explorer — Life Expectancy & Historic Death Rates",
  description:
    "Explore life expectancy, under-five mortality and historic crude death rates as far back as Human Mortality Database and Our World in Data reconstructions allow.",
  alternates: { canonical: "/mortality" },
};

export default async function MortalityPage() {
  const [
    lifeFrames,
    lifeRanking,
    lifeAll,
    childFrames,
    childRanking,
    childLowest,
    historicDeathRanking,
    lifeFemale,
    lifeMale,
    infantRanking,
    infantAll,
    maternalRanking,
    suicideRanking,
    updatedAt,
  ] = await Promise.all([
    safe(getMapFrames(SLUG.lifeExpectancy, { step: 5, maxFrames: 40 }), []),
    safe(getRanking(SLUG.lifeExpectancy, { order: "desc", limit: 15 }), []),
    safe(getRanking(SLUG.lifeExpectancy, { order: "desc" }), []),
    safe(getMapFrames(SLUG.childMortality, { step: 5, maxFrames: 55 }), []),
    safe(getRanking(SLUG.childMortality, { order: "desc", limit: 10 }), []),
    safe(getRanking(SLUG.childMortality, { order: "asc", limit: 10 }), []),
    safe(getRanking(SLUG.historicDeathRate, { order: "desc", limit: 15 }), []),
    safe(getRanking(SLUG.lifeExpectancyFemale, { order: "desc" }), []),
    safe(getRanking(SLUG.lifeExpectancyMale, { order: "desc" }), []),
    safe(getRanking(SLUG.infantMortality, { order: "desc", limit: 10 }), []),
    safe(getRanking(SLUG.infantMortality, { order: "desc" }), []),
    safe(getRanking(SLUG.maternalMortality, { order: "desc", limit: 10 }), []),
    safe(getRanking(SLUG.suicideRate, { order: "desc", limit: 15 }), []),
    safe(
      getIndicatorsUpdatedAt([
        SLUG.lifeExpectancy,
        SLUG.deathRate,
        SLUG.childMortality,
        SLUG.historicDeathRate,
        SLUG.infantMortality,
        SLUG.maternalMortality,
        SLUG.suicideRate,
      ]),
      null,
    ),
  ]);

  // Female minus male life expectancy. Women outlive men everywhere; the width
  // of the gap is what varies, and it tracks male deaths from injury, alcohol
  // and smoking more than anything women do differently.
  const maleByIso3 = new Map(lifeMale.map((r) => [r.iso3, r.value]));
  const sexGap = lifeFemale
    .flatMap((f) => {
      const male = maleByIso3.get(f.iso3);
      return male == null ? [] : [{ ...f, value: f.value - male }];
    })
    .sort((a, b) => b.value - a.value);
  const widestGap = sexGap.slice(0, 12);
  const narrowestGap = sexGap.slice(-12).reverse();

  return (
    <TopicShell title="Mortality" path="/mortality" updatedAt={updatedAt}>
      <section>
        <MapCard
          id="life-expectancy-map"
          title="Life expectancy map"
          source="World Bank · OWID (pre-1960)"
          frames={lifeFrames}
          unit="years"
          decimals={1}
          scaleType="sequential"
          height={400}
        />
      </section>

      <section>
        <SectionHeading
          id="longevity-leaders"
          title="Longevity and historic death rates"
          tocLabel="Longevity leaders"
        />
        <div className="mt-5 grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Highest life expectancy
            </h3>
            <RankingTable
              rows={lifeRanking}
              unit="years"
              decimals={1}
              valueLabel="Life expectancy"
            
              linkTopic="mortality"
            />
          </div>
          <div>
            <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Highest historic death rates (HMD countries)
            </h3>
            {historicDeathRanking.length > 0 ? (
              <RankingTable
                rows={historicDeathRanking}
                unit="per 1,000"
                decimals={1}
                valueLabel="Death rate"
              
              linkTopic="mortality"
            />
            ) : (
              <p className="text-sm text-muted-foreground">
                Historic death-rate rankings appear after the HMD series is
                seeded.
              </p>
            )}
          </div>
        </div>
      </section>

      {sexGap.length > 0 && (
        <section>
          <SectionHeading
            id="sex-gap"
            title="The longevity gap between women and men"
            tocLabel="Female–male gap"
          />
          <div className="mt-5 grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Widest gap
              </h3>
              <RankingTable
                rows={widestGap}
                unit="years"
                decimals={1}
                valueLabel="Gap"
              
              linkTopic="mortality"
            />
            </div>
            <div>
              <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Narrowest gap
              </h3>
              <RankingTable
                rows={narrowestGap}
                unit="years"
                decimals={1}
                valueLabel="Gap"
              
              linkTopic="mortality"
            />
            </div>
          </div>
        </section>
      )}

      {(infantRanking.length > 0 || maternalRanking.length > 0) && (
        <section>
          <SectionHeading
            id="infant-maternal"
            title="Infant and maternal mortality"
            tocLabel="Infant & maternal"
          />
          <div className="mt-5 grid gap-8 lg:grid-cols-2">
            {infantRanking.length > 0 && (
              <div>
                <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Highest infant mortality
                </h3>
                <RankingTable
                  rows={infantRanking}
                  unit="per 1,000 births"
                  decimals={1}
                  valueLabel="Infant deaths"
                
              linkTopic="mortality"
            />
              </div>
            )}
            {maternalRanking.length > 0 && (
              <div>
                <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Highest maternal mortality
                </h3>
                <RankingTable
                  rows={maternalRanking}
                  unit="per 100,000 births"
                  decimals={0}
                  valueLabel="Maternal deaths"
                
              linkTopic="mortality"
            />
              </div>
            )}
          </div>
          {infantAll.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Infant mortality, every country
              </h3>
              <ExplorerTable
                rows={infantAll}
                unit="per 1,000 births"
                decimals={1}
                valueLabel="Infant mortality"
                csvName="infant-mortality-rankings"
              
              linkTopic="mortality"
            />
            </div>
          )}
        </section>
      )}

      {suicideRanking.length > 0 && (
        <section>
          <SectionHeading id="suicide" title="Suicide mortality" />
          <div className="mt-5">
            <RankingTable
              rows={suicideRanking}
              unit="per 100,000"
              decimals={1}
              valueLabel="Suicide rate"
            
              linkTopic="mortality"
            />
          </div>
        </section>
      )}

      {childFrames.length > 0 && (
        <section>
          <MapCard
            id="child-mortality-map"
            title="Under-five mortality map"
            source="Our World in Data (Gapminder · UN IGME)"
            frames={childFrames}
            unit="per 1,000 births"
            decimals={1}
            scaleType="sequential"
            height={400}
          />
        </section>
      )}

      {childRanking.length > 0 && (
        <section>
          <SectionHeading
            id="child-mortality-rankings"
            title="Under-five mortality extremes"
            tocLabel="Child mortality"
          />
          <div className="mt-5 grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Highest under-five mortality
              </h3>
              <RankingTable
                rows={childRanking}
                unit="per 1,000"
                decimals={1}
                valueLabel="U5MR"
              
              linkTopic="mortality"
            />
            </div>
            <div>
              <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Lowest under-five mortality
              </h3>
              <RankingTable
                rows={childLowest}
                unit="per 1,000"
                decimals={1}
                valueLabel="U5MR"
              
              linkTopic="mortality"
            />
            </div>
          </div>
        </section>
      )}

      <section>
        <SectionHeading
          id="life-expectancy-rankings"
          title="Life expectancy rankings"
          tocLabel="All countries ranked"
        />
        <div className="mt-5">
          <ExplorerTable
            rows={lifeAll}
            unit="years"
            decimals={1}
            valueLabel="Life expectancy"
            csvName="life-expectancy-rankings"
          
              linkTopic="mortality"
            />
        </div>
      </section>
    </TopicShell>
  );
}
