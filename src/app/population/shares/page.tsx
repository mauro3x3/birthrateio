import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { RegionSharesExplorer } from "@/components/region-shares-explorer";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Where the births are — Regional population and birth shares",
  description:
    "Each region's residents, and which countries account for its births. A younger country can make up more of the babies than of the people. World Bank population and crude birth rates, latest year.",
  alternates: { canonical: "/population/shares" },
};

export default async function RegionalSharesPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  const { region } = await searchParams;
  return (
    <div>
      <PageHeader
        title="Where the births are"
        description="Share of a region's people, and share of its babies — country by country. A younger population punches above its weight; an older one accounts for fewer births than its size suggests."
      />
      <div className="border-b bg-[hsl(40_28%_97%)]">
        <Suspense
          fallback={
            <div className="container py-16 text-sm text-muted-foreground">
              Loading regions…
            </div>
          }
        >
          <RegionSharesExplorer initialId={region ?? "AFRICA"} />
        </Suspense>
      </div>
    </div>
  );
}
