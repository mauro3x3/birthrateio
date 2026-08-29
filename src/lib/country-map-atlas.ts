import catalog from "@/lib/data/subnational-maps.json";
import admin1 from "@/lib/data/admin1-demographics.json";
import type { ScaleType } from "@/lib/color-scale";
import type { SubnationalCatalog, SubnationalMap } from "@/lib/subnational-maps";

export type MapMetricId = "tfr" | "population" | "pop-growth" | "gfr";

export type CountryMapRegion = {
  id: string;
  slug: string;
  name: string;
  value: number | null;
};

export type CountryMapMetric = {
  id: MapMetricId;
  label: string;
  unit: string;
  decimals: number;
  scale: ScaleType;
  mid?: number;
  years: number[];
  yearFrom?: number;
  valuesByYear: Record<number, CountryMapRegion[]>;
  nationalByYear: Record<number, number | null>;
  sourceByYear: Record<number, string>;
  sourceUrl: string;
  credit: string | null;
  highlights?: { name: string; value: number }[];
};

export type CountryMapEntry = {
  iso3: string;
  country: string;
  kind: string;
  geoUrl: string;
  hrefPrefix: string | null;
  metrics: CountryMapMetric[];
  note?: string;
};

const ADMIN1_GEO: Record<string, string> = {
  USA: "/geo/admin1-usa.json",
  DEU: "/geo/admin1-deu.json",
  IND: "/geo/admin1-ind.json",
  CHN: "/geo/admin1-chn.json",
  RUS: "/geo/admin1-rus.json",
};

const FEATURED = [
  "IND",
  "IRN",
  "RUS",
  "CHN",
  "USA",
  "JPN",
  "KOR",
  "DEU",
  "AUS",
  "CAN",
  "ITA",
  "FRA",
  "ESP",
];

type Admin1File = {
  sources: Record<
    string,
    {
      fertility?: string;
      fertilityUrl?: string;
      population?: string | null;
      populationUrl?: string | null;
    }
  >;
  divisions: { iso3: string; slug: string; name: string }[];
  fertility: Record<string, { year: number; value: number }[]>;
  population: Record<string, { year: number; value: number }[]>;
  generalFertilityRate: Record<string, { year: number; value: number }[]>;
};

const admin = admin1 as Admin1File;
const maps = (catalog as SubnationalCatalog).maps;

function divisionsByIso3() {
  const out = new Map<string, { slug: string; name: string }[]>();
  for (const d of admin.divisions) {
    const list = out.get(d.iso3) ?? [];
    list.push({ slug: d.slug, name: d.name });
    out.set(d.iso3, list);
  }
  return out;
}

function seriesByYear(
  slugs: { slug: string; name: string }[],
  table: Record<string, { year: number; value: number }[]>,
): Record<number, CountryMapRegion[]> {
  const years = new Set<number>();
  for (const d of slugs) {
    for (const p of table[d.slug] ?? []) years.add(p.year);
  }
  const out: Record<number, CountryMapRegion[]> = {};
  for (const year of years) {
    out[year] = slugs.map((d) => {
      const hit = (table[d.slug] ?? []).find((p) => p.year === year);
      return {
        id: d.slug,
        slug: d.slug,
        name: d.name,
        value: hit?.value ?? null,
      };
    });
  }
  return out;
}

function catalogToTfr(iso3: string, layers: SubnationalMap[]): CountryMapMetric | null {
  const tfrMaps = layers.filter((m) => m.metric === "tfr");
  if (tfrMaps.length === 0) return null;
  const valuesByYear: Record<number, CountryMapRegion[]> = {};
  const nationalByYear: Record<number, number | null> = {};
  const sourceByYear: Record<number, string> = {};
  let credit: string | null = null;
  let highlights: CountryMapMetric["highlights"];
  let mid: number | undefined;
  let scale: ScaleType = "diverging";
  for (const m of tfrMaps) {
    valuesByYear[m.year] = m.regions.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      value: r.value,
    }));
    nationalByYear[m.year] = m.national;
    sourceByYear[m.year] = m.source;
    if (m.credit) credit = m.credit;
    if (m.highlights) highlights = m.highlights;
    if (m.mid != null) mid = m.mid;
    if (m.scale === "diverging-tfr") scale = "diverging-tfr";
    else if (m.scale === "plasma") scale = "plasma";
  }
  const years = Object.keys(valuesByYear)
    .map(Number)
    .sort((a, b) => b - a);
  return {
    id: "tfr",
    label: "Total fertility rate",
    unit: "children per woman",
    decimals: 2,
    scale,
    mid: mid ?? 2.1,
    years,
    valuesByYear,
    nationalByYear,
    sourceByYear,
    sourceUrl: tfrMaps[0].sourceUrl,
    credit,
    highlights,
  };
}

function catalogPopChange(layer: SubnationalMap): CountryMapMetric {
  return {
    id: "pop-growth",
    label: "Population change",
    unit: "% change",
    decimals: 1,
    scale: "diverging-growth",
    mid: 0,
    years: [layer.year],
    yearFrom: layer.yearFrom,
    valuesByYear: {
      [layer.year]: layer.regions.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        value: r.value,
      })),
    },
    nationalByYear: { [layer.year]: layer.national },
    sourceByYear: { [layer.year]: layer.source },
    sourceUrl: layer.sourceUrl,
    credit: layer.credit,
  };
}

function adminPopulation(iso3: string): CountryMapMetric | null {
  const slugs = divisionsByIso3().get(iso3);
  if (!slugs) return null;
  const valuesByYear = seriesByYear(slugs, admin.population);
  const years = Object.keys(valuesByYear)
    .map(Number)
    .sort((a, b) => b - a);
  if (years.length === 0) return null;
  const src = admin.sources[iso3];
  const nationalByYear: Record<number, number | null> = {};
  const sourceByYear: Record<number, string> = {};
  for (const y of years) {
    const vals = valuesByYear[y]
      .map((r) => r.value)
      .filter((v): v is number => v != null);
    nationalByYear[y] = vals.length ? vals.reduce((a, b) => a + b, 0) : null;
    sourceByYear[y] = src?.population ?? "National statistical office.";
  }
  return {
    id: "population",
    label: "Population",
    unit: "people",
    decimals: 0,
    scale: "sequential",
    years,
    valuesByYear,
    nationalByYear,
    sourceByYear,
    sourceUrl: src?.populationUrl ?? "#",
    credit: null,
  };
}

function adminPopGrowth(iso3: string): CountryMapMetric | null {
  const slugs = divisionsByIso3().get(iso3);
  if (!slugs) return null;
  const byYear = seriesByYear(slugs, admin.population);
  const years = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => a - b);
  if (years.length < 2) return null;
  const from = years[0];
  const to = years[years.length - 1];
  const start = new Map(byYear[from].map((r) => [r.slug, r]));
  const regions: CountryMapRegion[] = byYear[to].map((r) => {
    const a = start.get(r.slug)?.value;
    const b = r.value;
    return {
      ...r,
      value:
        a != null && b != null && a > 0 ? ((b - a) / a) * 100 : null,
    };
  });
  const src = admin.sources[iso3];
  const aSum = byYear[from]
    .map((r) => r.value)
    .filter((v): v is number => v != null)
    .reduce((x, y) => x + y, 0);
  const bSum = byYear[to]
    .map((r) => r.value)
    .filter((v): v is number => v != null)
    .reduce((x, y) => x + y, 0);
  return {
    id: "pop-growth",
    label: "Population change",
    unit: "% change",
    decimals: 1,
    scale: "diverging-growth",
    mid: 0,
    years: [to],
    yearFrom: from,
    valuesByYear: { [to]: regions },
    nationalByYear: { [to]: aSum > 0 ? ((bSum - aSum) / aSum) * 100 : null },
    sourceByYear: {
      [to]: src?.population ?? "National statistical office.",
    },
    sourceUrl: src?.populationUrl ?? "#",
    credit: null,
  };
}

function adminGfr(iso3: string): CountryMapMetric | null {
  const slugs = divisionsByIso3().get(iso3);
  if (!slugs) return null;
  const valuesByYear = seriesByYear(slugs, admin.generalFertilityRate);
  const years = Object.keys(valuesByYear)
    .map(Number)
    .sort((a, b) => b - a);
  if (years.length === 0) return null;
  const src = admin.sources[iso3];
  return {
    id: "gfr",
    label: "General fertility rate",
    unit: "births per 1,000 women 15–44",
    decimals: 1,
    scale: "sequential",
    years,
    valuesByYear,
    nationalByYear: Object.fromEntries(years.map((y) => [y, null])),
    sourceByYear: Object.fromEntries(
      years.map((y) => [y, src?.fertility ?? "NCHS"]),
    ),
    sourceUrl: src?.fertilityUrl ?? "#",
    credit: null,
  };
}

function mergeAdmin1TfrYears(iso3: string, tfr: CountryMapMetric): CountryMapMetric {
  const slugs = divisionsByIso3().get(iso3);
  if (!slugs) return tfr;
  const extra = seriesByYear(slugs, admin.fertility);
  const src = admin.sources[iso3];
  for (const [yearStr, regions] of Object.entries(extra)) {
    const year = Number(yearStr);
    if (tfr.valuesByYear[year]) continue;
    tfr.valuesByYear[year] = regions;
    tfr.nationalByYear[year] = null;
    tfr.sourceByYear[year] = src?.fertility ?? tfr.sourceByYear[tfr.years[0]];
  }
  tfr.years = Object.keys(tfr.valuesByYear)
    .map(Number)
    .sort((a, b) => b - a);
  return tfr;
}

export function getCountryMapAtlas(): CountryMapEntry[] {
  const byIso = new Map<string, SubnationalMap[]>();
  for (const m of maps) {
    const list = byIso.get(m.iso3) ?? [];
    list.push(m);
    byIso.set(m.iso3, list);
  }

  const entries: CountryMapEntry[] = [];
  for (const [iso3, layers] of byIso) {
    const first = layers[0];
    const metrics: CountryMapMetric[] = [];
    const tfr = catalogToTfr(iso3, layers);
    if (tfr) {
      metrics.push(
        ADMIN1_GEO[iso3] ? mergeAdmin1TfrYears(iso3, tfr) : tfr,
      );
    }
    const pop = adminPopulation(iso3);
    if (pop) metrics.push(pop);
    const growth = adminPopGrowth(iso3);
    const catalogGrowth = layers.find((m) => m.metric === "pop-change");
    if (growth) metrics.push(growth);
    else if (catalogGrowth) metrics.push(catalogPopChange(catalogGrowth));
    const gfr = adminGfr(iso3);
    if (gfr) metrics.push(gfr);

    entries.push({
      iso3,
      country: first.country,
      kind: first.kind,
      geoUrl: first.geoUrl || ADMIN1_GEO[iso3] || "",
      hrefPrefix: ADMIN1_GEO[iso3] ? "/state" : null,
      metrics,
    });
  }

  entries.push({
    iso3: "IRN",
    country: "Iran",
    kind: "province",
    geoUrl: "",
    hrefPrefix: null,
    metrics: [],
    note: "Statistical Centre of Iran has not released a provincial TFR or population table we can redistribute. BirthGauge publishes a 2025 provincial fertility map (national TFR 1.47); we credit that map but do not copy the unpublished figures. National series are on the Iran country page.",
  });

  entries.sort((a, b) => {
    const ai = FEATURED.indexOf(a.iso3);
    const bi = FEATURED.indexOf(b.iso3);
    if (ai === -1 && bi === -1) return a.country.localeCompare(b.country);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  return entries;
}

export function getCountryMapEntry(iso3: string): CountryMapEntry | undefined {
  return getCountryMapAtlas().find(
    (c) => c.iso3.toLowerCase() === iso3.toLowerCase(),
  );
}

export const FEATURED_MAP_COUNTRIES = FEATURED;
