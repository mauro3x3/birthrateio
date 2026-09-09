import type { Metadata } from "next";
import { CountryMapExplorer } from "@/components/country-map-explorer";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Regional maps — Fertility and population by state and province",
  description:
    "Census-style choropleth maps of total fertility rate, population, and population change for states, provinces and regions — plus Europe (NUTS 2 provinces, EU countries, or population/birth shares), MENA, Africa, Caribbean, South America, Central America and Oceania. Saudi Arabia includes a census toggle for Saudi women versus all residents. India, Pakistan, Nigeria, Brazil, Colombia, Indonesia, Iran, Japan, Germany, Turkey and dozens of other official sources.",
  alternates: { canonical: "/maps" },
};

export default function MapsPage() {
  return <CountryMapExplorer initialIso3="IND" />;
}
