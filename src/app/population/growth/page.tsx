import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { TimelineExplorer } from "@/components/maps/timeline-explorer";
import {
  getMapFrames,
  getWeightedGlobalByYear,
  getWorldByYear,
} from "@/lib/queries";
import { SLUG } from "@/lib/indicators";
import { safe } from "@/lib/safe";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "World population growth map — Annual % by country",
  description:
    "Interactive timeline of annual population growth by country. Scrub years, compare extremes, and see the global trend.",
  alternates: { canonical: "/population/growth" },
};

export default async function PopulationGrowthMapPage() {
  const growthFrames = await safe(
    getMapFrames(SLUG.populationGrowth, { step: 1, maxFrames: 60 }),
    [],
  );

  const years = growthFrames.map((f) => f.year);
  const world = await safe(
    getWorldByYear(SLUG.populationGrowth, years),
    {} as Record<number, number>,
  );
  const globalGrowth = Object.keys(world).length
    ? world
    : await safe(
        getWeightedGlobalByYear(SLUG.populationGrowth, SLUG.population, years),
        {} as Record<number, number>,
      );

  const timelineFrames = growthFrames.map((f) => ({
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
    <div>
      <PageHeader
        title="World population growth"
        description="Annual % change by country — scrub the timeline. Green grows, red shrinks."
      />

      <TimelineExplorer
        frames={timelineFrames}
        globalByYear={globalGrowth}
        unit="% annual"
        decimals={2}
        scaleType="diverging-growth-dark"
        mid={0}
        source="World Bank"
        headline="Global"
        metricLabel="% annual growth"
      />

      <div className="container space-y-8 py-8">
        <section className="max-w-2xl space-y-3">
          <SectionHeading
            id="about"
            title="What you are looking at"
            description="World Bank population growth series (annual %). Extremes can be tiny places or conflict years — use rankings for a calmer league table."
          />
          <p className="text-sm text-muted-foreground">
            Back to the{" "}
            <Link href="/population" className="link-editorial">
              population hub
            </Link>
            {" · "}
            <Link href="/population/rankings" className="link-editorial">
              growth rankings
            </Link>
            {" · "}
            <Link href="/population/europe-change" className="link-editorial">
              Europe settlement change
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
