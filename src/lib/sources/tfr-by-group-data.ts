import dhs from "@/lib/data/tfr-by-background-dhs.json";
import usEducation from "@/lib/data/tfr-by-education-us.json";
import usHispanic from "@/lib/data/tfr-by-hispanic-origin-us.json";

export type TfrGroupRow = { group: string; value: number };

export type TfrDhsBackgroundCountry = {
  iso3: string;
  country: string;
  survey: string;
  year: number;
  national: number | null;
  education: TfrGroupRow[];
  wealth: TfrGroupRow[];
};

export type TfrUsGroupPack = {
  iso3: string;
  country: string;
  year: number;
  unit: string;
  decimals: number;
  source: string;
  sourceUrl: string;
  doi?: string;
  note: string;
  groups: TfrGroupRow[];
};

const dhsFile = dhs as {
  updated: string;
  indicator: string;
  unit: string;
  source: string;
  sourceUrl: string;
  note: string;
  countries: TfrDhsBackgroundCountry[];
};

export const TFR_DHS_BACKGROUND_META = {
  updated: dhsFile.updated,
  unit: dhsFile.unit,
  source: dhsFile.source,
  sourceUrl: dhsFile.sourceUrl,
  note: dhsFile.note,
};

export const TFR_DHS_BACKGROUND = [...dhsFile.countries].sort((a, b) =>
  a.country.localeCompare(b.country),
);

export const TFR_US_EDUCATION = usEducation as TfrUsGroupPack;
export const TFR_US_HISPANIC_ORIGIN = usHispanic as TfrUsGroupPack;

export function getTfrDhsBackground(
  iso3: string,
): TfrDhsBackgroundCountry | undefined {
  return TFR_DHS_BACKGROUND.find((c) => c.iso3 === iso3.toUpperCase());
}
