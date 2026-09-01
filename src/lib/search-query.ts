/**
 * Parse global-search queries like "Japan fertility" into a place name
 * plus an optional topic (country-page hash + hub page).
 */

export type SearchTopic = {
  id: string;
  label: string;
  /** Country-profile panel hash. */
  hash: string;
  /** Site-wide explorer for this topic. */
  href: string;
  keywords: string[];
};

export const SEARCH_TOPICS: SearchTopic[] = [
  {
    id: "fertility",
    label: "Fertility",
    hash: "overview",
    href: "/fertility",
    keywords: [
      "total fertility rate",
      "fertility rate",
      "births per woman",
      "birth rate",
      "birthrate",
      "fertility",
      "tfr",
    ],
  },
  {
    id: "population",
    label: "Population",
    hash: "overview",
    href: "/population",
    keywords: ["population", "pop growth"],
  },
  {
    id: "migration",
    label: "Migration",
    hash: "migration",
    href: "/migration",
    keywords: ["net migration", "immigration", "emigration", "migration", "migrants"],
  },
  {
    id: "mortality",
    label: "Mortality",
    hash: "mortality",
    href: "/mortality",
    keywords: ["life expectancy", "child mortality", "death rate", "mortality", "deaths"],
  },
  {
    id: "trade",
    label: "Trade",
    hash: "economy",
    href: "/topics#economy",
    keywords: ["exports", "imports", "export", "import", "trade"],
  },
  {
    id: "economy",
    label: "Economy",
    hash: "economy",
    href: "/gdp",
    keywords: ["gdp per capita", "gdp", "economy", "economic"],
  },
  {
    id: "crime",
    label: "Crime",
    hash: "crime",
    href: "/crime",
    keywords: ["homicide", "crime"],
  },
  {
    id: "demography",
    label: "Demography",
    hash: "demography",
    href: "/population",
    keywords: ["projections", "pyramid", "demography", "demographic"],
  },
];

const KEYWORD_INDEX = SEARCH_TOPICS.flatMap((topic) =>
  topic.keywords.map((keyword) => ({ keyword, topic })),
).sort((a, b) => b.keyword.length - a.keyword.length);

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Words that are not a country/city when left after stripping a topic keyword. */
const PLACE_FILLER = new Set([
  "the",
  "a",
  "an",
  "of",
  "in",
  "by",
  "for",
  "and",
  "highest",
  "lowest",
  "top",
  "global",
  "world",
  "worldwide",
  "total",
  "average",
]);

function cleanPlaceQuery(raw: string) {
  return raw
    .split(/\s+/)
    .filter((w) => w && !PLACE_FILLER.has(w.toLowerCase()))
    .join(" ")
    .trim();
}

export function parseSearchQuery(query: string): {
  placeQuery: string;
  topic: SearchTopic | null;
} {
  const raw = query.trim();
  if (!raw) return { placeQuery: "", topic: null };

  const lower = raw.toLowerCase();
  for (const { keyword, topic } of KEYWORD_INDEX) {
    const re = new RegExp(`(?:^|\\s)${escapeRegExp(keyword)}(?:\\s|$)`, "i");
    if (!re.test(lower) && lower !== keyword) continue;
    const placeQuery = cleanPlaceQuery(
      raw
        .replace(new RegExp(escapeRegExp(keyword), "ig"), " ")
        .replace(/[.,:;!?]+/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    );
    return { placeQuery, topic };
  }
  return { placeQuery: cleanPlaceQuery(raw), topic: null };
}
