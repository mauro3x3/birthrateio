/** Shared dark basemap config for Leaflet point maps (cities, city location). */

export const CARTO_API_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim() ?? "";

/** CARTO raster dark tiles — require a free key from carto.com/basemaps/apikey. */
export function cartoDarkTileUrl(): string {
  const base =
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  return CARTO_API_KEY ? `${base}?key=${encodeURIComponent(CARTO_API_KEY)}` : base;
}

export const CARTO_ATTRIBUTION = "&copy; OpenStreetMap &copy; CARTO";

/** OpenFreeMap vector style — free, no registration or API key. */
export const OPENFREEMAP_DARK_STYLE =
  "https://tiles.openfreemap.org/styles/dark";

export const OPENFREEMAP_ATTRIBUTION =
  "&copy; OpenStreetMap &copy; OpenFreeMap";
