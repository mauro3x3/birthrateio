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
