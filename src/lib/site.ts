/** Live Vercel primary host — apex `birthrate.io` 308s here. */
const PRODUCTION_ORIGIN = "https://www.birthrate.io";

function normalizePublicOrigin(url: string): string {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname === "birthrate.io" ||
      parsed.hostname === "www.birthrate.io"
    ) {
      return PRODUCTION_ORIGIN;
    }
    return parsed.origin;
  } catch {
    return url.replace(/\/$/, "");
  }
}

function resolveSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv && !fromEnv.includes("localhost")) {
    return normalizePublicOrigin(fromEnv);
  }
  // Production on Vercel without the env var still must emit absolute public URLs
  // (sitemap, canonicals, JSON-LD). Never fall back to localhost there.
  if (process.env.VERCEL_ENV === "production") return PRODUCTION_ORIGIN;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return normalizePublicOrigin(
      `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`,
    );
  }
  if (fromEnv) return fromEnv;
  return "http://localhost:3000";
}

export const siteConfig = {
  name: "birthrate.io",
  tagline: "The world's demographic data platform",
  description:
    "Explore fertility, population, migration and economic trends for every country on Earth. Interactive charts, maps, projections and a demographic simulator — powered by UN, World Bank and OECD data.",
  url: resolveSiteUrl(),
  ogImage: "/og",
  links: {
    github: "https://github.com",
  },
};

/** Buy Me a Coffee, Ko-fi, Stripe Payment Link, PayPal, etc. */
export const supportConfig = {
  donationUrl:
    process.env.NEXT_PUBLIC_DONATION_URL ??
    "https://buymeacoffee.com/kinderheimrune",
  providerName: "Buy Me a Coffee",
  suggestedAmounts: [5, 10, 25, 50, 100],
  currency: "USD",
};

export const contactConfig = {
  /**
   * Public inbox for privacy / partnership / press.
   * Set NEXT_PUBLIC_CONTACT_EMAIL when a birthrate.io mailbox is live.
   * Until then the contact page routes through the contribute form.
   */
  organisationsEmail:
    process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || (null as string | null),
};

export type NavLink = {
  title: string;
  href: string;
  description?: string;
};

export type NavTopic = {
  id: string;
  title: string;
  href: string;
  description: string;
  links: NavLink[];
};

/**
 * Subject taxonomy (DST-style): grouped topics for hubs, sidebars, and menus.
 * Every former top-nav page lives here — nothing removed, just organized.
 */
export const navTopics: NavTopic[] = [
  {
    id: "people",
    title: "People",
    href: "/topics#people",
    description:
      "Fertility, migration, mortality, ageing, and cities.",
    links: [
      {
        title: "Why birthrates matter",
        href: "/why",
        description:
          "Pensions, labour, schools, elections, and geopolitics — why the series is worth a briefing",
      },
      {
        title: "Fertility",
        href: "/fertility",
        description:
          "Total fertility since 1800, nowcasts, rankings, and TFR by ancestry or religion where published",
      },
      {
        title: "Fertility by race & origin",
        href: "/fertility/race",
        description:
          "U.S. race TFR, Austria origin, Kosovo ethnicity, and GDP–fertility scatter",
      },
      {
        title: "Many mothers, or large families?",
        href: "/fertility/many-mothers-or-large-families",
        description:
          "Decompose the same TFR into how many women become mothers vs family size",
      },
      {
        title: "Migration",
        href: "/migration",
        description: "Net migration and mobility patterns",
      },
      {
        title: "Mortality",
        href: "/mortality",
        description: "Death rates and longevity indicators",
      },
      {
        title: "Workers vs retirees",
        href: "/workers-retirees",
        description:
          "Working-age and 65+ headcounts — compare countries through 2060",
      },
      {
        title: "Cities",
        href: "/cities",
        description: "World metropolitan areas database",
      },
    ],
  },
  {
    id: "population",
    title: "Population",
    href: "/population",
    description:
      "Size, growth, world shares, and settlement maps.",
    links: [
      {
        title: "Population hub",
        href: "/population",
        description: "Directory of charts, maps, rankings, and the growth calculator",
      },
      {
        title: "Share of world population & births",
        href: "/population/world-shares",
        description:
          "China, India, Nigeria and others as % of world people and babies, 1950–2100",
      },
      {
        title: "Where the births are",
        href: "/population/shares",
        description:
          "Each region's people, and which countries account for its births",
      },
      {
        title: "World growth map",
        href: "/population/growth",
        description: "Annual % change by country — scrubable timeline",
      },
      {
        title: "India population dots",
        href: "/population/india-dots",
        description: "WorldPop 2025 grid as glowing dots from a PMTiles archive",
      },
      {
        title: "Europe: who grew, who shrank",
        href: "/population/europe-change",
        description: "GHSL 2000→2025 settlement growth and decline",
      },
      {
        title: "Compare regions",
        href: "/population/compare",
        description:
          "Paint provinces into groups, sum populations, download a map",
      },
      {
        title: "Population rankings",
        href: "/population/rankings",
        description:
          "Size, growth, density, dependency, rural share, urban growth",
      },
    ],
  },
  {
    id: "maps",
    title: "Maps",
    href: "/topics#maps",
    description:
      "Regional fertility choropleths and census maps of ethnicity, ancestry, and country of birth.",
    links: [
      {
        title: "Regional maps",
        href: "/maps",
        description:
          "TFR, population and growth by state, province and prefecture",
      },
      {
        title: "Historic empires",
        href: "/maps/historic",
        description:
          "Ottoman, Russian, Habsburg, equal-population world 1914–2050, and more",
      },
      {
        title: "Census maps",
        href: "/demographics",
        description:
          "Ethnicity, ancestry, race and country of birth — UK, Denmark, Germany, Russia, the US, and Europe",
      },
      {
        title: "US demographics",
        href: "/demographics/us",
        description: "Race and Hispanic-origin map for U.S. states",
      },
      {
        title: "World growth map",
        href: "/population/growth",
        description: "Annual population growth % by country",
      },
      {
        title: "Europe population change",
        href: "/population/europe-change",
        description: "GHSL settlement growth and decline, 2000–2025",
      },
      {
        title: "India population dots",
        href: "/population/india-dots",
        description: "WorldPop night-lights style population map",
      },
    ],
  },
  {
    id: "society",
    title: "Society",
    href: "/topics#society",
    description: "Crime and related social indicators.",
    links: [
      {
        title: "Crime",
        href: "/crime",
        description: "Homicide and crime rates by country",
      },
    ],
  },
  {
    id: "economy",
    title: "Economy",
    href: "/topics#economy",
    description: "National accounts, living standards, and trade.",
    links: [
      {
        title: "GDP",
        href: "/gdp",
        description: "GDP and economic output explorers",
      },
      {
        title: "Trade / exports & imports",
        href: "/country/japan#economy",
        description: "Product export & import treemaps on each country page",
      },
    ],
  },
  {
    id: "tools",
    title: "Tools",
    href: "/topics#tools",
    description: "Compare countries, simulate futures, and track releases.",
    links: [
      {
        title: "Country briefings",
        href: "/brief",
        description:
          "AI memo you can forward — pick the sections and charts for any country",
      },
      {
        title: "Compare",
        href: "/compare",
        description: "Side-by-side country comparisons",
      },
      {
        title: "Simulator",
        href: "/simulator",
        description: "Demographic scenario simulator",
      },
      {
        title: "Stories",
        href: "/stories",
        description: "Animated rankings — play and download GIF or video",
      },
      {
        title: "Fertility clock",
        href: "/clock",
        description: "Live fertility countdown",
      },
      {
        title: "Release calendar",
        href: "/calendar",
        description: "Upcoming data releases",
      },
      {
        title: "Help improve the data",
        href: "/contribute",
        description: "Suggest a correction or new series",
      },
    ],
  },
];

/**
 * Reference pages documenting the data itself. Kept out of `navTopics` so the
 * subject taxonomy stays statistics-only and breadcrumbs read correctly.
 */
export const referenceNav: NavLink[] = [
  {
    title: "About",
    href: "/about",
    description: "What this site is and who it is for",
  },
  {
    title: "Methodology",
    href: "/methodology",
    description: "How the data is collected, labelled and revised",
  },
  {
    title: "Glossary",
    href: "/glossary",
    description: "Definitions and units for every indicator",
  },
  {
    title: "Data sources",
    href: "/sources",
    description: "Providers behind the figures, with licence terms",
  },
  {
    title: "Contact",
    href: "/contact",
    description: "Corrections, privacy requests, and enquiries",
  },
  {
    title: "Privacy",
    href: "/privacy",
    description: "Cookies, analytics, and advertising",
  },
  {
    title: "Disclaimer",
    href: "/disclaimer",
    description: "Reference data — not advice or official publication",
  },
  {
    title: "Terms",
    href: "/terms",
    description: "Reuse, attribution, and acceptable use",
  },
];

/** Slim primary header links — hubs and high-traffic destinations. */
export const primaryNav: NavLink[] = [
  { title: "Topics", href: "/topics" },
  { title: "Maps", href: "/maps" },
  { title: "Stories", href: "/stories" },
  { title: "Tools", href: "/topics#tools" },
  { title: "Cities", href: "/cities" },
  { title: "Clock", href: "/clock" },
  { title: "Contribute", href: "/contribute" },
  { title: "Pricing", href: "/pricing" },
];

/** Flat list of every content page (sitemap, assistants, legacy). */
export const mainNav: NavLink[] = navTopics.flatMap((topic) => topic.links);

export function navLinkMatches(pathname: string, href: string) {
  const base = href.includes("#") ? href.split("#")[0] : href;
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function bestNavLink(
  pathname: string,
  links: NavLink[],
): NavLink | undefined {
  return [...links]
    .filter((link) => navLinkMatches(pathname, link.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function topicForPath(pathname: string): NavTopic | undefined {
  const hits = navTopics.filter((topic) =>
    topic.links.some((link) => navLinkMatches(pathname, link.href)),
  );
  if (hits.length <= 1) return hits[0];
  return [...hits].sort((a, b) => {
    const aLen = bestNavLink(pathname, a.links)?.href.length ?? 0;
    const bLen = bestNavLink(pathname, b.links)?.href.length ?? 0;
    return bLen - aLen;
  })[0];
}
