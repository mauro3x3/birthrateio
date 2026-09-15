import { unstable_cache } from "next/cache";
import {
  AGE_GROUPS,
  project,
  summarize,
  type AgeSexPopulation,
} from "@/lib/demography";
import { SLUG } from "@/lib/indicators";
import { prisma } from "@/lib/prisma";
import {
  getAllCountries,
  getPopulationPyramid,
  getRanking,
} from "@/lib/queries";

export type LaborBand = {
  year: number;
  working: number;
  old: number;
  workersPerRetiree: number;
};

export type LaborOutlook = {
  baseYear: number;
  tfr: number;
  now: LaborBand;
  at2040: LaborBand;
  at2060: LaborBand;
  at2060Replacement: LaborBand;
  note: string;
};

export type LaborOutlookRow = LaborOutlook & {
  countryId: number;
  iso3: string;
  slug: string;
  name: string;
  flagEmoji: string | null;
  continent: string | null;
};

const LABOR_NOTE =
  "Modeled from today’s age pyramid, holding period TFR, life expectancy, and recent net migration. 2040 working-age people are mostly already born; TFR mainly shows up in the 2060 workforce. Not an official CBS or UN forecast.";

function bandsFromPyramid(
  rows: { ageGroup: string; sex: string; population: number }[],
): AgeSexPopulation | null {
  const male = AGE_GROUPS.map(() => 0);
  const female = AGE_GROUPS.map(() => 0);
  const idx = new Map<string, number>(AGE_GROUPS.map((g, i) => [g, i]));
  let any = false;
  for (const r of rows) {
    const i = idx.get(r.ageGroup);
    if (i == null) continue;
    any = true;
    if (r.sex === "male") male[i] += r.population;
    else if (r.sex === "female") female[i] += r.population;
  }
  if (!any) return null;
  return { male, female };
}

function band(year: number, snap: ReturnType<typeof project>[number]): LaborBand {
  const s = summarize(snap);
  const working = (s.workingShare / 100) * snap.total;
  const old = (s.elderlyShare / 100) * snap.total;
  return {
    year,
    working,
    old,
    workersPerRetiree: old > 0 ? working / old : 0,
  };
}

export function computeLaborOutlook(opts: {
  base: AgeSexPopulation;
  startYear: number;
  tfr: number;
  lifeExpectancy: number;
  netMigrationAnnual: number | null;
}): LaborOutlook {
  const migStep = (opts.netMigrationAnnual ?? 0) * 5;
  const paramsNow = {
    tfr: opts.tfr,
    lifeExpectancy: opts.lifeExpectancy,
    netMigrationPerStep: migStep,
  };
  const params21 = {
    tfr: 2.1,
    lifeExpectancy: opts.lifeExpectancy,
    netMigrationPerStep: migStep,
  };

  const start = opts.startYear;
  // 5-year steps: 3 ≈ 15 years (2040-ish), 7 ≈ 35 years (2060-ish).
  const current = project(opts.base, paramsNow, start, 7);
  const replacement = project(opts.base, params21, start, 7);
  const snapNow = current[0];
  const snap2040 = current[3] ?? current[current.length - 1];
  const snap2060 = current[7] ?? current[current.length - 1];
  const snap2060r = replacement[7] ?? replacement[replacement.length - 1];

  return {
    baseYear: start,
    tfr: opts.tfr,
    now: band(start, snapNow),
    at2040: band(snap2040.year, snap2040),
    at2060: band(snap2060.year, snap2060),
    at2060Replacement: band(snap2060r.year, snap2060r),
    note: LABOR_NOTE,
  };
}

export async function getLaborOutlook(opts: {
  countryId: number;
  tfr: number;
  lifeExpectancy: number;
  netMigrationAnnual: number | null;
}): Promise<LaborOutlook | null> {
  const pyramid = await getPopulationPyramid(opts.countryId);
  if (!pyramid.year || pyramid.rows.length === 0) return null;
  const base = bandsFromPyramid(pyramid.rows);
  if (!base) return null;
  return computeLaborOutlook({
    base,
    startYear: pyramid.year,
    tfr: opts.tfr,
    lifeExpectancy: opts.lifeExpectancy,
    netMigrationAnnual: opts.netMigrationAnnual,
  });
}

/**
 * All countries with a pyramid + fertility + life expectancy.
 * Cached — projecting ~200 countries is cheap once pyramids are in memory.
 */
export const getAllLaborOutlooks = unstable_cache(
  async (): Promise<LaborOutlookRow[]> => {
    const [countries, fert, life, mig, pyramidRows] = await Promise.all([
      getAllCountries(),
      getRanking(SLUG.fertility, { order: "desc" }),
      getRanking(SLUG.lifeExpectancy, { order: "desc" }),
      getRanking(SLUG.netMigration, { order: "desc" }),
      prisma.populationByAge.findMany({
        where: { sex: { in: ["male", "female"] } },
        select: {
          countryId: true,
          year: true,
          ageGroup: true,
          sex: true,
          population: true,
        },
      }),
    ]);

    const fertByIso = new Map(fert.map((r) => [r.iso3, r.value]));
    const lifeByIso = new Map(life.map((r) => [r.iso3, r.value]));
    const migByIso = new Map(mig.map((r) => [r.iso3, r.value]));

    const byCountry = new Map<
      number,
      { year: number; rows: { ageGroup: string; sex: string; population: number }[] }
    >();
    for (const r of pyramidRows) {
      let entry = byCountry.get(r.countryId);
      if (!entry) {
        entry = { year: r.year, rows: [] };
        byCountry.set(r.countryId, entry);
      }
      // Prefer the latest year if multiple ever appear.
      if (r.year > entry.year) {
        entry.year = r.year;
        entry.rows = [];
      }
      if (r.year === entry.year) {
        entry.rows.push({
          ageGroup: r.ageGroup,
          sex: r.sex,
          population: r.population,
        });
      }
    }

    const out: LaborOutlookRow[] = [];
    for (const c of countries) {
      const pyramid = byCountry.get(c.id);
      if (!pyramid || pyramid.rows.length === 0) continue;
      const tfr = fertByIso.get(c.iso3);
      const lifeExpectancy = lifeByIso.get(c.iso3);
      if (tfr == null || lifeExpectancy == null) continue;
      const base = bandsFromPyramid(pyramid.rows);
      if (!base) continue;
      const outlook = computeLaborOutlook({
        base,
        startYear: pyramid.year,
        tfr,
        lifeExpectancy,
        netMigrationAnnual: migByIso.get(c.iso3) ?? null,
      });
      out.push({
        ...outlook,
        countryId: c.id,
        iso3: c.iso3,
        slug: c.slug,
        name: c.name,
        flagEmoji: c.flagEmoji,
        continent: c.continent,
      });
    }

    out.sort((a, b) => b.now.workersPerRetiree - a.now.workersPerRetiree);
    return out;
  },
  ["all-labor-outlooks"],
  { revalidate: 86400, tags: ["indicators", "countries"] },
);

function mil(n: number) {
  return Math.round(n / 1e5) / 10;
}

export type LaborExplorerBand = {
  year: number;
  workersPerRetiree: number;
  workingMil: number;
  oldMil: number;
};

/** Slim row for the client explorer (avoids shipping raw population floats). */
export type LaborExplorerRow = {
  iso3: string;
  slug: string;
  name: string;
  flagEmoji: string | null;
  continent: string | null;
  tfr: number;
  now: LaborExplorerBand;
  at2040: LaborExplorerBand;
  at2060: LaborExplorerBand;
  at2060Replacement: LaborExplorerBand;
};

function toExplorerBand(b: LaborBand): LaborExplorerBand {
  return {
    year: b.year,
    workersPerRetiree: b.workersPerRetiree,
    workingMil: mil(b.working),
    oldMil: mil(b.old),
  };
}

export function toLaborExplorerRows(rows: LaborOutlookRow[]): LaborExplorerRow[] {
  return rows.map((r) => ({
    iso3: r.iso3,
    slug: r.slug,
    name: r.name,
    flagEmoji: r.flagEmoji,
    continent: r.continent,
    tfr: r.tfr,
    now: toExplorerBand(r.now),
    at2040: toExplorerBand(r.at2040),
    at2060: toExplorerBand(r.at2060),
    at2060Replacement: toExplorerBand(r.at2060Replacement),
  }));
}
