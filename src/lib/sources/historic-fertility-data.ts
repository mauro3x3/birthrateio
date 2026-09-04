/* eslint-disable no-console */
// Seeds pre-1960 total fertility rate into the existing `fertility-rate`
// indicator so country-page charts extend back to 1800. Source: Gapminder's
// long-run "babies per woman" compilation (Mattias Lindgren's historic
// estimates for 1800–1949, UN World Population Prospects for 1950–1959).
// World Bank WDI remains authoritative from 1960 onward; this only ever
// touches years < 1960 and is idempotent (re-seeding replaces, not appends).

import type { PrismaClient } from "@prisma/client";
import data from "../data/historic-fertility.json";
import { SLUG } from "../indicators";

type Point = { year: number; value: number };
type SeriesMap = Record<string, Point[]>;

const payload = data as {
  sources: Record<string, { code: string; citation: string }>;
  tfr: SeriesMap;
};

/** Countries with pre-1960 Gapminder TFR coverage (for UI notes). */
export const HISTORIC_FERTILITY_ISO3 = new Set(Object.keys(payload.tfr));

export async function seedHistoricFertility(prisma: PrismaClient) {
  const [fertilityInd, gapminder] = await Promise.all([
    prisma.indicator.findUnique({
      where: { slug: SLUG.fertility },
      select: { id: true },
    }),
    prisma.dataSource.findUnique({
      where: { code: "GAPMINDER" },
      select: { id: true },
    }),
  ]);

  if (!fertilityInd) {
    console.log("⚠ fertility-rate indicator missing; run ensureIndicators first");
    return;
  }

  const iso3s = Object.keys(payload.tfr);
  const countries = new Map(
    (
      await prisma.country.findMany({
        where: { iso3: { in: iso3s } },
        select: { id: true, iso3: true },
      })
    ).map((c) => [c.iso3, c.id]),
  );

  const matched = iso3s.filter((iso3) => countries.has(iso3));
  const countryIds = matched.map((iso3) => countries.get(iso3)!);

  if (countryIds.length) {
    // Idempotent: wipe any pre-1960 points for these countries before
    // re-inserting, so re-running the seed never duplicates or goes stale.
    await prisma.indicatorValue.deleteMany({
      where: {
        subjectType: "COUNTRY",
        countryId: { in: countryIds },
        indicatorId: fertilityInd.id,
        dimension: null,
        year: { lt: 1960 },
      },
    });
  }

  const records: Array<{
    subjectType: "COUNTRY";
    countryId: number;
    indicatorId: number;
    year: number;
    value: number;
    kind: "ESTIMATE";
    sourceId: number | null;
  }> = [];

  for (const iso3 of matched) {
    const countryId = countries.get(iso3)!;
    for (const p of payload.tfr[iso3]) {
      records.push({
        subjectType: "COUNTRY",
        countryId,
        indicatorId: fertilityInd.id,
        year: p.year,
        value: p.value,
        kind: "ESTIMATE",
        sourceId: gapminder?.id ?? null,
      });
    }
  }

  const chunk = 2000;
  for (let i = 0; i < records.length; i += chunk) {
    await prisma.indicatorValue.createMany({
      data: records.slice(i, i + chunk),
      skipDuplicates: true,
    });
  }

  console.log(
    `✔ historic fertility: ${records.length} pre-1960 TFR rows across ${matched.length} countries`,
  );
}
