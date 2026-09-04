/* eslint-disable no-console */
// Seeds pre-1960 total fertility rate into the existing `fertility-rate`
// indicator so country-page charts extend back to 1800. Each point is tagged
// with the best available source, in priority order:
//   - HFD (Human Fertility Database): official birth-registration-based
//     reconstructions, coverage starting anywhere from 1891 (Sweden) to
//     1950 (Germany, Italy, Austria, Netherlands) depending on the country.
//   - UN_WPP: UN World Population Prospects, 1950-1959.
//   - GAPMINDER: Mattias Lindgren's long-run historic estimate, used only
//     where nothing better exists (typically pre-1891, or countries HFD
//     never covered).
// World Bank WDI remains authoritative from 1960 onward; this only ever
// touches years < 1960 and is idempotent (re-seeding replaces, not appends).

import type { PrismaClient } from "@prisma/client";
import data from "../data/historic-fertility.json";
import { SLUG } from "../indicators";

type Point = { year: number; value: number; source: "GAPMINDER" | "HFD" | "UN_WPP" };
type SeriesMap = Record<string, Point[]>;

const payload = data as {
  sources: Record<string, { name: string; url: string; citation: string }>;
  tfr: SeriesMap;
};

/** Countries with any pre-1960 TFR coverage (for UI notes). */
export const HISTORIC_FERTILITY_ISO3 = new Set(Object.keys(payload.tfr));

/** Countries with Human Fertility Database (official-quality) coverage. */
export const HFD_FERTILITY_ISO3 = new Set(
  Object.entries(payload.tfr)
    .filter(([, pts]) => pts.some((p) => p.source === "HFD"))
    .map(([iso3]) => iso3),
);

export async function seedHistoricFertility(prisma: PrismaClient) {
  const [fertilityInd, sources] = await Promise.all([
    prisma.indicator.findUnique({
      where: { slug: SLUG.fertility },
      select: { id: true },
    }),
    prisma.dataSource.findMany({
      where: { code: { in: ["GAPMINDER", "HFD", "UN_WPP"] } },
      select: { id: true, code: true },
    }),
  ]);

  if (!fertilityInd) {
    console.log("⚠ fertility-rate indicator missing; run ensureIndicators first");
    return;
  }

  const sourceId = new Map(sources.map((s) => [s.code, s.id]));

  const iso3s = Object.keys(payload.tfr);
  const countries = new Map(
    (
      await prisma.country.findMany({
        where: { iso3: { in: iso3s } },
        select: { id: true, iso3: true },
      })
    ).map((c) => [c.iso3, c.id]),
  );

  const matched = iso3s.filter((iso3) => countries.has(iso3));
  const countryIds = matched.map((iso3) => countries.get(iso3)!);

  if (countryIds.length) {
    // Idempotent: wipe any pre-1960 points for these countries before
    // re-inserting, so re-running the seed never duplicates or goes stale.
    await prisma.indicatorValue.deleteMany({
      where: {
        subjectType: "COUNTRY",
        countryId: { in: countryIds },
        indicatorId: fertilityInd.id,
        dimension: null,
        year: { lt: 1960 },
      },
    });
  }

  const records: Array<{
    subjectType: "COUNTRY";
    countryId: number;
    indicatorId: number;
    year: number;
    value: number;
    kind: "ESTIMATE";
    sourceId: number | null;
  }> = [];

  const counts: Record<string, number> = {};
  for (const iso3 of matched) {
    const countryId = countries.get(iso3)!;
    for (const p of payload.tfr[iso3]) {
      counts[p.source] = (counts[p.source] ?? 0) + 1;
      records.push({
        subjectType: "COUNTRY",
        countryId,
        indicatorId: fertilityInd.id,
        year: p.year,
        value: p.value,
        kind: "ESTIMATE",
        sourceId: sourceId.get(p.source) ?? null,
      });
    }
  }

  const chunk = 2000;
  for (let i = 0; i < records.length; i += chunk) {
    await prisma.indicatorValue.createMany({
      data: records.slice(i, i + chunk),
      skipDuplicates: true,
    });
  }

  console.log(
    `✔ historic fertility: ${records.length} pre-1960 TFR rows across ${matched.length} countries ` +
      `(HFD ${counts.HFD ?? 0}, UN WPP ${counts.UN_WPP ?? 0}, Gapminder ${counts.GAPMINDER ?? 0})`,
  );
}
