import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { TipForm } from "@/components/tip-form";

export const metadata: Metadata = {
  title: "Help Improve the Data — Contribute to birthrate.io",
  description:
    "Suggest a correction, better estimate, or newly released fertility, population, migration, or city figure from an official source.",
  alternates: { canonical: "/contribute" },
};

export default function ContributePage() {
  return (
    <div>
      <PageHeader
        title="Help improve the data"
        description="Have a correction, a better estimate, or additional data—at the global, national, regional, or city level? Send a tip and we'll review it."
      />

      <div className="container max-w-2xl space-y-8 py-8 md:py-12">
        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          <p>
            We ingest World Bank, UN, and OECD series on a schedule, but
            national offices often publish country or city updates first. If you
            spot a new TFR release, census count, migration bulletin, or city
            figure — or something wrong on a page — tell us, with a link when
            you have one.
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

        <Suspense
          fallback={<div className="h-64 animate-pulse border bg-muted/30" />}
        >
          <TipForm />
        </Suspense>
      </div>
    </div>
  );
}
