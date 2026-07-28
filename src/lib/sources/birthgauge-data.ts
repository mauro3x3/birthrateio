/* eslint-disable no-console */
// Seeds provisional fertility / YTD births tracker compiled by BirthGauge from
// national statistical offices. Does NOT replace World Bank annual TFR series —
// lives in FertilityNowcast and is shown as a "2026 nowcast" layer.

import type { PrismaClient } from "@prisma/client";
import data from "../data/birthgauge-2026.json";

type Row = (typeof data.rows)[number];

export async function seedBirthGaugeNowcast(prisma: PrismaClient) {
  const countries = new Map(
    (
      await prisma.country.findMany({
        where: { isAggregate: false },
        select: { id: true, iso3: true, slug: true },
      })
    ).map((c) => [c.iso3, c]),
  );

  await prisma.fertilityNowcast.deleteMany({ where: { asOfLabel: "2026" } });

  const nowcastRows = (data.rows as Row[]).map((row) => {
    const country = row.iso3 ? countries.get(row.iso3) : undefined;
    return {
      countryId: country?.id ?? null,
      iso3: row.iso3 ?? null,
      label: row.name,
      slug: row.slug ?? country?.slug ?? null,
      birthsPrior: row.births2025 ?? null,
      birthsCurrent: row.births2026 ?? null,
      changePct: row.changePct ?? null,
      months: row.months ?? null,
      tfr2015: row.tfr?.["2015"] ?? null,
      tfr2020: row.tfr?.["2020"] ?? null,
      tfr2024: row.tfr?.["2024"] ?? null,
      tfr2025: row.tfr?.["2025"] ?? null,
      tfr2026: row.tfr?.["2026"] ?? null,
      lessReliable: Boolean(row.lessReliable),
      flags: row.flags?.length ? row.flags.join(",") : null,
      sourceNote: data.primarySources,
      compiledBy: data.compiledBy,
      compiledByUrl: data.compiledByUrl,
      asOfLabel: "2026",
    };
  });

  await prisma.fertilityNowcast.createMany({ data: nowcastRows });

  const indicator = await prisma.indicator.findUnique({
    where: { slug: "fertility-provisional" },
    select: { id: true },
  });
  const source = await prisma.dataSource.findUnique({
    where: { code: "BIRTHGAUGE" },
    select: { id: true },
  });

  let tfrRows = 0;
  if (indicator) {
    const matched = (data.rows as Row[]).filter(
      (r) => r.iso3 && countries.has(r.iso3),
    );
    const countryIds = matched.map((r) => countries.get(r.iso3!)!.id);
    await prisma.indicatorValue.deleteMany({
      where: {
        indicatorId: indicator.id,
        subjectType: "COUNTRY",
        countryId: { in: countryIds },
      },
    });

    const valueRows: Array<{
      subjectType: string;
      countryId: number;
      indicatorId: number;
      year: number;
      value: number;
      kind: string;
      sourceId: number | null;
    }> = [];

    for (const row of matched) {
      const c = countries.get(row.iso3!)!;
      for (const [yearStr, value] of Object.entries(row.tfr ?? {})) {
        const year = Number(yearStr);
        if (!Number.isFinite(year) || value == null || year < 2024) continue;
        valueRows.push({
          subjectType: "COUNTRY",
          countryId: c.id,
          indicatorId: indicator.id,
          year,
          value,
          kind: "ESTIMATE",
          sourceId: source?.id ?? null,
        });
      }
    }
    if (valueRows.length) {
      await prisma.indicatorValue.createMany({ data: valueRows });
      tfrRows = valueRows.length;
    }
  } else {
    console.log("⚠ fertility-provisional indicator missing; run ensureIndicators");
  }

  console.log(
    `✔ ${nowcastRows.length} fertility nowcast rows (BirthGauge 2026) · ${tfrRows} provisional TFR values`,
  );
}
