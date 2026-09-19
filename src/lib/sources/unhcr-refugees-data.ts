/* eslint-disable no-console */
import type { PrismaClient } from "@prisma/client";
import data from "../data/unhcr-refugees.json";
import { SLUG } from "../indicators";
import { seedCountryIndicatorSeries } from "./seed-indicator-series";

export const UNHCR_NOTE = data.definition;
export const UNHCR_SOURCE_URL = data.sourceUrl;

export async function seedUnhcrRefugees(prisma: PrismaClient) {
  await seedCountryIndicatorSeries(prisma, {
    sourceCode: "UNHCR",
    label: "unhcr-refugees",
    seriesToSlug: {
      refugees: SLUG.refugees,
      asylumSeekers: SLUG.asylumSeekers,
    },
    countries: data.countries as Record<
      string,
      Record<string, { year: number; value: number }[]>
    >,
  });

  // Refugee share of international migrant stock (nearest overlapping year).
  const [refInd, shareInd, stockInd, source] = await Promise.all([
    prisma.indicator.findUnique({
      where: { slug: SLUG.refugees },
      select: { id: true },
    }),
    prisma.indicator.findUnique({
      where: { slug: SLUG.refugeeShareOfMigrants },
      select: { id: true },
    }),
    prisma.indicator.findUnique({
      where: { slug: SLUG.migrantStock },
      select: { id: true },
    }),
    prisma.dataSource.findUnique({
      where: { code: "UNHCR" },
      select: { id: true },
    }),
  ]);
  if (!refInd || !shareInd || !stockInd) {
    console.log("⚠ skip refugee-share: missing indicators");
    return;
  }

  const refugees = await prisma.indicatorValue.findMany({
    where: {
      subjectType: "COUNTRY",
      indicatorId: refInd.id,
      dimension: null,
    },
    select: { countryId: true, year: true, value: true },
  });
  const stocks = await prisma.indicatorValue.findMany({
    where: {
      subjectType: "COUNTRY",
      indicatorId: stockInd.id,
      dimension: null,
    },
    select: { countryId: true, year: true, value: true },
  });

  const stockByCountry = new Map<number, { year: number; value: number }[]>();
  for (const s of stocks) {
    if (s.countryId == null) continue;
    const list = stockByCountry.get(s.countryId) ?? [];
    list.push({ year: s.year, value: s.value });
    stockByCountry.set(s.countryId, list);
  }
  for (const list of stockByCountry.values()) {
    list.sort((a, b) => a.year - b.year);
  }

  function nearestStock(countryId: number, year: number) {
    const list = stockByCountry.get(countryId);
    if (!list?.length) return null;
    let best = list[0];
    let bestDist = Math.abs(list[0].year - year);
    for (const p of list) {
      const d = Math.abs(p.year - year);
      if (d < bestDist) {
        best = p;
        bestDist = d;
      }
    }
    // Only use stocks within 3 years of the refugee figure.
    return bestDist <= 3 ? best : null;
  }

  await prisma.indicatorValue.deleteMany({
    where: { subjectType: "COUNTRY", indicatorId: shareInd.id, dimension: null },
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

  for (const r of refugees) {
    if (r.countryId == null || r.value <= 0) continue;
    const stock = nearestStock(r.countryId, r.year);
    if (!stock || stock.value <= 0) continue;
    const share = (r.value / stock.value) * 100;
    if (!Number.isFinite(share) || share > 200) continue;
    records.push({
      subjectType: "COUNTRY",
      countryId: r.countryId,
      indicatorId: shareInd.id,
      year: r.year,
      value: Math.round(share * 10) / 10,
      kind: "ESTIMATE",
      sourceId: source?.id ?? null,
    });
  }

  const CHUNK = 1000;
  for (let i = 0; i < records.length; i += CHUNK) {
    await prisma.indicatorValue.createMany({
      data: records.slice(i, i + CHUNK),
      skipDuplicates: true,
    });
  }
  console.log(`✔ ${records.length} refugee-share-of-migrants rows`);
}
