import denmark from "../data/tfr-by-ancestry-denmark.json";
import norway from "../data/tfr-by-background-norway.json";
import india from "../data/tfr-by-religion-india.json";
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
  sourceUrlLabel?: string;
  tableLinkLabel?: string;
  groups: string[];
  series: { year: number; label?: string; groups: Record<string, number> }[];
  colors?: Record<string, string>;
  dashed?: string[];
  defaultFrom?: number;
  headline?: string;
  /** Sparse official survey rounds rather than an annual series. */
  discreteSurveys?: boolean;
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

const IND_COLORS: Record<string, string> = {
  Hindu: "hsl(25 72% 46%)",
  Muslim: "hsl(142 42% 36%)",
  Christian: "hsl(221 52% 46%)",
  Sikh: "hsl(340 48% 44%)",
  Buddhist: "hsl(42 62% 42%)",
  Jain: "hsl(280 36% 46%)",
  Other: "hsl(215 12% 52%)",
  "All India": "hsl(213 62% 28%)",
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
  {
    ...(india as TfrAncestryPack),
    colors: IND_COLORS,
    dashed: ["All India"],
    discreteSurveys: true,
    headline: "Total fertility rate by religion",
    sourceUrlLabel: "NFHS portal",
    tableLinkLabel: "Open NFHS-5 Table 4.2 (PDF)",
  },
];

export const TFR_ANCESTRY_PACKS = PACKS;

export function getTfrAncestryPack(iso3: string): TfrAncestryPack | undefined {
  return PACKS.find((p) => p.iso3 === iso3.toUpperCase());
}

export function tfrAncestryOverlay(pack: TfrAncestryPack) {
  const rows = pack.series.map((snap) => {
    const row: Record<string, number | string | null> = { year: snap.year };
    if (snap.label) row.survey = snap.label;
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
    dashed: pack.dashed?.includes(key),
  }));
  const yearLabels = Object.fromEntries(
    pack.series
      .filter((s) => s.label)
      .map((s) => [s.year, s.label as string]),
  );
  return { pack, rows, series, yearLabels };
}
