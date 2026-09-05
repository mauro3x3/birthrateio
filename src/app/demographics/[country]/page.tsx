import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CensusMapExplorer } from "@/components/census-map-explorer";
import {
  CENSUS_COUNTRIES,
  getCensusCountry,
} from "@/lib/sources/census-maps-data";

export const revalidate = 86400;

type Props = { params: Promise<{ country: string }> };

export function generateStaticParams() {
  return CENSUS_COUNTRIES.filter((c) => c.slug !== "uk").map((c) => ({
    country: c.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country: slug } = await params;
  const entry = getCensusCountry(slug);
  if (!entry) return { title: "Census map" };
  return {
    title: `${entry.name} census map — ${entry.title}`,
    description: `Interactive choropleth of ${entry.title.toLowerCase()} in ${entry.name}, ${entry.year}. Same census-map layout as the England & Wales explorer.`,
    alternates: { canonical: `/demographics/${entry.slug}` },
  };
}

export default async function CensusCountryPage({ params }: Props) {
  const { country: slug } = await params;
  const entry = getCensusCountry(slug);
  if (!entry) notFound();
  return <CensusMapExplorer initialSlug={entry.slug} />;
}
