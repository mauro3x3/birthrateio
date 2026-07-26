/* eslint-disable no-console */
// Seeds bilateral migration corridors (migrant stock by origin → destination)
// from the UN DESA International Migrant Stock 2024 dataset into the
// MigrationFlow table. The compact source JSON is produced offline by
// scripts/build-migration-flows.js, so seeding needs no Excel dependency.
//
// Idempotent: clears existing "stock" flows, then re-inserts. Safe to re-run.

import type { PrismaClient } from "@prisma/client";
import flowsData from "../data/migration-flows.json";

interface FlowsFile {
  source: string;
  citation: string;
  metric: string;
  note: string;
  years: number[];
  // [destinationIso3, originIso3, [valuePerYear...]]
  flows: [string, string, (number | null)[]][];
}

export async function seedMigrationFlows(prisma: PrismaClient) {
  const data = flowsData as FlowsFile;

  const source = await prisma.dataSource.findUnique({
    where: { code: "UN_DESA_MIGRATION" },
    select: { id: true },
  });

  const countries = new Map(
    (await prisma.country.findMany({ select: { id: true, iso3: true } })).map(
      (c) => [c.iso3, c.id],
    ),
  );

  await prisma.migrationFlow.deleteMany({ where: { metric: "stock" } });

  const records: Array<{
    originId: number;
    destinationId: number;
    year: number;
    value: number;
    metric: string;
    sourceId: number | null;
  }> = [];

  const unmatched = new Set<string>();
  for (const [destIso3, originIso3, values] of data.flows) {
    const destinationId = countries.get(destIso3);
    const originId = countries.get(originIso3);
    if (!destinationId) unmatched.add(destIso3);
    if (!originId) unmatched.add(originIso3);
    if (!destinationId || !originId) continue;
    values.forEach((v, i) => {
      if (v == null) return;
      records.push({
        originId,
        destinationId,
        year: data.years[i],
        value: v,
        metric: "stock",
        sourceId: source?.id ?? null,
      });
    });
  }

  const CHUNK = 2000;
  for (let i = 0; i < records.length; i += CHUNK) {
    await prisma.migrationFlow.createMany({ data: records.slice(i, i + CHUNK) });
  }

  console.log(
    `✔ ${records.length} migration-flow rows from ${data.flows.length} corridors` +
      (unmatched.size ? ` (${unmatched.size} ISO3 not in country table)` : ""),
  );
}
