import { SLUG, INDICATOR_BY_SLUG } from "@/lib/indicators";

/**
 * Topic × country pages — the programmatic SEO layer.
 * Hub stays at `/fertility`; each country gets `/fertility/[slug]`, etc.
 */
export type CountryTopicId =
  | "fertility"
  | "population"
  | "migration"
  | "mortality"
  | "gdp";

export type CountryTopicDef = {
  id: CountryTopicId;
  /** Hub path without trailing slash. */
  hubPath: string;
  name: string;
  /** Primary indicator for rank, chart, and lead figure. */
  primarySlug: string;
  /** Extra series shown as supporting charts. */
  secondarySlugs: readonly string[];
  unit: string;
  decimals: number;
  order: "asc" | "desc";
  /** Short noun for titles: "fertility rate", "population". */
  metricLabel: string;
  /** One-line definition used in prose and meta. */
  definition: string;
};

export const COUNTRY_TOPICS: readonly CountryTopicDef[] = [
  {
    id: "fertility",
    hubPath: "/fertility",
    name: "Fertility",
    primarySlug: SLUG.fertility,
    secondarySlugs: [
      SLUG.birthRate,
      SLUG.adolescentFertility,
      SLUG.fertilityProvisional,
    ],
    unit: "births per woman",
    decimals: 2,
    order: "desc",
    metricLabel: "fertility rate",
    definition:
      "the average number of children a woman would have over her lifetime at current age-specific rates",
  },
  {
    id: "population",
    hubPath: "/population",
    name: "Population",
    primarySlug: SLUG.population,
    secondarySlugs: [
      SLUG.populationGrowth,
      SLUG.ageDependencyRatio,
      SLUG.urbanPopulation,
      SLUG.popShare65plus,
    ],
    unit: "people",
    decimals: 0,
    order: "desc",
    metricLabel: "population",
    definition: "the total resident population, all ages and both sexes",
  },
  {
    id: "migration",
    hubPath: "/migration",
    name: "Migration",
    primarySlug: SLUG.netMigration,
    secondarySlugs: [SLUG.migrantStock, SLUG.migrantStockShare],
    unit: "people",
    decimals: 0,
    order: "desc",
    metricLabel: "net migration",
    definition:
      "immigrants minus emigrants in a year — a net figure that can hide large flows in both directions",
  },
  {
    id: "mortality",
    hubPath: "/mortality",
    name: "Mortality",
    primarySlug: SLUG.lifeExpectancy,
    secondarySlugs: [
      SLUG.deathRate,
      SLUG.infantMortality,
      SLUG.childMortality,
      SLUG.lifeExpectancyFemale,
      SLUG.lifeExpectancyMale,
    ],
    unit: "years",
    decimals: 1,
    order: "desc",
    metricLabel: "life expectancy",
    definition:
      "the number of years a newborn would live if current mortality patterns stayed constant",
  },
  {
    id: "gdp",
    hubPath: "/gdp",
    name: "GDP",
    primarySlug: SLUG.gdpPerCapitaPppReal,
    secondarySlugs: [
      SLUG.gdpPerCapita,
      SLUG.gdpGrowth,
      SLUG.gdp,
      SLUG.gniPerCapita,
    ],
    unit: "constant 2021 international $",
    decimals: 0,
    order: "desc",
    metricLabel: "GDP per capita (PPP)",
    definition:
      "output per person at purchasing-power parity and constant 2021 prices — the most comparable living-standards measure",
  },
];

export const COUNTRY_TOPIC_BY_ID = new Map(
  COUNTRY_TOPICS.map((t) => [t.id, t]),
);

export const COUNTRY_TOPIC_PATHS = COUNTRY_TOPICS.map((t) => t.hubPath);

export function countryTopicHref(topicId: CountryTopicId, slug: string) {
  const topic = COUNTRY_TOPIC_BY_ID.get(topicId);
  if (!topic) return `/country/${slug}`;
  return `${topic.hubPath}/${slug}`;
}

export function topicPageTitle(
  topic: CountryTopicDef,
  countryName: string,
  year?: number | null,
) {
  const yearBit = year ? ` (${year})` : "";
  return `${countryName} ${topic.name}${yearBit}`;
}

export function topicPageMetaDescription(
  topic: CountryTopicDef,
  countryName: string,
  opts: {
    valueLabel?: string;
    year?: number | null;
    rank?: number | null;
    total?: number | null;
  } = {},
) {
  const ind = INDICATOR_BY_SLUG.get(topic.primarySlug);
  const parts = [
    `${countryName}'s ${topic.metricLabel}`,
    opts.valueLabel && opts.year
      ? `is ${opts.valueLabel} as of ${opts.year}`
      : null,
    opts.rank && opts.total
      ? `(rank ${opts.rank} of ${opts.total})`
      : null,
    `— charts, history, and comparisons. ${ind?.source === "WORLD_BANK" ? "World Bank" : "Official"} data via birthrate.io.`,
  ].filter(Boolean);
  return parts.join(" ");
}

/** High-traffic compare pairings for the sitemap (not exhaustive). */
export const SEO_COMPARE_PAIRS: readonly [string, string][] = [
  ["japan", "korea-rep"],
  ["japan", "china"],
  ["china", "india"],
  ["united-states", "china"],
  ["united-states", "mexico"],
  ["germany", "france"],
  ["germany", "united-kingdom"],
  ["united-kingdom", "france"],
  ["italy", "spain"],
  ["sweden", "denmark"],
  ["norway", "sweden"],
  ["nigeria", "ethiopia"],
  ["brazil", "mexico"],
  ["australia", "new-zealand"],
  ["canada", "united-states"],
  ["iran-islamic-rep", "turkiye"],
  ["israel", "egypt-arab-rep"],
  ["russian-federation", "ukraine"],
  ["poland", "germany"],
  ["korea-rep", "china"],
];
