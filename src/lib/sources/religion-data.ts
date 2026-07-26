/* eslint-disable no-console */
// Curated religious composition (share of population by religion), compiled
// from the Pew Research Center and national censuses. Stored in the
// GroupComposition table with groupKind = "RELIGION". Mostly a single recent
// snapshot per country. Add countries by appending to RELIGIONS.

import type { PrismaClient } from "@prisma/client";
import type { CompositionSeed } from "./ethnicity-data";

// Stable colours per religion so the same faith reads the same across pages.
export const RELIGION_COLORS: Record<string, string> = {
  Christian: "hsl(221 83% 53%)",
  Muslim: "hsl(142 71% 45%)",
  Unaffiliated: "hsl(215 16% 55%)",
  Hindu: "hsl(25 95% 53%)",
  Buddhist: "hsl(48 96% 53%)",
  Jewish: "hsl(280 65% 60%)",
  "Folk religion": "hsl(190 90% 42%)",
  Sikh: "hsl(340 82% 52%)",
  Other: "hsl(215 20% 75%)",
};

export const RELIGION_COLOR_FALLBACK = "hsl(215 20% 75%)";

export const RELIGIONS: CompositionSeed[] = [
  { iso3: "USA", order: ["Christian", "Unaffiliated", "Jewish", "Muslim", "Buddhist", "Hindu", "Other"], years: [{ year: 2020, groups: { Christian: 67, Unaffiliated: 23, Jewish: 2, Muslim: 1, Buddhist: 1, Hindu: 1, Other: 5 } }] },
  { iso3: "GBR", order: ["Christian", "Unaffiliated", "Muslim", "Hindu", "Other"], years: [{ year: 2021, groups: { Christian: 46, Unaffiliated: 37, Muslim: 6.5, Hindu: 1.7, Other: 8.8 } }] },
  { iso3: "FRA", order: ["Christian", "Unaffiliated", "Muslim", "Jewish", "Buddhist", "Other"], years: [{ year: 2020, groups: { Christian: 58, Unaffiliated: 31, Muslim: 8, Jewish: 1, Buddhist: 1, Other: 1 } }] },
  { iso3: "DEU", order: ["Christian", "Unaffiliated", "Muslim", "Other"], years: [{ year: 2020, groups: { Christian: 56, Unaffiliated: 38, Muslim: 5, Other: 1 } }] },
  { iso3: "ITA", order: ["Christian", "Unaffiliated", "Muslim", "Other"], years: [{ year: 2020, groups: { Christian: 80, Unaffiliated: 15, Muslim: 4, Other: 1 } }] },
  { iso3: "ESP", order: ["Christian", "Unaffiliated", "Muslim", "Other"], years: [{ year: 2020, groups: { Christian: 58, Unaffiliated: 39, Muslim: 2.5, Other: 0.5 } }] },
  { iso3: "PRT", order: ["Christian", "Unaffiliated", "Other"], years: [{ year: 2020, groups: { Christian: 84, Unaffiliated: 14, Other: 2 } }] },
  { iso3: "POL", order: ["Christian", "Unaffiliated", "Other"], years: [{ year: 2020, groups: { Christian: 92, Unaffiliated: 7, Other: 1 } }] },
  { iso3: "NLD", order: ["Unaffiliated", "Christian", "Muslim", "Other"], years: [{ year: 2020, groups: { Unaffiliated: 50, Christian: 44, Muslim: 5, Other: 1 } }] },
  { iso3: "SWE", order: ["Christian", "Unaffiliated", "Muslim", "Other"], years: [{ year: 2020, groups: { Christian: 60, Unaffiliated: 36, Muslim: 3, Other: 1 } }] },
  { iso3: "NOR", order: ["Christian", "Unaffiliated", "Muslim", "Other"], years: [{ year: 2020, groups: { Christian: 67, Unaffiliated: 28, Muslim: 4, Other: 1 } }] },
  { iso3: "DNK", order: ["Christian", "Unaffiliated", "Muslim", "Other"], years: [{ year: 2020, groups: { Christian: 73, Unaffiliated: 22, Muslim: 4, Other: 1 } }] },
  { iso3: "IRL", order: ["Christian", "Unaffiliated", "Other", "Muslim"], years: [{ year: 2020, groups: { Christian: 79, Unaffiliated: 16, Other: 3.5, Muslim: 1.5 } }] },
  { iso3: "GRC", order: ["Christian", "Muslim", "Unaffiliated", "Other"], years: [{ year: 2020, groups: { Christian: 90, Muslim: 5, Unaffiliated: 4, Other: 1 } }] },
  { iso3: "RUS", order: ["Christian", "Unaffiliated", "Muslim", "Other"], years: [{ year: 2020, groups: { Christian: 73, Unaffiliated: 15, Muslim: 10, Other: 2 } }] },
  { iso3: "TUR", order: ["Muslim", "Unaffiliated", "Other"], years: [{ year: 2020, groups: { Muslim: 98, Unaffiliated: 1, Other: 1 } }] },
  { iso3: "SAU", order: ["Muslim", "Christian", "Hindu", "Other"], years: [{ year: 2020, groups: { Muslim: 93, Christian: 4, Hindu: 1, Other: 2 } }] },
  { iso3: "EGY", order: ["Muslim", "Christian"], years: [{ year: 2020, groups: { Muslim: 90, Christian: 10 } }] },
  { iso3: "ISR", order: ["Jewish", "Muslim", "Christian", "Other"], years: [{ year: 2020, groups: { Jewish: 74, Muslim: 18, Christian: 2, Other: 6 } }] },
  { iso3: "IND", order: ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Other"], years: [{ year: 2020, groups: { Hindu: 80, Muslim: 14, Christian: 2.3, Sikh: 1.7, Buddhist: 0.7, Other: 1.3 } }] },
  { iso3: "PAK", order: ["Muslim", "Hindu", "Christian", "Other"], years: [{ year: 2020, groups: { Muslim: 96, Hindu: 2, Christian: 1.5, Other: 0.5 } }] },
  { iso3: "IDN", order: ["Muslim", "Christian", "Hindu", "Buddhist", "Other"], years: [{ year: 2020, groups: { Muslim: 87, Christian: 10, Hindu: 1.7, Buddhist: 0.7, Other: 0.6 } }] },
  { iso3: "CHN", order: ["Unaffiliated", "Folk religion", "Buddhist", "Christian", "Muslim", "Other"], years: [{ year: 2020, groups: { Unaffiliated: 52, "Folk religion": 22, Buddhist: 18, Christian: 5, Muslim: 2, Other: 1 } }] },
  { iso3: "JPN", order: ["Unaffiliated", "Buddhist", "Christian", "Other"], years: [{ year: 2020, groups: { Unaffiliated: 57, Buddhist: 36, Christian: 2, Other: 5 } }] },
  { iso3: "KOR", order: ["Unaffiliated", "Christian", "Buddhist"], years: [{ year: 2020, groups: { Unaffiliated: 56, Christian: 28, Buddhist: 16 } }] },
  { iso3: "THA", order: ["Buddhist", "Muslim", "Christian", "Other"], years: [{ year: 2020, groups: { Buddhist: 93, Muslim: 5, Christian: 1, Other: 1 } }] },
  { iso3: "VNM", order: ["Folk religion", "Unaffiliated", "Buddhist", "Christian", "Other"], years: [{ year: 2020, groups: { "Folk religion": 45, Unaffiliated: 30, Buddhist: 16, Christian: 8, Other: 1 } }] },
  { iso3: "PHL", order: ["Christian", "Muslim", "Other"], years: [{ year: 2020, groups: { Christian: 90, Muslim: 6, Other: 4 } }] },
  { iso3: "BRA", order: ["Christian", "Unaffiliated", "Other"], years: [{ year: 2020, groups: { Christian: 84, Unaffiliated: 11, Other: 5 } }] },
  { iso3: "MEX", order: ["Christian", "Unaffiliated", "Other"], years: [{ year: 2020, groups: { Christian: 95, Unaffiliated: 4, Other: 1 } }] },
  { iso3: "NGA", order: ["Muslim", "Christian", "Other"], years: [{ year: 2020, groups: { Muslim: 50, Christian: 48, Other: 2 } }] },
  { iso3: "ZAF", order: ["Christian", "Unaffiliated", "Muslim", "Other"], years: [{ year: 2020, groups: { Christian: 86, Unaffiliated: 11, Muslim: 2, Other: 1 } }] },
  { iso3: "AUS", order: ["Christian", "Unaffiliated", "Muslim", "Hindu", "Buddhist", "Other"], years: [{ year: 2021, groups: { Christian: 52, Unaffiliated: 39, Muslim: 3.2, Hindu: 2.7, Buddhist: 2.4, Other: 0.5 } }] },
  { iso3: "CAN", order: ["Christian", "Unaffiliated", "Muslim", "Hindu", "Sikh", "Other"], years: [{ year: 2021, groups: { Christian: 53, Unaffiliated: 35, Muslim: 4.9, Hindu: 2.3, Sikh: 2.1, Other: 2.7 } }] },
];

export async function seedReligion(prisma: PrismaClient) {
  const source = await prisma.dataSource.findUnique({ where: { code: "PEW" } });
  const sourceId = source?.id ?? null;
  const countries = new Map(
    (await prisma.country.findMany({ select: { id: true, iso3: true } })).map(
      (c) => [c.iso3, c.id],
    ),
  );

  let rows = 0;
  let found = 0;
  for (const comp of RELIGIONS) {
    const countryId = countries.get(comp.iso3);
    if (!countryId) continue;
    found++;
    await prisma.groupComposition.deleteMany({
      where: { countryId, groupKind: "RELIGION" },
    });
    for (const snap of comp.years) {
      for (const [groupName, share] of Object.entries(snap.groups)) {
        await prisma.groupComposition.create({
          data: { countryId, year: snap.year, groupKind: "RELIGION", groupName, share, sourceId },
        });
        rows++;
      }
    }
  }
  console.log(`✔ ${rows} religion composition rows (${found} countries)`);
}
