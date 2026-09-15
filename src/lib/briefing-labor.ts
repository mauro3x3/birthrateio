import {
  AGE_GROUPS,
  project,
  summarize,
  type AgeSexPopulation,
} from "@/lib/demography";
import { getPopulationPyramid } from "@/lib/queries";

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

  const start = pyramid.year;
  // 5-year steps: 3 ≈ 15 years (2040-ish), 7 ≈ 35 years (2060-ish).
  const current = project(base, paramsNow, start, 7);
  const replacement = project(base, params21, start, 7);
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
    note: "Modeled from today’s age pyramid, holding period TFR, life expectancy, and recent net migration. 2040 working-age people are mostly already born; TFR mainly shows up in the 2060 workforce. Not an official CBS or UN forecast.",
  };
}
