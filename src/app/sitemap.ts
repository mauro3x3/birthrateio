import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site";
import {
  COUNTRY_TOPICS,
  SEO_COMPARE_PAIRS,
} from "@/lib/country-topics";
import { getCountryMapAtlas } from "@/lib/country-map-atlas";
import { CENSUS_COUNTRIES } from "@/lib/sources/census-maps-data";
import { STORY_CATALOG } from "@/lib/stories";

export const revalidate = 86400;

/**
 * High-interest countries for the topic × country matrix in the sitemap.
 * Full matrix (~1k URLs of near-identical templates) reads as thin/doorway
 * content to AdSense reviewers — keep the rich `/country/[slug]` profiles as
 * the primary indexable unit, and only advertise a curated topic subset.
 */
const SITEMAP_TOPIC_COUNTRY_SLUGS = new Set([
  "united-states",
  "china",
  "india",
  "indonesia",
  "pakistan",
  "nigeria",
  "brazil",
  "bangladesh",
  "russian-federation",
  "mexico",
  "japan",
  "ethiopia",
  "philippines",
  "egypt-arab-rep",
  "vietnam",
  "congo-dem-rep",
  "turkiye",
  "germany",
  "thailand",
  "united-kingdom",
  "france",
  "italy",
  "south-africa",
  "korea-rep",
  "spain",
  "colombia",
  "argentina",
  "canada",
  "poland",
  "saudi-arabia",
  "ukraine",
  "morocco",
  "uzbekistan",
  "malaysia",
  "peru",
  "angola",
  "ghana",
  "mozambique",
  "yemen-rep",
  "australia",
  "madagascar",
  "cote-d-ivoire",
  "nepal",
  "cameroon",
  "niger",
  "taiwan",
  "sri-lanka",
  "burkina-faso",
  "mali",
  "romania",
  "malawi",
  "chile",
  "kazakhstan",
  "zambia",
  "guatemala",
  "ecuador",
  "syria",
  "netherlands",
  "sweden",
  "israel",
  "switzerland",
  "hong-kong-sar-china",
  "austria",
  "belgium",
  "singapore",
  "denmark",
  "finland",
  "norway",
  "ireland",
  "new-zealand",
  "iran-islamic-rep",
]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const staticRoutes = [
    "",
    "/topics",
    "/fertility",
    "/fertility/many-mothers-or-large-families",
    "/fertility/education",
    "/fertility/race",
    "/population",
    "/population/shares",
    "/population/world-shares",
    "/population/growth",
    "/population/europe-change",
    "/population/compare",
    "/population/rankings",
    "/migration",
    "/migration/buergergeld",
    "/migration/fiscal-balance",
    "/migration/citizen-flows",
    "/mortality",
    "/crime",
    "/workers-retirees",
    "/maps",
    "/stories",
    "/demographics",
    "/demographics/us",
    "/demographics/divorce-marriage",
    "/gdp",
    "/compare",
    "/simulator",
    "/clock",
    "/cities",
    "/calendar",
    "/demographics/uk",
    "/contribute",
    "/pricing",
    "/support",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    "/disclaimer",
    "/why",
    "/brief",
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

  const censusRoutes = CENSUS_COUNTRIES.filter((c) => c.slug !== "uk").map(
    (c) => ({
      url: `${base}/demographics/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }),
  );

  const storyRoutes = STORY_CATALOG.filter((s) => s.status === "live").map(
    (s) => ({
      url: `${base}/stories/${s.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }),
  );

  let countryRoutes: MetadataRoute.Sitemap = [];
  let topicCountryRoutes: MetadataRoute.Sitemap = [];
  let stateRoutes: MetadataRoute.Sitemap = [];
  let compareRoutes: MetadataRoute.Sitemap = [];

  try {
    const [countries, states] = await Promise.all([
      prisma.country.findMany({
        where: { isAggregate: false },
        select: { slug: true, updatedAt: true },
      }),
      prisma.admin1.findMany({ select: { slug: true, updatedAt: true } }),
    ]);

    const slugSet = new Set(countries.map((c) => c.slug));

    countryRoutes = countries.map((c) => ({
      url: `${base}/country/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    // Curated topic × country only (not the full doorway matrix).
    topicCountryRoutes = countries
      .filter((c) => SITEMAP_TOPIC_COUNTRY_SLUGS.has(c.slug))
      .flatMap((c) =>
        COUNTRY_TOPICS.map((topic) => ({
          url: `${base}${topic.hubPath}/${c.slug}`,
          lastModified: c.updatedAt,
          changeFrequency: "weekly" as const,
          priority: 0.55,
        })),
      );

    // States/provinces with census-style maps — keep, but cities stay off the
    // sitemap (many are thin UN WUP stubs).
    stateRoutes = states.map((s) => ({
      url: `${base}/state/${s.slug}`,
      lastModified: s.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));

    // Curated compare pairs only — the old continent mesh flooded the index
    // with near-identical side-by-side pages.
    const pairKeys = new Set<string>();
    for (const [x, y] of SEO_COMPARE_PAIRS) {
      if (!slugSet.has(x) || !slugSet.has(y) || x === y) continue;
      const [lo, hi] = x < y ? [x, y] : [y, x];
      const key = `${lo}/${hi}`;
      if (pairKeys.has(key)) continue;
      pairKeys.add(key);
      compareRoutes.push({
        url: `${base}/compare/${lo}/${hi}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.55,
      });
    }
  } catch {
    // DB not available at build time — static routes still emitted.
  }

  return [
    ...staticRoutes,
    ...mapCountryRoutes,
    ...censusRoutes,
    ...storyRoutes,
    ...countryRoutes,
    ...topicCountryRoutes,
    ...compareRoutes,
    ...stateRoutes,
  ];
}
