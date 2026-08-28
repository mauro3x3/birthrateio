"use client";

import { TileLayer } from "react-leaflet";
import {
  CARTO_API_KEY,
  CARTO_ATTRIBUTION,
  ESRI_ATTRIBUTION,
  ESRI_DARK_GRAY_BASE,
  ESRI_DARK_GRAY_REFERENCE,
  cartoDarkTileUrl,
} from "@/lib/map-tiles";

/** Dark basemap for Leaflet maps — CARTO when keyed, otherwise Esri dark canvas. */
export function DarkBasemapLayer() {
  if (CARTO_API_KEY) {
    return (
      <TileLayer
        url={cartoDarkTileUrl()}
        attribution={CARTO_ATTRIBUTION}
        subdomains="abcd"
        maxZoom={20}
      />
    );
  }

  return (
    <>
      <TileLayer
        url={ESRI_DARK_GRAY_BASE}
        attribution={ESRI_ATTRIBUTION}
        maxZoom={16}
      />
      <TileLayer url={ESRI_DARK_GRAY_REFERENCE} maxZoom={16} />
    </>
  );
}
