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

// Growth maps (light): red = shrinking → parchment mid → blue = growing.
const DIVERGING_GROWTH: ScaleStop[] = [
  { t: 0, color: [156, 42, 48] },
  { t: 0.18, color: [196, 88, 78] },
  { t: 0.34, color: [220, 150, 130] },
  { t: 0.5, color: [236, 230, 220] },
  { t: 0.66, color: [140, 176, 200] },
  { t: 0.82, color: [64, 128, 176] },
  { t: 1, color: [28, 84, 140] },
];

// Growth maps (cinema): red decline → charcoal zero → blue growth.
const DIVERGING_GROWTH_DARK: ScaleStop[] = [
  { t: 0, color: [190, 72, 68] },
  { t: 0.2, color: [148, 78, 74] },
  { t: 0.4, color: [82, 68, 70] },
  { t: 0.5, color: [52, 50, 54] },
  { t: 0.6, color: [58, 78, 100] },
  { t: 0.8, color: [72, 124, 168] },
  { t: 1, color: [90, 160, 210] },
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
  | "diverging-growth"
  | "diverging-growth-dark"
  | "sequential-dark";

function isDivergingScale(type: ScaleType): boolean {
  return (
    type === "diverging" ||
    type === "diverging-dark" ||
    type === "diverging-growth" ||
    type === "diverging-growth-dark"
  );
}

function stopsFor(type: ScaleType): ScaleStop[] {
  switch (type) {
    case "diverging-dark":
      return DIVERGING_DARK;
    case "diverging-growth":
      return DIVERGING_GROWTH;
    case "diverging-growth-dark":
      return DIVERGING_GROWTH_DARK;
    case "diverging":
      return DIVERGING;
    case "sequential-dark":
      return SEQUENTIAL_DARK;
    default:
      return SEQUENTIAL;
  }
}

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
  const stops = stopsFor(type);
  const diverging = isDivergingScale(type);

  // Log mapping spreads colour across a long-tailed distribution (e.g. GDP per
  // capita) instead of crushing most countries into the palest shades.
  const safe = (v: number) => Math.max(v, 1);
  const logMin = isLog ? Math.log(safe(min)) : 0;
  const logMax = isLog ? Math.log(safe(max)) : 0;

  const toT = (v: number) => {
    if (isLog) {
      return (Math.log(safe(v)) - logMin) / (logMax - logMin || 1);
    }
    if (diverging && mid !== undefined) {
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
  } else if (diverging && mid !== undefined) {
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
