export type BriefingModuleId =
  | "snapshot"
  | "neighbors"
  | "trajectory"
  | "age"
  | "groups"
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
  | "labor"
  | "population"
  | "migration"
  | "dependency";

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
    id: "labor",
    label: "Workers and retirees",
    description: "Working-age headcount and workers per retiree, now → 2040 → 2060.",
    defaultOn: true,
  },
  {
    id: "migration",
    label: "Migration",
    description: "Net flows, and what they do and do not offset.",
    defaultOn: false,
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
    defaultOn: false,
    defaultAfter: "migration",
  },
  {
    id: "dependency",
    label: "Age dependency",
    description: "Young and old per working-age person.",
    defaultOn: false,
    defaultAfter: "age",
  },
];

export const BRIEFING_MODULE_IDS = BRIEFING_MODULES.map((m) => m.id);
export const BRIEFING_CHART_IDS = BRIEFING_CHARTS.map((c) => c.id);
