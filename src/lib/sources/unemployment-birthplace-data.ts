/* eslint-disable no-console */
// Seeds OECD unemployment rates by place of birth (native-born vs foreign-born),
// ages 15–64. Source: OECD.ELS.IMD DSD_MIG@DF_MIG_NUP_SEX (UNE_RATE).

import type { PrismaClient } from "@prisma/client";
import data from "../data/oecd-unemployment-birthplace.json";
import { SLUG } from "../indicators";

export async function seedUnemploymentByBirthplace(prisma: PrismaClient) {
  const [nbInd, fbInd, source] = await Promise.all([
    prisma.indicator.findUnique({
      where: { slug: SLUG.unemploymentNativeBorn },
      select: { id: true },
    }),
    prisma.indicator.findUnique({
      where: { slug: SLUG.unemploymentForeignBorn },
      select: { id: true },
    }),
    prisma.dataSource.findUnique({ where: { code: "OECD" }, select: { id: true } }),
  ]);
  if (!nbInd || !fbInd) {
    console.log(
      "⚠ unemployment-native/foreign-born indicators missing; run ensureIndicators",
    );
    return;
  }

  const countries = new Map(
    (
      await prisma.country.findMany({
        where: { iso3: { in: Object.keys(data.countries) } },
        select: { id: true, iso3: true },
      })
    ).map((c) => [c.iso3, c.id]),
  );

  const countryIds = [...countries.values()];
  await prisma.indicatorValue.deleteMany({
    where: {
      subjectType: "COUNTRY",
      countryId: { in: countryIds },
      indicatorId: { in: [nbInd.id, fbInd.id] },
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

  for (const [iso3, series] of Object.entries(data.countries)) {
    const countryId = countries.get(iso3);
    if (!countryId) continue;
    for (const p of series.nativeBorn) {
      records.push({
        subjectType: "COUNTRY",
        countryId,
        indicatorId: nbInd.id,
        year: p.year,
        value: p.value,
        kind: "ESTIMATE",
        sourceId: source?.id ?? null,
      });
    }
    for (const p of series.foreignBorn) {
      records.push({
        subjectType: "COUNTRY",
        countryId,
        indicatorId: fbInd.id,
        year: p.year,
        value: p.value,
        kind: "ESTIMATE",
        sourceId: source?.id ?? null,
      });
    }
  }

  if (records.length) {
    // batch insert
    const chunk = 1000;
    for (let i = 0; i < records.length; i += chunk) {
      await prisma.indicatorValue.createMany({ data: records.slice(i, i + chunk) });
    }
  }

  console.log(
    `✔ ${records.length} unemployment-by-birthplace rows (${countries.size} OECD countries)`,
  );
}
