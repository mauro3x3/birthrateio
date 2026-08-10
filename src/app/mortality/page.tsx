import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { MapCard } from "@/components/maps/map-card";
import { ExplorerTable } from "@/components/explorer-table";
import { RankingTable } from "@/components/ranking-table";
import { getMapFrames, getRanking } from "@/lib/queries";
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
  ] = await Promise.all([
    safe(getMapFrames(SLUG.lifeExpectancy, { step: 5, maxFrames: 40 }), []),
    safe(getRanking(SLUG.lifeExpectancy, { order: "desc", limit: 15 }), []),
    safe(getRanking(SLUG.lifeExpectancy, { order: "desc" }), []),
    safe(getMapFrames(SLUG.childMortality, { step: 5, maxFrames: 55 }), []),
    safe(getRanking(SLUG.childMortality, { order: "desc", limit: 10 }), []),
    safe(getRanking(SLUG.childMortality, { order: "asc", limit: 10 }), []),
    safe(getRanking(SLUG.historicDeathRate, { order: "desc", limit: 15 }), []),
  ]);

  return (
    <div>
      <PageHeader
        title="Mortality Explorer"
        description="Life expectancy, child mortality and long-run crude death rates. Pre-1960 life expectancy and deep historical series come from Our World in Data and the Human Mortality Database; recent life expectancy also uses World Bank WDI."
      />
      <div className="container space-y-8 py-8">
        <MapCard
          title="Life expectancy map"
          description="Years at birth. Darker = longer lives. Animate to see the modern mortality transition."
          source="World Bank · OWID (pre-1960)"
          frames={lifeFrames}
          unit="years"
          decimals={1}
          scaleType="sequential"
          height={400}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Highest life expectancy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RankingTable
                rows={lifeRanking}
                unit="years"
                decimals={1}
                valueLabel="Life expectancy"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Highest historic death rates (HMD countries)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historicDeathRanking.length > 0 ? (
                <RankingTable
                  rows={historicDeathRanking}
                  unit="per 1,000"
                  decimals={1}
                  valueLabel="Death rate"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Historic death-rate rankings appear after the HMD series is
                  seeded.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {childFrames.length > 0 && (
          <MapCard
            title="Under-five mortality map"
            description="Deaths before age 5 per 1,000 live births. Historical reconstructions reach the 18th century for some countries."
            source="Our World in Data (Gapminder · UN IGME)"
            frames={childFrames}
            unit="per 1,000 births"
            decimals={1}
            scaleType="sequential"
            height={400}
          />
        )}

        {childRanking.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Highest under-five mortality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RankingTable
                  rows={childRanking}
                  unit="per 1,000"
                  decimals={1}
                  valueLabel="U5MR"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Lowest under-five mortality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RankingTable
                  rows={childLowest}
                  unit="per 1,000"
                  decimals={1}
                  valueLabel="U5MR"
                />
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">All countries — life expectancy</CardTitle>
          </CardHeader>
          <CardContent>
            <ExplorerTable
              rows={lifeAll}
              unit="years"
              decimals={1}
              valueLabel="Life expectancy"
              csvName="life-expectancy-rankings"
            />
          </CardContent>
        </Card>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Crude death rates are not age-standardized — ageing populations can
          raise the crude rate even as age-specific mortality falls. Early
          life-expectancy and child-mortality figures are historical
          reconstructions and may use national borders that differ from today
          (e.g. England mapped to the United Kingdom). Country pages show the
          longest available series for each indicator.
        </p>
      </div>
    </div>
  );
}
