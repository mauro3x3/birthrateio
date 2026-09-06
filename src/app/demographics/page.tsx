import type { Metadata } from "next";
import Link from "next/link";
import { TopicShell } from "@/components/topic-shell";
import { CensusDirectory } from "@/components/census-directory";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Census maps — Ethnicity, ancestry, race, and country of birth",
  description:
    "Interactive census choropleths: US race and Hispanic origin, UK ethnic group, Denmark ancestry, and country of birth across Europe. Same map layout for every country.",
  alternates: { canonical: "/demographics" },
};

export default function DemographicsHubPage() {
  return (
    <TopicShell
      title="Census maps"
      description="Ethnicity, ancestry, race, and country of birth from national statistical offices. Definitions are not comparable across countries — each map uses that census’s own categories."
      path="/demographics"
    >
      <section>
        <p className="text-sm text-muted-foreground">
          Looking for fertility by state or province? See{" "}
          <Link href="/maps" className="link-editorial font-medium">
            regional maps
          </Link>
          .
        </p>
        <div className="mt-5">
          <CensusDirectory />
        </div>
      </section>
    </TopicShell>
  );
}
