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
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap &copy; CARTO"
        />
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
