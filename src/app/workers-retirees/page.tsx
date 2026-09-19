import type { Metadata } from "next";
import Link from "next/link";
import { TopicShell } from "@/components/topic-shell";
import { ExplorerTable } from "@/components/explorer-table";
import { CollapsibleSection } from "@/components/collapsible-section";
import { StatCard } from "@/components/stat-card";
import { TimelineExplorer } from "@/components/maps/timeline-explorer";
import { WorkersRetireesExplorer } from "@/components/workers-retirees-explorer";
import {
  getAllLaborOutlooks,
  getLaborHighlights,
  globalWorkersPerRetireeByYear,
  toLaborExplorerRows,
  toLaborTimelineFrames,
} from "@/lib/briefing-labor";
import { getIndicatorsUpdatedAt, getRanking } from "@/lib/queries";
import { SLUG } from "@/lib/indicators";
import { safe } from "@/lib/safe";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Workers vs Retirees — Compare Countries",
  description:
    "Compare working-age (15–64) and age 65+ headcounts and workers-per-retiree ratios across countries, modeled from today’s population pyramids through 2060.",
  alternates: { canonical: "/workers-retirees" },
};

export default async function WorkersRetireesPage() {
  const [outlooks, share65, dependency, updatedAt] = await Promise.all([
    safe(getAllLaborOutlooks(), []),
    safe(getRanking(SLUG.popShare65plus, { order: "desc" }), []),
    safe(getRanking(SLUG.ageDependencyRatio, { order: "desc" }), []),
    safe(
      getIndicatorsUpdatedAt([
        SLUG.fertility,
        SLUG.lifeExpectancy,
        SLUG.popShare65plus,
        SLUG.ageDependencyRatio,
      ]),
      null,
    ),
  ]);

  const explorerRows = toLaborExplorerRows(outlooks);
  const timelineFrames = toLaborTimelineFrames(explorerRows);
  const globalByYear = globalWorkersPerRetireeByYear(explorerRows);
  const highlights = getLaborHighlights(explorerRows);

  return (
    <TopicShell
      title="Workers vs retirees"
      path="/workers-retirees"
      updatedAt={updatedAt}
      description={
        <>
          How many working-age people (15–64) support each person aged 65+,
          country by country — today and under a simple projection to ~2060.
        </>
      }
      intro={
        <>
          <p>
            The working-age and 65+ shares of today&apos;s pyramid already fix
            most of the next two decades of workers-per-retiree. Fertility
            changes show up later; migration and retirement age move the ratio
            sooner. The map and scatter use the same simple projection as the
            country briefing chart — hold recent fertility, life expectancy, and
            net migration, then age the population forward.
          </p>
          <p>
            This is arithmetic for planning conversations, not an official UN
            forecast. Microstates and extreme Gulf ratios are filtered from some
            comparisons so the chart stays readable; the full table keeps the
            wider set.
          </p>
        </>
      }
      hero={
        explorerRows.length > 0 ? (
          <TimelineExplorer
            frames={timelineFrames}
            globalByYear={globalByYear}
            unit="workers/retiree"
            decimals={2}
            scaleType="sequential-log"
            source="World Bank"
            headline="World"
            metricLabel="Workers per retiree"
            playMs={900}
          />
        ) : undefined
      }
    >
      <section className="space-y-4">
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Same age pools as the{" "}
          <Link href="/brief" className="link-editorial font-medium">
            country briefing
          </Link>{" "}
          chart — not employment counts. Pick a country on the scatter or table
          to spotlight its path.
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
            For context, World Bank estimates of the share aged 65+ and the age
            dependency ratio (young + old per 100 working-age). These are
            observed series, not the modeled projection above.
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
