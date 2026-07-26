"use client";

import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";

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
      className="overflow-hidden rounded-lg border"
      style={{ height }}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={9}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap &copy; CARTO"
        />
        <CircleMarker
          center={[lat, lng]}
          radius={10}
          pathOptions={{
            color: "hsl(221 83% 53%)",
            fillColor: "hsl(221 83% 53%)",
            fillOpacity: 0.6,
          }}
        >
          <Tooltip>{label}</Tooltip>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}
