"use client";

import { MapContainer, CircleMarker, Tooltip } from "react-leaflet";
import { DarkBasemapLayer } from "@/components/maps/dark-basemap-layer";

export function PointMapInner({
  lat,
  lng,
  label,
  height = 256,
}: {
  lat: number;
  lng: number;
  label: string;
  height?: number;
}) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-white/10"
      style={{ height }}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={9}
        scrollWheelZoom={false}
        className="br-cinema-map"
        style={{ height: "100%", width: "100%", background: "#0a0a0a" }}
      >
        <DarkBasemapLayer />
        <CircleMarker
          center={[lat, lng]}
          radius={10}
          pathOptions={{
            color: "#c49660",
            fillColor: "#c49660",
            fillOpacity: 0.75,
            weight: 1.5,
          }}
        >
          <Tooltip>{label}</Tooltip>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}
