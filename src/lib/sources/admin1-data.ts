/* eslint-disable no-console */
// Seeds first-level administrative divisions (states / provinces / Länder / …)
// and their fertility + population time series from national statistical offices.

import type { PrismaClient } from "@prisma/client";
import data from "../data/admin1-demographics.json";
import { SLUG } from "../indicators";

export async function seedAdmin1(prisma: PrismaClient) {
  const [fertInd, popInd, gfrInd, national, eurostat, usBjs] =
    await Promise.all([
      prisma.indicator.findUnique({
        where: { slug: SLUG.fertility },
        select: { id: true },
      }),
      prisma.indicator.findUnique({
        where: { slug: SLUG.population },
        select: { id: true },
      }),
      prisma.indicator.findUnique({
        where: { slug: SLUG.generalFertilityRate },
        select: { id: true },
      }),
      prisma.dataSource.findUnique({
        where: { code: "NATIONAL_STATS" },
        select: { id: true },
      }),
      prisma.dataSource.findUnique({
        where: { code: "EUROSTAT" },
        select: { id: true },
      }),
      prisma.dataSource.findUnique({
        where: { code: "US_BJS_FBI" },
        select: { id: true },
      }),
    ]);

  if (!fertInd || !popInd) {
    console.log("⚠ fertility/population indicators missing; run ensureIndicators");
    return;
  }

  const countries = new Map(
    (
      await prisma.country.findMany({
        where: {
          iso3: { in: [...new Set(data.divisions.map((d) => d.iso3))] },
        },
        select: { id: true, iso3: true },
      })
    ).map((c) => [c.iso3, c.id]),
  );

  // Upsert divisions
  const adminIds = new Map<string, number>();
  for (const d of data.divisions) {
    const countryId = countries.get(d.iso3);
    if (!countryId) continue;
    const latestPop = data.population[d.slug as keyof typeof data.population];
    const pop =
      Array.isArray(latestPop) && latestPop.length
        ? latestPop[latestPop.length - 1].value
        : null;
    const row = await prisma.admin1.upsert({
      where: { slug: d.slug },
      create: {
        slug: d.slug,
        name: d.name,
        countryId,
        kind: d.kind,
        code: d.code ?? null,
        population: pop,
      },
      update: {
        name: d.name,
        kind: d.kind,
        code: d.code ?? null,
        population: pop,
      },
      select: { id: true, slug: true },
    });
    adminIds.set(row.slug, row.id);
  }
  console.log(`✔ ${adminIds.size} admin1 divisions`);

  const sourceFor = (iso3: string) => {
    if (iso3 === "DEU") return eurostat?.id ?? national?.id ?? null;
    if (iso3 === "USA") return national?.id ?? usBjs?.id ?? null;
    return national?.id ?? null;
  };

  // Clear prior ADMIN1 values for these indicators then reinsert
  const adminIdList = [...adminIds.values()];
  const indicatorIds = [fertInd.id, popInd.id, ...(gfrInd ? [gfrInd.id] : [])];
  await prisma.indicatorValue.deleteMany({
    where: {
      subjectType: "ADMIN1",
      admin1Id: { in: adminIdList },
      indicatorId: { in: indicatorIds },
    },
  });

  const records: Array<{
    subjectType: string;
    admin1Id: number;
    indicatorId: number;
    year: number;
    value: number;
    kind: string;
    sourceId: number | null;
  }> = [];

  const isoBySlug = new Map(data.divisions.map((d) => [d.slug, d.iso3]));

  for (const [slug, series] of Object.entries(data.fertility)) {
    const admin1Id = adminIds.get(slug);
    if (!admin1Id) continue;
    const iso3 = isoBySlug.get(slug) ?? "";
    for (const p of series) {
      records.push({
        subjectType: "ADMIN1",
        admin1Id,
        indicatorId: fertInd.id,
        year: p.year,
        value: p.value,
        kind: "ESTIMATE",
        sourceId: sourceFor(iso3),
      });
    }
  }

  for (const [slug, series] of Object.entries(data.population)) {
    const admin1Id = adminIds.get(slug);
    if (!admin1Id) continue;
    const iso3 = isoBySlug.get(slug) ?? "";
    for (const p of series) {
      records.push({
        subjectType: "ADMIN1",
        admin1Id,
        indicatorId: popInd.id,
        year: p.year,
        value: p.value,
        kind: "ESTIMATE",
        sourceId: sourceFor(iso3),
      });
    }
  }

  if (gfrInd && data.generalFertilityRate) {
    for (const [slug, series] of Object.entries(data.generalFertilityRate)) {
      const admin1Id = adminIds.get(slug);
      if (!admin1Id) continue;
      for (const p of series) {
        records.push({
          subjectType: "ADMIN1",
          admin1Id,
          indicatorId: gfrInd.id,
          year: p.year,
          value: p.value,
          kind: "ESTIMATE",
          sourceId: sourceFor("USA"),
        });
      }
    }
  }

  const chunk = 1000;
  for (let i = 0; i < records.length; i += chunk) {
    await prisma.indicatorValue.createMany({ data: records.slice(i, i + chunk) });
  }

  console.log(
    `✔ ${records.length} admin1 indicator rows (${adminIds.size} divisions)`,
  );
}
