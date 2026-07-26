/* eslint-disable no-console */
// Curated ethnic / racial composition over time, compiled from national
// censuses. Stored in the GroupComposition table (groupKind = "ETHNICITY").
// Figures are % of population. Pre-/post-2024 US figures combine historical
// census counts with official U.S. Census Bureau projections.
//
// This is an MVP seed for the most-requested and best-documented countries.
// New countries are added by appending to COMPOSITIONS — no schema change.

import type { PrismaClient } from "@prisma/client";

export interface CompositionSeed {
  iso3: string;
  note?: string;
  // Display order for groups in the stacked chart.
  order: string[];
  years: { year: number; groups: Record<string, number> }[];
}

export const COMPOSITIONS: CompositionSeed[] = [
  {
    iso3: "USA",
    note: "U.S. Census Bureau (1980–2020 census; 2030–2060 projections).",
    order: ["White (non-Hispanic)", "Hispanic", "Black", "Asian", "Other / Multiple"],
    years: [
      { year: 1980, groups: { "White (non-Hispanic)": 79.6, Hispanic: 6.5, Black: 11.5, Asian: 1.5, "Other / Multiple": 0.9 } },
      { year: 1990, groups: { "White (non-Hispanic)": 75.6, Hispanic: 9.0, Black: 11.7, Asian: 2.8, "Other / Multiple": 0.9 } },
      { year: 2000, groups: { "White (non-Hispanic)": 69.1, Hispanic: 12.5, Black: 12.1, Asian: 3.6, "Other / Multiple": 2.7 } },
      { year: 2010, groups: { "White (non-Hispanic)": 63.7, Hispanic: 16.3, Black: 12.2, Asian: 4.7, "Other / Multiple": 3.1 } },
      { year: 2020, groups: { "White (non-Hispanic)": 57.8, Hispanic: 18.7, Black: 12.1, Asian: 5.9, "Other / Multiple": 5.5 } },
      { year: 2030, groups: { "White (non-Hispanic)": 55.5, Hispanic: 21.1, Black: 12.4, Asian: 6.6, "Other / Multiple": 4.4 } },
      { year: 2045, groups: { "White (non-Hispanic)": 49.7, Hispanic: 24.6, Black: 12.7, Asian: 7.9, "Other / Multiple": 5.1 } },
      { year: 2060, groups: { "White (non-Hispanic)": 44.3, Hispanic: 27.5, Black: 13.0, Asian: 9.1, "Other / Multiple": 6.1 } },
    ],
  },
  {
    iso3: "GBR",
    note: "Census of England & Wales (ONS).",
    order: ["White", "Asian", "Black", "Mixed", "Other"],
    years: [
      { year: 1991, groups: { White: 94.1, Asian: 3.0, Black: 1.6, Mixed: 0.0, Other: 1.3 } },
      { year: 2001, groups: { White: 91.3, Asian: 4.4, Black: 2.2, Mixed: 1.3, Other: 0.8 } },
      { year: 2011, groups: { White: 86.0, Asian: 7.5, Black: 3.3, Mixed: 2.2, Other: 1.0 } },
      { year: 2021, groups: { White: 81.7, Asian: 9.3, Black: 4.0, Mixed: 2.9, Other: 2.1 } },
    ],
  },
  {
    iso3: "SGP",
    note: "Singapore Dept. of Statistics (resident population).",
    order: ["Chinese", "Malay", "Indian", "Other"],
    years: [
      { year: 1990, groups: { Chinese: 77.8, Malay: 14.0, Indian: 7.1, Other: 1.1 } },
      { year: 2000, groups: { Chinese: 76.8, Malay: 13.9, Indian: 7.9, Other: 1.4 } },
      { year: 2010, groups: { Chinese: 74.1, Malay: 13.4, Indian: 9.2, Other: 3.3 } },
      { year: 2020, groups: { Chinese: 74.3, Malay: 13.5, Indian: 9.0, Other: 3.2 } },
    ],
  },
  {
    iso3: "ZAF",
    note: "Statistics South Africa (census).",
    order: ["Black African", "Coloured", "White", "Indian / Asian"],
    years: [
      { year: 1996, groups: { "Black African": 76.7, Coloured: 8.9, White: 10.9, "Indian / Asian": 2.6 } },
      { year: 2001, groups: { "Black African": 79.0, Coloured: 8.9, White: 9.6, "Indian / Asian": 2.5 } },
      { year: 2011, groups: { "Black African": 79.2, Coloured: 8.9, White: 8.9, "Indian / Asian": 2.5 } },
      { year: 2022, groups: { "Black African": 81.4, Coloured: 8.2, White: 7.3, "Indian / Asian": 2.7 } },
    ],
  },
  {
    iso3: "MYS",
    note: "Dept. of Statistics Malaysia (citizens).",
    order: ["Bumiputera", "Chinese", "Indian", "Other"],
    years: [
      { year: 1990, groups: { Bumiputera: 60.6, Chinese: 28.1, Indian: 7.9, Other: 3.4 } },
      { year: 2000, groups: { Bumiputera: 65.1, Chinese: 26.0, Indian: 7.7, Other: 1.2 } },
      { year: 2010, groups: { Bumiputera: 67.4, Chinese: 24.6, Indian: 7.3, Other: 0.7 } },
      { year: 2020, groups: { Bumiputera: 69.8, Chinese: 22.4, Indian: 6.8, Other: 1.0 } },
    ],
  },
  {
    iso3: "BRA",
    note: "IBGE census (self-declared colour/race).",
    order: ["Pardo (mixed)", "White", "Black", "Asian / Indigenous"],
    years: [
      { year: 1991, groups: { "Pardo (mixed)": 42.5, White: 51.6, Black: 5.0, "Asian / Indigenous": 0.9 } },
      { year: 2000, groups: { "Pardo (mixed)": 38.5, White: 53.7, Black: 6.2, "Asian / Indigenous": 1.6 } },
      { year: 2010, groups: { "Pardo (mixed)": 43.1, White: 47.7, Black: 7.6, "Asian / Indigenous": 1.6 } },
      { year: 2022, groups: { "Pardo (mixed)": 45.3, White: 43.5, Black: 10.2, "Asian / Indigenous": 1.0 } },
    ],
  },
];

// Ethnic / racial composition of BIRTHS over time (share of births by the
// mother's group). A leading indicator of future population change — the
// newborn cohort is much more diverse than the population as a whole.
// Stored with groupKind = "BIRTHS_ETHNICITY".
export const COMPOSITIONS_BIRTHS: CompositionSeed[] = [
  {
    iso3: "USA",
    note: "CDC/NCHS natality data (births by mother's race & Hispanic origin).",
    order: ["White (non-Hispanic)", "Hispanic", "Black", "Asian", "Other / Multiple"],
    years: [
      { year: 1990, groups: { "White (non-Hispanic)": 62.8, Hispanic: 14.8, Black: 16.9, Asian: 3.6, "Other / Multiple": 1.9 } },
      { year: 1995, groups: { "White (non-Hispanic)": 60.0, Hispanic: 17.6, Black: 15.5, Asian: 4.2, "Other / Multiple": 2.7 } },
      { year: 2000, groups: { "White (non-Hispanic)": 57.9, Hispanic: 20.6, Black: 15.0, Asian: 4.8, "Other / Multiple": 1.7 } },
      { year: 2005, groups: { "White (non-Hispanic)": 55.0, Hispanic: 23.0, Black: 14.5, Asian: 5.3, "Other / Multiple": 2.2 } },
      { year: 2010, groups: { "White (non-Hispanic)": 53.5, Hispanic: 24.9, Black: 14.6, Asian: 5.7, "Other / Multiple": 1.3 } },
      { year: 2015, groups: { "White (non-Hispanic)": 52.0, Hispanic: 23.0, Black: 15.0, Asian: 6.4, "Other / Multiple": 3.6 } },
      { year: 2020, groups: { "White (non-Hispanic)": 50.1, Hispanic: 24.0, Black: 14.6, Asian: 6.4, "Other / Multiple": 4.9 } },
      { year: 2022, groups: { "White (non-Hispanic)": 49.4, Hispanic: 24.7, Black: 14.4, Asian: 6.4, "Other / Multiple": 5.1 } },
    ],
  },
  {
    iso3: "GBR",
    note: "ONS births by ethnicity, England & Wales.",
    order: ["White", "Asian", "Black", "Mixed", "Other"],
    years: [
      { year: 2007, groups: { White: 79.6, Asian: 9.8, Black: 4.8, Mixed: 3.3, Other: 2.5 } },
      { year: 2012, groups: { White: 75.6, Asian: 11.4, Black: 5.2, Mixed: 4.4, Other: 3.4 } },
      { year: 2017, groups: { White: 73.4, Asian: 12.1, Black: 5.3, Mixed: 5.2, Other: 4.0 } },
      { year: 2021, groups: { White: 70.5, Asian: 13.4, Black: 5.5, Mixed: 6.0, Other: 4.6 } },
    ],
  },
];

async function seedKind(
  prisma: PrismaClient,
  comps: CompositionSeed[],
  groupKind: string,
  sourceId: number | null,
) {
  const countries = new Map(
    (await prisma.country.findMany({ select: { id: true, iso3: true } })).map(
      (c) => [c.iso3, c.id],
    ),
  );
  let rows = 0;
  for (const comp of comps) {
    const countryId = countries.get(comp.iso3);
    if (!countryId) continue;
    // Idempotent: clear existing rows of this kind for this country.
    await prisma.groupComposition.deleteMany({
      where: { countryId, groupKind },
    });
    for (const snap of comp.years) {
      for (const [groupName, share] of Object.entries(snap.groups)) {
        await prisma.groupComposition.create({
          data: {
            countryId,
            year: snap.year,
            groupKind,
            groupName,
            share,
            sourceId,
          },
        });
        rows++;
      }
    }
  }
  return rows;
}

export async function seedEthnicity(prisma: PrismaClient) {
  const source = await prisma.dataSource.findUnique({
    where: { code: "NATIONAL_CENSUS" },
  });
  const sourceId = source?.id ?? null;

  const popRows = await seedKind(prisma, COMPOSITIONS, "ETHNICITY", sourceId);
  console.log(`✔ ${popRows} ethnicity composition rows (${COMPOSITIONS.length} countries)`);

  const birthRows = await seedKind(
    prisma,
    COMPOSITIONS_BIRTHS,
    "BIRTHS_ETHNICITY",
    sourceId,
  );
  console.log(
    `✔ ${birthRows} births-by-ethnicity rows (${COMPOSITIONS_BIRTHS.length} countries)`,
  );
}

// Stable display order lookup used by the UI.
export const COMPOSITION_ORDER = new Map(
  COMPOSITIONS.map((c) => [c.iso3, c.order]),
);
