import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { UkCensusExplorer } from "@/components/uk-census-explorer";
import { UK_CENSUS_META } from "@/lib/sources/uk-census-data";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "UK Census Map — Ethnic Group by Local Authority (ONS 2021)",
  description:
    "Interactive England & Wales choropleth of Census 2021 ethnic group shares by local authority (LAD) and neighbourhood (MSOA), from ONS TS021.",
  alternates: { canonical: "/demographics/uk" },
};

export default function UkDemographicsPage() {
  return (
    <div>
      <PageHeader
        title="UK Census — Ethnic group"
        description={`${UK_CENSUS_META.msoaGeography} · Census ${UK_CENSUS_META.year}. Toggle LAD / MSOA like the ONS census maps.`}
      />
      <div className="container space-y-6 py-8">
        <p className="text-sm text-muted-foreground">
          Also see{" "}
          <Link
            href="/demographics"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            US demographics by state
          </Link>
          .
        </p>
        <UkCensusExplorer />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Source:{" "}
          <a
            href={UK_CENSUS_META.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            {UK_CENSUS_META.source}
          </a>
          . MSOA neighbourhood names: House of Commons Library. Boundaries: ONS
          LAD (Dec 2022) and MSOA (Dec 2021), generalised for the web. Compare
          with the{" "}
          <a
            href={UK_CENSUS_META.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            ONS Census maps
          </a>
          .
        </p>
      </div>
    </div>
  );
}
