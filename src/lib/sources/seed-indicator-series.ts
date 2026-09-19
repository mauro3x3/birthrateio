/* eslint-disable no-console */
/**
 * Shared helper: seed country×year IndicatorValue series from a compact JSON
 * shape `{ countries: { ISO3: { seriesKey: [{year,value}] } } }`.
 */
import type { PrismaClient } from "@prisma/client";

export type YearPoint = { year: number; value: number };
export type CountrySeriesMap = Record<string, Record<string, YearPoint[]>>;

export async function seedCountryIndicatorSeries(
  prisma: PrismaClient,
  opts: {
    /** Map series key in the JSON → indicator slug. */
    seriesToSlug: Record<string, string>;
    countries: CountrySeriesMap;
    sourceCode: string;
    label: string;
  },
) {
  const slugs = Object.values(opts.seriesToSlug);
  const indicators = await prisma.indicator.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });
  const bySlug = new Map(indicators.map((i) => [i.slug, i.id]));
  for (const slug of slugs) {
    if (!bySlug.has(slug)) {
      console.log(`⚠ indicator missing: ${slug}; run ensureIndicators`);
      return;
    }
  }

  const source = await prisma.dataSource.findUnique({
    where: { code: opts.sourceCode },
    select: { id: true },
  });

  const iso3s = Object.keys(opts.countries);
  const countries = new Map(
    (
      await prisma.country.findMany({
        where: { iso3: { in: iso3s } },
        select: { id: true, iso3: true },
      })
    ).map((c) => [c.iso3, c.id]),
  );

  const indicatorIds = [...bySlug.values()];
  const countryIds = [...countries.values()];
  if (countryIds.length && indicatorIds.length) {
    await prisma.indicatorValue.deleteMany({
      where: {
        subjectType: "COUNTRY",
        countryId: { in: countryIds },
        indicatorId: { in: indicatorIds },
        dimension: null,
      },
    });
  }

  const records: Array<{
    subjectType: string;
    countryId: number;
    indicatorId: number;
    year: number;
    value: number;
    kind: string;
    sourceId: number | null;
  }> = [];

  for (const [iso3, series] of Object.entries(opts.countries)) {
    const countryId = countries.get(iso3);
    if (!countryId) continue;
    for (const [key, slug] of Object.entries(opts.seriesToSlug)) {
      const points = series[key] ?? [];
      const indicatorId = bySlug.get(slug)!;
      for (const p of points) {
        if (!Number.isFinite(p.value) || !Number.isFinite(p.year)) continue;
        records.push({
          subjectType: "COUNTRY",
          countryId,
          indicatorId,
          year: p.year,
          value: p.value,
          kind: "ESTIMATE",
          sourceId: source?.id ?? null,
        });
      }
    }
  }

  const CHUNK = 1000;
  for (let i = 0; i < records.length; i += CHUNK) {
    await prisma.indicatorValue.createMany({
      data: records.slice(i, i + CHUNK),
      skipDuplicates: true,
    });
  }

  console.log(
    `✔ ${records.length} ${opts.label} rows (${countries.size} countries)`,
  );
}
