"use client";

import * as React from "react";
import { TileLayer } from "react-leaflet";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  CARTO_API_KEY,
  CARTO_ATTRIBUTION,
  OPENFREEMAP_ATTRIBUTION,
  OPENFREEMAP_DARK_STYLE,
  cartoDarkTileUrl,
} from "@/lib/map-tiles";

/** OpenFreeMap vector basemap — loaded only when CARTO key is absent. */
function OpenFreeMapBasemap() {
  const map = useMap();

  React.useEffect(() => {
    let layer: L.Layer | null = null;
    let cancelled = false;

    void (async () => {
      await import("maplibre-gl");
      await import("@maplibre/maplibre-gl-leaflet");
      if (cancelled) return;

      const glLayer = (
        L as typeof L & {
          maplibreGL: (options: {
            style: string;
            attribution?: string;
          }) => L.Layer;
        }
      ).maplibreGL({
        style: OPENFREEMAP_DARK_STYLE,
        attribution: OPENFREEMAP_ATTRIBUTION,
      });
      glLayer.addTo(map);
      layer = glLayer;
    })();

    return () => {
      cancelled = true;
      if (layer) map.removeLayer(layer);
    };
  }, [map]);

  return null;
}

/** Dark basemap for Leaflet maps — CARTO when keyed, otherwise OpenFreeMap. */
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

  return <OpenFreeMapBasemap />;
}
