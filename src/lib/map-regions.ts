/** Map region membership for explorers — not the same as World Bank
 *  `continent` codes (those put Central Asia + Russia under “Europe”). */

export type MapRegionId =
  | "all"
  | "Africa"
  | "Americas"
  | "Asia"
  | "Europe"
  | "Middle East & North Africa";

export const MAP_REGIONS: { id: MapRegionId; label: string }[] = [
  { id: "all", label: "Global" },
  { id: "Africa", label: "Africa" },
  { id: "Americas", label: "Americas" },
  { id: "Asia", label: "Asia" },
  { id: "Europe", label: "Europe" },
  { id: "Middle East & North Africa", label: "MENA" },
];

/** Continental Europe + UK/Ireland/Nordics/Balkans — excludes Russia & Central Asia
 *  so region zoom frames Europe properly. */
const EUROPE_ISO3 = new Set([
  "ALB",
  "AND",
  "AUT",
  "BLR",
  "BEL",
  "BIH",
  "BGR",
  "HRV",
  "CYP",
  "CZE",
  "DNK",
  "EST",
  "FRO",
  "FIN",
  "FRA",
  "DEU",
  "GIB",
  "GRC",
  "HUN",
  "ISL",
  "IRL",
  "IMN",
  "ITA",
  "XKX",
  "LVA",
  "LIE",
  "LTU",
  "LUX",
  "MLT",
  "MDA",
  "MCO",
  "MNE",
  "NLD",
  "MKD",
  "NOR",
  "POL",
  "PRT",
  "ROU",
  "SMR",
  "SRB",
  "SVK",
  "SVN",
  "ESP",
  "SWE",
  "CHE",
  "UKR",
  "GBR",
  "VAT",
  "CHI", // Channel Islands
]);

/** Mis-tagged as Europe in WDI; treat as Asia for map regions. */
const CENTRAL_ASIA_ISO3 = new Set([
  "KAZ",
  "KGZ",
  "TJK",
  "TKM",
  "UZB",
]);

const CAUCASUS_ISO3 = new Set(["ARM", "AZE", "GEO"]);

/** Optional geographic clamp so overseas territories (e.g. French Guiana)
 *  don't blow out a continental zoom. */
export const REGION_VIEW_CLAMP: Partial<
  Record<MapRegionId, { west: number; south: number; east: number; north: number }>
> = {
  // Tight continental frame — stops before Kazakhstan / Urals.
  Europe: { west: -12, south: 35, east: 40, north: 71 },
  Africa: { west: -25, south: -37, east: 55, north: 38 },
  "Middle East & North Africa": { west: -20, south: 10, east: 65, north: 42 },
};

/** Fixed cameras beat flyToBounds on wide aspect ratios (Europe used to
 *  look like “half of Eurasia” even after excluding Central Asia). */
export const REGION_CAMERA: Partial<
  Record<MapRegionId, { center: [number, number]; zoom: number }>
> = {
  // [lat, lng] — continental Europe fills a wide stage without world-wrap duplicates.
  Europe: { center: [52, 10], zoom: 4.15 },
  Africa: { center: [2, 18], zoom: 2.9 },
  Americas: { center: [8, -78], zoom: 2.35 },
  Asia: { center: [28, 95], zoom: 2.55 },
  "Middle East & North Africa": { center: [27, 32], zoom: 3.35 },
};

export function countryInMapRegion(
  region: MapRegionId,
  country: { iso3: string; continent: string | null },
): boolean {
  if (region === "all") return true;
  const iso = country.iso3.toUpperCase();

  if (region === "Europe") {
    return EUROPE_ISO3.has(iso);
  }

  if (region === "Asia") {
    if (CENTRAL_ASIA_ISO3.has(iso) || iso === "RUS" || iso === "TUR")
      return true;
    if (CAUCASUS_ISO3.has(iso)) return true;
    return country.continent === "Asia";
  }

  if (region === "Americas") {
    // Greenland is tagged Europe in WDI but belongs here geographically.
    if (iso === "GRL") return true;
    return country.continent === "Americas";
  }

  if (region === "Africa") {
    return country.continent === "Africa";
  }

  if (region === "Middle East & North Africa") {
    return country.continent === "Middle East & North Africa";
  }

  return false;
}

/** ISO3s that belong on the map for a region (for masking, not just data rows). */
export function mapRegionMaskIso3s(
  region: MapRegionId,
  catalog: { iso3: string; continent: string | null }[],
): string[] | null {
  if (region === "all") return null;
  if (region === "Europe") return Array.from(EUROPE_ISO3);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of catalog) {
    const iso = c.iso3.toUpperCase();
    if (seen.has(iso)) continue;
    if (countryInMapRegion(region, c)) {
      seen.add(iso);
      out.push(iso);
    }
  }
  return out;
}
