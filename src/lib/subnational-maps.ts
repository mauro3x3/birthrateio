export type SubnationalRegion = {
  id: string;
  slug: string;
  name: string;
  value: number | null;
};

export type SubnationalMap = {
  id: string;
  iso3: string;
  country: string;
  title: string;
  metric: "tfr" | "pop-change";
  unit: string;
  kind: string;
  year: number;
  yearFrom?: number;
  national: number | null;
  source: string;
  sourceUrl: string;
  credit: string | null;
  geoUrl: string;
  scale: "plasma" | "diverging-growth" | "diverging-tfr";
  mid?: number;
  labelValues: boolean;
  /** Optional country-picker tab when a country has more than one map. */
  tab?: string;
  /** Extra headline figures (e.g. Taiwan / Hong Kong / Macao next to China). */
  highlights?: { name: string; value: number }[];
  regions: SubnationalRegion[];
  min: number | null;
  max: number | null;
};

export type SubnationalCatalog = {
  maps: SubnationalMap[];
};
