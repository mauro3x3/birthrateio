import {
  AGE_GROUPS,
  project,
  totalPop,
  type AgeSexPopulation,
  type ProjectionParams,
} from "@/lib/demography";

export const SINGLE_YEAR_AGES = 101; // 0..100, with 100 standing in for 100+

export interface PyramidFrame {
  year: number;
  male: number[]; // length 21 (5-year groups)
  female: number[];
  total: number;
}

export interface SingleYearCounts {
  male: number[]; // length 101
  female: number[];
}

/**
 * Single-year bars from 5-year counts. Densities are interpolated between
 * adjacent cohort midpoints so the silhouette is continuous, then each
 * 5-year band is rescaled so its total is unchanged.
 */
export function expandFiveYearToSingleYear(
  male: number[],
  female: number[],
): SingleYearCounts {
  return {
    male: expandSex(male),
    female: expandSex(female),
  };
}

function expandSex(src: number[]): number[] {
  const groups = 20; // 0–4 … 95–99
  const dens: number[] = [];
  for (let i = 0; i < groups; i++) dens.push((src[i] ?? 0) / 5);
  const mid = (i: number) => i * 5 + 2;
  const out = new Array(SINGLE_YEAR_AGES).fill(0);

  for (let age = 0; age < 100; age++) {
    let v: number;
    if (age <= mid(0)) {
      const t = (age - mid(0)) / 5;
      v = dens[0] + ((dens[1] ?? dens[0]) - dens[0]) * t;
    } else if (age >= mid(groups - 1)) {
      const t = (age - mid(groups - 1)) / 5;
      v =
        dens[groups - 1] +
        (dens[groups - 1] - (dens[groups - 2] ?? dens[groups - 1])) * t;
    } else {
      const i0 = Math.min(groups - 2, Math.max(0, Math.floor((age - 2) / 5)));
      const i1 = i0 + 1;
      const t = (age - mid(i0)) / 5;
      v = dens[i0] + (dens[i1] - dens[i0]) * t;
    }
    out[age] = Math.max(0, v);
  }
  // 100+ is an open group (everyone 100 and older), not a single year of age.
  // Plot it on the same per-year density scale as 0–99 or it reads as a spike
  // and can dominate the axis.
  out[100] = Math.max(0, (src[20] ?? 0) / 5);

  for (let i = 0; i < groups; i++) {
    const target = src[i] ?? 0;
    let sum = 0;
    for (let k = 0; k < 5; k++) sum += out[i * 5 + k];
    if (sum > 0 && target > 0) {
      const k = target / sum;
      for (let j = 0; j < 5; j++) out[i * 5 + j] *= k;
    } else if (target > 0) {
      for (let j = 0; j < 5; j++) out[i * 5 + j] = target / 5;
    }
  }
  return out;
}

export function alignFiveYear(
  male: number[],
  female: number[],
): AgeSexPopulation {
  const m = new Array(AGE_GROUPS.length).fill(0);
  const f = new Array(AGE_GROUPS.length).fill(0);
  for (let i = 0; i < AGE_GROUPS.length; i++) {
    m[i] = male[i] ?? 0;
    f[i] = female[i] ?? 0;
  }
  return { male: m, female: f };
}

/** Cohort-component snapshots every 5 years, interpolated to yearly frames. */
export function buildYearlyPyramidFrames(opts: {
  male: number[];
  female: number[];
  startYear: number;
  endYear: number;
  params: ProjectionParams;
}): PyramidFrame[] {
  const base = alignFiveYear(opts.male, opts.female);
  const span = Math.max(0, opts.endYear - opts.startYear);
  const steps = Math.ceil(span / 5);
  const snaps = project(base, opts.params, opts.startYear, steps);
  const out: PyramidFrame[] = [];
  for (let y = 0; y <= span; y++) {
    const pos = y / 5;
    const lo = Math.min(Math.floor(pos), snaps.length - 1);
    const hi = Math.min(lo + 1, snaps.length - 1);
    const t = pos - Math.floor(pos);
    const a = snaps[lo];
    const b = snaps[hi];
    if (!a) break;
    const male = a.male.map((v, i) => v + ((b.male[i] ?? v) - v) * t);
    const female = a.female.map((v, i) => v + ((b.female[i] ?? v) - v) * t);
    out.push({
      year: opts.startYear + y,
      male,
      female,
      total: male.reduce((s, v) => s + v, 0) + female.reduce((s, v) => s + v, 0),
    });
  }
  if (out.length === 0) {
    out.push({
      year: opts.startYear,
      male: base.male,
      female: base.female,
      total: totalPop(base),
    });
  }
  return out;
}

export function maxSingleYearBand(frames: PyramidFrame[]): number {
  let m = 0;
  for (const fr of frames) {
    const exp = expandFiveYearToSingleYear(fr.male, fr.female);
    for (let i = 0; i < SINGLE_YEAR_AGES; i++) {
      m = Math.max(m, exp.male[i], exp.female[i]);
    }
  }
  if (m <= 0) return 1;
  return Math.ceil(m);
}
