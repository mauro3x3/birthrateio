import raw from "@/lib/data/regional-shares.json";

export type RegionalShareCountry = {
  iso3: string;
  name: string;
  population: number;
  popYear: number;
  cbr?: number;
  cbrYear?: number;
  births?: number;
};

export type RegionalShareSet = {
  id: string;
  name: string;
  year: number | null;
  countries: RegionalShareCountry[];
};

type FileShape = {
  source: string;
  sourceUrl: string;
  regions: Record<string, RegionalShareSet>;
};

const FILE = raw as FileShape;

export function tidyCountryName(name: string): string {
  return name
    .replace(/, Fed\. Rep\.$/, "")
    .replace(/, Arab Rep\.$/, "")
    .replace(/^Congo, Dem\. Rep\.$/, "DR Congo")
    .replace(/^Congo, Rep\.$/, "Congo")
    .replace(/^Russian Federation$/, "Russia")
    .replace(/^Iran, Islamic Rep\.$/, "Iran")
    .replace(/^Yemen, Rep\.$/, "Yemen")
    .replace(/^Syrian Arab Republic$/, "Syria")
    .replace(/^Lao PDR$/, "Laos")
    .replace(/^Slovak Republic$/, "Slovakia")
    .replace(/^Turkiye$/, "Türkiye")
    .replace(/^Korea, Rep\.$/, "South Korea")
    .replace(/^Kyrgyz Republic$/, "Kyrgyzstan");
}

export const REGIONAL_SHARES_SOURCE = FILE.source;
export const REGIONAL_SHARES_SOURCE_URL = FILE.sourceUrl;

/** Display order for the dedicated explorer (not the map atlas order). */
const REGION_ORDER = [
  "AFRICA",
  "EU",
  "MENA",
  "SOUTHAMERICA",
  "NORTHAMERICA",
  "CENTRALAMERICA",
  "CARIBBEAN",
  "SEASIA",
  "CENTRALASIA",
  "OCEANIA",
];

export function regionalSharesFor(iso3: string): RegionalShareSet | null {
  return FILE.regions[iso3.toUpperCase()] ?? null;
}

export function allRegionalShares(): RegionalShareSet[] {
  const listed = REGION_ORDER.map((id) => FILE.regions[id]).filter(
    (r): r is RegionalShareSet => r != null,
  );
  const extra = Object.keys(FILE.regions)
    .filter((id) => !REGION_ORDER.includes(id))
    .map((id) => FILE.regions[id]);
  return [...listed, ...extra];
}

export function regionalShareSlug(id: string): string {
  return id.toLowerCase();
}

export type ShareSlice = {
  name: string;
  iso3: string | null;
  value: number;
  pct: number;
};

/** Named slices plus a remainder, Wikipedia-style. */
export function shareSlices(
  countries: RegionalShareCountry[],
  key: "population" | "births",
  opts?: { maxNamed?: number },
): { slices: ShareSlice[]; total: number } {
  const maxNamed = opts?.maxNamed ?? 8;
  const rows = countries
    .map((c) => ({
      iso3: c.iso3,
      name: tidyCountryName(c.name),
      value: key === "births" ? c.births : c.population,
    }))
    .filter((r): r is { iso3: string; name: string; value: number } => r.value != null && r.value > 0);
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (total <= 0) return { slices: [], total: 0 };
  const ranked = [...rows].sort((a, b) => b.value - a.value);
  const named: ShareSlice[] = [];
  let other = 0;
  ranked.forEach((r, i) => {
    const pct = r.value / total;
    if (i < maxNamed) {
      named.push({ name: r.name, iso3: r.iso3, value: r.value, pct });
    } else {
      other += r.value;
    }
  });
  if (other > 0) {
    named.push({
      name: "Other",
      iso3: null,
      value: other,
      pct: other / total,
    });
  }
  return { slices: named, total };
}
