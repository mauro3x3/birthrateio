// Geography helpers shared by ingestion and UI.

/** Convert an ISO-3166 alpha-2 code into its flag emoji. */
export function flagFromIso2(iso2?: string | null): string | null {
  if (!iso2 || iso2.length !== 2) return null;
  const code = iso2.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  const A = 0x1f1e6;
  return String.fromCodePoint(
    A + (code.charCodeAt(0) - 65),
    A + (code.charCodeAt(1) - 65),
  );
}

// Continent grouping used for region filters in explorers.
export const CONTINENTS = [
  "Africa",
  "Americas",
  "Asia",
  "Europe",
  "Oceania",
  "Middle East & North Africa",
] as const;

export type Continent = (typeof CONTINENTS)[number];
