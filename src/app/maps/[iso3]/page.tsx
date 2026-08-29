import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CountryMapExplorer } from "@/components/country-map-explorer";
import {
  getCountryMapAtlas,
  getCountryMapEntry,
} from "@/lib/country-map-atlas";

export const revalidate = 86400;

type Props = { params: Promise<{ iso3: string }> };

export function generateStaticParams() {
  return getCountryMapAtlas().map((c) => ({ iso3: c.iso3.toLowerCase() }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { iso3 } = await params;
  const entry = getCountryMapEntry(iso3);
  if (!entry) return { title: "Regional maps" };
  return {
    title: `${entry.country} regional map — Fertility and population`,
    description: `Interactive choropleth of ${entry.country} ${entry.kind}s: total fertility rate and, where official tables exist, population and population change.`,
    alternates: { canonical: `/maps/${entry.iso3.toLowerCase()}` },
  };
}

export default async function CountryMapPage({ params }: Props) {
  const { iso3 } = await params;
  const entry = getCountryMapEntry(iso3);
  if (!entry) notFound();
  return <CountryMapExplorer initialIso3={entry.iso3} />;
}
