/* eslint-disable no-console */
// Seeds long-run mortality series from Our World in Data / Human Mortality
// Database: historic crude death rates (HMD), pre-1960 life expectancy, and
// under-five mortality. Idempotent.

import type { PrismaClient } from "@prisma/client";
import data from "../data/historic-mortality.json";
import { SLUG } from "../indicators";

type Point = { year: number; value: number };
type SeriesMap = Record<string, Point[]>;

const payload = data as {
  sources: Record<string, { code: string; citation: string }>;
  deathRate: SeriesMap;
  lifeExpectancyHistoric: SeriesMap;
  childMortality: SeriesMap;
};

async function insertSeries(
  prisma: PrismaClient,
  countries: Map<string, number>,
  indicatorId: number,
  series: SeriesMap,
  sourceId: number | null,
  opts: { deleteYearsBefore?: number; deleteAll?: boolean } = {},
) {
  const iso3s = Object.keys(series).filter((iso3) => countries.has(iso3));
  const countryIds = iso3s.map((iso3) => countries.get(iso3)!);

  if (opts.deleteAll && countryIds.length) {
    await prisma.indicatorValue.deleteMany({
      where: {
        subjectType: "COUNTRY",
        countryId: { in: countryIds },
        indicatorId,
        dimension: null,
      },
    });
  } else if (opts.deleteYearsBefore != null && countryIds.length) {
    await prisma.indicatorValue.deleteMany({
      where: {
        subjectType: "COUNTRY",
        countryId: { in: countryIds },
        indicatorId,
        dimension: null,
        year: { lt: opts.deleteYearsBefore },
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

  for (const iso3 of iso3s) {
    const countryId = countries.get(iso3)!;
    for (const p of series[iso3]) {
      records.push({
        subjectType: "COUNTRY",
        countryId,
        indicatorId,
        year: p.year,
        value: p.value,
        kind: "ESTIMATE",
        sourceId,
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
  return records.length;
}

export async function seedHistoricMortality(prisma: PrismaClient) {
  const [deathInd, lifeInd, childInd, hmd, owid] = await Promise.all([
    prisma.indicator.findUnique({
      where: { slug: SLUG.historicDeathRate },
      select: { id: true },
    }),
    prisma.indicator.findUnique({
      where: { slug: SLUG.lifeExpectancy },
      select: { id: true },
    }),
    prisma.indicator.findUnique({
      where: { slug: SLUG.childMortality },
      select: { id: true },
    }),
    prisma.dataSource.findUnique({ where: { code: "HMD" }, select: { id: true } }),
    prisma.dataSource.findUnique({ where: { code: "OWID" }, select: { id: true } }),
  ]);

  if (!deathInd || !lifeInd || !childInd) {
    console.log(
      "⚠ historic mortality indicators missing; run ensureIndicators first",
    );
    return;
  }

  const allIso3 = new Set([
    ...Object.keys(payload.deathRate),
    ...Object.keys(payload.lifeExpectancyHistoric),
    ...Object.keys(payload.childMortality),
  ]);

  const countries = new Map(
    (
      await prisma.country.findMany({
        where: { iso3: { in: [...allIso3] } },
        select: { id: true, iso3: true },
      })
    ).map((c) => [c.iso3, c.id]),
  );

  const nDeath = await insertSeries(
    prisma,
    countries,
    deathInd.id,
    payload.deathRate,
    hmd?.id ?? owid?.id ?? null,
    { deleteAll: true },
  );

  const nLife = await insertSeries(
    prisma,
    countries,
    lifeInd.id,
    payload.lifeExpectancyHistoric,
    owid?.id ?? null,
    { deleteYearsBefore: 1960 },
  );

  const nChild = await insertSeries(
    prisma,
    countries,
    childInd.id,
    payload.childMortality,
    owid?.id ?? null,
    { deleteAll: true },
  );

  console.log(
    `✔ historic mortality: ${nDeath} HMD death-rate, ${nLife} pre-1960 life expectancy, ${nChild} child-mortality rows`,
  );
}

/** Countries with HMD long crude-death-rate coverage (for UI notes). */
export const HMD_DEATH_RATE_ISO3 = new Set(Object.keys(payload.deathRate));
