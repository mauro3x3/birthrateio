/* eslint-disable no-console */
// Reusable ingestion orchestration shared by the CLI (`scripts/ingest.ts`) and
// the Vercel cron route (`/api/cron/ingest`).

import type { PrismaClient } from "@prisma/client";
import { INDICATORS } from "../indicators";
import {
  fetchCountries,
  fetchIndicator,
  WB_REGION_TO_CONTINENT,
} from "./worldbank";
import { flagFromIso2 } from "../geo";
import { slugify } from "../utils";
import { ensureSources, ensureIndicators } from "./reference";
import { generateDerivedData } from "./derived";

export interface IngestOptions {
  source?: "worldbank" | "all";
  derivedOnly?: boolean;
  /** Limit indicators (by code) — useful for incremental cron runs. */
  onlyIndicators?: string[];
}

async function ingestWorldBank(
  prisma: PrismaClient,
  onlyIndicators?: string[],
) {
  const run = await prisma.ingestionRun.create({
    data: { source: "worldbank", status: "running" },
  });
  let rows = 0;
  try {
    const wbSource = await prisma.dataSource.findUnique({
      where: { code: "WORLD_BANK" },
    });

    const wbCountries = await fetchCountries();
    for (const c of wbCountries) {
      const isAggregate = !c.region || c.region.id === "NA";
      const continent = isAggregate
        ? null
        : WB_REGION_TO_CONTINENT[c.region.id] ?? c.region.value;
      const data = {
        iso3: c.id,
        iso2: c.iso2Code || null,
        slug: slugify(c.name),
        name: c.name,
        capital: c.capitalCity || null,
        latitude: c.latitude ? Number(c.latitude) : null,
        longitude: c.longitude ? Number(c.longitude) : null,
        flagEmoji: flagFromIso2(c.iso2Code),
        continent,
        subregion: isAggregate ? null : c.region.value,
        incomeGroup:
          c.incomeLevel?.value && c.incomeLevel.value !== "Aggregates"
            ? c.incomeLevel.value
            : null,
        isAggregate,
      };
      await prisma.country.upsert({
        where: { iso3: c.id },
        create: data,
        update: data,
      });
    }
    console.log(`✔ ${wbCountries.length} countries / aggregates`);

    const countryByIso3 = new Map(
      (await prisma.country.findMany({ select: { id: true, iso3: true } })).map(
        (c) => [c.iso3, c.id],
      ),
    );

    // Only ingest World Bank-sourced indicators here. Curated indicators
    // (e.g. abortion rate) are seeded separately and must not be touched.
    const wbIndicators = INDICATORS.filter((i) => i.source === "WORLD_BANK");
    const indicators = onlyIndicators
      ? wbIndicators.filter((i) => onlyIndicators.includes(i.code))
      : wbIndicators;

    for (const def of indicators) {
      const indicator = await prisma.indicator.findUnique({
        where: { code: def.code },
        select: { id: true },
      });
      if (!indicator) continue;

      try {
        const series = await fetchIndicator(def.code);
        await prisma.indicatorValue.deleteMany({
          where: {
            indicatorId: indicator.id,
            subjectType: "COUNTRY",
            dimension: null,
          },
        });

        const records = series
          .map((v) => {
            const countryId = countryByIso3.get(v.iso3);
            if (!countryId) return null;
            return {
              subjectType: "COUNTRY" as const,
              indicatorId: indicator.id,
              countryId,
              year: v.year,
              value: v.value,
              kind: "ESTIMATE" as const,
              sourceId: wbSource?.id ?? null,
            };
          })
          .filter(Boolean) as Array<Record<string, unknown>>;

        const CHUNK = 5000;
        for (let i = 0; i < records.length; i += CHUNK) {
          await prisma.indicatorValue.createMany({
            // @ts-expect-error chunk is well-typed at runtime
            data: records.slice(i, i + CHUNK),
          });
        }
        rows += records.length;
        console.log(`  ↳ ${def.code}: ${records.length} values`);
      } catch (err) {
        // Don't abort the whole run if one indicator fails — keep going so
        // derived data (pyramids/projections) can still be generated.
        console.warn(`  ⚠ ${def.code} failed: ${String(err)}`);
      }
      // Gentle pacing to stay well under World Bank rate limits.
      await new Promise((r) => setTimeout(r, 400));
    }

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: { status: "success", rowsWritten: rows, finishedAt: new Date() },
    });
    return rows;
  } catch (err) {
    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: { status: "failed", message: String(err), finishedAt: new Date() },
    });
    throw err;
  }
}

export async function runIngestion(
  prisma: PrismaClient,
  opts: IngestOptions = {},
) {
  await ensureSources(prisma);
  await ensureIndicators(prisma);

  let rows = 0;
  if (!opts.derivedOnly) {
    if (!opts.source || opts.source === "worldbank" || opts.source === "all") {
      rows = await ingestWorldBank(prisma, opts.onlyIndicators);
    }
  }

  await generateDerivedData(prisma);
  return { rows };
}
