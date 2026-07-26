/* eslint-disable no-console */
// Real population pyramids from the World Bank's 5-year age-sex series.
//
// The World Bank publishes population by 5-year age band as a PERCENT of each
// sex's population (the ".5Y" indicator family), plus male/female population
// totals. Multiplying the two reconstructs real counts per band — giving a true
// age structure (not a model) for every country, matching our 5-year groups.
//
// Bands cover 0–4 … 75–79 explicitly, then a single 80+ band, which we split
// into 80-84 … 100+ using a fixed elderly-survival shape (the 80+ tail is a
// small share, so the approximation is minor).

import { fetchIndicator } from "./worldbank";

// World Bank band code → index into AGE_GROUPS (0–4 = 0, 5–9 = 1, …).
const BAND_CODES: { code: string; idx: number }[] = [
  { code: "0004", idx: 0 },
  { code: "0509", idx: 1 },
  { code: "1014", idx: 2 },
  { code: "1519", idx: 3 },
  { code: "2024", idx: 4 },
  { code: "2529", idx: 5 },
  { code: "3034", idx: 6 },
  { code: "3539", idx: 7 },
  { code: "4044", idx: 8 },
  { code: "4549", idx: 9 },
  { code: "5054", idx: 10 },
  { code: "5559", idx: 11 },
  { code: "6064", idx: 12 },
  { code: "6569", idx: 13 },
  { code: "7074", idx: 14 },
  { code: "7579", idx: 15 },
];

// How the 80+ band is distributed across 80-84, 85-89, 90-94, 95-99, 100+.
const OPEN_TAIL_WEIGHTS = [0.46, 0.3, 0.16, 0.06, 0.02];

export interface RealPyramid {
  year: number;
  male: number[]; // length 21 (AGE_GROUPS)
  female: number[];
}

// iso3 -> year -> value
type Nested = Map<string, Map<number, number>>;

function nest(rows: { iso3: string; year: number; value: number }[]): Nested {
  const m: Nested = new Map();
  for (const r of rows) {
    let byYear = m.get(r.iso3);
    if (!byYear) {
      byYear = new Map();
      m.set(r.iso3, byYear);
    }
    byYear.set(r.year, r.value);
  }
  return m;
}

/**
 * Fetch and reconstruct real 5-year pyramids for every country.
 * Returns a map keyed by ISO3 with male/female counts per age group.
 */
export async function fetchRealPyramids(
  startYear = 2012,
): Promise<Map<string, RealPyramid>> {
  const endYear = new Date().getFullYear();

  // Male/female population totals (counts).
  const [maleTot, femaleTot] = await Promise.all([
    fetchIndicator("SP.POP.TOTL.MA.IN", startYear, endYear),
    fetchIndicator("SP.POP.TOTL.FE.IN", startYear, endYear),
  ]);
  const maleTotN = nest(maleTot);
  const femaleTotN = nest(femaleTot);

  // Band percentages (% of each sex). Fetch sequentially-ish but in parallel
  // pairs to stay friendly to the API.
  const malePct: Record<string, Nested> = {};
  const femalePct: Record<string, Nested> = {};
  for (const { code } of BAND_CODES) {
    const [m, f] = await Promise.all([
      fetchIndicator(`SP.POP.${code}.MA.5Y`, startYear, endYear),
      fetchIndicator(`SP.POP.${code}.FE.5Y`, startYear, endYear),
    ]);
    malePct[code] = nest(m);
    femalePct[code] = nest(f);
  }
  const [open80M, open80F] = await Promise.all([
    fetchIndicator("SP.POP.80UP.MA.5Y", startYear, endYear),
    fetchIndicator("SP.POP.80UP.FE.5Y", startYear, endYear),
  ]);
  const open80MN = nest(open80M);
  const open80FN = nest(open80F);

  const out = new Map<string, RealPyramid>();

  for (const [iso3, byYear] of maleTotN) {
    const femaleYears = femaleTotN.get(iso3);
    if (!femaleYears) continue;

    // Latest year present in both totals AND the band data.
    const candidateYears = [...byYear.keys()].sort((a, b) => b - a);
    let chosen: number | null = null;
    for (const y of candidateYears) {
      if (
        femaleYears.has(y) &&
        malePct["0004"].get(iso3)?.has(y) &&
        femalePct["0004"].get(iso3)?.has(y)
      ) {
        chosen = y;
        break;
      }
    }
    if (chosen == null) continue;

    const mPop = byYear.get(chosen)!;
    const fPop = femaleYears.get(chosen)!;

    const male = new Array(21).fill(0);
    const female = new Array(21).fill(0);

    for (const { code, idx } of BAND_CODES) {
      const mp = malePct[code].get(iso3)?.get(chosen);
      const fp = femalePct[code].get(iso3)?.get(chosen);
      if (mp != null) male[idx] = (mp / 100) * mPop;
      if (fp != null) female[idx] = (fp / 100) * fPop;
    }

    // 80+ split across 80-84 … 100+ (indices 16–20).
    const m80 = open80MN.get(iso3)?.get(chosen);
    const f80 = open80FN.get(iso3)?.get(chosen);
    if (m80 != null) {
      const total = (m80 / 100) * mPop;
      OPEN_TAIL_WEIGHTS.forEach((w, k) => (male[16 + k] = total * w));
    }
    if (f80 != null) {
      const total = (f80 / 100) * fPop;
      OPEN_TAIL_WEIGHTS.forEach((w, k) => (female[16 + k] = total * w));
    }

    out.set(iso3, { year: chosen, male, female });
  }

  console.log(`  ↳ reconstructed real pyramids for ${out.size} countries`);
  return out;
}
