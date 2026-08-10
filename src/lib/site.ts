export const siteConfig = {
  name: "birthrate.io",
  tagline: "The world's demographic data platform",
  description:
    "Explore fertility, population, migration and economic trends for every country on Earth. Interactive charts, maps, projections and a demographic simulator — powered by UN, World Bank and OECD data.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
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
      "Fertility, population size, migration, mortality, and subnational demographics.",
    links: [
      {
        title: "Fertility",
        href: "/fertility",
        description: "Total fertility rates, maps, rankings, and nowcasts",
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
        title: "States & provinces",
        href: "/states",
        description: "Subnational fertility maps and tables",
      },
      {
        title: "US demographics",
        href: "/demographics",
        description: "Race and Hispanic-origin map for U.S. states",
      },
      {
        title: "Cities",
        href: "/cities",
        description: "World metropolitan areas database",
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
        title: "Trade (on country pages)",
        href: "/country/japan",
        description: "Exports & imports treemaps from OEC / BACI",
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
        title: "Report data",
        href: "/contribute",
        description: "Suggest a correction or new series",
      },
    ],
  },
];

/** Slim primary header links — hubs and high-traffic destinations. */
export const primaryNav: NavLink[] = [
  { title: "Topics", href: "/topics" },
  { title: "Tools", href: "/topics#tools" },
  { title: "Cities", href: "/cities" },
  { title: "Clock", href: "/clock" },
];

/** Flat list of every content page (sitemap, assistants, legacy). */
export const mainNav: NavLink[] = navTopics.flatMap((topic) => topic.links);

export function topicForPath(pathname: string): NavTopic | undefined {
  return navTopics.find((topic) =>
    topic.links.some(
      (link) =>
        pathname === link.href || pathname.startsWith(`${link.href}/`),
    ),
  );
}
