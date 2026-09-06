import raw from "../data/tfr-decomposition.json";
import groupsRaw from "../data/tfr-decomposition-groups.json";

/**
 * Decomposes each country's total fertility rate into two multiplicative
 * components — TFR = Total Maternal Rate × Children per Mother — following
 * the "microdemographic framework" popularised by demographer Stephen J.
 * Shaw and used by fertility trackers such as BirthGauge.
 *
 * - Total Maternal Rate (TMR): the share of women who become mothers,
 *   approximated here as each country's total fertility rate for FIRST births
 *   only (i.e. the first-birth-order equivalent of the TFR).
 * - Children per Mother (CPM): the average family size among mothers,
 *   i.e. TFR ÷ TMR.
 *
 * Both figures are period measures (like the TFR itself), not completed
 * cohort measures — they describe one year's age-specific birth rates, not
 * the eventual family size of real women. We derive TMR and CPM from the
 * same two primitive, officially published inputs for every country so the
 * identity TFR = TMR × CPM always holds exactly:
 *
 *   orderOneSharePct = first births ÷ all births of known order, in %
 *   CPM  = 100 / orderOneSharePct
 *   TMR  = TFR / CPM  (equivalently TFR × orderOneSharePct / 100)
 *
 * Sources: Eurostat's "Fertility indicators" table (demo_find) for European
 * countries, and each country's own statistical office for the rest (US
 * CDC/NCHS, Japan MHLW, Statistics Korea, Australian Bureau of Statistics,
 * Rosstat via the HSE Institute of Demography, Israel CBS). Within-country
 * groups (US race and Hispanic origin) use the same identity on NCHS Tables
 * 2–3 — published TFR × first-birth share of births of known order.
 */
export type TfrDecompositionRow = {
  /** Stable id for pinning on the scatter (iso3 for countries). */
  id: string;
  iso3: string;
  iso2: string;
  slug: string;
  name: string;
  /** Shorter chart label; defaults to name. */
  shortLabel?: string;
  kind: "country" | "group";
  /** Picker section heading for within-country groups. */
  group?: string;
  /** Year the underlying birth-order and TFR figures refer to. */
  year: number;
  /** Total fertility rate, births per woman. */
  tfr: number;
  /** First-order live births as a share of all births of known order, %. */
  orderOneSharePct: number;
  /** Average children per mother — TFR ÷ Total Maternal Rate. */
  cpm: number;
  /** Total Maternal Rate — share of women who become mothers, %. */
  tmrPct: number;
  source: string;
  sourceUrl: string;
};

type CountryRaw = Omit<TfrDecompositionRow, "id" | "kind" | "shortLabel" | "group">;

export const TFR_DECOMPOSITION: TfrDecompositionRow[] = (
  raw as CountryRaw[]
).map((r) => ({
  ...r,
  id: r.iso3,
  kind: "country",
  shortLabel: r.name,
}));

export const TFR_DECOMPOSITION_GROUPS: TfrDecompositionRow[] =
  groupsRaw as TfrDecompositionRow[];

/** Countries plus within-country groups that have official TFR and birth order. */
export const TFR_DECOMPOSITION_ALL: TfrDecompositionRow[] = [
  ...TFR_DECOMPOSITION,
  ...TFR_DECOMPOSITION_GROUPS,
];

export const TFR_DECOMPOSITION_BY_ISO3 = new Map(
  TFR_DECOMPOSITION.map((r) => [r.iso3, r]),
);

export const TFR_DECOMPOSITION_UPDATED = "2024–2025 (latest available per country)";

export const DEFAULT_FEATURED_GROUPS: readonly string[] = [
  "usa-hispanic",
  "usa-nh-black",
  "usa-nh-asian",
  "usa-nh-nhpi",
];
