/**
 * Statista-style search suggestions and "related insights" rails.
 * Static on purpose: typing "fertility rate" should suggest Japan / Korea /
 * rankings even when the database is slow or unreachable.
 */

import { parseSearchQuery, SEARCH_TOPICS, type SearchTopic } from "@/lib/search-query";

export type RelatedInsight = {
  title: string;
  href: string;
  region: string;
};

export type SearchInsight = RelatedInsight & {
  id: string;
};

export type SuggestedTopic = {
  id: string;
  title: string;
  href: string;
  description?: string;
};

const TOPIC_HUB: Record<string, string> = {
  fertility: "/fertility",
  population: "/population",
  migration: "/migration",
  mortality: "/mortality",
  gdp: "/gdp",
  economy: "/gdp",
  demography: "/population",
};

const COMPARE_METRIC: Record<string, string> = {
  fertility: "fertility-rate",
  population: "population",
  migration: "net-migration",
  mortality: "life-expectancy",
  gdp: "gdp-per-capita",
  economy: "gdp-per-capita",
  demography: "population",
};

/** Phrase used in suggestion titles: "Japan fertility rate". */
const METRIC_PHRASE: Record<string, string> = {
  fertility: "fertility rate",
  population: "population",
  migration: "net migration",
  mortality: "life expectancy",
  gdp: "GDP per capita",
  economy: "GDP per capita",
  demography: "population",
  crime: "homicide rate",
  trade: "trade",
};

type FeaturedPlace = {
  slug: string;
  name: string;
  aliases: string[];
  region: string;
  /** Lowercase ISO3 for /maps/[iso3] when a choropleth exists. */
  mapIso3?: string;
  tfr?: "high" | "low";
};

const FEATURED: FeaturedPlace[] = [
  { slug: "japan", name: "Japan", aliases: ["japan"], region: "Japan", mapIso3: "jpn", tfr: "low" },
  { slug: "china", name: "China", aliases: ["china"], region: "China", mapIso3: "chn", tfr: "low" },
  {
    slug: "korea-rep",
    name: "South Korea",
    aliases: ["korea", "south korea", "korean"],
    region: "Korea",
    mapIso3: "kor",
    tfr: "low",
  },
  {
    slug: "united-states",
    name: "United States",
    aliases: ["united states", "usa", "us", "america"],
    region: "USA",
    mapIso3: "usa",
  },
  { slug: "india", name: "India", aliases: ["india"], region: "India", mapIso3: "ind" },
  { slug: "italy", name: "Italy", aliases: ["italy"], region: "Italy", mapIso3: "ita", tfr: "low" },
  { slug: "germany", name: "Germany", aliases: ["germany"], region: "Germany", mapIso3: "deu" },
  { slug: "france", name: "France", aliases: ["france"], region: "France", mapIso3: "fra" },
  { slug: "united-kingdom", name: "United Kingdom", aliases: ["united kingdom", "uk", "britain"], region: "UK" },
  { slug: "nigeria", name: "Nigeria", aliases: ["nigeria"], region: "Africa", tfr: "high" },
  { slug: "niger", name: "Niger", aliases: ["niger"], region: "Africa", tfr: "high" },
  { slug: "chad", name: "Chad", aliases: ["chad"], region: "Africa", tfr: "high" },
  { slug: "ethiopia", name: "Ethiopia", aliases: ["ethiopia"], region: "Africa", tfr: "high" },
  { slug: "spain", name: "Spain", aliases: ["spain"], region: "Spain", mapIso3: "esp", tfr: "low" },
  { slug: "brazil", name: "Brazil", aliases: ["brazil"], region: "Brazil" },
  { slug: "mexico", name: "Mexico", aliases: ["mexico"], region: "Mexico" },
  { slug: "denmark", name: "Denmark", aliases: ["denmark"], region: "Denmark", mapIso3: "dnk" },
  { slug: "norway", name: "Norway", aliases: ["norway"], region: "Norway" },
  {
    slug: "russian-federation",
    name: "Russia",
    aliases: ["russia"],
    region: "Russia",
    mapIso3: "rus",
  },
  {
    slug: "iran-islamic-rep",
    name: "Iran",
    aliases: ["iran"],
    region: "Iran",
  },
];

type StatisticDef = {
  id: string;
  title: string;
  href: string;
  region: string;
  topicIds: string[];
  keywords: string[];
};

const STATISTICS: StatisticDef[] = [
  {
    id: "tfr-highest",
    title: "Countries with the highest fertility rates",
    href: "/fertility#fertility-rankings",
    region: "Worldwide",
    topicIds: ["fertility"],
    keywords: ["highest fertility", "highest tfr", "highest birth", "top fertility"],
  },
  {
    id: "tfr-lowest",
    title: "Countries with the lowest fertility rates",
    href: "/fertility#fertility-rankings",
    region: "Worldwide",
    topicIds: ["fertility"],
    keywords: ["lowest fertility", "lowest tfr", "lowest birth", "ultra-low"],
  },
  {
    id: "tfr-movers",
    title: "Biggest fertility declines",
    href: "/fertility#biggest-movers",
    region: "Worldwide",
    topicIds: ["fertility"],
    keywords: ["decline", "movers", "falling fertility", "dropping"],
  },
  {
    id: "tfr-compare",
    title: "Compare fertility rates across countries",
    href: "/compare?metric=fertility-rate",
    region: "Worldwide",
    topicIds: ["fertility"],
    keywords: ["compare fertility", "compare tfr"],
  },
  {
    id: "tfr-maps",
    title: "Fertility maps by region",
    href: "/maps",
    region: "Worldwide",
    topicIds: ["fertility"],
    keywords: ["map", "maps", "subnational", "regional fertility", "prefecture", "state fertility"],
  },
  {
    id: "tfr-teen",
    title: "Adolescent fertility and contraception",
    href: "/fertility#teen-fertility-contraception",
    region: "Worldwide",
    topicIds: ["fertility"],
    keywords: ["teen", "adolescent", "contraception"],
  },
  {
    id: "tfr-ancestry",
    title: "Fertility by ancestry in Denmark",
    href: "/country/denmark",
    region: "Denmark",
    topicIds: ["fertility"],
    keywords: ["ancestry", "origin", "background", "denmark fertility"],
  },
  {
    id: "pop-rank",
    title: "Countries by population",
    href: "/population#population-rankings",
    region: "Worldwide",
    topicIds: ["population", "demography"],
    keywords: ["largest population", "most populous", "population ranking"],
  },
  {
    id: "pop-compare",
    title: "Compare population across countries",
    href: "/compare?metric=population",
    region: "Worldwide",
    topicIds: ["population", "demography"],
    keywords: ["compare population"],
  },
  {
    id: "mig-rank",
    title: "Net migration by country",
    href: "/migration#net-migration-rankings",
    region: "Worldwide",
    topicIds: ["migration"],
    keywords: ["immigration", "emigration", "net migration ranking"],
  },
  {
    id: "life-rank",
    title: "Life expectancy by country",
    href: "/mortality#life-expectancy-rankings",
    region: "Worldwide",
    topicIds: ["mortality"],
    keywords: ["longest lived", "life expectancy ranking"],
  },
  {
    id: "gdp-rank",
    title: "GDP per capita by country",
    href: "/gdp#gdp-per-capita",
    region: "Worldwide",
    topicIds: ["gdp", "economy"],
    keywords: ["richest", "gdp ranking", "living standards"],
  },
];

const HUB_INSIGHTS: Record<string, RelatedInsight[]> = {
  "/fertility": [
    { title: "South Korea fertility rate", href: "/fertility/korea-rep", region: "Korea" },
    { title: "Japan fertility rate", href: "/fertility/japan", region: "Japan" },
    { title: "China fertility rate", href: "/fertility/china", region: "China" },
    { title: "Niger fertility rate", href: "/fertility/niger", region: "Africa" },
    { title: "Italy fertility rate", href: "/fertility/italy", region: "Italy" },
    { title: "Compare fertility rates across countries", href: "/compare?metric=fertility-rate", region: "Worldwide" },
    { title: "Fertility maps by region", href: "/maps", region: "Worldwide" },
    { title: "World population rankings", href: "/population#population-rankings", region: "Worldwide" },
  ],
  "/population": [
    { title: "India population", href: "/population/india", region: "India" },
    { title: "China population", href: "/population/china", region: "China" },
    { title: "Nigeria population", href: "/population/nigeria", region: "Africa" },
    { title: "United States population", href: "/population/united-states", region: "USA" },
    { title: "Compare population across countries", href: "/compare?metric=population", region: "Worldwide" },
    { title: "Fertility rates worldwide", href: "/fertility", region: "Worldwide" },
    { title: "Net migration by country", href: "/migration", region: "Worldwide" },
  ],
  "/migration": [
    { title: "United States net migration", href: "/migration/united-states", region: "USA" },
    { title: "Germany net migration", href: "/migration/germany", region: "Germany" },
    { title: "United Kingdom net migration", href: "/migration/united-kingdom", region: "UK" },
    { title: "Compare net migration", href: "/compare?metric=net-migration", region: "Worldwide" },
    { title: "World population", href: "/population", region: "Worldwide" },
    { title: "UK census ethnicity", href: "/demographics/uk", region: "UK" },
  ],
  "/mortality": [
    { title: "Japan life expectancy", href: "/mortality/japan", region: "Japan" },
    { title: "Nigeria life expectancy", href: "/mortality/nigeria", region: "Africa" },
    { title: "United States life expectancy", href: "/mortality/united-states", region: "USA" },
    { title: "Child mortality rankings", href: "/mortality#child-mortality-rankings", region: "Worldwide" },
    { title: "Compare life expectancy", href: "/compare?metric=life-expectancy", region: "Worldwide" },
    { title: "Fertility rates worldwide", href: "/fertility", region: "Worldwide" },
  ],
  "/gdp": [
    { title: "United States GDP per capita", href: "/gdp/united-states", region: "USA" },
    { title: "China GDP per capita", href: "/gdp/china", region: "China" },
    { title: "India GDP per capita", href: "/gdp/india", region: "India" },
    { title: "Compare GDP per capita", href: "/compare?metric=gdp-per-capita", region: "Worldwide" },
    { title: "Largest economies", href: "/gdp#gdp-total", region: "Worldwide" },
    { title: "World population", href: "/population", region: "Worldwide" },
  ],
};

function countryHref(topicId: string, slug: string) {
  const hub = TOPIC_HUB[topicId];
  return hub ? `${hub}/${slug}` : `/country/${slug}`;
}

function metricPhrase(topicId: string) {
  return METRIC_PHRASE[topicId] ?? "data";
}

function placeMatches(place: FeaturedPlace, q: string) {
  if (!q) return false;
  const slugQ = q.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (place.slug === slugQ || place.slug.includes(slugQ)) return true;
  return place.aliases.some(
    (a) => a === q || q.includes(a) || a.includes(q),
  );
}

function countryInsight(place: FeaturedPlace, topic: SearchTopic): SearchInsight {
  const phrase = metricPhrase(topic.id);
  return {
    id: `${topic.id}-${place.slug}`,
    title: `${place.name} ${phrase}`,
    href: countryHref(topic.id, place.slug),
    region: place.region,
  };
}

function statisticToInsight(s: StatisticDef): SearchInsight {
  return { id: s.id, title: s.title, href: s.href, region: s.region };
}

function uniqueByHref<T extends { href: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });
}

const RANKING_RE =
  /\b(highest|lowest|ranking|rankings|top |compare|map|maps|ancestry|origin|teen|adolescent)\b/i;

/** Map search-topic ids onto country-topic hubs. */
export function countryHrefForSearch(
  slug: string,
  topic: SearchTopic | null,
): { href: string; hint: string | null } {
  if (!topic) return { href: `/country/${slug}`, hint: null };
  if (TOPIC_HUB[topic.id]) {
    return { href: countryHref(topic.id, slug), hint: topic.label };
  }
  return { href: `/country/${slug}#${topic.hash}`, hint: topic.label };
}

export function relatedInsightsForHub(path: string): RelatedInsight[] {
  return HUB_INSIGHTS[path] ?? [];
}

export function relatedInsightsForCountryTopic(opts: {
  topicId: string;
  slug: string;
  name: string;
  iso3: string;
  continent: string | null;
}): RelatedInsight[] {
  const { topicId, slug, name, iso3, continent } = opts;
  const phrase = metricPhrase(topicId);
  const hub = TOPIC_HUB[topicId] ?? `/${topicId}`;
  const compare = COMPARE_METRIC[topicId];
  const place = FEATURED.find((p) => p.slug === slug);
  const peers = FEATURED.filter((p) => {
    if (p.slug === slug) return false;
    if (topicId === "fertility" && place?.tfr && p.tfr === place.tfr) return true;
    if (continent === "Africa" && p.region === "Africa") return true;
    if (continent === "Europe" && ["Italy", "Germany", "France", "Spain", "UK", "Denmark"].includes(p.region))
      return true;
    if (continent === "East Asia" || continent === "Asia") {
      return ["Japan", "Korea", "China", "India"].includes(p.region);
    }
    return ["Japan", "Korea", "USA", "Germany"].includes(p.region);
  }).slice(0, 2);

  const rankingTitle =
    topicId === "fertility"
      ? "Countries with the highest fertility rates"
      : topicId === "population"
        ? "Countries by population"
        : topicId === "migration"
          ? "Net migration by country"
          : topicId === "mortality"
            ? "Life expectancy by country"
            : topicId === "gdp"
              ? "GDP per capita by country"
              : `Countries by ${phrase}`;

  const items: RelatedInsight[] = [
    { title: rankingTitle, href: hub, region: "Worldwide" },
    ...peers.map((p) => ({
      title: `${p.name} ${phrase}`,
      href: countryHref(topicId, p.slug),
      region: p.region,
    })),
  ];

  const otherTopic =
    topicId === "fertility"
      ? { id: "population", label: "population" }
      : topicId === "population"
        ? { id: "fertility", label: "fertility rate" }
        : { id: "population", label: "population" };
  items.push({
    title: `${name} ${otherTopic.label}`,
    href: countryHref(otherTopic.id, slug),
    region: name,
  });

  if (place?.mapIso3 && (topicId === "fertility" || topicId === "population")) {
    items.push({
      title: `${name} by region`,
      href: `/maps/${place.mapIso3}`,
      region: name,
    });
  } else if (iso3 && (topicId === "fertility" || topicId === "population")) {
    const known = FEATURED.find(
      (p) => p.mapIso3 === iso3.toLowerCase(),
    );
    if (known?.mapIso3) {
      items.push({
        title: `${name} by region`,
        href: `/maps/${known.mapIso3}`,
        region: name,
      });
    }
  }

  if (compare) {
    items.push({
      title: `Compare ${name} ${phrase}`,
      href: `/compare?countries=${slug}&metric=${compare}`,
      region: "Worldwide",
    });
  }

  return uniqueByHref(items).slice(0, 7);
}

export function suggestSearch(query: string): {
  topics: SuggestedTopic[];
  insights: SearchInsight[];
} {
  const raw = query.trim();
  if (!raw) return { topics: [], insights: [] };

  const { placeQuery, topic } = parseSearchQuery(raw);
  const q = raw.toLowerCase();
  const placeQ = placeQuery.toLowerCase();
  const ranking = RANKING_RE.test(q);

  const topics: SuggestedTopic[] = topic
    ? [
        {
          id: topic.id,
          title: topic.label,
          href: topic.href,
          description: placeQuery
            ? `${topic.label} for matching places`
            : `Browse ${topic.label.toLowerCase()} data`,
        },
      ]
    : [];

  const insights: SearchInsight[] = [];

  const matchingStats = STATISTICS.filter((s) =>
    s.keywords.some((k) => q.includes(k)),
  );
  for (const s of matchingStats) insights.push(statisticToInsight(s));

  if (topic && TOPIC_HUB[topic.id]) {
    if (!placeQuery) {
      const pool = ranking
        ? FEATURED.filter((p) => {
            if (/\bhighest\b/i.test(q)) return p.tfr === "high";
            if (/\blowest\b/i.test(q)) return p.tfr === "low";
            return true;
          })
        : FEATURED;
      const take = ranking ? 3 : 6;
      for (const place of pool.slice(0, take)) {
        insights.push(countryInsight(place, topic));
      }
      if (!ranking) {
        const rest = STATISTICS.filter((s) => s.topicIds.includes(topic.id));
        for (const s of rest) insights.push(statisticToInsight(s));
      } else {
        const rest = STATISTICS.filter(
          (s) => s.topicIds.includes(topic.id) && !matchingStats.includes(s),
        );
        for (const s of rest.slice(0, 3)) insights.push(statisticToInsight(s));
      }
    } else {
      const matched = FEATURED.filter((p) => placeMatches(p, placeQ));
      for (const place of matched.slice(0, 3)) {
        insights.push(countryInsight(place, topic));
        if (place.mapIso3 && (topic.id === "fertility" || q.includes("map"))) {
          insights.push({
            id: `map-${place.slug}`,
            title: `${place.name} fertility by region`,
            href: `/maps/${place.mapIso3}`,
            region: place.region,
          });
        }
      }
      const related = STATISTICS.filter((s) => s.topicIds.includes(topic.id));
      for (const s of related.slice(0, 3)) insights.push(statisticToInsight(s));
    }
  } else if (placeQ) {
    const matched = FEATURED.filter((p) => placeMatches(p, placeQ));
    const fertility = SEARCH_TOPICS.find((t) => t.id === "fertility");
    const population = SEARCH_TOPICS.find((t) => t.id === "population");
    for (const place of matched.slice(0, 2)) {
      if (fertility) insights.push(countryInsight(place, fertility));
      if (population) insights.push(countryInsight(place, population));
    }
  }

  const topicHrefs = new Set(topics.map((t) => t.href));
  const filtered = uniqueByHref(insights).filter((i) => {
    const base = i.href.split("#")[0] ?? i.href;
    if (topicHrefs.has(i.href) || topicHrefs.has(base)) {
      return i.href.includes("#") || i.href.includes("?");
    }
    return true;
  });

  return { topics, insights: filtered.slice(0, 10) };
}
