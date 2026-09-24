import catalog from "@/lib/data/census-maps-catalog.json";
import {
  IRAN_ESTIMATES_DISCLAIMER,
  IRAN_GROUP_BLURBS,
  IRAN_PROVINCE_ESTIMATES,
} from "@/lib/data/iran-ethnic-profiles";
import {
  UK_CENSUS_META,
  UK_ETHNIC_GROUPS,
  UK_LAD_ETHNICITY,
  type UkAreaEthnicityRow,
  type UkMsoaFile,
} from "@/lib/sources/uk-census-data";

export type CensusGroup = {
  id: string;
  shortLabel: string;
  label: string;
  /** Fixed swatch for plurality / categorical maps. */
  color?: string;
};

export type CensusLevel = {
  id: string;
  label: string;
  kind: string;
  geoUrl: string;
};

export type CensusCatalogCountry = {
  slug: string;
  iso3: string;
  iso2: string;
  name: string;
  kicker: string;
  title: string;
  year: number;
  source: string;
  sourceUrl: string;
  nationalLabel: string;
  topicLabel: string;
  groups: CensusGroup[];
  levels: CensusLevel[];
  dataUrl: string;
  fitMaxZoom: number;
  /** Optional framing box so arctic / overseas fragments don’t shrink the map. */
  fitClamp?: { west: number; south: number; east: number; north: number };
  builtin?: string;
  /** `plurality` = colour provinces by dominant group (not a % choropleth). */
  mapMode?: "share" | "plurality";
};

export type CensusArea = {
  code: string;
  name: string;
  slug: string;
  population: number;
  shares: Record<string, number>;
  parent?: string | null;
  /** Dominant group id when mapMode is plurality. */
  plurality?: string;
  /** True when shares are non-census estimates. */
  estimate?: boolean;
  /** Short province-specific note for dig-in. */
  note?: string;
};

export type CensusReligion = {
  label: string;
  shares: Record<string, number>;
  groups: CensusGroup[];
};

export type CensusFile = {
  source: string;
  sourceUrl: string;
  year: number;
  unit: string;
  national: { population: number; shares: Record<string, number> };
  areas: Record<string, Record<string, CensusArea>>;
  mapMode?: "share" | "plurality";
  religion?: CensusReligion;
  /** Shown when province shares are estimates (e.g. Iran). */
  estimatesDisclaimer?: string;
  /** One-liner unique traits keyed by group id. */
  groupBlurbs?: Record<string, string>;
};

export const UK_CATALOG: CensusCatalogCountry = {
  slug: "uk",
  iso3: "GBR",
  iso2: "UK",
  name: "United Kingdom",
  kicker: `UK Census ${UK_CENSUS_META.year}`,
  title: "Ethnic group",
  year: UK_CENSUS_META.year,
  source: UK_CENSUS_META.source,
  sourceUrl: UK_CENSUS_META.sourceUrl,
  nationalLabel: "England & Wales",
  topicLabel: "Ethnic group",
  groups: UK_ETHNIC_GROUPS.map((g) => ({
    id: g.id,
    shortLabel: g.shortLabel,
    label: g.label,
  })),
  levels: [
    {
      id: "lad",
      label: "LAD",
      kind: "Local authorities",
      geoUrl: UK_CENSUS_META.ladGeoUrl,
    },
    {
      id: "msoa",
      label: "MSOA",
      kind: "Neighbourhoods",
      geoUrl: UK_CENSUS_META.msoaGeoUrl,
    },
  ],
  dataUrl: "",
  fitMaxZoom: 9.5,
  builtin: "uk",
};

const RAW_CATALOG = (catalog.countries as CensusCatalogCountry[]).filter(
  (c) => c.slug !== "uk" && c.builtin !== "uk",
);

export const CENSUS_COUNTRIES: CensusCatalogCountry[] = [
  UK_CATALOG,
  ...RAW_CATALOG,
];

export function getCensusCountry(
  slug: string,
): CensusCatalogCountry | undefined {
  const s = slug.toLowerCase();
  return CENSUS_COUNTRIES.find(
    (c) => c.slug === s || c.iso3.toLowerCase() === s || c.iso2.toLowerCase() === s,
  );
}

export function defaultCensusGroup(groups: CensusGroup[]): string {
  const prefer = [
    "persian",
    "pardo",
    "black",
    "not_vm",
    "immigrant",
    "other_eu",
    "mixed",
    "russian",
    "other",
    "asia",
  ];
  for (const id of prefer) {
    if (groups.some((g) => g.id === id)) return id;
  }
  return groups[0]?.id ?? "";
}

export async function loadCensusFile(url: string): Promise<CensusFile> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as CensusFile;
  return enrichCensusFile(json, url);
}

function enrichCensusFile(file: CensusFile, url: string): CensusFile {
  if (!url.includes("irn.json")) return file;

  const blurbs: Record<string, string> = {};
  for (const g of IRAN_GROUP_BLURBS) blurbs[g.id] = g.blurb;

  const byCode = new Map(IRAN_PROVINCE_ESTIMATES.map((p) => [p.code, p]));
  const areas = { ...file.areas };
  for (const [levelId, levelMap] of Object.entries(areas)) {
    const next: Record<string, CensusArea> = {};
    for (const [code, area] of Object.entries(levelMap)) {
      const est = byCode.get(code) ?? byCode.get(area.slug);
      if (!est) {
        next[code] = area;
        continue;
      }
      // Replace the fake 100%/0% plurality stubs with estimated shares.
      const shares: Record<string, number> = {};
      for (const key of Object.keys(area.shares)) shares[key] = 0;
      for (const [k, v] of Object.entries(est.shares)) shares[k] = v;
      next[code] = {
        ...area,
        population: est.population ?? area.population,
        shares,
        estimate: true,
        note: est.note,
      };
    }
    areas[levelId] = next;
  }

  return {
    ...file,
    areas,
    estimatesDisclaimer: IRAN_ESTIMATES_DISCLAIMER,
    groupBlurbs: blurbs,
  };
}

function ukLadToArea(row: UkAreaEthnicityRow): CensusArea {
  return {
    code: row.code,
    name: row.name,
    slug: row.slug,
    population: row.population,
    shares: row.shares,
  };
}

export function ukCensusAsFile(msoa?: UkAreaEthnicityRow[]): CensusFile {
  const lads: Record<string, CensusArea> = {};
  for (const row of UK_LAD_ETHNICITY) lads[row.code] = ukLadToArea(row);
  const msoas: Record<string, CensusArea> = {};
  for (const row of msoa ?? []) {
    msoas[row.code] = {
      code: row.code,
      name: row.name,
      slug: row.slug,
      population: row.population,
      shares: row.shares,
      parent: row.ladCode ?? null,
    };
  }
  return {
    source: UK_CENSUS_META.source,
    sourceUrl: UK_CENSUS_META.sourceUrl,
    year: UK_CENSUS_META.year,
    unit: "%",
    national: {
      population: UK_CENSUS_META.englandAndWales.population,
      shares: UK_CENSUS_META.englandAndWales.shares,
    },
    areas: { lad: lads, ...(msoa ? { msoa: msoas } : {}) },
  };
}

export const UK_MSOA_DATA_URL = UK_CENSUS_META.msoaDataUrl;

export async function loadUkMsoaAreas(): Promise<UkAreaEthnicityRow[]> {
  const res = await fetch(UK_MSOA_DATA_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as UkMsoaFile;
  return Object.values(json.areas).sort((a, b) => a.name.localeCompare(b.name));
}
