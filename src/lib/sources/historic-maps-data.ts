import catalog from "../data/historic-maps-catalog.json";

export type HistoricMapGroup = {
  id: string;
  shortLabel: string;
  color: string;
};

export type HistoricMapEntry = {
  id: string;
  slug: string;
  title: string;
  empire: string;
  year: number;
  metric: string;
  kind: string;
  status: "live" | "planned";
  region?: string;
  blurb: string;
  source: string;
  sourceUrl: string;
  geoUrl?: string;
  /** Why a planned map is not interactive yet. */
  statusNote?: string;
  groups?: HistoricMapGroup[];
};

type HistoricCatalog = { maps: HistoricMapEntry[] };

/** Newest census years first; live layers float above planned. */
export const HISTORIC_MAPS = [...(catalog as HistoricCatalog).maps].sort(
  (a, b) => {
    if (a.status !== b.status) return a.status === "live" ? -1 : 1;
    return b.year - a.year;
  },
);

const REGION_ORDER = [
  "Overview",
  "Near East & Balkans",
  "Central Europe",
  "Eurasia",
  "Balkans",
  "South Asia",
  "East Asia",
  "Southeast Asia",
  "North Africa",
  "Other",
];

export function historicMapsByRegion(): {
  region: string;
  maps: HistoricMapEntry[];
}[] {
  const buckets = new Map<string, HistoricMapEntry[]>();
  for (const m of HISTORIC_MAPS) {
    const region = m.region ?? "Other";
    const list = buckets.get(region) ?? [];
    list.push(m);
    buckets.set(region, list);
  }
  const regions = [
    ...REGION_ORDER.filter((r) => buckets.has(r)),
    ...[...buckets.keys()].filter((r) => !REGION_ORDER.includes(r)),
  ];
  return regions.map((region) => ({ region, maps: buckets.get(region)! }));
}

export function getHistoricMap(slug: string): HistoricMapEntry | undefined {
  return HISTORIC_MAPS.find((m) => m.slug === slug);
}
