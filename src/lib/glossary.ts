import type { IndicatorCategory } from "@/lib/enums";
import { INDICATORS, INDICATOR_BY_SLUG, type IndicatorDef } from "@/lib/indicators";
import { DATA_SOURCES } from "@/lib/sources/reference";

/** Human labels for the indicator taxonomy used across glossary and hub pages. */
export const CATEGORY_LABELS: Record<IndicatorCategory, string> = {
  FERTILITY: "Fertility",
  POPULATION: "Population",
  MIGRATION: "Migration",
  MORTALITY: "Mortality",
  ECONOMY: "Economy",
  HEALTH: "Health",
  EDUCATION: "Education",
  HOUSING: "Housing",
  ELECTION: "Elections",
  ETHNICITY: "Ethnicity",
  RELIGION: "Religion",
  SOCIETY: "Society",
  CRIME: "Crime",
  OTHER: "Other",
};

/** Order categories so the glossary reads like the subject taxonomy. */
const CATEGORY_ORDER: IndicatorCategory[] = [
  "FERTILITY",
  "POPULATION",
  "MIGRATION",
  "MORTALITY",
  "ECONOMY",
  "SOCIETY",
  "CRIME",
  "HOUSING",
  "ETHNICITY",
  "RELIGION",
  "HEALTH",
  "EDUCATION",
  "ELECTION",
  "OTHER",
];

export type SourceRef = {
  code: string;
  name: string;
  url: string;
  license: string;
  description: string;
};

const SOURCE_BY_CODE = new Map(
  DATA_SOURCES.map((s) => [s.code, s as SourceRef]),
);

export function sourceByCode(code: string): SourceRef | undefined {
  return SOURCE_BY_CODE.get(code);
}

export function indicatorBySlug(slug: string): IndicatorDef | undefined {
  return INDICATOR_BY_SLUG.get(slug);
}

/** Resolve a list of indicator slugs, skipping any that are unknown. */
export function indicatorsBySlugs(slugs: readonly string[]): IndicatorDef[] {
  return slugs
    .map((slug) => INDICATOR_BY_SLUG.get(slug))
    .filter((i): i is IndicatorDef => Boolean(i));
}

/** Distinct sources behind a set of indicators, in catalogue order. */
export function sourcesForIndicators(slugs: readonly string[]): SourceRef[] {
  const codes = new Set(indicatorsBySlugs(slugs).map((i) => i.source));
  return DATA_SOURCES.filter((s) => codes.has(s.code)) as SourceRef[];
}

export type GlossaryGroup = {
  category: IndicatorCategory;
  label: string;
  entries: IndicatorDef[];
};

/** Indicator definitions grouped by subject, for the glossary page. */
export function glossaryGroups(): GlossaryGroup[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    entries: INDICATORS.filter((i) => i.category === category).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  })).filter((group) => group.entries.length > 0);
}

export type ConceptDef = {
  id: string;
  term: string;
  definition: string;
};

/**
 * Cross-cutting concepts that aren't indicators but are needed to read the
 * numbers correctly. Referenced from the glossary and methodology pages.
 */
export const CONCEPTS: ConceptDef[] = [
  {
    id: "estimate",
    term: "Estimate",
    definition:
      "A value for a past or current year produced by a statistical agency from registration data, censuses, or surveys. Estimates are revised as better information arrives.",
  },
  {
    id: "projection",
    term: "Projection",
    definition:
      "A modelled value for a future year, conditional on assumptions about fertility, mortality, and migration. A projection is not a forecast or a prediction of what will happen.",
  },
  {
    id: "provisional",
    term: "Provisional figure (nowcast)",
    definition:
      "An early value published before the final annual statistics, often covering part of a year. Provisional figures are the most current numbers available and the most likely to be revised.",
  },
  {
    id: "replacement-level",
    term: "Replacement-level fertility",
    definition:
      "The total fertility rate at which a generation exactly replaces itself, about 2.1 births per woman in countries with low child mortality. Sustained rates below this level shrink a population over the long run, absent migration.",
  },
  {
    id: "period-vs-cohort",
    term: "Period vs cohort measure",
    definition:
      "A period measure such as the total fertility rate describes one calendar year as if current rates applied for a whole lifetime. A cohort measure follows real people over time. Period rates react faster to shifts in the timing of births.",
  },
  {
    id: "crude-rate",
    term: "Crude rate",
    definition:
      "An event count divided by total population, usually per 1,000 people. Crude rates are not adjusted for age structure, so an older population shows a higher crude death rate even with identical mortality risk at every age.",
  },
  {
    id: "age-standardised",
    term: "Age-standardised rate",
    definition:
      "A rate recalculated against a common reference age structure so that populations of different ages can be compared directly.",
  },
  {
    id: "foreign-born",
    term: "Foreign-born vs foreign citizenship",
    definition:
      "Foreign-born counts where a person was born. Foreign citizenship counts the passport they hold. The two differ substantially in countries where naturalisation is common, and neither is the same as ancestry or migration background.",
  },
  {
    id: "net-migration-concept",
    term: "Net migration",
    definition:
      "Arrivals minus departures over a period. A net figure of zero can mean no movement at all, or very large flows in both directions that happen to cancel out.",
  },
  {
    id: "aggregate",
    term: "Aggregate",
    definition:
      "A region, income group, or world total rather than a single country. Aggregates are excluded from country rankings and maps on this site.",
  },
];

export const CONCEPT_BY_ID = new Map(CONCEPTS.map((c) => [c.id, c]));
