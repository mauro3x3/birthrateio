// Builds a MODELED population pyramid broken down by ethnic group.
//
// We don't have true age × ethnicity microdata, but we do have two real
// anchors per country: the overall population composition (skews older /
// less diverse) and the composition of births (the youngest cohort, more
// diverse). We blend between them across age bands so that:
//   * the youngest band ≈ births composition,
//   * the population-weighted average across all ages = overall composition.
// The result is a plausible, clearly-labeled model — useful for visualizing
// how diaspora / minority groups are concentrated in younger cohorts.

export interface AgeRow {
  ageGroup: string;
  ageStart: number;
  male: number;
  female: number;
}

export interface EthnicityPyramidRow {
  ageGroup: string;
  ageStart: number;
  /** male[group] and female[group] populations. */
  m: Record<string, number>;
  f: Record<string, number>;
}

export interface EthnicityPyramidModel {
  rows: EthnicityPyramidRow[];
  groups: string[];
  maxValue: number;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function buildEthnicityPyramid(
  pyramid: AgeRow[],
  overall: Record<string, number>,
  births: Record<string, number>,
  groups: string[],
): EthnicityPyramidModel | null {
  if (!pyramid.length || groups.length === 0) return null;

  const totalPop =
    pyramid.reduce((s, r) => s + r.male + r.female, 0) || 1;
  // Age "oldness" weight per band and its population-weighted mean.
  const t = pyramid.map((r) => clamp01(r.ageStart / 85));
  const T =
    pyramid.reduce(
      (s, r, i) => s + ((r.male + r.female) / totalPop) * t[i],
      0,
    ) || 0.5;

  // Normalize anchors to fractions.
  const norm = (rec: Record<string, number>) => {
    const sum = groups.reduce((s, g) => s + (rec[g] ?? 0), 0) || 1;
    const out: Record<string, number> = {};
    for (const g of groups) out[g] = (rec[g] ?? 0) / sum;
    return out;
  };
  const P = norm(overall);
  const B = norm(births);

  // Solve the "old-age" composition O so the weighted mean equals P.
  const O: Record<string, number> = {};
  for (const g of groups) {
    O[g] = T > 0 ? Math.max(0, (P[g] - B[g] * (1 - T)) / T) : P[g];
  }

  let maxValue = 0;
  const rows: EthnicityPyramidRow[] = pyramid.map((r, i) => {
    const ti = t[i];
    const raw: Record<string, number> = {};
    let rawSum = 0;
    for (const g of groups) {
      const s = Math.max(0, B[g] * (1 - ti) + O[g] * ti);
      raw[g] = s;
      rawSum += s;
    }
    const m: Record<string, number> = {};
    const f: Record<string, number> = {};
    for (const g of groups) {
      const share = rawSum > 0 ? raw[g] / rawSum : 0;
      m[g] = r.male * share;
      f[g] = r.female * share;
    }
    maxValue = Math.max(maxValue, r.male, r.female);
    return { ageGroup: r.ageGroup, ageStart: r.ageStart, m, f };
  });

  return { rows, groups, maxValue };
}
