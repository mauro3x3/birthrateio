import usRace from "../data/tfr-by-race-us.json";
import austria from "../data/tfr-by-origin-austria.json";
import kosovo from "../data/tfr-by-ethnicity-kosovo.json";
import bolivia from "../data/bolivia-ine-projections.json";
import azerbaijan from "../data/azerbaijan-vital-2026.json";
import egypt from "../data/egypt-vital-2025.json";
import iranianExogamy from "../data/iranian-diaspora-exogamy.json";
import usIntermarriage from "../data/us-intermarriage-pew.json";
import jewishIntermarriage from "../data/jewish-intermarriage-pew.json";
import asianEthnicMarriage from "../data/asian-ethnic-intermarriage-acs.json";
import eurostatMixed from "../data/eurostat-mixed-marriages.json";
import ukInterethnic from "../data/uk-interethnic-ons.json";
import consanguinityMena from "../data/consanguinity-mena.json";
import globalIntermarriageRecent from "../data/global-intermarriage-recent.json";
import europeIntermarriageRecent from "../data/europe-intermarriage-recent.json";

export const TFR_BY_RACE_US = usRace;
export const TFR_BY_ORIGIN_AUSTRIA = austria;
export const TFR_BY_ETHNICITY_KOSOVO = kosovo;
export const BOLIVIA_INE_PROJECTIONS = bolivia;
export const AZERBAIJAN_VITAL_2026 = azerbaijan;
export const EGYPT_VITAL_2025 = egypt;
export const IRANIAN_DIASPORA_EXOGAMY = iranianExogamy;
export const US_INTERMARRIAGE_PEW = usIntermarriage;
export const JEWISH_INTERMARRIAGE_PEW = jewishIntermarriage;
export const ASIAN_ETHNIC_MARRIAGE_ACS = asianEthnicMarriage;
export const EUROSTAT_MIXED_MARRIAGES = eurostatMixed;
export const UK_INTERETHNIC_ONS = ukInterethnic;
export const CONSANGUINITY_MENA = consanguinityMena;
export const GLOBAL_INTERMARRIAGE_RECENT = globalIntermarriageRecent;
export const EUROPE_INTERMARRIAGE_RECENT = europeIntermarriageRecent;

export function usRaceOverlay() {
  const shortLabel: Record<string, string> = {
    Hispanic: "Hispanic",
    "Non-Hispanic White": "White",
    "Non-Hispanic Black": "Black",
    "American Indian / Alaska Native": "American Indian / Alaska Native",
    "Asian / Pacific Islander": "Asian / Pacific Islander",
  };
  const rows = TFR_BY_RACE_US.series.map((snap) => {
    const row: Record<string, number | string | null> = { year: snap.year };
    for (const g of TFR_BY_RACE_US.groups) {
      const v = snap.groups[g as keyof typeof snap.groups];
      row[g] = typeof v === "number" ? v : null;
    }
    return row;
  });
  const series = TFR_BY_RACE_US.groups.map((key) => ({
    key,
    label: shortLabel[key] ?? key,
    color: TFR_BY_RACE_US.colors[key as keyof typeof TFR_BY_RACE_US.colors],
  }));
  const callouts = (
    TFR_BY_RACE_US as {
      callouts?: Array<{ year: number; group: string; value: number }>;
    }
  ).callouts?.map((c) => ({ year: c.year, key: c.group })) ?? [];
  return { rows, series, callouts };
}
