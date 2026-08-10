import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
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
    <div>
      <PageHeader
        title="Cities Database"
        description="The world's largest metropolitan areas on a map — then drill into population history, fertility, and demographics for each city."
      />
      <div className="container py-8">
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
      </div>
    </div>
  );
}
