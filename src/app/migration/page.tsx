import type { Metadata } from "next";
import { TopicShell } from "@/components/topic-shell";
import { SectionHeading } from "@/components/section-heading";
import { MapCard } from "@/components/maps/map-card";
import { ExplorerTable } from "@/components/explorer-table";
import { RankingTable } from "@/components/ranking-table";
import {
  getIndicatorsUpdatedAt,
  getMapFrames,
  getRanking,
} from "@/lib/queries";
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
    updatedAt,
  ] = await Promise.all([
    safe(getMapFrames(SLUG.netMigration, { step: 1, maxFrames: 66 }), []),
    safe(getRanking(SLUG.netMigration, { order: "desc" }), []),
    safe(getRanking(SLUG.netMigration, { order: "desc", limit: 10 }), []),
    safe(getRanking(SLUG.netMigration, { order: "asc", limit: 10 }), []),
    safe(getMapFrames(SLUG.migrantStockShare, { step: 5, maxFrames: 12 }), []),
    safe(getRanking(SLUG.migrantStock, { order: "desc", limit: 10 }), []),
    safe(
      getIndicatorsUpdatedAt([
        SLUG.netMigration,
        SLUG.migrantStock,
        SLUG.migrantStockShare,
      ]),
      null,
    ),
  ]);

  return (
    <TopicShell title="Migration" path="/migration" updatedAt={updatedAt}>
      <section>
        <MapCard
          id="net-migration-map"
          title="Net migration map"
          source="World Bank"
          frames={frames}
          unit="people"
          decimals={0}
          scaleType="diverging"
          mid={0}
          height={400}
        />
      </section>

      <section>
        <SectionHeading
          id="destinations-and-origins"
          title="Largest destinations and origins"
          tocLabel="Destinations & origins"
        />
        <div className="mt-5 grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Top immigration destinations
            </h3>
            <RankingTable
              rows={topImmigration}
              unit="people"
              decimals={0}
              valueLabel="Net migration"
            
              linkTopic="migration"
            />
          </div>
          <div>
            <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Top emigration countries
            </h3>
            <RankingTable
              rows={topEmigration}
              unit="people"
              decimals={0}
              valueLabel="Net migration"
            
              linkTopic="migration"
            />
          </div>
        </div>
      </section>

      <section>
        <SectionHeading
          id="net-migration-rankings"
          title="Net migration rankings"
          tocLabel="All countries ranked"
        />
        <div className="mt-5">
          <ExplorerTable
            rows={ranking}
            unit="people"
            decimals={0}
            valueLabel="Net migration"
            csvName="migration-rankings"
          
              linkTopic="migration"
            />
        </div>
      </section>

      {foreignBornFrames.length > 0 && (
        <section>
          <SectionHeading
            id="foreign-born"
            title="Foreign-born population"
            tocLabel="Foreign-born population"
          />
          <div className="mt-5 space-y-8">
            <MapCard
              title="Foreign-born share of population"
              source="World Bank / UN DESA"
              frames={foreignBornFrames}
              unit="%"
              decimals={1}
              scaleType="sequential"
              height={400}
            />

            {foreignBornTop.length > 0 && (
              <div>
                <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Largest foreign-born populations
                </h3>
                <RankingTable
                  rows={foreignBornTop}
                  unit="people"
                  decimals={0}
                  valueLabel="Foreign-born"
                
              linkTopic="migration"
            />
              </div>
            )}
          </div>
        </section>
      )}
    </TopicShell>
  );
}
