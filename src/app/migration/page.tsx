import type { Metadata } from "next";
import Link from "next/link";
import { TopicShell } from "@/components/topic-shell";
import { SectionHeading } from "@/components/section-heading";
import { MapCard } from "@/components/maps/map-card";
import { EuIllegalPresenceFlow } from "@/components/maps/eu-illegal-presence-flow";
import { ExplorerTable } from "@/components/explorer-table";
import { RankingTable } from "@/components/ranking-table";
import { MigrationExtraCharts } from "@/components/migration-extra-charts";
import { CollapsibleSection } from "@/components/collapsible-section";
import { StatCard } from "@/components/stat-card";
import {
  getIndicatorsUpdatedAt,
  getMapFrames,
  getRanking,
} from "@/lib/queries";
import { SLUG } from "@/lib/indicators";
import { safe } from "@/lib/safe";
import { prisma } from "@/lib/prisma";
import { getFrontexLatest } from "@/lib/sources/frontex-detections-data";
import { getIomMissingMigrantsLatest } from "@/lib/sources/iom-missing-migrants-data";
import { formatCompact } from "@/lib/utils";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Migration Explorer — Net Migration, Refugees & Border Data",
  description:
    "Learn how migration works with clear maps: net migration, foreign-born stocks, UNHCR refugees, and EU detections — each series labelled for what it can and cannot tell you.",
  alternates: { canonical: "/migration" },
};

const CHAPTERS = [
  { href: "#who-moves", label: "1. Who moves" },
  { href: "#who-lives-abroad", label: "2. Who lives abroad" },
  { href: "#refugees-asylum", label: "3. Refugees" },
  { href: "#eu-detections", label: "4. EU detections" },
  { href: "#europe-more", label: "5. Europe more" },
] as const;

export default async function MigrationPage() {
  const [
    frames,
    ranking,
    topImmigration,
    topEmigration,
    foreignBornFrames,
    foreignBornTop,
    refugeeFrames,
    refugees,
    refugeesAll,
    asylumSeekers,
    refugeeShare,
    orderedToLeave,
    returnedAfterOrder,
    returnRate,
    lfprNat,
    lfprFor,
    irregularStock,
    frontex,
    iom,
    updatedAt,
  ] = await Promise.all([
    safe(getMapFrames(SLUG.netMigration, { step: 1, maxFrames: 66 }), []),
    safe(getRanking(SLUG.netMigration, { order: "desc" }), []),
    safe(getRanking(SLUG.netMigration, { order: "desc", limit: 10 }), []),
    safe(getRanking(SLUG.netMigration, { order: "asc", limit: 10 }), []),
    safe(getMapFrames(SLUG.migrantStockShare, { step: 5, maxFrames: 12 }), []),
    safe(getRanking(SLUG.migrantStock, { order: "desc", limit: 10 }), []),
    safe(getMapFrames(SLUG.refugees, { step: 1, maxFrames: 20 }), []),
    safe(getRanking(SLUG.refugees, { order: "desc", limit: 15 }), []),
    safe(getRanking(SLUG.refugees, { order: "desc" }), []),
    safe(getRanking(SLUG.asylumSeekers, { order: "desc", limit: 15 }), []),
    safe(getRanking(SLUG.refugeeShareOfMigrants, { order: "desc", limit: 15 }), []),
    safe(getRanking(SLUG.orderedToLeave, { order: "desc", limit: 15 }), []),
    safe(getRanking(SLUG.returnedAfterOrder, { order: "desc", limit: 15 }), []),
    safe(getRanking(SLUG.returnRate, { order: "asc", limit: 15 }), []),
    safe(getRanking(SLUG.lfprNationals, { order: "desc", limit: 15 }), []),
    safe(getRanking(SLUG.lfprForeignCitizens, { order: "desc", limit: 15 }), []),
    safe(getRanking(SLUG.irregularMigrantStock, { order: "desc", limit: 20 }), []),
    safe(getFrontexLatest(prisma), null),
    safe(getIomMissingMigrantsLatest(prisma), null),
    safe(
      getIndicatorsUpdatedAt([
        SLUG.netMigration,
        SLUG.migrantStock,
        SLUG.migrantStockShare,
        SLUG.refugees,
        SLUG.orderedToLeave,
      ]),
      null,
    ),
  ]);

  const topIn = topImmigration[0];
  const topOut = topEmigration[0];
  const topRefugee = refugees[0];
  const topForeign = foreignBornTop[0];

  return (
    <TopicShell
      title="Migration"
      path="/migration"
      updatedAt={updatedAt}
      description="Four different questions — net flow, who already lives abroad, who has refugee status, and EU detections — each with its own map and caveats."
      intro={
        <>
          <p>
            Migration is easy to argue about and hard to measure. This page
            separates the series people usually mix up:{" "}
            <strong className="font-medium text-foreground">net migration</strong>{" "}
            (arrivals minus departures in one year),{" "}
            <strong className="font-medium text-foreground">foreign-born stock</strong>{" "}
            (residents born abroad),{" "}
            <strong className="font-medium text-foreground">refugees</strong>{" "}
            (UNHCR protection status), and{" "}
            <strong className="font-medium text-foreground">EU detections</strong>{" "}
            (people found illegally present — not a global stock).
          </p>
          <nav
            aria-label="Chapters"
            className="flex flex-wrap gap-x-3 gap-y-2 pt-1 text-sm"
          >
            {CHAPTERS.map((c) => (
              <a
                key={c.href}
                href={c.href}
                className="link-editorial font-medium text-primary"
              >
                {c.label}
              </a>
            ))}
          </nav>
        </>
      }
    >
      {(topIn || topOut || topRefugee || topForeign) && (
        <section aria-label="Latest snapshots" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {topIn && (
            <StatCard
              label="Largest net inflow"
              value={
                <>
                  {topIn.flagEmoji ?? ""} {topIn.name}
                </>
              }
              sub={`${formatCompact(topIn.value)} · ${topIn.year}`}
            />
          )}
          {topOut && (
            <StatCard
              label="Largest net outflow"
              value={
                <>
                  {topOut.flagEmoji ?? ""} {topOut.name}
                </>
              }
              sub={`${formatCompact(topOut.value)} · ${topOut.year}`}
            />
          )}
          {topRefugee && (
            <StatCard
              label="Largest refugee host"
              value={
                <>
                  {topRefugee.flagEmoji ?? ""} {topRefugee.name}
                </>
              }
              sub={`${formatCompact(topRefugee.value)} · UNHCR ${topRefugee.year}`}
            />
          )}
          {topForeign && (
            <StatCard
              label="Largest foreign-born stock"
              value={
                <>
                  {topForeign.flagEmoji ?? ""} {topForeign.name}
                </>
              }
              sub={`${formatCompact(topForeign.value)} · ${topForeign.year}`}
            />
          )}
        </section>
      )}

      {/* ── 1. Who moves ───────────────────────────────────────── */}
      <section className="space-y-5">
        <SectionHeading
          id="who-moves"
          title="1. Who moves — net migration"
          tocLabel="Who moves"
          description="Immigrants minus emigrants in a year. Teal countries gained people on net; copper lost them. A small net can hide large flows both ways."
        />
        <MapCard
          id="net-migration-map"
          title="Net migration over time"
          description="Play the timeline. Hover a country for the figure."
          source="World Bank"
          frames={frames}
          unit="people"
          decimals={0}
          scaleType="diverging"
          mid={0}
          height={440}
          appearance="light"
        />
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Top destinations (net inflow)
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
              Top origins (net outflow)
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
        <CollapsibleSection title="All countries — net migration table">
          <ExplorerTable
            rows={ranking}
            unit="people"
            decimals={0}
            valueLabel="Net migration"
            csvName="migration-rankings"
            linkTopic="migration"
          />
        </CollapsibleSection>
      </section>

      {/* ── 2. Who lives abroad ────────────────────────────────── */}
      {foreignBornFrames.length > 0 && (
        <section className="space-y-5">
          <SectionHeading
            id="who-lives-abroad"
            title="2. Who lives abroad — foreign-born stock"
            tocLabel="Who lives abroad"
            description="Share of residents born in another country. This is a stock (people already there), not this year’s arrivals."
          />
          <MapCard
            id="foreign-born-map"
            title="Foreign-born share of population"
            description="Darker = higher share. Gulf states and small high-income hubs often lead."
            source="World Bank / UN DESA"
            frames={foreignBornFrames}
            unit="%"
            decimals={1}
            scaleType="sequential"
            height={440}
            appearance="light"
          />
          {foreignBornTop.length > 0 && (
            <div className="max-w-xl">
              <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Largest foreign-born populations (people)
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
        </section>
      )}

      {/* ── 3. Refugees ────────────────────────────────────────── */}
      {(refugees.length > 0 ||
        asylumSeekers.length > 0 ||
        refugeeFrames.length > 0) && (
        <section className="space-y-5">
          <SectionHeading
            id="refugees-asylum"
            title="3. Refugees & asylum-seekers"
            tocLabel="Refugees"
            description="UNHCR end-year stocks by country of asylum — where people are hosted, not where they fled from. Not the same as foreign-born or net migration."
          />
          {refugeeFrames.length > 0 && (
            <MapCard
              id="refugees-map"
              title="Refugee stock by country of asylum"
              description="Play the years. Neighbours of conflict zones and a few large European hosts dominate."
              source="UNHCR"
              frames={refugeeFrames}
              unit="people"
              decimals={0}
              scaleType="sequential-log"
              height={440}
              appearance="light"
            />
          )}
          <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
            {refugees.length > 0 && (
              <div>
                <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Largest refugee stocks
                </h3>
                <RankingTable
                  rows={refugees}
                  unit="people"
                  decimals={0}
                  valueLabel="Refugees"
                  linkTopic="migration"
                />
              </div>
            )}
            {asylumSeekers.length > 0 && (
              <div>
                <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Largest asylum-seeker stocks
                </h3>
                <RankingTable
                  rows={asylumSeekers}
                  unit="people"
                  decimals={0}
                  valueLabel="Asylum-seekers"
                  linkTopic="migration"
                />
              </div>
            )}
            {refugeeShare.length > 0 && (
              <div>
                <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Refugees as share of migrant stock
                </h3>
                <RankingTable
                  rows={refugeeShare}
                  unit="%"
                  decimals={1}
                  valueLabel="Share"
                  linkTopic="migration"
                />
              </div>
            )}
          </div>
          {refugeesAll.length > 0 && (
            <CollapsibleSection title="All countries — refugee stock table">
              <ExplorerTable
                rows={refugeesAll}
                unit="people"
                decimals={0}
                valueLabel="Refugees"
                csvName="unhcr-refugees"
                linkTopic="migration"
              />
            </CollapsibleSection>
          )}
        </section>
      )}

      {/* ── 4. EU detections (shareable) ───────────────────────── */}
      <section className="space-y-4">
        <SectionHeading
          id="eu-detections"
          title="4. EU detections — who was found illegally present"
          tocLabel="EU detections"
          description="Eurostat only. Annual counts by citizenship of third-country nationals detected by authorities in the EU-27. Not a world map, not a stock of unauthorised residents — use it to see how origin mix shifted since 2008."
        />
        <EuIllegalPresenceFlow />
      </section>

      {/* ── 5. Europe more ─────────────────────────────────────── */}
      <section className="space-y-8">
        <SectionHeading
          id="europe-more"
          title="5. More Europe — returns, work, borders"
          tocLabel="Europe more"
          description="Enforcement and labour series for EU/EFTA reporters. Useful for Europe; not a global ranking."
        />

        {(orderedToLeave.length > 0 || returnedAfterOrder.length > 0) && (
          <div className="space-y-4">
            <h3 className="font-serif text-base font-semibold text-primary">
              Orders to leave & returns
            </h3>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Return rate is returns ÷ orders in the same year — not a matched
              cohort.
            </p>
            <div className="grid gap-8 lg:grid-cols-3">
              {orderedToLeave.length > 0 && (
                <div>
                  <h4 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Most ordered to leave
                  </h4>
                  <RankingTable
                    rows={orderedToLeave}
                    unit="people"
                    decimals={0}
                    valueLabel="Orders"
                    linkTopic="migration"
                  />
                </div>
              )}
              {returnedAfterOrder.length > 0 && (
                <div>
                  <h4 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Most returned after order
                  </h4>
                  <RankingTable
                    rows={returnedAfterOrder}
                    unit="people"
                    decimals={0}
                    valueLabel="Returns"
                    linkTopic="migration"
                  />
                </div>
              )}
              {returnRate.length > 0 && (
                <div>
                  <h4 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Lowest return rates
                  </h4>
                  <RankingTable
                    rows={returnRate}
                    unit="%"
                    decimals={1}
                    valueLabel="Return rate"
                    linkTopic="migration"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {(lfprNat.length > 0 || lfprFor.length > 0) && (
          <div className="space-y-4">
            <h3 className="font-serif text-base font-semibold text-primary">
              Labour-force participation by citizenship
            </h3>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Activity rates for nationals vs foreign citizens aged 15–64.
              Citizenship ≠ foreign-born.
            </p>
            <div className="grid gap-8 lg:grid-cols-2">
              {lfprNat.length > 0 && (
                <div>
                  <h4 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Nationals
                  </h4>
                  <RankingTable
                    rows={lfprNat}
                    unit="%"
                    decimals={1}
                    valueLabel="LFPR"
                    linkTopic="migration"
                  />
                </div>
              )}
              {lfprFor.length > 0 && (
                <div>
                  <h4 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Foreign citizens
                  </h4>
                  <RankingTable
                    rows={lfprFor}
                    unit="%"
                    decimals={1}
                    valueLabel="LFPR"
                    linkTopic="migration"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {irregularStock.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-serif text-base font-semibold text-primary">
              Estimated irregular migrant stocks
            </h3>
            <p className="max-w-2xl text-sm text-muted-foreground">
              MIrreM / Zenodo research estimates — order-of-magnitude only.
            </p>
            <div className="max-w-xl">
              <RankingTable
                rows={irregularStock}
                unit="people"
                decimals={0}
                valueLabel="Estimate"
                linkTopic="migration"
              />
            </div>
          </div>
        )}

        {(frontex || iom) && (
          <div className="space-y-4">
            <h3 className="font-serif text-base font-semibold text-primary">
              Border detections & migrant deaths
            </h3>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Frontex route detections and IOM Missing Migrants regional totals —
              undercounts; not destination-country rankings.
            </p>
            <MigrationExtraCharts
              frontexEuTotal={frontex?.euTotal ?? []}
              frontexRoutes={frontex?.routes ?? {}}
              iomRegions={iom ?? {}}
            />
          </div>
        )}
      </section>

      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Want a country deep-dive? Open any row above, or start from a profile
        such as{" "}
        <Link href="/migration/germany" className="link-editorial">
          Germany
        </Link>
        ,{" "}
        <Link href="/migration/united-states" className="link-editorial">
          United States
        </Link>
        , or{" "}
        <Link href="/migration/turkiye" className="link-editorial">
          Türkiye
        </Link>
        .
      </p>
    </TopicShell>
  );
}
