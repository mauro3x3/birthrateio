import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { TipForm } from "@/components/tip-form";

export const metadata: Metadata = {
  title: "Contribute — Report New Demographic Data",
  description:
    "Tip us when a national statistical office, UN agency, or other official source releases new fertility, population, migration, or city data.",
  alternates: { canonical: "/contribute" },
};

export default function ContributePage() {
  return (
    <div>
      <PageHeader
        title="Report new data"
        description="Help us keep birthrate.io current. When an official source publishes a new figure, send us a tip."
      />

      <div className="container max-w-2xl space-y-8 py-8 md:py-12">
        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          <p>
            We ingest World Bank, UN, and OECD series on a schedule, but
            national offices often publish country or city updates first. If you
            spot a new TFR release, census count, migration bulletin, or city
            fertility figure, tell us — with a link if you have one.
          </p>
          <p>
            Tips are reviewed by hand. We only add numbers we can verify against
            an official source. For scheduled releases, see the{" "}
            <Link
              href="/calendar"
              className="text-primary underline-offset-2 hover:underline"
            >
              data release calendar
            </Link>
            .
          </p>
        </section>

        <TipForm />
      </div>
    </div>
  );
}
