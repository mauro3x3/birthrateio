/* eslint-disable no-console */
/**
 * Seed Frontex route + EU-total detections as REGION IndicatorValues
 * (dimension = route name; EU total has no dimension).
 */
import type { PrismaClient } from "@prisma/client";
import data from "../data/frontex-border-detections.json";
import { SLUG } from "../indicators";

export const FRONTEX_NOTE = data.definition;
export const FRONTEX_SOURCE_URL = data.sourceUrl;

export async function seedFrontexDetections(prisma: PrismaClient) {
  const indicator = await prisma.indicator.findUnique({
    where: { slug: SLUG.illegalBorderCrossings },
    select: { id: true },
  });
  const source = await prisma.dataSource.findUnique({
    where: { code: "FRONTEX" },
    select: { id: true },
  });
  if (!indicator) {
    console.log("⚠ illegal-border-crossings indicator missing");
    return;
  }

  const region = await prisma.region.upsert({
    where: { slug: "eu-external-borders" },
    create: {
      slug: "eu-external-borders",
      name: "EU external borders",
      kind: "custom",
    },
    update: { name: "EU external borders", kind: "custom" },
  });

  await prisma.indicatorValue.deleteMany({
    where: {
      subjectType: "REGION",
      regionId: region.id,
      indicatorId: indicator.id,
    },
  });

  const records: Array<{
    subjectType: string;
    regionId: number;
    indicatorId: number;
    year: number;
    value: number;
    kind: string;
    dimension: string | null;
    dimensionValue: string | null;
    sourceId: number | null;
  }> = [];

  for (const p of data.euTotal) {
    records.push({
      subjectType: "REGION",
      regionId: region.id,
      indicatorId: indicator.id,
      year: p.year,
      value: p.value,
      kind: "ESTIMATE",
      dimension: null,
      dimensionValue: null,
      sourceId: source?.id ?? null,
    });
  }

  for (const [route, points] of Object.entries(data.routes)) {
    for (const p of points) {
      records.push({
        subjectType: "REGION",
        regionId: region.id,
        indicatorId: indicator.id,
        year: p.year,
        value: p.value,
        kind: "ESTIMATE",
        dimension: "route",
        dimensionValue: route,
        sourceId: source?.id ?? null,
      });
    }
  }

  await prisma.indicatorValue.createMany({ data: records, skipDuplicates: true });
  console.log(
    `✔ ${records.length} Frontex detection rows (${Object.keys(data.routes).length} routes + EU total)`,
  );
}

/** Latest EU-total + route breakdown for the migration hub. */
export async function getFrontexLatest(prisma: PrismaClient) {
  const indicator = await prisma.indicator.findUnique({
    where: { slug: SLUG.illegalBorderCrossings },
    select: { id: true },
  });
  if (!indicator) return null;
  const region = await prisma.region.findUnique({
    where: { slug: "eu-external-borders" },
    select: { id: true },
  });
  if (!region) return null;

  const rows = await prisma.indicatorValue.findMany({
    where: {
      subjectType: "REGION",
      regionId: region.id,
      indicatorId: indicator.id,
    },
    orderBy: { year: "asc" },
  });

  const euTotal = rows
    .filter((r) => r.dimension == null)
    .map((r) => ({ year: r.year, value: r.value }));
  const byRoute = new Map<string, { year: number; value: number }[]>();
  for (const r of rows) {
    if (r.dimension !== "route" || !r.dimensionValue) continue;
    const list = byRoute.get(r.dimensionValue) ?? [];
    list.push({ year: r.year, value: r.value });
    byRoute.set(r.dimensionValue, list);
  }

  return { euTotal, routes: Object.fromEntries(byRoute) };
}
