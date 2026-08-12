/* eslint-disable no-console */
// First residence permits for employment by citizenship (Eurostat migr_resfirst).
// Stored as GroupComposition with groupKind = "WORK_PERMITS_CITIZENSHIP"
// (absolute counts in `population`).

import type { PrismaClient } from "@prisma/client";
import data from "../data/eurostat-work-permits-citizenship.json";

export const WORK_PERMITS_KIND = "WORK_PERMITS_CITIZENSHIP";

export const WORK_PERMITS_NOTE = data.definition;
export const WORK_PERMITS_SOURCE_URL = data.sourceUrl;

export async function seedWorkPermits(prisma: PrismaClient) {
  const source = await prisma.dataSource.findUnique({
    where: { code: "EUROSTAT" },
    select: { id: true },
  });
  const sourceId = source?.id ?? null;

  const countries = new Map(
    (await prisma.country.findMany({ select: { id: true, iso3: true } })).map(
      (c) => [c.iso3, c.id],
    ),
  );

  await prisma.groupComposition.deleteMany({
    where: { groupKind: WORK_PERMITS_KIND },
  });

  const batch: Array<{
    countryId: number;
    year: number;
    groupKind: string;
    groupName: string;
    population: number;
    share: number | null;
    sourceId: number | null;
  }> = [];

  let missing = 0;
  for (const entry of data.countries) {
    const countryId = countries.get(entry.iso3);
    if (!countryId) {
      missing++;
      continue;
    }
    for (const snap of entry.years) {
      const total = entry.order.reduce(
        (s, g) =>
          s + (Number(snap.groups[g as keyof typeof snap.groups]) || 0),
        0,
      );
      for (const groupName of entry.order) {
        const count = Number(
          snap.groups[groupName as keyof typeof snap.groups] ?? 0,
        );
        batch.push({
          countryId,
          year: snap.year,
          groupKind: WORK_PERMITS_KIND,
          groupName,
          population: count,
          share: total > 0 ? (count / total) * 100 : null,
          sourceId,
        });
      }
    }
  }

  const CHUNK = 1000;
  for (let i = 0; i < batch.length; i += CHUNK) {
    await prisma.groupComposition.createMany({
      data: batch.slice(i, i + CHUNK),
      skipDuplicates: true,
    });
  }

  console.log(
    `✔ ${batch.length} work-permit-by-citizenship rows (${data.countries.length - missing} countries${missing ? `, ${missing} not found` : ""})`,
  );
}
