/** Shared dark basemap config for Leaflet point maps (cities, city location). */

export const CARTO_API_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim() ?? "";

/** CARTO raster dark tiles — require a free key from carto.com/basemaps/apikey. */
export function cartoDarkTileUrl(): string {
  const base =
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  return CARTO_API_KEY ? `${base}?key=${encodeURIComponent(CARTO_API_KEY)}` : base;
}

export const CARTO_ATTRIBUTION = "&copy; OpenStreetMap &copy; CARTO";

/** Esri dark canvas — free raster tiles, no API key. */
export const ESRI_DARK_GRAY_BASE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";

export const ESRI_DARK_GRAY_REFERENCE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

export const ESRI_ATTRIBUTION = "Tiles &copy; Esri";
