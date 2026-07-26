import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { CompareTool } from "@/components/compare-tool";
import { getAllCountries } from "@/lib/queries";
import { safe } from "@/lib/safe";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Compare Countries — Demographic & Economic Comparison",
  description:
    "Compare fertility, population, GDP, migration and growth across countries and regions with overlay charts, tables and rankings.",
  alternates: { canonical: "/compare" },
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ countries?: string }>;
}) {
  const { countries } = await searchParams;
  const initial = (countries ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const options = await safe(getAllCountries(), []);

  return (
    <div>
      <PageHeader
        title="Compare Countries"
        description="Overlay demographic and economic indicators for up to 8 countries. Share the URL to share your comparison."
      />
      <div className="container py-8">
        <Suspense>
          <CompareTool
            options={options.map((c) => ({
              slug: c.slug,
              name: c.name,
              flagEmoji: c.flagEmoji,
            }))}
            initial={initial}
          />
        </Suspense>
      </div>
    </div>
  );
}
