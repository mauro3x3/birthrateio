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
    <TopicShell
      title="Mortality"
      description="Life expectancy, child mortality, and long-run death rates. Deep historical series come from the Human Mortality Database and Our World in Data reconstructions."
      path="/mortality"
      updatedAt={updatedAt}
    >
      <section>
        <MapCard
          id="life-expectancy-map"
          title="Life expectancy map"
          description="Years at birth. Darker = longer lives. Animate to see the modern mortality transition."
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
          description="Where people live longest today, alongside the highest death rates recorded in countries with long vital-registration series."
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
            description="Female life expectancy minus male, in years. Women outlive men in every country with data; only the size of the gap varies."
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
          <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            The widest gaps cluster in the former Soviet Union, where male
            mortality from injury, alcohol and cardiovascular disease is high at
            working ages. The narrowest appear in West Africa, where maternal
            mortality still cuts into the advantage women hold elsewhere, and in
            the Gulf states, where a resident population dominated by young male
            labour migrants pulls measured male mortality down.
          </p>
        </section>
      )}

      {(infantRanking.length > 0 || maternalRanking.length > 0) && (
        <section>
          <SectionHeading
            id="infant-maternal"
            title="Infant and maternal mortality"
            tocLabel="Infant & maternal"
            description="Deaths in the first year of life, and deaths from causes related to pregnancy and childbirth."
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
          <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Infant mortality is unusually sensitive to registration practice.
            Countries that record extremely premature births as live births
            rather than stillbirths report higher rates for identical medical
            outcomes, which accounts for part of the gap between the United
            States and Western Europe.
          </p>
        </section>
      )}

      {suicideRanking.length > 0 && (
        <section>
          <SectionHeading
            id="suicide"
            title="Suicide mortality"
            description="Age-standardised suicide deaths per 100,000 people, WHO estimates. Classification depends on legal and religious context as well as medicine, and undercounting is thought to be substantial in some countries."
          />
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
            description="Deaths before age 5 per 1,000 live births. Historical reconstructions reach the 18th century for some countries."
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
            description="The countries where a child is most and least likely to die before their fifth birthday."
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
          description="Every country ranked by life expectancy at birth. Filter by region or download the table as CSV."
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

      <p className="text-xs leading-relaxed text-muted-foreground">
        Early life-expectancy and child-mortality figures are historical
        reconstructions and may use national borders that differ from today
        (England, for example, is mapped to the United Kingdom). Country pages
        show the longest available series for each indicator.
      </p>
    </TopicShell>
  );
}
