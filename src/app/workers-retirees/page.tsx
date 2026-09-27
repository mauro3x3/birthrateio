import type { Metadata } from "next";
import Link from "next/link";
import { TopicShell } from "@/components/topic-shell";
import { SectionHeading } from "@/components/section-heading";
import { ExplorerTable } from "@/components/explorer-table";
import { CollapsibleSection } from "@/components/collapsible-section";
import { StatCard } from "@/components/stat-card";
import { MapCard } from "@/components/maps/map-card";
import { WorkersRetireesExplorer } from "@/components/workers-retirees-explorer";
import {
  getAllLaborOutlooks,
  getLaborHighlights,
  toLaborExplorerRows,
} from "@/lib/briefing-labor";
import {
  getIndicatorsUpdatedAt,
  getRanking,
  getWorkersPerRetireeHistoryFrames,
  getWorldByYear,
} from "@/lib/queries";
import { SLUG } from "@/lib/indicators";
import { safe } from "@/lib/safe";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Workers vs Retirees — Compare Countries",
  description:
    "Workers per retiree by country since 1960 — scrub decades on a world map — plus a simple projection of working-age vs 65+ through ~2060.",
  alternates: { canonical: "/workers-retirees" },
};

export default async function WorkersRetireesPage() {
  const [outlooks, historyFrames, share65, dependency, updatedAt] =
    await Promise.all([
      safe(getAllLaborOutlooks(), []),
      safe(getWorkersPerRetireeHistoryFrames(), []),
      safe(getRanking(SLUG.popShare65plus, { order: "desc" }), []),
      safe(getRanking(SLUG.ageDependencyRatio, { order: "desc" }), []),
      safe(
        getIndicatorsUpdatedAt([
          SLUG.fertility,
          SLUG.lifeExpectancy,
          SLUG.popShare15to64,
          SLUG.popShare65plus,
          SLUG.ageDependencyRatio,
        ]),
        null,
      ),
    ]);

  const explorerRows = toLaborExplorerRows(outlooks);
  const highlights = getLaborHighlights(explorerRows);

  const histYears = historyFrames.map((f) => f.year);
  const [worldWorking, worldOld] = await Promise.all([
    safe(getWorldByYear(SLUG.popShare15to64, histYears), {} as Record<number, number>),
    safe(getWorldByYear(SLUG.popShare65plus, histYears), {} as Record<number, number>),
  ]);
  const frameStats = histYears
    .map((year) => {
      const w = worldWorking[year];
      const o = worldOld[year];
      if (w == null || o == null || o <= 0) return null;
      return {
        year,
        label: `World ${ (w / o).toFixed(2) } workers/retiree`,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s != null);

  const mapFrames = historyFrames.map((f) => ({
    year: f.year,
    data: f.data.map((d) => ({
      iso3: d.iso3,
      slug: d.slug,
      name: d.name,
      value: d.value,
      continent: d.continent,
    })),
  }));

  const firstYear = mapFrames[0]?.year;
  const lastYear = mapFrames[mapFrames.length - 1]?.year;

  return (
    <TopicShell
      title="Workers vs retirees"
      path="/workers-retirees"
      updatedAt={updatedAt}
      description={
        <>
          How many working-age people (15–64) support each person aged 65+,
          country by country — observed decades on the map, then a simple
          projection to ~2060 below.
        </>
      }
      intro={
        <>
          <p>
            The map uses World Bank age shares: workers per retiree ≈ share
            aged 15–64 ÷ share aged 65+. Scrub 1980, 1990, 2000… to watch
            ageing spread. Darker means more workers per retiree.
          </p>
          <p>
            The scatter and country paths below use the same simple projection
            as the country briefing chart — hold recent fertility, life
            expectancy, and net migration, then age today&apos;s pyramid forward.
            That is planning arithmetic, not an official UN forecast.
          </p>
        </>
      }
    >
      {mapFrames.length > 0 ? (
        <section className="space-y-5">
          <SectionHeading
            id="history-map"
            title="Workers per retiree over time"
            tocLabel="Map"
            description={
              firstYear != null && lastYear != null
                ? `Observed World Bank age structure, ${firstYear}–${lastYear}. Click a decade or play the timeline.`
                : "Observed World Bank age structure. Click a decade or play the timeline."
            }
          />
          <MapCard
            id="workers-retirees-map"
            title="Workers per retiree"
            description="Darker = more working-age people per person 65+. Microstates and Gulf labour pyramids can sit at extremes."
            source="World Bank"
            frames={mapFrames}
            frameStats={frameStats}
            unit="workers/retiree"
            decimals={2}
            scaleType="sequential"
            height={480}
            appearance="light"
          />
        </section>
      ) : null}

      <section className="space-y-4">
        <SectionHeading
          id="outlook"
          title="Outlook to ~2060"
          tocLabel="Outlook"
          description="Modeled from today’s pyramids — same age pools as the country briefing, not employment counts."
        />
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Pick a country on the scatter or table to spotlight its path. Same
          series as the{" "}
          <Link href="/brief" className="link-editorial font-medium">
            country briefing
          </Link>{" "}
          labour chart.
        </p>

        {highlights ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Fewest workers per retiree, today"
              value={
                <>
                  {highlights.oldestToday.row.flagEmoji ?? "🏳️"}{" "}
                  {highlights.oldestToday.value.toFixed(2)}
                </>
              }
              sub={highlights.oldestToday.row.name}
            />
            <StatCard
              label="Fastest aging by ~2060"
              value={
                <>
                  {highlights.steepestDecline.row.flagEmoji ?? "🏳️"}{" "}
                  {highlights.steepestDecline.pct.toFixed(0)}%
                </>
              }
              sub={`${highlights.steepestDecline.row.name} · large countries`}
              trend={highlights.steepestDecline.pct}
            />
            <StatCard
              label="Country median, now → ~2060"
              value={
                <>
                  {highlights.medianNow.toFixed(1)} →{" "}
                  {highlights.median2060.toFixed(1)}
                </>
              }
              sub="Half of countries fall on either side"
            />
          </div>
        ) : null}
      </section>

      {explorerRows.length > 0 ? (
        <WorkersRetireesExplorer rows={explorerRows} />
      ) : (
        <p className="text-sm text-muted-foreground">
          No pyramid data loaded yet. Run ingestion to populate age structures.
        </p>
      )}

      {(share65.length > 0 || dependency.length > 0) && (
        <CollapsibleSection title="Official age-structure rankings (World Bank)">
          <p className="mb-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Share aged 65+ and the age dependency ratio (young + old per 100
            working-age) — observed series, not the modeled projection above.
          </p>
          <div className="grid gap-8 xl:grid-cols-2">
            {share65.length > 0 && (
              <div>
                <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Highest share aged 65+
                </h3>
                <ExplorerTable
                  rows={share65}
                  unit="%"
                  decimals={1}
                  valueLabel="% 65+"
                  csvName="share-65-plus"
                  linkTopic="population"
                />
              </div>
            )}
            {dependency.length > 0 && (
              <div>
                <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Highest age dependency ratio
                </h3>
                <ExplorerTable
                  rows={dependency}
                  unit="per 100"
                  decimals={1}
                  valueLabel="Dependency"
                  csvName="age-dependency-ratio"
                  linkTopic="population"
                />
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}
    </TopicShell>
  );
}
