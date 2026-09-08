export type FeaturedDestination = {
  id: string;
  kicker: string;
  title: string;
  href: string;
  description: string;
};

/**
 * High-traffic explorers that are easy to miss in the subject catalogue.
 * Homepage, Topics, and topic hubs should point here rather than inventing
 * parallel lists.
 */
export const FEATURED_DESTINATIONS: FeaturedDestination[] = [
  {
    id: "regional-maps",
    kicker: "Maps",
    title: "Regional fertility maps",
    href: "/maps",
    description:
      "Total fertility by state, province, and country — India, Pakistan, Nigeria, Brazil, Indonesia, Europe (NUTS 2), Africa, the Caribbean, and dozens of other official maps.",
  },
  {
    id: "census-maps",
    kicker: "Maps",
    title: "Census maps",
    href: "/demographics",
    description:
      "Ethnicity, ancestry, race, and country of birth from national censuses — the UK, Denmark, Germany, Russia, the United States, and the rest of Europe.",
  },
  {
    id: "birth-shares",
    kicker: "Population",
    title: "Where the births are",
    href: "/population/shares",
    description:
      "Share of a region's residents, and share of its babies — country by country. A younger country can punch above its population.",
  },
  {
    id: "tfr-education",
    kicker: "Fertility",
    title: "Fertility by education and income",
    href: "/fertility/education",
    description:
      "DHS TFR by schooling and wealth quintile, U.S. TFR by educational attainment, and why language spoken at home has no official U.S. fertility table.",
  },
  {
    id: "tfr-decomp",
    kicker: "Fertility",
    title: "Many mothers, or large families?",
    href: "/fertility/many-mothers-or-large-families",
    description:
      "The same total fertility rate can mean most women become mothers, or that a smaller group of mothers have larger families.",
  },
  {
    id: "tfr-history",
    kicker: "Fertility",
    title: "Fertility since 1800",
    href: "/fertility#since-1800",
    description:
      "Total fertility for most countries back to the nineteenth century — Human Fertility Database, UN WPP, and Gapminder reconstructions, then World Bank from 1960.",
  },
  {
    id: "fertility",
    kicker: "Fertility",
    title: "World fertility",
    href: "/fertility",
    description:
      "Interactive timeline, TFR since 1800, 2026 nowcast, country rankings, and the biggest movers.",
  },
  {
    id: "cities",
    kicker: "People",
    title: "Cities",
    href: "/cities",
    description:
      "Population, fertility, and foreign-born share for metropolitan areas worldwide.",
  },
  {
    id: "compare",
    kicker: "Tools",
    title: "Compare countries",
    href: "/compare",
    description:
      "Side-by-side fertility, population, migration, and GDP for any pair of countries.",
  },
];

export function featuredById(
  id: string,
): FeaturedDestination | undefined {
  return FEATURED_DESTINATIONS.find((d) => d.id === id);
}
