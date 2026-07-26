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
  title: "Migration Explorer — Net Migration Trends & Rankings",
  description:
    "Explore global migration: net migration by country, top immigration and emigration destinations, historical trends and an animated migration map.",
  alternates: { canonical: "/migration" },
};

export default async function MigrationPage() {
  const [
    frames,
    ranking,
    topImmigration,
    topEmigration,
    foreignBornFrames,
    foreignBornTop,
  ] = await Promise.all([
    safe(getMapFrames(SLUG.netMigration, { step: 1, maxFrames: 66 }), []),
    safe(getRanking(SLUG.netMigration, { order: "desc" }), []),
    safe(getRanking(SLUG.netMigration, { order: "desc", limit: 10 }), []),
    safe(getRanking(SLUG.netMigration, { order: "asc", limit: 10 }), []),
    safe(getMapFrames(SLUG.migrantStockShare, { step: 5, maxFrames: 12 }), []),
    safe(getRanking(SLUG.migrantStock, { order: "desc", limit: 10 }), []),
  ]);

  return (
    <div>
      <PageHeader
        title="Migration Explorer"
        description="Net migration (immigrants minus emigrants) by country. Positive values indicate net immigration; negative values net emigration."
      />
      <div className="container space-y-8 py-8">
        <MapCard
          title="Net Migration Map"
          description="Net migrants per year. Blue = net immigration, red = net emigration."
          source="World Bank"
          frames={frames}
          unit="people"
          decimals={0}
          scaleType="diverging"
          mid={0}
          height={540}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Top Immigration Destinations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RankingTable
                rows={topImmigration}
                unit="people"
                decimals={0}
                valueLabel="Net migration"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Emigration Countries</CardTitle>
            </CardHeader>
            <CardContent>
              <RankingTable
                rows={topEmigration}
                unit="people"
                decimals={0}
                valueLabel="Net migration"
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Net Migration Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <ExplorerTable
              rows={ranking}
              unit="people"
              decimals={0}
              valueLabel="Net migration"
              csvName="migration-rankings"
            />
          </CardContent>
        </Card>

        {foreignBornFrames.length > 0 && (
          <div className="space-y-8 border-t pt-8">
            <div className="space-y-1">
              <h2 className="text-xl">Foreign-born population &amp; diasporas</h2>
              <p className="text-sm text-muted-foreground">
                How large the immigrant (foreign-born) population is in each
                country — its size and how fast it has grown over time.
              </p>
            </div>

            <MapCard
              title="Foreign-born Share Map"
              description="Foreign-born residents as a share of the total population. Darker = a larger immigrant / diaspora share."
              source="World Bank / UN DESA"
              frames={foreignBornFrames}
              unit="%"
              decimals={1}
              scaleType="sequential"
              height={540}
            />

            {foreignBornTop.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Largest Foreign-born Populations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RankingTable
                    rows={foreignBornTop}
                    unit="people"
                    decimals={0}
                    valueLabel="Foreign-born"
                  />
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
