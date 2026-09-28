import pack from "@/lib/data/japan-tfr-by-region.json";

export type JapanTfrByRegionPack = {
  id: string;
  title: string;
  headline: string;
  slug: string;
  iso3: string;
  unit: string;
  decimals: number;
  seriesKeys: string[];
  colors: Record<string, string>;
  series: Array<Record<string, number | string>>;
  interpolatedYears: number[];
  source: string;
  sourceUrl: string;
  note: string;
  yearFrom: number;
  yearTo: number;
};

export const JAPAN_TFR_BY_REGION = pack as JapanTfrByRegionPack;

export const JAPAN_TFR_BY_REGION_SERIES = JAPAN_TFR_BY_REGION.seriesKeys.map(
  (key) => ({
    key,
    label: key,
    color: JAPAN_TFR_BY_REGION.colors[key],
  }),
);
