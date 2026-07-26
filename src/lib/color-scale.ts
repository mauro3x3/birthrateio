// Lightweight choropleth colour scales (no d3 dependency).

export interface ScaleStop {
  t: number; // 0..1
  color: [number, number, number]; // RGB
}

// Sequential — ColorBrewer "Blues" (light -> deep), crisp single-hue ramp.
const SEQUENTIAL: ScaleStop[] = [
  { t: 0, color: [247, 251, 255] },
  { t: 0.15, color: [222, 235, 247] },
  { t: 0.3, color: [198, 219, 239] },
  { t: 0.45, color: [158, 202, 225] },
  { t: 0.6, color: [66, 146, 198] },
  { t: 0.75, color: [33, 113, 181] },
  { t: 0.88, color: [8, 81, 156] },
  { t: 1, color: [8, 48, 107] },
];

// Diverging — ColorBrewer "RdBu" reversed (red low -> clean neutral -> blue).
// Replaces the old muddy tan midpoint with a crisp light neutral.
const DIVERGING: ScaleStop[] = [
  { t: 0, color: [153, 18, 43] }, // strong red (kept off near-black)
  { t: 0.12, color: [198, 60, 58] },
  { t: 0.28, color: [228, 120, 100] },
  { t: 0.42, color: [246, 178, 147] },
  { t: 0.5, color: [247, 247, 247] }, // neutral mid
  { t: 0.58, color: [150, 200, 224] },
  { t: 0.72, color: [82, 158, 200] },
  { t: 0.88, color: [40, 110, 178] },
  { t: 1, color: [21, 78, 150] }, // strong blue (kept off near-black)
];

function interp(stops: ScaleStop[], t: number): string {
  const x = Math.max(0, Math.min(1, t));
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i].t) {
      const a = stops[i - 1];
      const b = stops[i];
      const local = (x - a.t) / (b.t - a.t || 1);
      const c = a.color.map((ac, j) =>
        Math.round(ac + (b.color[j] - ac) * local),
      );
      return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    }
  }
  const last = stops[stops.length - 1].color;
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
}

export type ScaleType = "sequential" | "sequential-log" | "diverging";

export interface ColorScale {
  color: (value: number) => string;
  /** Legend breakpoints: array of {value, color}. */
  legend: { value: number; color: string }[];
  min: number;
  max: number;
  mid?: number;
}

export function buildColorScale(
  values: number[],
  type: ScaleType = "sequential",
  mid?: number,
  /** Fix the colour domain (e.g. so an animation keeps one scale across years). */
  domain?: { min: number; max: number },
): ColorScale {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0 && !domain) {
    return {
      color: () => "rgb(200,200,200)",
      legend: [],
      min: 0,
      max: 1,
    };
  }
  let min: number;
  let max: number;
  if (domain) {
    min = domain.min;
    max = domain.max;
  } else {
    const sorted = [...finite].sort((a, b) => a - b);
    // Use 2nd/98th percentile to avoid outlier distortion.
    const q = (p: number) =>
      sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))];
    min = q(0.02);
    max = q(0.98);
  }
  const isLog = type === "sequential-log";
  const stops = type === "diverging" ? DIVERGING : SEQUENTIAL;

  // Log mapping spreads colour across a long-tailed distribution (e.g. GDP per
  // capita) instead of crushing most countries into the palest shades.
  const safe = (v: number) => Math.max(v, 1);
  const logMin = isLog ? Math.log(safe(min)) : 0;
  const logMax = isLog ? Math.log(safe(max)) : 0;

  const toT = (v: number) => {
    if (isLog) {
      return (Math.log(safe(v)) - logMin) / (logMax - logMin || 1);
    }
    if (type === "diverging" && mid !== undefined) {
      if (v <= mid) return 0.5 * ((v - min) / (mid - min || 1));
      return 0.5 + 0.5 * ((v - mid) / (max - mid || 1));
    }
    return (v - min) / (max - min || 1);
  };

  const color = (value: number) => interp(stops, toT(value));

  let legendValues: number[];
  if (isLog) {
    // Log-spaced, evenly distributed ticks across the domain.
    legendValues = [0, 0.25, 0.5, 0.75, 1].map((p) =>
      Math.exp(logMin + (logMax - logMin) * p),
    );
  } else if (type === "diverging" && mid !== undefined) {
    legendValues = [min, (min + mid) / 2, mid, (mid + max) / 2, max];
  } else {
    legendValues = [
      min,
      min + (max - min) * 0.25,
      (min + max) / 2,
      min + (max - min) * 0.75,
      max,
    ];
  }

  const legend = legendValues.map((value) => ({ value, color: color(value) }));

  // Surface a geometric-mean mid tick for log scales so the legend communicates
  // the non-linear spacing (without affecting the colour mapping above).
  const legendMid = isLog ? legendValues[2] : mid;

  return { color, legend, min, max, mid: legendMid };
}
