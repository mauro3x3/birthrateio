import type { Metadata } from "next";
import Link from "next/link";
import { TopicShell } from "@/components/topic-shell";
import { UsDemographicsExplorer } from "@/components/us-demographics-explorer";
import { US_DEMOGRAPHICS_META } from "@/lib/sources/us-demographics-data";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "US Demographics Map — Race & Hispanic Origin by State",
  description:
    "Interactive U.S. state choropleth of race and Hispanic origin shares from the Census Bureau ACS, in the style of the Census demographic data map viewer.",
  alternates: { canonical: "/demographics" },
};

export default function DemographicsPage() {
  return (
    <TopicShell
      title="US demographics"
      description={`Race and Hispanic origin by state, from the Census Bureau's American Community Survey (${US_DEMOGRAPHICS_META.year}). Click a state for its profile.`}
      path="/demographics"
    >
      <section>
        <p className="text-sm text-muted-foreground">
          Census-style maps:{" "}
          <Link href="/demographics/uk" className="link-editorial font-medium">
            United Kingdom
          </Link>
          {", "}
          <Link href="/demographics/denmark" className="link-editorial font-medium">
            Denmark
          </Link>
          {", "}
          <Link href="/demographics/germany" className="link-editorial font-medium">
            Germany
          </Link>
          {", "}
          <Link href="/demographics/spain" className="link-editorial font-medium">
            Spain
          </Link>
          {", "}
          <Link href="/demographics/russia" className="link-editorial font-medium">
            Russia
          </Link>
          {", and "}
          <Link href="/demographics/france" className="link-editorial font-medium">
            other European countries
          </Link>
          .
        </p>
        <div className="mt-5 space-y-4">
          <UsDemographicsExplorer />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Source: {US_DEMOGRAPHICS_META.source}. Hispanic origin is asked
            separately from race; people who are Hispanic may be of any race.
            Shares are of total resident population.
          </p>
        </div>
      </section>
    </TopicShell>
  );
}
