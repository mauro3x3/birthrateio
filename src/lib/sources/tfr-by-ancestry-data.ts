import denmark from "../data/tfr-by-ancestry-denmark.json";
import norway from "../data/tfr-by-background-norway.json";
import availability from "../data/tfr-by-ancestry-availability.json";

export type TfrAncestryStatus =
  | "AVAILABLE"
  | "PARTIAL"
  | "LIMITED"
  | "HISTORICAL"
  | "NOT_AVAILABLE";

export type TfrAncestryAvailabilityEntry = {
  iso3: string;
  status: TfrAncestryStatus;
  level: string | null;
  detail: string;
  sourceUrl: string | null;
};

export const TFR_ANCESTRY_AVAILABILITY = availability as {
  metric: string;
  updated: string;
  note: string;
  countries: TfrAncestryAvailabilityEntry[];
};

export const TFR_ANCESTRY_BY_ISO3 = new Map(
  TFR_ANCESTRY_AVAILABILITY.countries.map((c) => [c.iso3, c]),
);

export type TfrAncestryPack = {
  iso3: string;
  slug: string;
  country: string;
  metric: string;
  unit: string;
  decimals: number;
  definition: string;
  source: string;
  sourceUrl: string;
  statbank: string;
  groups: string[];
  series: { year: number; groups: Record<string, number> }[];
  colors?: Record<string, string>;
  defaultFrom?: number;
  headline?: string;
};

const DNK_COLORS: Record<string, string> = {
  "Immigrants, western": "hsl(199 52% 55%)",
  "Descendants, western": "hsl(24 68% 55%)",
  "Danish origin": "hsl(213 62% 32%)",
  "Immigrants, non-western": "hsl(140 32% 36%)",
  "Descendants, non-western": "hsl(28 10% 46%)",
};

const NOR_COLORS: Record<string, string> = {
  Immigrants: "hsl(199 52% 42%)",
  "Norwegian-born to immigrant parents": "hsl(24 68% 50%)",
  "Other population": "hsl(213 62% 32%)",
};

const PACKS: TfrAncestryPack[] = [
  {
    ...(denmark as TfrAncestryPack),
    colors: DNK_COLORS,
    defaultFrom: 1995,
    headline: "Total fertility rate disaggregated by ancestry",
  },
  {
    ...(norway as TfrAncestryPack),
    colors: NOR_COLORS,
    headline: "Total fertility rate by mother's immigrant category",
  },
];

export const TFR_ANCESTRY_PACKS = PACKS;

export function getTfrAncestryPack(iso3: string): TfrAncestryPack | undefined {
  return PACKS.find((p) => p.iso3 === iso3.toUpperCase());
}

export function tfrAncestryOverlay(pack: TfrAncestryPack) {
  const rows = pack.series.map((snap) => {
    const row: Record<string, number | null> = { year: snap.year };
    for (const g of pack.groups) {
      const v = snap.groups[g];
      row[g] = v != null && Number.isFinite(v) ? v : null;
    }
    return row;
  });
  const series = pack.groups.map((key) => ({
    key,
    label: key,
    color: pack.colors?.[key],
  }));
  return { pack, rows, series };
}
