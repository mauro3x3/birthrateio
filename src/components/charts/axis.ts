/** Shared Y-axis scaling helpers for time-series charts. */

/** Round to a "nice" 1/2/5 × 10ⁿ step for clean axis bounds. */
export function niceStep(range: number): number {
  if (!Number.isFinite(range) || range <= 0) return 1;
  const exp = Math.floor(Math.log10(range));
  const base = Math.pow(10, exp);
  const frac = range / base;
  const niceFrac = frac < 1.5 ? 1 : frac < 3 ? 2 : frac < 7 ? 5 : 10;
  return niceFrac * base;
}

/**
 * Auto-scale the Y-axis to a padded band around the data so trends are legible
 * (avoids the "flat line" caused by anchoring the axis at 0). Keeps 0 only when
 * the data is genuinely near it, and always includes an optional reference line.
 */
export function computeDomain(
  values: number[],
  referenceY?: number,
): [number, number] | undefined {
  const vals = values.filter((v) => Number.isFinite(v));
  if (vals.length === 0) return undefined;
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (referenceY !== undefined) {
    lo = Math.min(lo, referenceY);
    hi = Math.max(hi, referenceY);
  }
  if (lo === hi) {
    const pad = Math.abs(lo) * 0.1 || 1;
    return [lo - pad, hi + pad];
  }
  const step = niceStep((hi - lo) / 4);
  let niceLo = Math.floor((lo - (hi - lo) * 0.08) / step) * step;
  const niceHi = Math.ceil((hi + (hi - lo) * 0.08) / step) * step;
  if (lo >= 0 && niceLo < 0) niceLo = 0;
  return [niceLo, niceHi];
}

/** Even ticks across a computed domain (e.g. 0, 2, 4, 6, 8, 10). */
export function niceTicks(domain: [number, number], count = 5): number[] {
  const [lo, hi] = domain;
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return [lo];
  const step = niceStep((hi - lo) / count);
  const ticks: number[] = [];
  const start = Math.ceil((lo - step * 1e-9) / step) * step;
  for (let v = start; v <= hi + step * 1e-9; v += step) {
    ticks.push(Number(v.toPrecision(10)));
  }
  if (ticks[0] !== lo && lo === 0) ticks.unshift(0);
  return ticks;
}

/** Calendar-year ticks that keep 1960…2023 from labeling every survey year. */
export function niceYearTicks(min: number, max: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) return [];
  if (min === max) return [min];
  const span = max - min;
  const step =
    span <= 8 ? 1 : span <= 16 ? 2 : span <= 40 ? 5 : span <= 80 ? 10 : span <= 160 ? 20 : 50;
  const start = min % step === 0 ? min : Math.ceil(min / step) * step;
  const ticks: number[] = [];
  if (start !== min && start - min >= step * 0.45) ticks.push(min);
  for (let y = start; y <= max; y += step) ticks.push(y);
  return ticks;
}
