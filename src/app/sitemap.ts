import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const staticRoutes = [
    "",
    "/topics",
    "/fertility",
    "/population",
    "/migration",
    "/mortality",
    "/crime",
    "/states",
    "/demographics",
    "/gdp",
    "/compare",
    "/simulator",
    "/clock",
    "/cities",
    "/calendar",
    "/demographics/uk",
    "/contribute",
    "/support",
    "/about",
    "/methodology",
    "/glossary",
    "/sources",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  let countryRoutes: MetadataRoute.Sitemap = [];
  let cityRoutes: MetadataRoute.Sitemap = [];
  let stateRoutes: MetadataRoute.Sitemap = [];
  try {
    const [countries, cities, states] = await Promise.all([
      prisma.country.findMany({
        where: { isAggregate: false },
        select: { slug: true, updatedAt: true },
      }),
      prisma.city.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.admin1.findMany({ select: { slug: true, updatedAt: true } }),
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
    stateRoutes = states.map((s) => ({
      url: `${base}/state/${s.slug}`,
      lastModified: s.updatedAt,
      changeFrequency: "weekly",
      priority: 0.55,
    }));
  } catch {
    // DB not available at build time — static routes still emitted.
  }

  return [...staticRoutes, ...countryRoutes, ...stateRoutes, ...cityRoutes];
}
