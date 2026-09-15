export type BriefingModuleId =
  | "snapshot"
  | "neighbors"
  | "trajectory"
  | "age"
  | "groups"
  | "composition"
  | "labor"
  | "migration"
  | "economy"
  | "politics"
  | "levers"
  | "watch";

export type BriefingChartId =
  | "neighbors"
  | "tfr"
  | "groups"
  | "composition"
  | "birthsComposition"
  | "religion"
  | "pyramid"
  | "labor"
  | "population"
  | "migration"
  | "migrationOrigins"
  | "migrationDestinations"
  | "budget"
  | "health"
  | "dependency"
  | "share65";

export type BriefingPlaceAfter = BriefingModuleId | "top";

export type BriefingModule = {
  id: BriefingModuleId;
  label: string;
  description: string;
  defaultOn: boolean;
};

export type BriefingChart = {
  id: BriefingChartId;
  label: string;
  description: string;
  defaultOn: boolean;
  defaultAfter: BriefingPlaceAfter;
};

export const BRIEFING_MODULES: BriefingModule[] = [
  {
    id: "snapshot",
    label: "Why this matters",
    description: "Plain-language stake: children today, workers and voters later.",
    defaultOn: true,
  },
  {
    id: "neighbors",
    label: "Neighbors and peers",
    description: "How many children women have next door — the regional comparison.",
    defaultOn: true,
  },
  {
    id: "trajectory",
    label: "Fertility path",
    description: "How TFR got here, and whether the latest year is a blip.",
    defaultOn: true,
  },
  {
    id: "age",
    label: "Age structure",
    description: "Who is already born. 2040 workers are mostly on the pyramid now.",
    defaultOn: true,
  },
  {
    id: "groups",
    label: "Group fertility",
    description:
      "Religion, ancestry, or origin TFR where a national office publishes it.",
    defaultOn: true,
  },
  {
    id: "composition",
    label: "Demographic change",
    description:
      "Race / ethnicity / religion shares where published, and births by group when available.",
    defaultOn: true,
  },
  {
    id: "labor",
    label: "Workers and retirees",
    description: "Working-age headcount and workers per retiree, now → 2040 → 2060.",
    defaultOn: true,
  },
  {
    id: "migration",
    label: "Migration",
    description: "Net flows, and what they do and do not offset.",
    defaultOn: true,
  },
  {
    id: "economy",
    label: "Pensions and growth",
    description: "The fiscal constraint in one page.",
    defaultOn: true,
  },
  {
    id: "politics",
    label: "Political arithmetic",
    description:
      "Electorate weights, group fertility where published, and the budget that follows — descriptive, not a vote.",
    defaultOn: true,
  },
  {
    id: "levers",
    label: "What actually moves the numbers",
    description:
      "Work, retirement, migration — and whether family policy has moved TFR elsewhere.",
    defaultOn: true,
  },
  {
    id: "watch",
    label: "What to watch next",
    description: "The next official release that would change the story.",
    defaultOn: false,
  },
];

export const BRIEFING_CHARTS: BriefingChart[] = [
  {
    id: "neighbors",
    label: "TFR vs neighbors",
    description: "Latest period TFR for this country and its peers.",
    defaultOn: true,
    defaultAfter: "neighbors",
  },
  {
    id: "tfr",
    label: "National TFR over time",
    description: "Births per woman since the series begins.",
    defaultOn: true,
    defaultAfter: "trajectory",
  },
  {
    id: "groups",
    label: "Group TFR over time",
    description: "Official religion / ancestry / origin fertility, if published.",
    defaultOn: true,
    defaultAfter: "groups",
  },
  {
    id: "composition",
    label: "Population by group",
    description:
      "Race / ethnicity share of residents over time (projections where published).",
    defaultOn: true,
    defaultAfter: "composition",
  },
  {
    id: "birthsComposition",
    label: "Births by group",
    description:
      "Share of births by mother's race / ethnicity — a leading indicator.",
    defaultOn: true,
    defaultAfter: "composition",
  },
  {
    id: "religion",
    label: "Religion share",
    description: "Pew / census religion snapshot where curated.",
    defaultOn: true,
    defaultAfter: "composition",
  },
  {
    id: "pyramid",
    label: "Age pyramid",
    description: "Who is already born — male/female by age band.",
    defaultOn: true,
    defaultAfter: "age",
  },
  {
    id: "labor",
    label: "Workers vs retirees",
    description: "Modeled 15–64 and 65+ from today’s pyramid.",
    defaultOn: true,
    defaultAfter: "labor",
  },
  {
    id: "population",
    label: "Population",
    description: "Resident population over time.",
    defaultOn: false,
    defaultAfter: "snapshot",
  },
  {
    id: "migration",
    label: "Net migration",
    description: "Immigrants minus emigrants.",
    defaultOn: true,
    defaultAfter: "migration",
  },
  {
    id: "migrationOrigins",
    label: "Where immigrants come from",
    description: "Foreign-born stock by country of birth (UN DESA).",
    defaultOn: true,
    defaultAfter: "migration",
  },
  {
    id: "migrationDestinations",
    label: "Where emigrants live",
    description: "People born here living abroad by destination (UN DESA stock).",
    defaultOn: true,
    defaultAfter: "migration",
  },
  {
    id: "budget",
    label: "Budget / pensions",
    description: "Curated pension and outlay figures where published (e.g. US CBO).",
    defaultOn: true,
    defaultAfter: "economy",
  },
  {
    id: "health",
    label: "Health spending",
    description: "Current health expenditure as % of GDP (World Bank).",
    defaultOn: true,
    defaultAfter: "economy",
  },
  {
    id: "dependency",
    label: "Age dependency",
    description: "Young and old per working-age person.",
    defaultOn: true,
    defaultAfter: "age",
  },
  {
    id: "share65",
    label: "Share aged 65+",
    description: "Old-age share of the population over time.",
    defaultOn: true,
    defaultAfter: "economy",
  },
];

export const BRIEFING_MODULE_IDS = BRIEFING_MODULES.map((m) => m.id);
export const BRIEFING_CHART_IDS = BRIEFING_CHARTS.map((c) => c.id);
