import nycAcs from "@/lib/data/nyc-acs.json";

export type DistrictMetricId =
  | "population"
  | "density"
  | "income"
  | "hispanic"
  | "white"
  | "black"
  | "asian";

export type DistrictMetricDef = {
  id: DistrictMetricId;
  label: string;
  unit: string;
  decimals: number;
  /** Short hint under the title. */
  description: string;
};

export type CityDistrictRow = {
  slug: string;
  name: string;
  population: number | null;
  areaKm2: number | null;
  year: number | null;
  /** Extra metric values keyed by DistrictMetricId (besides pop/density). */
  metrics?: Partial<Record<DistrictMetricId, number | null>>;
};

export type CityDistrictMapConfig = {
  geoUrl: string;
  kindLabel: string;
  source: string;
  /** Metrics available beyond population/density when data exists. */
  extraMetrics?: DistrictMetricId[];
};

/** Cities with district polygon overlays. */
export const CITY_DISTRICT_MAPS: Record<string, CityDistrictMapConfig> = {
  "new-york": {
    geoUrl: "/geo/city-new-york-boroughs.json",
    kindLabel: "Boroughs",
    source: "ACS 2024 1-year via Census Reporter · borough boundaries",
    extraMetrics: ["income", "hispanic", "white", "black", "asian"],
  },
  london: {
    geoUrl: "/geo/city-london-boroughs.json",
    kindLabel: "Boroughs",
    source: "ONS Census 2021 · borough boundaries",
  },
  tokyo: {
    geoUrl: "/geo/city-tokyo-wards.json",
    kindLabel: "Special wards",
    source: "Tokyo Statistical Yearbook · ward boundaries",
  },
};

const METRIC_DEFS: Record<DistrictMetricId, Omit<DistrictMetricDef, "id">> = {
  population: {
    label: "Population",
    unit: "",
    decimals: 0,
    description: "Resident population by district",
  },
  density: {
    label: "Density",
    unit: "/km²",
    decimals: 0,
    description: "People per square kilometre",
  },
  income: {
    label: "Median income",
    unit: "US$",
    decimals: 0,
    description: "Median household income",
  },
  hispanic: {
    label: "Hispanic",
    unit: "%",
    decimals: 1,
    description: "Share Hispanic or Latino",
  },
  white: {
    label: "White",
    unit: "%",
    decimals: 1,
    description: "Share White (non-Hispanic)",
  },
  black: {
    label: "Black",
    unit: "%",
    decimals: 1,
    description: "Share Black (non-Hispanic)",
  },
  asian: {
    label: "Asian",
    unit: "%",
    decimals: 1,
    description: "Share Asian (non-Hispanic)",
  },
};

export function districtMetricDef(id: DistrictMetricId): DistrictMetricDef {
  return { id, ...METRIC_DEFS[id] };
}

export function availableDistrictMetrics(
  citySlug: string,
  rows: CityDistrictRow[],
): DistrictMetricId[] {
  const base: DistrictMetricId[] = ["population"];
  if (rows.some((r) => r.population != null && r.areaKm2 && r.areaKm2 > 0)) {
    base.push("density");
  }
  const extra = CITY_DISTRICT_MAPS[citySlug]?.extraMetrics ?? [];
  for (const id of extra) {
    if (rows.some((r) => r.metrics?.[id] != null)) base.push(id);
  }
  return base;
}

export function districtMetricValue(
  row: CityDistrictRow,
  metric: DistrictMetricId,
): number | null {
  if (metric === "population") return row.population;
  if (metric === "density") {
    if (row.population == null || !row.areaKm2 || row.areaKm2 <= 0) return null;
    return row.population / row.areaKm2;
  }
  return row.metrics?.[metric] ?? null;
}

/** Attach NYC ACS borough income + race shares onto subdivision rows. */
export function enrichNewYorkDistrictRows(
  rows: CityDistrictRow[],
): CityDistrictRow[] {
  const bySlug = new Map(
    nycAcs.nyc.boroughs.map((b) => [b.slug, b] as const),
  );
  return rows.map((r) => {
    const b = bySlug.get(r.slug);
    if (!b) return r;
    return {
      ...r,
      // Prefer fresher ACS population when present
      population: b.population ?? r.population,
      year: nycAcs.nyc.year,
      metrics: {
        income: b.medianHouseholdIncome,
        hispanic: b.groups["Hispanic"] ?? null,
        white: b.groups["White (non-Hispanic)"] ?? null,
        black: b.groups["Black (non-Hispanic)"] ?? null,
        asian: b.groups["Asian (non-Hispanic)"] ?? null,
      },
    };
  });
}
