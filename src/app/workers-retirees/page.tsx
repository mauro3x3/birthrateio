import type { Metadata } from "next";
import Link from "next/link";
import { TopicShell } from "@/components/topic-shell";
import { SectionHeading } from "@/components/section-heading";
import { ExplorerTable } from "@/components/explorer-table";
import { WorkersRetireesExplorer } from "@/components/workers-retirees-explorer";
import { getAllLaborOutlooks, toLaborExplorerRows } from "@/lib/briefing-labor";
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

  const note = outlooks[0]?.note;
  const explorerRows = toLaborExplorerRows(outlooks);

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
    >
      <section>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Same model as the{" "}
          <Link href="/brief" className="link-editorial font-medium">
            country briefing
          </Link>{" "}
          “Workers vs retirees” chart: start from today’s age pyramid, hold
          recent fertility, life expectancy, and net migration, then age the
          population forward. This is not employment — it is the age pools that
          shape pensions and the labour force.
        </p>
        {note ? (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {note}
          </p>
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
        <section>
          <SectionHeading
            id="official-age-structure"
            title="Official age structure"
            tocLabel="World Bank age shares"
          />
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            For context, World Bank estimates of the share aged 65+ and the age
            dependency ratio (young + old per 100 working-age). These are
            observed series, not the projection above.
          </p>
          <div className="mt-5 grid gap-8 xl:grid-cols-2">
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
        </section>
      )}
    </TopicShell>
  );
}
