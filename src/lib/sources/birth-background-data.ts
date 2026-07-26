/* eslint-disable no-console */
// Curated "births by migrant background" — what share of a country's newborns
// are born to native vs migrant-background parents. There is NO single
// international definition: every statistical office measures this differently
// (mother's citizenship, mother's country of birth, parents' place of birth…),
// so each country below uses its own official categories and is labelled and
// cited precisely. Figures are % of live births. Stored in GroupComposition
// with groupKind = "BIRTHS_BACKGROUND".

import type { PrismaClient } from "@prisma/client";
import type { CompositionSeed } from "./ethnicity-data";

export const BIRTHS_BACKGROUND: CompositionSeed[] = [
  {
    // Destatis: live births by citizenship of mother (official birth register).
    iso3: "DEU",
    note: "Live births by mother's citizenship (Destatis). 'Foreign mother' = mother holds a non-German citizenship. Because many residents with a migration background are German citizens, this understates migrant-origin births — Destatis' broader measure (at least one parent with a migration background) is roughly 40% of newborns.",
    order: ["German mother", "Foreign mother"],
    years: [
      { year: 1995, groups: { "German mother": 83.8, "Foreign mother": 16.2 } },
      { year: 2000, groups: { "German mother": 83.0, "Foreign mother": 17.0 } },
      { year: 2005, groups: { "German mother": 82.2, "Foreign mother": 17.8 } },
      { year: 2010, groups: { "German mother": 83.3, "Foreign mother": 16.7 } },
      { year: 2015, groups: { "German mother": 79.9, "Foreign mother": 20.1 } },
      { year: 2018, groups: { "German mother": 76.0, "Foreign mother": 24.0 } },
      { year: 2020, groups: { "German mother": 75.8, "Foreign mother": 24.2 } },
      { year: 2022, groups: { "German mother": 74.1, "Foreign mother": 25.9 } },
      { year: 2024, groups: { "German mother": 71.3, "Foreign mother": 28.7 } },
    ],
  },
  {
    // ONS: live births in England & Wales by mother's country of birth.
    iso3: "GBR",
    note: "Live births in England & Wales by mother's country of birth (ONS). Shares computed from total vs births to mothers born outside the UK.",
    order: ["UK-born mother", "Non-UK-born mother"],
    years: [
      { year: 2008, groups: { "UK-born mother": 75.9, "Non-UK-born mother": 24.1 } },
      { year: 2010, groups: { "UK-born mother": 74.9, "Non-UK-born mother": 25.1 } },
      { year: 2012, groups: { "UK-born mother": 74.1, "Non-UK-born mother": 25.9 } },
      { year: 2014, groups: { "UK-born mother": 73.0, "Non-UK-born mother": 27.0 } },
      { year: 2016, groups: { "UK-born mother": 71.8, "Non-UK-born mother": 28.2 } },
      { year: 2018, groups: { "UK-born mother": 71.8, "Non-UK-born mother": 28.2 } },
      { year: 2020, groups: { "UK-born mother": 70.7, "Non-UK-born mother": 29.3 } },
      { year: 2022, groups: { "UK-born mother": 69.7, "Non-UK-born mother": 30.3 } },
      { year: 2024, groups: { "UK-born mother": 66.1, "Non-UK-born mother": 33.9 } },
    ],
  },
  {
    // Pew Research Center analysis of NCHS natality data.
    iso3: "USA",
    note: "Live births by mother's nativity (Pew Research Center analysis of CDC/NCHS natality data). 'Foreign-born' = mother born outside the United States.",
    order: ["US-born mother", "Foreign-born mother"],
    years: [
      { year: 1990, groups: { "US-born mother": 84.0, "Foreign-born mother": 16.0 } },
      { year: 2000, groups: { "US-born mother": 78.6, "Foreign-born mother": 21.4 } },
      { year: 2007, groups: { "US-born mother": 75.0, "Foreign-born mother": 25.0 } },
      { year: 2010, groups: { "US-born mother": 77.0, "Foreign-born mother": 23.0 } },
      { year: 2014, groups: { "US-born mother": 77.0, "Foreign-born mother": 23.0 } },
    ],
  },
  {
    // INED / INSEE: live births by parents' place of birth (per 100 births).
    iso3: "FRA",
    note: "Live births by parents' place of birth (INED/INSEE). 'France-born' parents include those born in France's overseas territories.",
    order: [
      "Both parents France-born",
      "One parent born abroad",
      "Both parents born abroad",
    ],
    years: [
      { year: 2013, groups: { "Both parents France-born": 71.8, "One parent born abroad": 14.8, "Both parents born abroad": 13.4 } },
      { year: 2014, groups: { "Both parents France-born": 71.0, "One parent born abroad": 15.0, "Both parents born abroad": 14.0 } },
      { year: 2015, groups: { "Both parents France-born": 70.4, "One parent born abroad": 15.0, "Both parents born abroad": 14.6 } },
      { year: 2016, groups: { "Both parents France-born": 69.6, "One parent born abroad": 15.2, "Both parents born abroad": 15.2 } },
      { year: 2017, groups: { "Both parents France-born": 69.0, "One parent born abroad": 15.3, "Both parents born abroad": 15.7 } },
      { year: 2018, groups: { "Both parents France-born": 68.6, "One parent born abroad": 15.2, "Both parents born abroad": 16.2 } },
      { year: 2019, groups: { "Both parents France-born": 68.0, "One parent born abroad": 15.2, "Both parents born abroad": 16.8 } },
      { year: 2020, groups: { "Both parents France-born": 68.4, "One parent born abroad": 15.0, "Both parents born abroad": 16.6 } },
    ],
  },
  {
    // CBS (Statistics Netherlands): live births by mother's migration background.
    iso3: "NLD",
    note: "Live births by mother's migration background (CBS, Statistics Netherlands). CBS has since retired the 'migration background' concept in favour of a country-of-origin classification, so this series ends in 2022.",
    order: ["Dutch-background mother", "Migration-background mother"],
    years: [
      { year: 2010, groups: { "Dutch-background mother": 72.5, "Migration-background mother": 27.5 } },
      { year: 2015, groups: { "Dutch-background mother": 69.6, "Migration-background mother": 30.4 } },
      { year: 2020, groups: { "Dutch-background mother": 67.2, "Migration-background mother": 32.8 } },
      { year: 2022, groups: { "Dutch-background mother": 66.3, "Migration-background mother": 33.7 } },
    ],
  },
  {
    // Statistics Canada: live births by mother's place of birth (CVSB).
    iso3: "CAN",
    note: "Live births by mother's place of birth (Statistics Canada, Canadian Vital Statistics). 'Foreign-born' = mother born outside Canada. 2024 figure is preliminary.",
    order: ["Canadian-born mother", "Foreign-born mother"],
    years: [
      { year: 1997, groups: { "Canadian-born mother": 77.5, "Foreign-born mother": 22.5 } },
      { year: 2000, groups: { "Canadian-born mother": 75.8, "Foreign-born mother": 24.2 } },
      { year: 2005, groups: { "Canadian-born mother": 73.8, "Foreign-born mother": 26.2 } },
      { year: 2010, groups: { "Canadian-born mother": 72.6, "Foreign-born mother": 27.4 } },
      { year: 2015, groups: { "Canadian-born mother": 70.3, "Foreign-born mother": 29.7 } },
      { year: 2019, groups: { "Canadian-born mother": 66.2, "Foreign-born mother": 33.8 } },
      { year: 2021, groups: { "Canadian-born mother": 67.0, "Foreign-born mother": 33.0 } },
      { year: 2022, groups: { "Canadian-born mother": 64.2, "Foreign-born mother": 35.8 } },
      { year: 2023, groups: { "Canadian-born mother": 60.7, "Foreign-born mother": 39.3 } },
      { year: 2024, groups: { "Canadian-born mother": 57.7, "Foreign-born mother": 42.3 } },
    ],
  },
  {
    // Statistics Sweden (SCB): live births by parents' country of birth.
    iso3: "SWE",
    note: "Live births by parents' country of birth (Statistics Sweden). 2002 and 2012 are period averages for 2000–2004 and 2010–2014 respectively.",
    order: ["Both parents Sweden-born", "At least one parent foreign-born"],
    years: [
      { year: 1970, groups: { "Both parents Sweden-born": 84.0, "At least one parent foreign-born": 16.0 } },
      { year: 2002, groups: { "Both parents Sweden-born": 75.0, "At least one parent foreign-born": 25.0 } },
      { year: 2012, groups: { "Both parents Sweden-born": 67.0, "At least one parent foreign-born": 33.0 } },
      { year: 2018, groups: { "Both parents Sweden-born": 62.0, "At least one parent foreign-born": 38.0 } },
    ],
  },
];

// iso3 → methodology note, surfaced in the UI so each country's definition is
// transparent (the GroupComposition table doesn't carry a note column).
export const BIRTH_BACKGROUND_NOTES = new Map(
  BIRTHS_BACKGROUND.map((c) => [c.iso3, c.note ?? null]),
);

export async function seedBirthBackground(prisma: PrismaClient) {
  const source = await prisma.dataSource.findUnique({
    where: { code: "NATIONAL_CENSUS" },
    select: { id: true },
  });
  const sourceId = source?.id ?? null;

  const countries = new Map(
    (await prisma.country.findMany({ select: { id: true, iso3: true } })).map(
      (c) => [c.iso3, c.id],
    ),
  );

  let rows = 0;
  for (const comp of BIRTHS_BACKGROUND) {
    const countryId = countries.get(comp.iso3);
    if (!countryId) continue;
    await prisma.groupComposition.deleteMany({
      where: { countryId, groupKind: "BIRTHS_BACKGROUND" },
    });
    for (const snap of comp.years) {
      // Insert in declared `order` so the chart's stack/legend order is stable.
      for (const groupName of comp.order) {
        const share = snap.groups[groupName];
        if (share == null) continue;
        await prisma.groupComposition.create({
          data: {
            countryId,
            year: snap.year,
            groupKind: "BIRTHS_BACKGROUND",
            groupName,
            share,
            sourceId,
          },
        });
        rows++;
      }
    }
  }
  console.log(
    `✔ ${rows} births-by-background rows (${BIRTHS_BACKGROUND.length} countries)`,
  );
}
