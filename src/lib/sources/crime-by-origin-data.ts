/* eslint-disable no-console */
// Crime / convictions by ancestry, immigrant background, or citizenship —
// only where national offices (or Eurostat) publish comparable figures.
// Definitions differ by country; each series is labelled and cited.
// Stored as GroupComposition (counts + shares) and IndicatorValue
// (foreign-prisoner share).

import type { PrismaClient } from "@prisma/client";
import denmark from "../data/crime-by-ancestry-denmark.json";
import norway from "../data/crime-by-citizenship-norway.json";
import sweden from "../data/crime-by-background-sweden.json";
import usa from "../data/crime-by-race-usa.json";
import eurostatPrison from "../data/eurostat-prisoners-citizenship.json";
import availability from "../data/crime-data-availability.json";
import { SLUG } from "../indicators";

export type CrimeAvailabilityStatus =
  | "AVAILABLE"
  | "PARTIAL"
  | "LIMITED"
  | "HISTORICAL"
  | "NOT_AVAILABLE";

export type CrimeAvailabilityEntry = {
  iso3: string;
  status: CrimeAvailabilityStatus;
  level: string | null;
  detail: string;
  sourceUrl: string | null;
};

export const CRIME_DATA_AVAILABILITY = availability as {
  metric: string;
  updated: string;
  note: string;
  countries: CrimeAvailabilityEntry[];
  eurostatPrisonCitizenship: string;
};

export const CRIME_AVAILABILITY_BY_ISO3 = new Map(
  CRIME_DATA_AVAILABILITY.countries.map((c) => [c.iso3, c]),
);

const CRIME_META: Record<
  string,
  { groupKind: string; note: string; sourceUrl: string; absolute: boolean }
> = {
  DNK: {
    groupKind: "CRIME_ANCESTRY",
    note: denmark.definition,
    sourceUrl: denmark.sourceUrl,
    absolute: true,
  },
  NOR: {
    groupKind: "CRIME_CITIZENSHIP",
    note: norway.definition,
    sourceUrl: norway.sourceUrl,
    absolute: true,
  },
  SWE: {
    groupKind: "CRIME_BACKGROUND",
    note: sweden.definition,
    sourceUrl: sweden.sourceUrl,
    absolute: false,
  },
  USA: {
    groupKind: "CRIME_RACE_PRISON",
    note: usa.prisoners.definition,
    sourceUrl: usa.prisoners.sourceUrl,
    absolute: true,
  },
};

export const USA_CRIME_NOTES = {
  prisoners: usa.prisoners.definition,
  arrests: usa.arrests.definition,
  murderArrests: usa.murderArrests.definition,
};

export function getCrimeMeta(iso3: string) {
  return CRIME_META[iso3] ?? null;
}

async function seedCompositionSeries(
  prisma: PrismaClient,
  opts: {
    iso3: string;
    groupKind: string;
    groups: string[];
    series: Array<{ year: number; groups: Record<string, number> }>;
    absolute: boolean;
    sourceId: number | null;
  },
) {
  const country = await prisma.country.findUnique({
    where: { iso3: opts.iso3 },
    select: { id: true },
  });
  if (!country) return 0;

  await prisma.groupComposition.deleteMany({
    where: { countryId: country.id, groupKind: opts.groupKind },
  });

  let rows = 0;
  for (const snap of opts.series) {
    const total = opts.groups.reduce(
      (s, g) => s + (snap.groups[g] ?? 0),
      0,
    );
    for (const groupName of opts.groups) {
      const raw = snap.groups[groupName] ?? 0;
      const share = opts.absolute
        ? total > 0
          ? (raw / total) * 100
          : 0
        : raw;
      await prisma.groupComposition.create({
        data: {
          countryId: country.id,
          year: snap.year,
          groupKind: opts.groupKind,
          groupName,
          share,
          population: opts.absolute ? raw : null,
          sourceId: opts.sourceId,
        },
      });
      rows++;
    }
  }
  return rows;
}

export async function seedCrimeByOrigin(prisma: PrismaClient) {
  const [national, eurostat, prisInd] = await Promise.all([
    prisma.dataSource.findUnique({
      where: { code: "NATIONAL_STATS" },
      select: { id: true },
    }),
    prisma.dataSource.upsert({
      where: { code: "EUROSTAT" },
      update: {},
      create: {
        code: "EUROSTAT",
        name: "Eurostat",
        url: "https://ec.europa.eu/eurostat",
        license: "Eurostat terms (CC BY 4.0)",
        description:
          "European statistical office — crime, population and social statistics.",
      },
      select: { id: true },
    }),
    prisma.indicator.findUnique({
      where: { slug: SLUG.foreignPrisonerShare },
      select: { id: true },
    }),
  ]);

  let compositionRows = 0;

  compositionRows += await seedCompositionSeries(prisma, {
    iso3: "DNK",
    groupKind: "CRIME_ANCESTRY",
    groups: denmark.groups,
    series: denmark.series,
    absolute: true,
    sourceId: national?.id ?? null,
  });
  console.log(`✔ Denmark crime-by-ancestry (STRAFNA9)`);

  compositionRows += await seedCompositionSeries(prisma, {
    iso3: "NOR",
    groupKind: "CRIME_CITIZENSHIP",
    groups: norway.groups,
    series: norway.series,
    absolute: true,
    sourceId: national?.id ?? null,
  });
  console.log(`✔ Norway persons charged by citizenship (SSB 09421)`);

  compositionRows += await seedCompositionSeries(prisma, {
    iso3: "SWE",
    groupKind: "CRIME_BACKGROUND",
    groups: sweden.groups,
    series: sweden.series,
    absolute: false,
    sourceId: national?.id ?? null,
  });
  console.log(`✔ Sweden Brå offence shares by background (2007 & 2018)`);

  const bjsSource = await prisma.dataSource.upsert({
    where: { code: "US_BJS_FBI" },
    update: {
      name: "U.S. BJS / FBI UCR",
      url: "https://bjs.ojp.gov",
      description:
        "Bureau of Justice Statistics prisoner statistics and FBI Uniform Crime Reporting arrest tables.",
    },
    create: {
      code: "US_BJS_FBI",
      name: "U.S. BJS / FBI UCR",
      url: "https://bjs.ojp.gov",
      license: "U.S. Government public domain",
      description:
        "Bureau of Justice Statistics prisoner statistics and FBI Uniform Crime Reporting arrest tables.",
    },
    select: { id: true },
  });

  compositionRows += await seedCompositionSeries(prisma, {
    iso3: "USA",
    groupKind: "CRIME_RACE_PRISON",
    groups: usa.prisoners.groups,
    series: usa.prisoners.series,
    absolute: true,
    sourceId: bjsSource.id,
  });
  console.log(`✔ USA sentenced prisoners by race/Hispanic origin (BJS)`);

  compositionRows += await seedCompositionSeries(prisma, {
    iso3: "USA",
    groupKind: "CRIME_RACE_ARREST",
    groups: usa.arrests.groups,
    series: usa.arrests.series,
    absolute: true,
    sourceId: bjsSource.id,
  });
  console.log(`✔ USA arrests by race (FBI UCR Table 43)`);

  compositionRows += await seedCompositionSeries(prisma, {
    iso3: "USA",
    groupKind: "CRIME_RACE_MURDER",
    groups: usa.murderArrests.groups,
    series: usa.murderArrests.series,
    absolute: true,
    sourceId: bjsSource.id,
  });
  console.log(`✔ USA murder arrests by race (FBI UCR Table 43)`);

  // Eurostat: foreign citizenship share of prisoners
  let prisonRows = 0;
  if (prisInd) {
    const iso3s = Object.keys(eurostatPrison.countries);
    const countries = new Map(
      (
        await prisma.country.findMany({
          where: { iso3: { in: iso3s } },
          select: { id: true, iso3: true },
        })
      ).map((c) => [c.iso3, c.id]),
    );

    const countryIds = [...countries.values()];
    await prisma.indicatorValue.deleteMany({
      where: {
        subjectType: "COUNTRY",
        countryId: { in: countryIds },
        indicatorId: prisInd.id,
      },
    });

    const records: Array<{
      subjectType: string;
      countryId: number;
      indicatorId: number;
      year: number;
      value: number;
      kind: string;
      sourceId: number | null;
    }> = [];

    for (const [iso3, entry] of Object.entries(eurostatPrison.countries)) {
      const countryId = countries.get(iso3);
      if (!countryId) continue;
      for (const p of entry.series) {
        records.push({
          subjectType: "COUNTRY",
          countryId,
          indicatorId: prisInd.id,
          year: p.year,
          value: p.sharePct,
          kind: "ESTIMATE",
          sourceId: eurostat.id,
        });
      }
    }

    const chunk = 1000;
    for (let i = 0; i < records.length; i += chunk) {
      await prisma.indicatorValue.createMany({
        data: records.slice(i, i + chunk),
      });
    }
    prisonRows = records.length;
    console.log(
      `✔ ${prisonRows} foreign-prisoner-share rows (${countries.size} countries, Eurostat)`,
    );
  } else {
    console.log(
      "⚠ foreign-prisoner-share indicator missing; run ensureIndicators",
    );
  }

  console.log(
    `✔ crime-by-origin: ${compositionRows} composition rows + ${prisonRows} prison-share rows`,
  );
}
