/**
 * Friendly URL aliases → World Bank / DB slugs.
 * Lets `/country/south-korea` and `/fertility/south-korea` resolve to `korea-rep`.
 */
export const COUNTRY_SLUG_ALIASES: Record<string, string> = {
  "south-korea": "korea-rep",
  "korea": "korea-rep",
  "north-korea": "korea-dem-people-s-rep",
  russia: "russian-federation",
  iran: "iran-islamic-rep",
  egypt: "egypt-arab-rep",
  turkey: "turkiye",
  "slovak-republic": "slovak-republic",
  slovakia: "slovak-republic",
  "czech-republic": "czech-republic",
  czechia: "czech-republic",
  usa: "united-states",
  us: "united-states",
  america: "united-states",
  uk: "united-kingdom",
  britain: "united-kingdom",
  "great-britain": "united-kingdom",
  venezuela: "venezuela-rb",
  syria: "syrian-arab-republic",
  laos: "lao-pdr",
  "hong-kong": "hong-kong-sar-china",
  macao: "macao-sar-china",
  macau: "macao-sar-china",
};

/** Resolve a URL slug to the canonical DB slug. */
export function resolveCountrySlug(slug: string): string {
  return COUNTRY_SLUG_ALIASES[slug] ?? slug;
}
