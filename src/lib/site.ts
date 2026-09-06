function resolveSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv && !fromEnv.includes("localhost")) return fromEnv;
  // Production on Vercel without the env var still must emit absolute public URLs
  // (sitemap, canonicals, JSON-LD). Never fall back to localhost there.
  if (process.env.VERCEL_ENV === "production") return "https://birthrate.io";
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`;
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
      "Fertility, population size, migration, mortality, and cities.",
    links: [
      {
        title: "Fertility",
        href: "/fertility",
        description:
          "Total fertility rates, nowcasts, rankings, and TFR by ancestry where published",
      },
      {
        title: "Population",
        href: "/population",
        description: "Population levels, growth, and projections",
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
        title: "Cities",
        href: "/cities",
        description: "World metropolitan areas database",
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
        title: "States & provinces",
        href: "/states",
        description: "Subnational fertility maps and tables",
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
];

/** Slim primary header links — hubs and high-traffic destinations. */
export const primaryNav: NavLink[] = [
  { title: "Topics", href: "/topics" },
  { title: "Maps", href: "/maps" },
  { title: "Tools", href: "/topics#tools" },
  { title: "Cities", href: "/cities" },
  { title: "Clock", href: "/clock" },
  { title: "Contribute", href: "/contribute" },
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
