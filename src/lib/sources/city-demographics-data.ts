/* eslint-disable no-console */
// Curated city-level demographic snapshots: foreign-born / foreign-citizenship
// share and broad age-structure shares from national censuses / ACS / ONS.
//
// IMPORTANT: caller must run ensureIndicators first so
// "city-foreign-born-share" and "city-age-share" exist.

import type { PrismaClient } from "@prisma/client";
import { SLUG } from "../indicators";

export interface CityForeignBornPoint {
  citySlug: string;
  year: number;
  value: number; // % of population
  definition: string;
  sourceNote: string;
  sourceUrl?: string;
}

export interface CityAgeSharePoint {
  citySlug: string;
  year: number;
  share0to14: number;
  share15to64: number;
  share65plus: number;
  sourceNote: string;
  sourceUrl?: string;
}

/** Foreign-born or foreign-citizenship share (%). Definition varies by office. */
export const CITY_FOREIGN_BORN: CityForeignBornPoint[] = [
  {
    // Japan publishes foreign nationals (not birthplace) at prefecture level.
    citySlug: "tokyo",
    year: 2020,
    value: 4.8,
    definition: "Foreign nationals (外国人) as % of Tokyo Metropolis population",
    sourceNote: "Statistics Bureau of Japan, 2020 Population Census",
    sourceUrl: "https://www.stat.go.jp/english/data/kokusei/2020/summary.html",
  },
  {
    citySlug: "new-york",
    year: 2020,
    value: 36.0,
    definition: "Foreign-born share of NYC resident population (ACS 5-year)",
    sourceNote: "U.S. Census Bureau, ACS 2016–2020 5-year estimates",
    sourceUrl: "https://data.census.gov",
  },
  {
    citySlug: "new-york",
    year: 2022,
    value: 36.3,
    definition: "Foreign-born share of NYC resident population (ACS 1-year)",
    sourceNote: "U.S. Census Bureau, ACS 2022 1-year estimates (B05002)",
    sourceUrl: "https://data.census.gov",
  },
  {
    citySlug: "los-angeles",
    year: 2022,
    value: 36.9,
    definition: "Foreign-born share — City of Los Angeles (ACS 1-year)",
    sourceNote: "U.S. Census Bureau, ACS 2022 1-year (place: Los Angeles city)",
    sourceUrl: "https://data.census.gov",
  },
  {
    citySlug: "london",
    year: 2021,
    value: 40.6,
    definition: "Non-UK born residents as % of usual residents (Greater London)",
    sourceNote: "ONS Census 2021 — country of birth, London region",
    sourceUrl:
      "https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/internationalmigration",
  },
  {
    citySlug: "paris",
    year: 2020,
    value: 20.5,
    definition: "Immigrants (born abroad) as % of population — Paris département",
    sourceNote: "INSEE — immigrés, département 75",
    sourceUrl: "https://www.insee.fr",
  },
  {
    citySlug: "singapore",
    year: 2020,
    value: 31.9,
    definition: "Overseas-born as % of resident population (citizens + PRs)",
    sourceNote: "Singapore DOS, Census of Population 2020",
    sourceUrl: "https://www.singstat.gov.sg",
  },
  {
    citySlug: "hong-kong",
    year: 2021,
    value: 39.5,
    definition: "Born outside Hong Kong as % of population (place of birth)",
    sourceNote: "Hong Kong C&SD, 2021 Population Census — place of birth",
    sourceUrl: "https://www.censtatd.gov.hk",
  },
  {
    citySlug: "berlin",
    year: 2023,
    value: 24.5,
    definition: "Foreign nationals (Ausländer) as % of Berlin population",
    sourceNote: "Amt für Statistik Berlin-Brandenburg / Destatis",
    sourceUrl: "https://www.statistik-berlin-brandenburg.de/",
  },
  {
    citySlug: "seoul",
    year: 2020,
    value: 2.8,
    definition: "Foreign residents as % of Seoul Special City population",
    sourceNote: "KOSTAT / Seoul Metropolitan Government, 2020",
    sourceUrl: "https://kosis.kr",
  },
  {
    citySlug: "toronto",
    year: 2021,
    value: 46.6,
    definition: "Immigrants as % of City of Toronto census subdivision",
    sourceNote: "Statistics Canada, Census 2021 — immigrant status, Toronto CSD",
    sourceUrl:
      "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/index-eng.cfm",
  },
];

/** Broad age shares (%). Should sum ≈ 100 (rounding allowed). */
export const CITY_AGE_SHARES: CityAgeSharePoint[] = [
  {
    citySlug: "tokyo",
    year: 2020,
    share0to14: 11.1,
    share15to64: 66.3,
    share65plus: 22.6,
    sourceNote:
      "Statistics Bureau of Japan, 2020 Population Census (Tokyo Metropolis)",
    sourceUrl: "https://www.stat.go.jp/english/data/kokusei/2020/summary.html",
  },
  {
    citySlug: "new-york",
    year: 2022,
    share0to14: 17.0,
    share15to64: 67.2,
    share65plus: 15.8,
    sourceNote: "U.S. Census Bureau, ACS 2022 1-year — NYC age structure",
    sourceUrl: "https://data.census.gov",
  },
  {
    citySlug: "london",
    year: 2021,
    share0to14: 18.1,
    share15to64: 69.3,
    share65plus: 12.6,
    sourceNote: "ONS Census 2021 — age structure, Greater London",
    sourceUrl: "https://www.ons.gov.uk/census",
  },
  {
    citySlug: "paris",
    year: 2020,
    share0to14: 14.0,
    share15to64: 68.5,
    share65plus: 17.5,
    sourceNote: "INSEE — structure par âge, Paris département",
    sourceUrl: "https://www.insee.fr",
  },
  {
    citySlug: "singapore",
    year: 2020,
    share0to14: 14.5,
    share15to64: 70.8,
    share65plus: 14.7,
    sourceNote:
      "Singapore DOS, Census of Population 2020 — resident age structure",
    sourceUrl: "https://www.singstat.gov.sg",
  },
  {
    citySlug: "hong-kong",
    year: 2021,
    share0to14: 10.9,
    share15to64: 68.0,
    share65plus: 21.1,
    sourceNote: "Hong Kong C&SD, 2021 Population Census",
    sourceUrl: "https://www.censtatd.gov.hk",
  },
  {
    citySlug: "berlin",
    year: 2023,
    share0to14: 14.2,
    share15to64: 66.8,
    share65plus: 19.0,
    sourceNote: "Amt für Statistik Berlin-Brandenburg — Altersstruktur",
    sourceUrl: "https://www.statistik-berlin-brandenburg.de/",
  },
  {
    citySlug: "seoul",
    year: 2020,
    share0to14: 10.0,
    share15to64: 74.0,
    share65plus: 16.0,
    sourceNote: "KOSTAT / Seoul — 2020 census age structure (rounded)",
    sourceUrl: "https://kosis.kr",
  },
];

export async function seedCityDemographics(prisma: PrismaClient): Promise<void> {
  const [foreignInd, ageInd, source] = await Promise.all([
    prisma.indicator.findUnique({
      where: { slug: SLUG.cityForeignBornShare },
      select: { id: true },
    }),
    prisma.indicator.findUnique({
      where: { slug: SLUG.cityAgeShare },
      select: { id: true },
    }),
    prisma.dataSource.findUnique({
      where: { code: "NATIONAL_STATS" },
      select: { id: true },
    }),
  ]);

  if (!foreignInd || !ageInd) {
    console.log(
      "⚠ city-foreign-born-share / city-age-share missing; run ensureIndicators first",
    );
    return;
  }

  const sourceId =
    source?.id ??
    (
      await prisma.dataSource.findUnique({
        where: { code: "NATIONAL_CENSUS" },
        select: { id: true },
      })
    )?.id ??
    null;

  const neededSlugs = [
    ...new Set([
      ...CITY_FOREIGN_BORN.map((r) => r.citySlug),
      ...CITY_AGE_SHARES.map((r) => r.citySlug),
    ]),
  ];
  const cities = new Map(
    (
      await prisma.city.findMany({
        where: { slug: { in: neededSlugs } },
        select: { id: true, slug: true },
      })
    ).map((c) => [c.slug, c.id]),
  );

  const cityIds = [...cities.values()];
  await prisma.indicatorValue.deleteMany({
    where: {
      subjectType: "CITY",
      cityId: { in: cityIds },
      indicatorId: { in: [foreignInd.id, ageInd.id] },
    },
  });

  let foreignRows = 0;
  let ageRows = 0;

  for (const row of CITY_FOREIGN_BORN) {
    const cityId = cities.get(row.citySlug);
    if (!cityId) continue;
    await prisma.indicatorValue.create({
      data: {
        subjectType: "CITY",
        indicatorId: foreignInd.id,
        cityId,
        year: row.year,
        value: row.value,
        kind: "ESTIMATE",
        sourceId,
      },
    });
    foreignRows++;
  }

  for (const row of CITY_AGE_SHARES) {
    const cityId = cities.get(row.citySlug);
    if (!cityId) continue;
    const groups: Array<[string, number]> = [
      ["0-14", row.share0to14],
      ["15-64", row.share15to64],
      ["65+", row.share65plus],
    ];
    for (const [dimensionValue, value] of groups) {
      await prisma.indicatorValue.create({
        data: {
          subjectType: "CITY",
          indicatorId: ageInd.id,
          cityId,
          year: row.year,
          value,
          kind: "ESTIMATE",
          dimension: "age",
          dimensionValue,
          sourceId,
        },
      });
      ageRows++;
    }
  }

  console.log(
    `✔ ${foreignRows} city-foreign-born-share + ${ageRows} city-age-share rows (NATIONAL_STATS)`,
  );
}
