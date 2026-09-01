import type { Metadata } from "next";
import { TopicShell } from "@/components/topic-shell";
import { SectionHeading } from "@/components/section-heading";
import { ExplorerTable } from "@/components/explorer-table";
import { FertilityMovers } from "@/components/fertility-movers";
import { TimelineExplorer } from "@/components/maps/timeline-explorer";
import {
  getFertilityChanges,
  getIndicatorsUpdatedAt,
  getMapFrames,
  getRanking,
  getWeightedGlobalByYear,
  getWorldByYear,
  getFertilityNowcasts,
} from "@/lib/queries";
import { FertilityNowcastTable } from "@/components/fertility-nowcast-table";
import { SLUG } from "@/lib/indicators";
import { safe } from "@/lib/safe";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TFR_ANCESTRY_PACKS } from "@/lib/sources/tfr-by-ancestry-data";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Fertility Explorer — Global Fertility Rates & Trends",
  description:
    "Explore total fertility rates for every country. Interactive timeline map, 2026 provisional nowcast, rankings, and the biggest fertility movers.",
  alternates: { canonical: "/fertility" },
};

export default async function FertilityPage() {
  const [
    frames,
    ranking,
    changes,
    nowcasts,
    adolescent,
    contraceptive,
    updatedAt,
  ] = await Promise.all([
    safe(getMapFrames(SLUG.fertility, { step: 1, maxFrames: 66 }), []),
    safe(getRanking(SLUG.fertility, { order: "desc" }), []),
    safe(getFertilityChanges(10, 8), { increases: [], declines: [] }),
    safe(getFertilityNowcasts("2026"), []),
    safe(getRanking(SLUG.adolescentFertility, { order: "desc" }), []),
    safe(getRanking(SLUG.contraceptivePrevalence, { order: "desc" }), []),
    safe(
      getIndicatorsUpdatedAt([
        SLUG.fertility,
        SLUG.fertilityProvisional,
        SLUG.adolescentFertility,
        SLUG.contraceptivePrevalence,
      ]),
      null,
    ),
  ]);

  const years = frames.map((f) => f.year);
  const world = await safe(
    getWorldByYear(SLUG.fertility, years),
    {} as Record<number, number>,
  );
  const globalTfr = Object.keys(world).length
    ? world
    : await safe(
        getWeightedGlobalByYear(SLUG.fertility, SLUG.population, years),
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
      title="Fertility"
      path="/fertility"
      updatedAt={updatedAt}
      hero={
        <TimelineExplorer
          frames={timelineFrames}
          globalByYear={globalTfr}
          unit="births/woman"
          decimals={2}
          scaleType="diverging-dark"
          mid={2.1}
          source="World Bank"
          headline="Global"
          metricLabel="Births / woman"
        />
      }
    >
      <section>
        <SectionHeading id="biggest-movers" title="Biggest movers" />
        <div className="mt-5">
          <FertilityMovers
            declines={changes.declines}
            increases={changes.increases}
          />
        </div>
      </section>

      {TFR_ANCESTRY_PACKS.length > 0 && (
        <section>
          <SectionHeading
            id="fertility-by-ancestry"
            title="Fertility by ancestry"
            description="A handful of statistical offices publish TFR disaggregated by ancestry, immigrant category, or mother's country of birth. Definitions are not comparable across countries."
            tocLabel="By ancestry"
          />
          <ul className="mt-5 divide-y divide-border border-y border-border">
            {TFR_ANCESTRY_PACKS.map((pack) => (
              <li key={pack.iso3}>
                <Link
                  href={`/country/${pack.slug}`}
                  className="group flex items-center justify-between gap-3 py-3 text-sm transition-colors hover:bg-muted/50"
                >
                  <span className="font-serif font-medium text-primary group-hover:underline">
                    {pack.headline ?? pack.country}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    {pack.country}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {nowcasts.length > 0 && (
        <FertilityNowcastTable
          compiledBy={nowcasts[0]?.compiledBy ?? "BirthGauge"}
          compiledByUrl={nowcasts[0]?.compiledByUrl}
          sourceNote={
            nowcasts[0]?.sourceNote ??
            "National Statistical Offices or Ministries of Health / Interior"
          }
          rows={nowcasts.map((r) => ({
            label: r.label,
            iso3: r.iso3,
            slug: r.slug,
            countrySlug: r.country?.slug ?? null,
            flagEmoji: r.country?.flagEmoji ?? null,
            birthsPrior: r.birthsPrior,
            birthsCurrent: r.birthsCurrent,
            changePct: r.changePct,
            months: r.months,
            tfr2015: r.tfr2015,
            tfr2020: r.tfr2020,
            tfr2024: r.tfr2024,
            tfr2025: r.tfr2025,
            tfr2026: r.tfr2026,
            lessReliable: r.lessReliable,
            flags: r.flags,
          }))}
        />
      )}

      <section>
        <SectionHeading
          id="fertility-rankings"
          title="Fertility rankings"
          tocLabel="All countries ranked"
        />
        <div className="mt-5">
          <ExplorerTable
            rows={ranking}
            unit="births/woman"
            decimals={2}
            valueLabel="Fertility"
            csvName="fertility-rankings"
          
              linkTopic="fertility"
            />
        </div>
      </section>

      {(adolescent.length > 0 || contraceptive.length > 0) && (
        <section>
          <SectionHeading
            id="teen-fertility-contraception"
            title="Adolescent fertility and contraception"
            tocLabel="Teen births & contraception"
          />
          <div className="mt-5 grid gap-8 xl:grid-cols-2">
            {adolescent.length > 0 && (
              <div>
                <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Highest adolescent fertility
                </h3>
                <ExplorerTable
                  rows={adolescent}
                  unit="per 1,000 women 15–19"
                  decimals={1}
                  valueLabel="Teen births"
                  csvName="adolescent-fertility-rankings"
                
              linkTopic="fertility"
            />
              </div>
            )}
            {contraceptive.length > 0 && (
              <div>
                <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Highest contraceptive use
                </h3>
                <ExplorerTable
                  rows={contraceptive}
                  unit="% of women 15–49"
                  decimals={1}
                  valueLabel="Contraceptive use"
                  csvName="contraceptive-prevalence-rankings"
                
              linkTopic="fertility"
            />
              </div>
            )}
          </div>
        </section>
      )}
    </TopicShell>
  );
}
