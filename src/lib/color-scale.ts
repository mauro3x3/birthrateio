// Lightweight choropleth colour scales (no d3 dependency).

export interface ScaleStop {
  t: number; // 0..1
  color: [number, number, number]; // RGB
}

// Sequential — soft slate→ink (editorial, not default Blues).
const SEQUENTIAL: ScaleStop[] = [
  { t: 0, color: [236, 232, 224] },
  { t: 0.18, color: [210, 208, 198] },
  { t: 0.35, color: [160, 172, 178] },
  { t: 0.52, color: [100, 130, 148] },
  { t: 0.7, color: [55, 95, 120] },
  { t: 0.86, color: [28, 62, 88] },
  { t: 1, color: [14, 36, 56] },
];

// Diverging — muted copper (low) → parchment (mid) → deep teal (high).
// Reads cleaner than harsh RdBu and fits an editorial demographic site.
const DIVERGING: ScaleStop[] = [
  { t: 0, color: [120, 48, 36] },
  { t: 0.14, color: [168, 78, 52] },
  { t: 0.28, color: [196, 128, 88] },
  { t: 0.4, color: [220, 188, 158] },
  { t: 0.5, color: [236, 230, 220] },
  { t: 0.6, color: [176, 198, 196] },
  { t: 0.72, color: [96, 148, 152] },
  { t: 0.86, color: [40, 100, 112] },
  { t: 1, color: [18, 64, 78] },
];

// Dark-stage diverging: bone (low) → charcoal mid → muted copper (high).
// Desaturated on purpose — busy world maps need calm fills.
const DIVERGING_DARK: ScaleStop[] = [
  { t: 0, color: [186, 176, 162] },
  { t: 0.22, color: [140, 128, 112] },
  { t: 0.42, color: [88, 82, 76] },
  { t: 0.5, color: [58, 54, 50] },
  { t: 0.62, color: [96, 72, 52] },
  { t: 0.8, color: [138, 96, 58] },
  { t: 1, color: [168, 118, 68] },
];

// Single-hue copper wash for dark maps (sequential).
const SEQUENTIAL_DARK: ScaleStop[] = [
  { t: 0, color: [42, 40, 38] },
  { t: 0.25, color: [78, 64, 52] },
  { t: 0.5, color: [128, 92, 58] },
  { t: 0.75, color: [176, 120, 64] },
  { t: 1, color: [220, 168, 100] },
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

export type ScaleType =
  | "sequential"
  | "sequential-log"
  | "diverging"
  | "diverging-dark"
  | "sequential-dark";

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
  const stops =
    type === "diverging-dark"
      ? DIVERGING_DARK
      : type === "sequential-dark"
        ? SEQUENTIAL_DARK
        : type === "diverging"
          ? DIVERGING
          : SEQUENTIAL;

  // Log mapping spreads colour across a long-tailed distribution (e.g. GDP per
  // capita) instead of crushing most countries into the palest shades.
  const safe = (v: number) => Math.max(v, 1);
  const logMin = isLog ? Math.log(safe(min)) : 0;
  const logMax = isLog ? Math.log(safe(max)) : 0;

  const toT = (v: number) => {
    if (isLog) {
      return (Math.log(safe(v)) - logMin) / (logMax - logMin || 1);
    }
    if (
      (type === "diverging" || type === "diverging-dark") &&
      mid !== undefined
    ) {
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
  } else if (
    (type === "diverging" || type === "diverging-dark") &&
    mid !== undefined
  ) {
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
