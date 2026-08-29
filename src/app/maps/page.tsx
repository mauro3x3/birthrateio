import type { Metadata } from "next";
import { CountryMapExplorer } from "@/components/country-map-explorer";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Regional maps — Fertility and population by state and province",
  description:
    "Census-style choropleth maps of total fertility rate, population, and population change for states, provinces and regions. India, Russia, China, the United States and 25 other countries from official sources.",
  alternates: { canonical: "/maps" },
};

export default function MapsPage() {
  return <CountryMapExplorer initialIso3="IND" />;
}
