import data from "../data/us-state-race-acs.json";

export type UsRaceGroupId =
  | "white_nh"
  | "black_nh"
  | "aian_nh"
  | "asian_nh"
  | "nhpi_nh"
  | "other_nh"
  | "multiracial_nh"
  | "hispanic";

export type UsRaceGroup = {
  id: UsRaceGroupId;
  label: string;
  shortLabel: string;
  description: string;
};

/** ACS B03002 race / Hispanic origin groups shown in the US demographics map. */
export const US_RACE_GROUPS: UsRaceGroup[] = [
  {
    id: "white_nh",
    label: "White alone, not Hispanic or Latino",
    shortLabel: "White",
    description:
      "Share of the total population that reported race as White alone and not Hispanic or Latino.",
  },
  {
    id: "black_nh",
    label: "Black or African American alone, not Hispanic or Latino",
    shortLabel: "Black",
    description:
      "Share of the total population that reported race as Black or African American alone and not Hispanic or Latino.",
  },
  {
    id: "aian_nh",
    label: "American Indian and Alaska Native alone, not Hispanic or Latino",
    shortLabel: "AIAN",
    description:
      "Share of the total population that reported race as American Indian and Alaska Native alone and not Hispanic or Latino.",
  },
  {
    id: "asian_nh",
    label: "Asian alone, not Hispanic or Latino",
    shortLabel: "Asian",
    description:
      "Share of the total population that reported race as Asian alone and not Hispanic or Latino.",
  },
  {
    id: "nhpi_nh",
    label:
      "Native Hawaiian and Other Pacific Islander alone, not Hispanic or Latino",
    shortLabel: "NHPI",
    description:
      "Share of the total population that reported race as Native Hawaiian and Other Pacific Islander alone and not Hispanic or Latino.",
  },
  {
    id: "other_nh",
    label: "Some Other Race alone, not Hispanic or Latino",
    shortLabel: "Some other",
    description:
      "Share of the total population that reported Some Other Race alone and not Hispanic or Latino.",
  },
  {
    id: "multiracial_nh",
    label: "Two or More Races, not Hispanic or Latino",
    shortLabel: "Multiracial",
    description:
      "Share of the total population that reported two or more races and not Hispanic or Latino.",
  },
  {
    id: "hispanic",
    label: "Hispanic or Latino (any race)",
    shortLabel: "Hispanic",
    description:
      "Share of the total population that identified as Hispanic or Latino of any race.",
  },
];

export const US_DEMOGRAPHICS_META = {
  source: data.source,
  sourceUrl: data.sourceUrl,
  year: data.year,
  release: data.release,
  unit: data.unit as string,
  unitedStates: data.unitedStates as {
    population: number;
    shares: Record<UsRaceGroupId, number>;
  },
};

export type UsStateRaceRow = {
  name: string;
  fips: string;
  slug: string;
  population: number;
  shares: Record<UsRaceGroupId, number>;
};

export const US_STATE_RACE: UsStateRaceRow[] = Object.values(
  data.states as Record<string, UsStateRaceRow>,
).sort((a, b) => a.name.localeCompare(b.name));

export function getUsRaceGroup(id: string): UsRaceGroup {
  return US_RACE_GROUPS.find((g) => g.id === id) ?? US_RACE_GROUPS[0];
}

/** Census-style stepped green bins for percent-of-population maps. */
export const US_PCT_LEGEND = [
  { min: 80, max: Infinity, label: "80.0 or more", color: "rgb(0, 109, 44)" },
  { min: 65, max: 80, label: "65.0 to 79.9", color: "rgb(35, 139, 69)" },
  { min: 45, max: 65, label: "45.0 to 64.9", color: "rgb(65, 171, 93)" },
  { min: 20, max: 45, label: "20.0 to 44.9", color: "rgb(116, 196, 118)" },
  { min: 0, max: 20, label: "Less than 20.0", color: "rgb(199, 233, 192)" },
] as const;

export type UsPctBin = {
  min: number;
  max: number;
  label: string;
  color: string;
};

const US_PCT_COLORS = [
  "rgb(0, 109, 44)",
  "rgb(35, 139, 69)",
  "rgb(65, 171, 93)",
  "rgb(116, 196, 118)",
  "rgb(199, 233, 192)",
] as const;

function niceBreak(v: number): number {
  if (v <= 0) return 0;
  if (v >= 50) return Math.round(v);
  if (v >= 10) return Math.round(v * 2) / 2;
  if (v >= 2) return Math.round(v * 10) / 10;
  return Math.round(v * 100) / 100;
}

/**
 * Fixed census bins work for White/Black/Hispanic. For smaller groups
 * (Asian, multiracial, …) remap the same greens onto the observed range
 * so the map isn't one flat "less than 20%" wash.
 */
export function usPctBinsForValues(values: number[]): UsPctBin[] {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return [...US_PCT_LEGEND];
  const max = Math.max(...finite);
  if (max >= 55) return [...US_PCT_LEGEND];

  const sorted = [...finite].sort((a, b) => a - b);
  const q = (p: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))]!;
  const raw = [0, q(0.2), q(0.4), q(0.6), q(0.8), max];
  const edges = raw.map(niceBreak);
  for (let i = 1; i < edges.length; i++) {
    if (edges[i]! <= edges[i - 1]!) {
      edges[i] = niceBreak(
        edges[i - 1]! + Math.max(0.1, edges[i - 1]! * 0.08),
      );
    }
  }
  // High → low (same order as US_PCT_LEGEND)
  return [
    {
      min: edges[4]!,
      max: Infinity,
      label: `${edges[4]!.toFixed(1)} or more`,
      color: US_PCT_COLORS[0]!,
    },
    {
      min: edges[3]!,
      max: edges[4]!,
      label: `${edges[3]!.toFixed(1)} to ${(edges[4]! - 0.05).toFixed(1)}`,
      color: US_PCT_COLORS[1]!,
    },
    {
      min: edges[2]!,
      max: edges[3]!,
      label: `${edges[2]!.toFixed(1)} to ${(edges[3]! - 0.05).toFixed(1)}`,
      color: US_PCT_COLORS[2]!,
    },
    {
      min: edges[1]!,
      max: edges[2]!,
      label: `${edges[1]!.toFixed(1)} to ${(edges[2]! - 0.05).toFixed(1)}`,
      color: US_PCT_COLORS[3]!,
    },
    {
      min: 0,
      max: edges[1]!,
      label: `Less than ${edges[1]!.toFixed(1)}`,
      color: US_PCT_COLORS[4]!,
    },
  ];
}

export function usPctColorFromBins(value: number, bins: UsPctBin[]): string {
  for (const bin of bins) {
    if (value >= bin.min) return bin.color;
  }
  return bins[bins.length - 1]?.color ?? US_PCT_COLORS[4]!;
}

export function usPctColor(value: number): string {
  for (const bin of US_PCT_LEGEND) {
    if (value >= bin.min) return bin.color;
  }
  return US_PCT_LEGEND[US_PCT_LEGEND.length - 1].color;
}
