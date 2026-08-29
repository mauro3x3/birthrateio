import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site";
import {
  COUNTRY_TOPICS,
  SEO_COMPARE_PAIRS,
} from "@/lib/country-topics";
import { getCountryMapAtlas } from "@/lib/country-map-atlas";

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
    "/maps",
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

  const mapCountryRoutes = getCountryMapAtlas().map((c) => ({
    url: `${base}/maps/${c.iso3.toLowerCase()}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  let countryRoutes: MetadataRoute.Sitemap = [];
  let topicCountryRoutes: MetadataRoute.Sitemap = [];
  let cityRoutes: MetadataRoute.Sitemap = [];
  let stateRoutes: MetadataRoute.Sitemap = [];
  let compareRoutes: MetadataRoute.Sitemap = [];

  try {
    const [countries, cities, states] = await Promise.all([
      prisma.country.findMany({
        where: { isAggregate: false },
        select: { slug: true, updatedAt: true, continent: true },
      }),
      prisma.city.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.admin1.findMany({ select: { slug: true, updatedAt: true } }),
    ]);

    const slugSet = new Set(countries.map((c) => c.slug));

    countryRoutes = countries.map((c) => ({
      url: `${base}/country/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    // Topic × country — the programmatic SEO matrix (~5 × 200 URLs).
    topicCountryRoutes = countries.flatMap((c) =>
      COUNTRY_TOPICS.map((topic) => ({
        url: `${base}${topic.hubPath}/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.65,
      })),
    );

    cityRoutes = cities.map((c) => ({
      url: `${base}/city/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));

    stateRoutes = states.map((s) => ({
      url: `${base}/state/${s.slug}`,
      lastModified: s.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.55,
    }));

    // Curated high-interest pairs + same-continent neighbours (capped).
    const pairKeys = new Set<string>();
    const addPair = (x: string, y: string) => {
      if (!slugSet.has(x) || !slugSet.has(y) || x === y) return;
      const [lo, hi] = x < y ? [x, y] : [y, x];
      const key = `${lo}/${hi}`;
      if (pairKeys.has(key)) return;
      pairKeys.add(key);
      compareRoutes.push({
        url: `${base}/compare/${lo}/${hi}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.55,
      });
    };

    for (const [x, y] of SEO_COMPARE_PAIRS) addPair(x, y);

    // Up to 8 peers per country within continent → bounded compare surface.
    const byContinent = new Map<string, string[]>();
    for (const c of countries) {
      if (!c.continent) continue;
      const list = byContinent.get(c.continent) ?? [];
      list.push(c.slug);
      byContinent.set(c.continent, list);
    }
    for (const slugs of byContinent.values()) {
      const sorted = [...slugs].sort();
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < Math.min(i + 9, sorted.length); j++) {
          addPair(sorted[i], sorted[j]);
        }
      }
    }
  } catch {
    // DB not available at build time — static routes still emitted.
  }

  return [
    ...staticRoutes,
    ...mapCountryRoutes,
    ...countryRoutes,
    ...topicCountryRoutes,
    ...compareRoutes,
    ...stateRoutes,
    ...cityRoutes,
  ];
}
