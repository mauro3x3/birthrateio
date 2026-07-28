/* eslint-disable no-console */
// City-level racial / ethnic composition and ZIP income from national
// statistical offices (U.S. Census ACS via Census Reporter for U.S. cities).
// Accuracy over coverage — only geographies with published official figures.

import type { PrismaClient } from "@prisma/client";
import nycAcs from "../data/nyc-acs.json";
import usCitiesAcs from "../data/us-cities-acs.json";

type RaceMap = Record<string, number>;

interface CityRaceYear {
  citySlug: string;
  year: number;
  groups: RaceMap;
  geographyNote: string;
  sourceNote: string;
  sourceUrl: string;
}

// Historical NYC race shares from U.S. Census (2000, 2010, 2020 redistricting)
// plus ACS 2024 1-year (via Census Reporter). Categories are mutually exclusive
// Hispanic-origin × race (NH = non-Hispanic).
const NYC_RACE_HISTORY: CityRaceYear[] = [
  {
    citySlug: "new-york",
    year: 2000,
    geographyNote: "New York City (5 boroughs)",
    sourceNote: "U.S. Census Bureau, Census 2000",
    sourceUrl: "https://www.census.gov",
    groups: {
      "White (non-Hispanic)": 35.0,
      "Black (non-Hispanic)": 24.5,
      "Asian (non-Hispanic)": 9.8,
      Hispanic: 27.0,
      "Other / Multiple": 3.7,
    },
  },
  {
    citySlug: "new-york",
    year: 2010,
    geographyNote: "New York City (5 boroughs)",
    sourceNote: "U.S. Census Bureau, Census 2010",
    sourceUrl: "https://www.census.gov",
    groups: {
      "White (non-Hispanic)": 33.3,
      "Black (non-Hispanic)": 22.8,
      "Asian (non-Hispanic)": 12.7,
      Hispanic: 28.6,
      "Other / Multiple": 2.6,
    },
  },
  {
    citySlug: "new-york",
    year: 2020,
    geographyNote: "New York City (5 boroughs)",
    sourceNote: "U.S. Census Bureau, 2020 Census Redistricting Data (P.L. 94-171)",
    sourceUrl: "https://www.census.gov/programs-surveys/decennial-census/decade/2020/2020-census-results.html",
    groups: {
      "White (non-Hispanic)": 31.9,
      "Black (non-Hispanic)": 21.9,
      "Asian (non-Hispanic)": 14.1,
      Hispanic: 28.3,
      "Other / Multiple": 3.8,
    },
  },
];

function acsRaceYears(): CityRaceYear[] {
  const out: CityRaceYear[] = [...NYC_RACE_HISTORY];
  const nyc = nycAcs.nyc;
  out.push({
    citySlug: nyc.citySlug,
    year: nyc.year,
    geographyNote: "New York City (5 boroughs)",
    sourceNote: `${nycAcs.source} — ${nycAcs.release.name}`,
    sourceUrl: nycAcs.sourceUrl,
    groups: nyc.race,
  });
  for (const c of Object.values(usCitiesAcs.cities)) {
    // Prefer NYC history above for new-york; skip ACS duplicate for new-york if present
    if (c.citySlug === "new-york") continue;
    out.push({
      citySlug: c.citySlug,
      year: c.year,
      geographyNote: c.geographyNote,
      sourceNote: `${usCitiesAcs.source}`,
      sourceUrl: usCitiesAcs.sourceUrl,
      groups: c.race,
    });
  }
  return out;
}

export async function seedCityRace(prisma: PrismaClient) {
  const series = acsRaceYears();
  const slugs = [...new Set(series.map((s) => s.citySlug))];
  const cities = new Map(
    (
      await prisma.city.findMany({
        where: { slug: { in: slugs } },
        select: { id: true, slug: true },
      })
    ).map((c) => [c.slug, c.id]),
  );

  let rows = 0;
  let citiesSeeded = 0;
  for (const slug of slugs) {
    const cityId = cities.get(slug);
    if (!cityId) continue;
    citiesSeeded++;
    await prisma.cityGroupComposition.deleteMany({
      where: { cityId, groupKind: "RACE" },
    });
    for (const s of series.filter((x) => x.citySlug === slug)) {
      for (const [groupName, share] of Object.entries(s.groups)) {
        await prisma.cityGroupComposition.create({
          data: {
            cityId,
            year: s.year,
            groupKind: "RACE",
            groupName,
            share,
            geographyNote: s.geographyNote,
            sourceNote: s.sourceNote,
            sourceUrl: s.sourceUrl,
          },
        });
        rows++;
      }
    }
  }
  console.log(`✔ ${rows} city race composition rows (${citiesSeeded} cities)`);
}

export async function seedCityIncome(prisma: PrismaClient) {
  // Median household income as IndicatorValue + ZIP table for NYC.
  const incomeIndicator = await prisma.indicator.findUnique({
    where: { slug: "city-median-income" },
    select: { id: true },
  });
  const source = await prisma.dataSource.findUnique({
    where: { code: "US_CENSUS" },
    select: { id: true },
  });
  if (!incomeIndicator) {
    console.log("⚠ city-median-income missing; run ensureIndicators first");
    return;
  }

  const cityIncome: Array<{
    citySlug: string;
    year: number;
    value: number;
    note: string;
  }> = [
    {
      citySlug: "new-york",
      year: nycAcs.nyc.year,
      value: nycAcs.nyc.medianHouseholdIncome,
      note: `${nycAcs.source} — ${nycAcs.release.name}`,
    },
    ...Object.values(usCitiesAcs.cities).map((c) => ({
      citySlug: c.citySlug,
      year: c.year,
      value: c.medianHouseholdIncome,
      note: usCitiesAcs.source,
    })),
  ];

  const slugs = [...new Set(cityIncome.map((c) => c.citySlug))];
  const cities = new Map(
    (
      await prisma.city.findMany({
        where: { slug: { in: slugs } },
        select: { id: true, slug: true },
      })
    ).map((c) => [c.slug, c.id]),
  );

  let incomeRows = 0;
  for (const row of cityIncome) {
    const cityId = cities.get(row.citySlug);
    if (!cityId) continue;
    await prisma.indicatorValue.deleteMany({
      where: {
        cityId,
        indicatorId: incomeIndicator.id,
        subjectType: "CITY",
        year: row.year,
      },
    });
    await prisma.indicatorValue.create({
      data: {
        subjectType: "CITY",
        cityId,
        indicatorId: incomeIndicator.id,
        year: row.year,
        value: row.value,
        kind: "ESTIMATE",
        sourceId: source?.id ?? null,
      },
    });
    incomeRows++;
  }

  // Borough median incomes as subdivision metadata? Store as zip-like with kind — use CityZipStat for ZIPs only.
  // Update subdivision rows for NYC boroughs with income via a dedicated zip-like table keyed by borough slug? Skip — show in race borough table.

  // NYC ZCTA incomes
  const nycId = cities.get("new-york");
  let zipRows = 0;
  if (nycId) {
    await prisma.cityZipStat.deleteMany({ where: { cityId: nycId } });
    for (const z of nycAcs.nyc.zips) {
      await prisma.cityZipStat.create({
        data: {
          cityId: nycId,
          zip: z.zip,
          year: nycAcs.nyc.year,
          population: z.population,
          medianHouseholdIncome: z.medianHouseholdIncome,
          sourceNote: `${nycAcs.source} — ${nycAcs.release.name}`,
          sourceUrl: nycAcs.sourceUrl,
        },
      });
      zipRows++;
    }
  }

  // Borough race breakdown (NYC counties)
  if (nycId) {
    await prisma.cityGroupComposition.deleteMany({
      where: { cityId: nycId, groupKind: "RACE_BOROUGH" },
    });
    for (const b of nycAcs.nyc.boroughs) {
      for (const [groupName, share] of Object.entries(b.groups)) {
        await prisma.cityGroupComposition.create({
          data: {
            cityId: nycId,
            year: nycAcs.nyc.year,
            groupKind: "RACE_BOROUGH",
            groupName: `${b.name}::${groupName}`,
            share,
            geographyNote: b.name,
            sourceNote: `${nycAcs.source} — ${nycAcs.release.name}`,
            sourceUrl: nycAcs.sourceUrl,
            population: b.population,
          },
        });
      }
    }
  }

  console.log(
    `✔ ${incomeRows} city median-income rows · ${zipRows} NYC ZIP income rows`,
  );
}
