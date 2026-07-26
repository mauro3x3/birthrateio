/* eslint-disable no-console */
// Seeds official UN World Population Prospects 2024 population projections
// (Low / Medium / High variants, base year → 2100) into the
// PopulationProjection table. The compact source JSON is produced offline by
// scripts/build-wpp-projections.js, so seeding needs no large download.
//
// These authoritative numbers replace the homegrown cohort-component
// projections for every country the UN covers — the model alone badly
// understated migration-driven populations (e.g. Germany). The cohort engine is
// retained only for the interactive /simulator.
//
// Idempotent: clears existing projections per covered country, then re-inserts.

import type { PrismaClient } from "@prisma/client";
import wppData from "../data/wpp-projections.json";

interface WppFile {
  source: string;
  citation: string;
  note: string;
  unit: string;
  years: number[];
  data: Record<string, { low: (number | null)[]; medium: (number | null)[]; high: (number | null)[] }>;
}

const FILE = wppData as WppFile;

/** ISO3 codes the UN WPP dataset covers (used by the ingest fallback). */
export const WPP_ISO3 = new Set(Object.keys(FILE.data));

export async function seedWppProjections(prisma: PrismaClient) {
  const source = await prisma.dataSource.findUnique({
    where: { code: "UN_WPP" },
    select: { id: true },
  });

  const countries = await prisma.country.findMany({
    select: { id: true, iso3: true },
  });

  const records: Array<{
    countryId: number;
    year: number;
    scenario: string;
    population: number;
    sourceId: number | null;
  }> = [];

  let covered = 0;
  const coveredIds: number[] = [];
  for (const c of countries) {
    const entry = FILE.data[c.iso3];
    if (!entry) continue;
    covered++;
    coveredIds.push(c.id);
    for (const scenario of ["low", "medium", "high"] as const) {
      const series = entry[scenario];
      FILE.years.forEach((year, i) => {
        const v = series[i];
        if (v == null) return;
        records.push({
          countryId: c.id,
          year,
          scenario,
          population: v,
          sourceId: source?.id ?? null,
        });
      });
    }
  }

  // Replace projections only for the countries we have official data for, so
  // any model fallback for uncovered countries stays intact.
  await prisma.populationProjection.deleteMany({
    where: { countryId: { in: coveredIds } },
  });

  const CHUNK = 2000;
  for (let i = 0; i < records.length; i += CHUNK) {
    await prisma.populationProjection.createMany({
      data: records.slice(i, i + CHUNK),
    });
  }

  console.log(
    `✔ ${records.length} UN WPP projection rows for ${covered} countries`,
  );
}
