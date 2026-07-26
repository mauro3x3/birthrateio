/* eslint-disable no-console */
// Curated "society & housing" indicators that aren't in the World Bank feed:
//   * Crude divorce rate (per 1,000 population)
//   * Births outside marriage (% of live births)
//   * Home ownership rate (% of households)
//
// Compiled from OECD, Eurostat and national statistical offices (latest
// available year, ~2018–2022). Add a country by appending to the relevant
// list and re-running the curated seeder — no schema change required.

import type { PrismaClient } from "@prisma/client";
import { SLUG } from "../indicators";

interface CountrySeries {
  iso3: string;
  values: { year: number; value: number }[];
}

const V = (iso3: string, value: number, year = 2020): CountrySeries => ({
  iso3,
  values: [{ year, value }],
});

// Crude divorce rate — divorces per 1,000 population.
export const DIVORCE_RATE: CountrySeries[] = [
  V("USA", 2.5), V("RUS", 3.9), V("CHN", 3.1, 2019), V("KOR", 2.1),
  V("JPN", 1.6), V("CAN", 2.1, 2019), V("MEX", 1.4, 2019), V("BRA", 1.6, 2019),
  V("GBR", 1.7, 2019), V("FRA", 1.9, 2019), V("DEU", 1.8), V("ITA", 1.4),
  V("ESP", 1.8), V("PRT", 2.0), V("NLD", 1.9), V("BEL", 2.0), V("SWE", 2.4),
  V("NOR", 1.9), V("DNK", 2.6), V("FIN", 2.4), V("ISL", 1.7), V("IRL", 0.7),
  V("AUT", 1.8), V("CHE", 1.9), V("POL", 1.7), V("CZE", 2.0), V("HUN", 1.8),
  V("ROU", 1.5), V("GRC", 1.9), V("TUR", 1.9), V("AUS", 2.2, 2019),
  V("NZL", 1.7, 2019), V("CHL", 0.7), V("UKR", 3.0, 2019),
];

// Births outside marriage — % of all live births.
export const NONMARITAL_BIRTHS: CountrySeries[] = [
  V("ISL", 69), V("FRA", 62), V("NOR", 58), V("PRT", 57), V("SWE", 55),
  V("DNK", 54), V("NLD", 53), V("BEL", 50), V("GBR", 49), V("ESP", 48),
  V("CZE", 48), V("HUN", 47), V("FIN", 46), V("AUT", 41), V("USA", 40),
  V("IRL", 38), V("AUS", 36, 2019), V("ITA", 35), V("CAN", 33, 2019),
  V("DEU", 33), V("CHE", 27), V("POL", 26), V("RUS", 21, 2019), V("GRC", 12),
  V("TUR", 3, 2019), V("KOR", 2.5), V("JPN", 2.4), V("CHL", 73, 2019),
  V("MEX", 70, 2019), V("BRA", 67, 2019),
];

// Home ownership rate — % of households that own their home.
export const HOMEOWNERSHIP_RATE: CountrySeries[] = [
  V("ROU", 95), V("HUN", 92), V("CHN", 90, 2019), V("RUS", 89), V("SGP", 89),
  V("POL", 87), V("NOR", 79), V("PRT", 78), V("ESP", 76), V("GRC", 74),
  V("ITA", 73), V("BRA", 73, 2019), V("BEL", 71), V("FIN", 71), V("IRL", 70),
  V("MEX", 70, 2019), V("NLD", 69), V("CAN", 67, 2019), V("USA", 66),
  V("AUS", 66, 2019), V("GBR", 65), V("FRA", 65), V("SWE", 65), V("JPN", 61, 2018),
  V("DNK", 60), V("KOR", 57), V("AUT", 55), V("DEU", 51), V("CHE", 42),
];

async function seedSeries(
  prisma: PrismaClient,
  slug: string,
  series: CountrySeries[],
  countries: Map<string, number>,
  sourceId: number | null,
) {
  const indicator = await prisma.indicator.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!indicator) {
    console.warn(`⚠ ${slug} indicator missing — run ensureIndicators first`);
    return 0;
  }
  await prisma.indicatorValue.deleteMany({ where: { indicatorId: indicator.id } });

  const records = series.flatMap((c) => {
    const countryId = countries.get(c.iso3);
    if (!countryId) return [];
    return c.values.map((v) => ({
      subjectType: "COUNTRY" as const,
      indicatorId: indicator.id,
      countryId,
      year: v.year,
      value: v.value,
      kind: "ESTIMATE" as const,
      sourceId,
    }));
  });
  for (let i = 0; i < records.length; i += 2000) {
    await prisma.indicatorValue.createMany({ data: records.slice(i, i + 2000) });
  }
  return records.length;
}

export async function seedSocial(prisma: PrismaClient) {
  const oecd = await prisma.dataSource.findUnique({ where: { code: "OECD" } });
  const sourceId = oecd?.id ?? null;
  const countries = new Map(
    (await prisma.country.findMany({ select: { id: true, iso3: true } })).map(
      (c) => [c.iso3, c.id],
    ),
  );

  const d = await seedSeries(prisma, SLUG.divorceRate, DIVORCE_RATE, countries, sourceId);
  const n = await seedSeries(prisma, SLUG.nonmaritalBirths, NONMARITAL_BIRTHS, countries, sourceId);
  const h = await seedSeries(prisma, SLUG.homeownershipRate, HOMEOWNERSHIP_RATE, countries, sourceId);
  console.log(
    `✔ society indicators: ${d} divorce · ${n} nonmarital births · ${h} home ownership`,
  );
}
