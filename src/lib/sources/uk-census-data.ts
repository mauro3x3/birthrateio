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
 * ONS-style continuous yellow→teal→blue scale for percent shares.
 * Domain is passed in so each ethnic group can use its own range.
 */
export function ukPctColor(
  value: number,
  domain: { min: number; max: number },
): string {
  const span = domain.max - domain.min || 1;
  const t = Math.max(0, Math.min(1, (value - domain.min) / span));
  const stops: [number, [number, number, number]][] = [
    [0, [253, 231, 117]],
    [0.25, [145, 213, 129]],
    [0.5, [55, 174, 160]],
    [0.75, [40, 120, 180]],
    [1, [20, 70, 140]],
  ];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const u = (t - t0) / (t1 - t0 || 1);
      const rgb = c0.map((a, j) => Math.round(a + (c1[j] - a) * u));
      return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    }
  }
  const last = stops[stops.length - 1][1];
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
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
