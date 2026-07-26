import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { CitiesList } from "@/components/cities-list";
import { getCities } from "@/lib/queries";
import { safe } from "@/lib/safe";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Cities Database — Major World Cities by Population",
  description:
    "Explore the world's largest cities by metropolitan population, with demographic and economic context from their countries.",
  alternates: { canonical: "/cities" },
};

export default async function CitiesPage() {
  const cities = await safe(getCities(200), []);

  return (
    <div>
      <PageHeader
        title="Cities Database"
        description="The world's largest metropolitan areas. City pages provide population plus demographic and economic context from each country."
      />
      <div className="container py-8">
        <Card>
          <CardContent className="p-5">
            <CitiesList
              cities={cities.map((c) => ({
                slug: c.slug,
                name: c.name,
                population: c.population,
                isCapital: c.isCapital,
                country: {
                  name: c.country.name,
                  slug: c.country.slug,
                  flagEmoji: c.country.flagEmoji,
                },
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
