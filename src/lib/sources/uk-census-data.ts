import ladData from "../data/uk-lad-ethnicity-census2021.json";

export type UkEthnicGroupId =
  | "white"
  | "asian"
  | "black"
  | "mixed"
  | "other";

export type UkGeographyLevel = "lad" | "msoa";

export type UkEthnicGroup = {
  id: UkEthnicGroupId;
  label: string;
  shortLabel: string;
  description: string;
};

/** High-level Census 2021 ethnic groups (ONS census maps topic). */
export const UK_ETHNIC_GROUPS: UkEthnicGroup[] = [
  {
    id: "white",
    label: "White",
    shortLabel: "White",
    description:
      "Share of usual residents who identified as White (including English/Welsh/Scottish/Northern Irish/British, Irish, Gypsy or Irish Traveller, Roma, and Other White).",
  },
  {
    id: "asian",
    label: "Asian, Asian British or Asian Welsh",
    shortLabel: "Asian",
    description:
      "Share identifying as Asian, Asian British or Asian Welsh (Bangladeshi, Chinese, Indian, Pakistani, or Other Asian).",
  },
  {
    id: "black",
    label: "Black, Black British, Black Welsh, Caribbean or African",
    shortLabel: "Black",
    description:
      "Share identifying as Black, Black British, Black Welsh, Caribbean or African.",
  },
  {
    id: "mixed",
    label: "Mixed or Multiple ethnic groups",
    shortLabel: "Mixed",
    description:
      "Share identifying with Mixed or Multiple ethnic groups.",
  },
  {
    id: "other",
    label: "Other ethnic group",
    shortLabel: "Other",
    description:
      "Share identifying as Arab or Any other ethnic group.",
  },
];

export const UK_CENSUS_META = {
  source: ladData.source,
  sourceUrl: ladData.sourceUrl,
  mapsUrl: ladData.mapsUrl,
  year: ladData.year,
  ladGeography: ladData.geography,
  msoaGeography: "Middle Layer Super Output Areas (England and Wales)",
  unit: ladData.unit as string,
  englandAndWales: ladData.englandAndWales as {
    population: number;
    shares: Record<UkEthnicGroupId, number>;
  },
  msoaDataUrl: "/data/uk-msoa-ethnicity-census2021.json",
  ladGeoUrl: "/geo/uk-lad-2022.json",
  msoaGeoUrl: "/geo/uk-msoa-2021.json",
};

export type UkAreaEthnicityRow = {
  code: string;
  name: string;
  slug: string;
  population: number;
  shares: Record<UkEthnicGroupId, number>;
  ladCode?: string | null;
  ladName?: string | null;
  officialName?: string;
};

export const UK_LAD_ETHNICITY: UkAreaEthnicityRow[] = Object.values(
  ladData.areas as Record<string, UkAreaEthnicityRow>,
).sort((a, b) => a.name.localeCompare(b.name));

export type UkMsoaFile = {
  source: string;
  sourceUrl: string;
  mapsUrl: string;
  namesSource?: string;
  year: number;
  geography: string;
  areas: Record<string, UkAreaEthnicityRow>;
};

export function getUkEthnicGroup(id: string): UkEthnicGroup {
  return UK_ETHNIC_GROUPS.find((g) => g.id === id) ?? UK_ETHNIC_GROUPS[0];
}

/**
 * ONS-style yellow→teal→navy stops (class midpoints / continuous).
 * Tuned for a light paper map stage.
 */
const UK_PCT_STOPS: [number, [number, number, number]][] = [
  // Warm sand — reads as land against cool grey-blue ocean
  [0, [242, 220, 140]],
  [0.2, [176, 206, 138]],
  [0.4, [88, 168, 152]],
  [0.65, [48, 128, 168]],
  [0.85, [30, 90, 142]],
  [1, [20, 55, 108]],
];

function lerpStop(t: number): string {
  const x = Math.max(0, Math.min(1, t));
  for (let i = 1; i < UK_PCT_STOPS.length; i++) {
    if (x <= UK_PCT_STOPS[i][0]) {
      const [t0, c0] = UK_PCT_STOPS[i - 1];
      const [t1, c1] = UK_PCT_STOPS[i];
      const u = (x - t0) / (t1 - t0 || 1);
      const rgb = c0.map((a, j) => Math.round(a + (c1[j] - a) * u));
      return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    }
  }
  const last = UK_PCT_STOPS[UK_PCT_STOPS.length - 1][1];
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
}

/** Continuous yellow→navy for a given domain (legacy / fine gradients). */
export function ukPctColor(
  value: number,
  domain: { min: number; max: number },
): string {
  const span = domain.max - domain.min || 1;
  return lerpStop((value - domain.min) / span);
}

/**
 * Choropleth class breaks.
 * Quantiles collapse on zero-inflated / right-skewed ethnic shares
 * (Chechens, Tatars, …) into useless 0–0% bins and one giant top bin.
 * Prefer Jenks natural breaks; fall back to unique-aware quantiles.
 */
export function ukPctBreaks(values: number[], classes = 5): number[] {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return [0, 20, 40, 60, 80, 100];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (max - min < 1e-9) return [min, roundBreak(min + Math.max(0.01, min * 0.01 || 0.01))];

  const unique = uniqueSorted(sorted);
  const k = Math.min(classes, Math.max(2, unique.length));
  if (unique.length <= k) {
    // Fewer unique values than classes — use the unique edges + max.
    const breaks = [...unique];
    if (breaks[breaks.length - 1] < max) breaks.push(max);
    return strictIncrease(breaks.length >= 2 ? breaks : [min, max]);
  }

  // Jenks is O(n²k); fine for federal subjects / LADs (n ≲ a few thousand).
  if (sorted.length <= 2500) {
    return strictIncrease(jenksBreaks(sorted, k));
  }
  return strictIncrease(uniqueQuantileBreaks(sorted, k));
}

function uniqueSorted(sorted: number[]): number[] {
  const out: number[] = [];
  for (const v of sorted) {
    if (!out.length || Math.abs(out[out.length - 1] - v) > 1e-9) out.push(v);
  }
  return out;
}

function roundBreak(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (Math.abs(v) >= 10) return Math.round(v * 10) / 10;
  if (Math.abs(v) >= 1) return Math.round(v * 100) / 100;
  return Math.round(v * 1000) / 1000;
}

function strictIncrease(breaks: number[]): number[] {
  const out = breaks.map(roundBreak);
  for (let i = 1; i < out.length; i++) {
    if (out[i] <= out[i - 1]) {
      const step =
        Math.abs(out[i - 1]) >= 1 ? 0.1 : Math.abs(out[i - 1]) >= 0.1 ? 0.01 : 0.001;
      out[i] = roundBreak(out[i - 1] + step);
    }
  }
  return out;
}

/** Fisher–Jenks natural breaks (matrix dynamic programming). */
function jenksBreaks(sorted: number[], classes: number): number[] {
  const n = sorted.length;
  const k = Math.max(2, Math.min(classes, n));
  // lower[j][i] = index of first member of class i ending at index j (1-based)
  const lower: number[][] = Array.from({ length: n + 1 }, () =>
    Array(k + 1).fill(0),
  );
  const variance: number[][] = Array.from({ length: n + 1 }, () =>
    Array(k + 1).fill(0),
  );

  for (let i = 1; i <= k; i++) {
    lower[1][i] = 1;
    variance[1][i] = 0;
    for (let j = 2; j <= n; j++) variance[j][i] = Infinity;
  }

  for (let l = 2; l <= n; l++) {
    let sum = 0;
    let sumSq = 0;
    let w = 0;
    for (let m = 1; m <= l; m++) {
      const i3 = l - m + 1;
      const val = sorted[i3 - 1];
      sumSq += val * val;
      sum += val;
      w += 1;
      const varianceVal = sumSq - (sum * sum) / w;
      const i4 = i3 - 1;
      if (i4 !== 0) {
        for (let j = 2; j <= k; j++) {
          const trial = variance[i4][j - 1] + varianceVal;
          if (trial < variance[l][j]) {
            lower[l][j] = i3;
            variance[l][j] = trial;
          }
        }
      }
    }
    lower[l][1] = 1;
    variance[l][1] = sumSq - (sum * sum) / w;
  }

  const breaks: number[] = Array(k + 1).fill(0);
  breaks[k] = sorted[n - 1];
  breaks[0] = sorted[0];
  let countNum = k;
  let dataIndex = n;
  while (countNum >= 2) {
    const id = lower[dataIndex][countNum] - 2;
    breaks[countNum - 1] = sorted[Math.max(0, id)];
    dataIndex = lower[dataIndex][countNum] - 1;
    countNum -= 1;
  }
  return breaks;
}

function uniqueQuantileBreaks(sorted: number[], classes: number): number[] {
  const breaks: number[] = [sorted[0]];
  for (let i = 1; i < classes; i++) {
    const idx = Math.min(
      sorted.length - 1,
      Math.floor((i / classes) * sorted.length),
    );
    breaks.push(sorted[idx]);
  }
  breaks.push(sorted[sorted.length - 1]);
  return breaks;
}

export function ukPctClassColor(value: number, breaks: number[]): string {
  if (breaks.length < 2) return lerpStop(0.5);
  const n = breaks.length - 1;
  let cls = 0;
  for (let i = 0; i < n; i++) {
    if (value >= breaks[i]) cls = i;
  }
  // Upper edge inclusive
  if (value >= breaks[n]) cls = n - 1;
  return lerpStop(n <= 1 ? 0.5 : cls / (n - 1));
}

export function ukPctDomain(values: number[]): { min: number; max: number } {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return { min: 0, max: 100 };
  const q = (p: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))];
  const min = Math.max(0, q(0.02));
  const max = Math.min(100, q(0.98));
  return { min, max: max > min ? max : min + 1 };
}

function formatPctBreak(v: number): string {
  if (v >= 10) return v.toFixed(1).replace(/\.0$/, "");
  if (v >= 1) return v.toFixed(1);
  if (v >= 0.1) return v.toFixed(1);
  return v.toFixed(2);
}

export function ukPctLegendFromBreaks(
  breaks: number[],
): { label: string; color: string }[] {
  const n = breaks.length - 1;
  if (n < 1) return [];
  return Array.from({ length: n }, (_, i) => {
    const lo = breaks[i];
    const hi = breaks[i + 1];
    const mid = (lo + hi) / 2;
    return {
      label: `${formatPctBreak(lo)}–${formatPctBreak(hi)}%`,
      color: ukPctClassColor(mid, breaks),
    };
  });
}

export function ukPctLegend(
  domain: { min: number; max: number },
): { label: string; color: string }[] {
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(
    (t) => domain.min + (domain.max - domain.min) * t,
  );
  return ticks.map((v) => ({
    label: `${v.toFixed(1)}%`,
    color: ukPctColor(v, domain),
  }));
}
