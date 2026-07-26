import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const staticRoutes = [
    "",
    "/fertility",
    "/population",
    "/migration",
    "/gdp",
    "/compare",
    "/simulator",
    "/cities",
    "/calendar",
    "/support",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  let countryRoutes: MetadataRoute.Sitemap = [];
  let cityRoutes: MetadataRoute.Sitemap = [];
  try {
    const [countries, cities] = await Promise.all([
      prisma.country.findMany({
        where: { isAggregate: false },
        select: { slug: true, updatedAt: true },
      }),
      prisma.city.findMany({ select: { slug: true, updatedAt: true } }),
    ]);
    countryRoutes = countries.map((c) => ({
      url: `${base}/country/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
    cityRoutes = cities.map((c) => ({
      url: `${base}/city/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "monthly",
      priority: 0.5,
    }));
  } catch {
    // DB not available at build time — static routes still emitted.
  }

  return [...staticRoutes, ...countryRoutes, ...cityRoutes];
}
