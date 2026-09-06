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
      "Total fertility and population by state, province, and prefecture — India, the United States, China, Japan, and 25 other countries.",
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
    id: "tfr-decomp",
    kicker: "Fertility",
    title: "Many mothers, or large families?",
    href: "/fertility/many-mothers-or-large-families",
    description:
      "The same total fertility rate can mean most women become mothers, or that a smaller group of mothers have larger families.",
  },
  {
    id: "fertility",
    kicker: "Fertility",
    title: "World fertility",
    href: "/fertility",
    description:
      "Interactive timeline, 2026 nowcast, country rankings, and the biggest movers.",
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
