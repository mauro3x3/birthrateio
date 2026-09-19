/* eslint-disable no-console */
/**
 * Seed IOM Missing Migrants regional death totals as REGION IndicatorValues.
 */
import type { PrismaClient } from "@prisma/client";
import data from "../data/iom-missing-migrants.json";
import { SLUG } from "../indicators";

export const IOM_MMP_NOTE = data.definition;
export const IOM_MMP_SOURCE_URL = data.sourceUrl;

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function seedIomMissingMigrants(prisma: PrismaClient) {
  const indicator = await prisma.indicator.findUnique({
    where: { slug: SLUG.migrantDeaths },
    select: { id: true },
  });
  const source = await prisma.dataSource.findUnique({
    where: { code: "IOM_MISSING_MIGRANTS" },
    select: { id: true },
  });
  if (!indicator) {
    console.log("⚠ migrant-deaths indicator missing");
    return;
  }

  const records: Array<{
    subjectType: string;
    regionId: number;
    indicatorId: number;
    year: number;
    value: number;
    kind: string;
    sourceId: number | null;
  }> = [];

  for (const [name, points] of Object.entries(data.regions)) {
    const region = await prisma.region.upsert({
      where: { slug: `mmp-${slugify(name)}` },
      create: {
        slug: `mmp-${slugify(name)}`,
        name: `Missing Migrants — ${name}`,
        kind: "custom",
      },
      update: { name: `Missing Migrants — ${name}`, kind: "custom" },
    });
    await prisma.indicatorValue.deleteMany({
      where: {
        subjectType: "REGION",
        regionId: region.id,
        indicatorId: indicator.id,
      },
    });
    for (const p of points) {
      records.push({
        subjectType: "REGION",
        regionId: region.id,
        indicatorId: indicator.id,
        year: p.year,
        value: p.value,
        kind: "ESTIMATE",
        sourceId: source?.id ?? null,
      });
    }
  }

  await prisma.indicatorValue.createMany({ data: records, skipDuplicates: true });
  console.log(
    `✔ ${records.length} IOM Missing Migrants rows (${Object.keys(data.regions).length} regions)`,
  );
}

export async function getIomMissingMigrantsLatest(prisma: PrismaClient) {
  const indicator = await prisma.indicator.findUnique({
    where: { slug: SLUG.migrantDeaths },
    select: { id: true },
  });
  if (!indicator) return null;
  const regions = await prisma.region.findMany({
    where: { slug: { startsWith: "mmp-" } },
    select: { id: true, slug: true, name: true },
  });
  if (!regions.length) return null;

  const out: Record<string, { year: number; value: number }[]> = {};
  for (const region of regions) {
    const rows = await prisma.indicatorValue.findMany({
      where: {
        subjectType: "REGION",
        regionId: region.id,
        indicatorId: indicator.id,
      },
      orderBy: { year: "asc" },
      select: { year: true, value: true },
    });
    const label = region.name.replace(/^Missing Migrants — /, "");
    out[label] = rows;
  }
  return out;
}
