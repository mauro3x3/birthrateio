import type { Metadata } from "next";
import { CitiesExplorer } from "@/components/cities-explorer";
import { getCities } from "@/lib/queries";
import { safe } from "@/lib/safe";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Cities Database — Major World Cities by Population",
  description:
    "Explore the world's largest cities by metropolitan population on an interactive map, with demographic and economic context from their countries.",
  alternates: { canonical: "/cities" },
};

export default async function CitiesPage() {
  const cities = await safe(getCities(200), []);

  return (
    <CitiesExplorer
      cities={cities.map((c) => ({
        slug: c.slug,
        name: c.name,
        population: c.population,
        isCapital: c.isCapital,
        latitude: c.latitude,
        longitude: c.longitude,
        country: {
          name: c.country.name,
          slug: c.country.slug,
          flagEmoji: c.country.flagEmoji,
          continent: c.country.continent,
        },
      }))}
    />
  );
}
