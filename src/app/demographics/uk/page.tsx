import type { Metadata } from "next";
import { CensusMapExplorer } from "@/components/census-map-explorer";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "UK Census Map — Ethnic Group by Local Authority (ONS 2021)",
  description:
    "Interactive England & Wales choropleth of Census 2021 ethnic group shares by local authority (LAD) and neighbourhood (MSOA), from ONS TS021.",
  alternates: { canonical: "/demographics/uk" },
};

export default function UkDemographicsPage() {
  return <CensusMapExplorer initialSlug="uk" />;
}
