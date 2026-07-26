// ---------------------------------------------------------------------------
// Cohort-component demographic engine.
//
// Used in three places:
//   1. /simulator — interactive projections from user assumptions.
//   2. Ingestion — generating model population pyramids from real World Bank
//      population + fertility + life-expectancy inputs.
//   3. Ingestion — generating population projections by TFR scenario.
//
// The model uses 5-year age groups (0-4 ... 100+), a parametric (Weibull)
// survival curve calibrated to a target life expectancy, and a standard
// age-specific fertility schedule. Outputs are clearly "modeled" estimates.
// ---------------------------------------------------------------------------

export const AGE_GROUPS = [
  "0-4", "5-9", "10-14", "15-19", "20-24", "25-29", "30-34", "35-39",
  "40-44", "45-49", "50-54", "55-59", "60-64", "65-69", "70-74", "75-79",
  "80-84", "85-89", "90-94", "95-99", "100+",
] as const;

export const AGE_STARTS = AGE_GROUPS.map((_, i) => i * 5);
const N = AGE_GROUPS.length;
const STEP = 5;
const SRB = 1.05; // sex ratio at birth (males per female)
const FEMALE_SHARE_AT_BIRTH = 1 / (1 + SRB);

// Standard age-specific fertility distribution across 5-year groups 15-49.
// Index aligns to AGE_GROUPS[3..9]. Sums to 1; scaled by TFR.
const ASFR_SHAPE: Record<number, number> = {
  15: 0.07, // 15-19
  20: 0.18, // 20-24
  25: 0.27, // 25-29
  30: 0.25, // 30-34
  35: 0.15, // 35-39
  40: 0.07, // 40-44
  45: 0.01, // 45-49
};

export interface AgeSexPopulation {
  male: number[]; // length N
  female: number[]; // length N
}

export interface ProjectionParams {
  tfr: number;
  lifeExpectancy: number; // e0 (both sexes); female gets +~5y, male -~ to balance
  netMigrationPerStep?: number; // net migrants added each 5-year step
}

export interface ProjectionSnapshot {
  year: number;
  total: number;
  male: number[];
  female: number[];
  births: number;
  deaths: number;
}

/** Weibull survivorship l(x) calibrated so life expectancy ≈ e0. */
function survivorship(e0: number): number[] {
  // l(x) = exp(-(x/scale)^shape). Choose shape by e0 (higher e0 => rectangular).
  const shape = e0 >= 75 ? 6.5 : e0 >= 65 ? 5 : e0 >= 55 ? 3.8 : 3;
  // Solve scale so that ∫ l(x) dx = e0 (trapezoidal over 0..110).
  const integ = (scale: number) => {
    let sum = 0;
    const dx = 1;
    let prev = 1;
    for (let x = dx; x <= 115; x += dx) {
      const lx = Math.exp(-Math.pow(x / scale, shape));
      sum += ((prev + lx) / 2) * dx;
      prev = lx;
    }
    return sum;
  };
  // Bisection on scale.
  let lo = 1,
    hi = 200;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (integ(mid) > e0) hi = mid;
    else lo = mid;
  }
  const scale = (lo + hi) / 2;
  const l: number[] = [];
  for (let i = 0; i <= N; i++) {
    const x = i * STEP;
    l.push(Math.exp(-Math.pow(x / scale, shape)));
  }
  return l; // length N+1
}

/** 5-year survival ratios Sx = L(x+5)/L(x). */
function survivalRatios(e0: number): number[] {
  const l = survivorship(e0);
  const L: number[] = [];
  for (let i = 0; i < N; i++) L.push(((l[i] + l[i + 1]) / 2) * STEP);
  // Final open group person-years (rough tail).
  const Lopen = (l[N] / 2) * STEP;
  const S: number[] = [];
  for (let i = 0; i < N - 1; i++) S.push(L[i + 1] / L[i]);
  S.push(Lopen / (L[N - 1] + Lopen)); // 100+ retention
  // Birth survival (to 0-4 group): L0/(5*l0)
  return S;
}

function birthSurvival(e0: number): number {
  const l = survivorship(e0);
  const L0 = ((l[0] + l[1]) / 2) * STEP;
  return L0 / (STEP * 1); // l0 = 1
}

/**
 * Real broad age-band shares for a country (percentages of total population),
 * e.g. from World Bank SP.POP.0014/1564/65UP. When supplied, the starting
 * pyramid is anchored to these — preserving demographic momentum — instead of
 * assuming the country sits at its long-run equilibrium age structure.
 */
export interface AgeBandShares {
  youth: number; // 0–14
  working: number; // 15–64
  old: number; // 65+
}

function splitSex(grp: number, i: number): { male: number; female: number } {
  // Slightly more males when young, more females when old (SRB + mortality).
  const maleShare = Math.min(0.62, Math.max(0.35, 0.512 - i * 0.004));
  return { male: grp * maleShare, female: grp * (1 - maleShare) };
}

/**
 * Build a starting age structure scaled to `total`.
 *
 * - With `shares` (real 0–14 / 15–64 / 65+ data): distribute each band across
 *   its 5-year groups using the stationary survival shape, then scale each band
 *   to its real share. This keeps the true working-age bulge, so projections
 *   reflect momentum (gradual then accelerating change) rather than the full
 *   equilibrium growth/decline rate from year one.
 * - Without `shares`: fall back to the theoretical stable population implied by
 *   TFR + e0 (used for hypothetical "custom" scenarios with no country).
 */
export function buildStablePopulation(
  total: number,
  tfr: number,
  e0: number,
  shares?: AgeBandShares,
): AgeSexPopulation {
  const l = survivorship(e0);
  const L: number[] = [];
  for (let i = 0; i < N; i++) L.push(((l[i] + l[i + 1]) / 2) * STEP);

  const male: number[] = [];
  const female: number[] = [];

  if (shares && shares.youth + shares.working + shares.old > 0) {
    // Age-group index ranges for each broad band.
    const bands: { from: number; to: number; share: number }[] = [
      { from: 0, to: 2, share: shares.youth }, // 0–14
      { from: 3, to: 12, share: shares.working }, // 15–64
      { from: 13, to: N - 1, share: shares.old }, // 65+
    ];
    const shareSum = shares.youth + shares.working + shares.old;
    const grp = new Array(N).fill(0);
    for (const b of bands) {
      let wSum = 0;
      for (let i = b.from; i <= b.to; i++) wSum += L[i];
      if (wSum <= 0) continue;
      const bandTotal = (b.share / shareSum) * total;
      for (let i = b.from; i <= b.to; i++) {
        grp[i] = (L[i] / wSum) * bandTotal;
      }
    }
    for (let i = 0; i < N; i++) {
      const s = splitSex(grp[i], i);
      male.push(s.male);
      female.push(s.female);
    }
    return { male, female };
  }

  // Fallback: theoretical stable population from TFR + e0.
  const meanAgeChildbearing = 29;
  const survToMean = Math.exp(-Math.pow(meanAgeChildbearing / (e0 * 1.3), 5));
  const nrr = tfr * FEMALE_SHARE_AT_BIRTH * Math.min(1, Math.max(0.4, survToMean));
  const r = Math.log(Math.max(0.3, nrr)) / 27; // generation length ~27y

  const weights: number[] = [];
  for (let i = 0; i < N; i++) {
    const aMid = i * STEP + STEP / 2;
    weights.push(Math.exp(-r * aMid) * L[i]);
  }
  const wSum = weights.reduce((a, b) => a + b, 0);

  for (let i = 0; i < N; i++) {
    const grp = (weights[i] / wSum) * total;
    const s = splitSex(grp, i);
    male.push(s.male);
    female.push(s.female);
  }
  return { male, female };
}

/** Advance one 5-year step using the cohort-component method. */
function step(
  pop: AgeSexPopulation,
  params: ProjectionParams,
): { next: AgeSexPopulation; births: number; deaths: number } {
  const e0f = params.lifeExpectancy + 2.5;
  const e0m = params.lifeExpectancy - 2.5;
  const Sf = survivalRatios(e0f);
  const Sm = survivalRatios(e0m);
  const bsF = birthSurvival(e0f);
  const bsM = birthSurvival(e0m);

  const before = totalPop(pop);

  // Births from female population in fertile ages.
  let births = 0;
  for (const [ageStartStr, shareFrac] of Object.entries(ASFR_SHAPE)) {
    const ageStart = Number(ageStartStr);
    const idx = ageStart / 5;
    const asfr = (params.tfr * shareFrac) / STEP; // annual rate per woman
    births += pop.female[idx] * asfr * STEP; // over the 5-year step
  }
  const femaleBirths = births * FEMALE_SHARE_AT_BIRTH;
  const maleBirths = births - femaleBirths;

  const male = new Array(N).fill(0);
  const female = new Array(N).fill(0);

  // Age existing cohorts forward.
  for (let i = 0; i < N - 1; i++) {
    male[i + 1] += pop.male[i] * Sm[i];
    female[i + 1] += pop.female[i] * Sf[i];
  }
  // Open-ended group retains survivors.
  male[N - 1] += pop.male[N - 1] * Sm[N - 1];
  female[N - 1] += pop.female[N - 1] * Sf[N - 1];

  // New births into youngest group.
  male[0] += maleBirths * bsM;
  female[0] += femaleBirths * bsF;

  // Migration distributed mostly to working ages (20-44).
  const mig = params.netMigrationPerStep ?? 0;
  if (mig !== 0) {
    const profile = [0, 0, 0.04, 0.12, 0.16, 0.16, 0.13, 0.1, 0.08, 0.06, 0.05, 0.04, 0.03, 0.02, 0.01, 0, 0, 0, 0, 0, 0];
    const pSum = profile.reduce((a, b) => a + b, 0) || 1;
    for (let i = 0; i < N; i++) {
      const add = (mig * profile[i]) / pSum;
      male[i] += add * 0.5;
      female[i] += add * 0.5;
    }
  }

  const after = totalPop({ male, female });
  const deaths = Math.max(0, before + births + mig - after);
  return { next: { male, female }, births, deaths };
}

export function totalPop(pop: AgeSexPopulation): number {
  return (
    pop.male.reduce((a, b) => a + b, 0) +
    pop.female.reduce((a, b) => a + b, 0)
  );
}

/** Project a base population forward `steps` 5-year periods. */
export function project(
  base: AgeSexPopulation,
  params: ProjectionParams,
  startYear: number,
  steps: number,
): ProjectionSnapshot[] {
  const out: ProjectionSnapshot[] = [
    {
      year: startYear,
      total: totalPop(base),
      male: [...base.male],
      female: [...base.female],
      births: 0,
      deaths: 0,
    },
  ];
  let current = base;
  for (let s = 1; s <= steps; s++) {
    const { next, births, deaths } = step(current, params);
    out.push({
      year: startYear + s * STEP,
      total: totalPop(next),
      male: [...next.male],
      female: [...next.female],
      births,
      deaths,
    });
    current = next;
  }
  return out;
}

/** Derived summary metrics for the simulator UI. */
export function summarize(snap: ProjectionSnapshot) {
  const youth = sumRange(snap, 0, 2); // 0-14
  const working = sumRange(snap, 3, 12); // 15-64
  const old = sumRange(snap, 13, N - 1); // 65+
  return {
    total: snap.total,
    youthShare: (youth / snap.total) * 100,
    workingShare: (working / snap.total) * 100,
    elderlyShare: (old / snap.total) * 100,
    medianAgeApprox: medianAge(snap),
    dependencyRatio: ((youth + old) / working) * 100,
  };
}

function sumRange(snap: ProjectionSnapshot, from: number, to: number): number {
  let s = 0;
  for (let i = from; i <= to; i++) s += snap.male[i] + snap.female[i];
  return s;
}

function medianAge(snap: ProjectionSnapshot): number {
  const half = snap.total / 2;
  let cum = 0;
  for (let i = 0; i < N; i++) {
    const grp = snap.male[i] + snap.female[i];
    if (cum + grp >= half) {
      const within = (half - cum) / grp;
      return i * STEP + within * STEP;
    }
    cum += grp;
  }
  return 100;
}
