"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
import { formatCompact } from "@/lib/utils";

export type CityMapPoint = {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  population: number;
  country: string;
};

function FitPoints({ points }: { points: CityMapPoint[] }) {
  const map = useMap();
  React.useEffect(() => {
    if (points.length === 0) return;
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 4 });
    const t = setTimeout(() => map.invalidateSize(), 60);
    return () => clearTimeout(t);
  }, [map, points]);
  return null;
}

function radiusFor(pop: number, maxPop: number) {
  const t = Math.sqrt(pop / maxPop);
  return 4 + t * 18;
}

export function CitiesWorldMapInner({
  points,
  highlightedSlug,
  onHover,
  height = 440,
}: {
  points: CityMapPoint[];
  highlightedSlug?: string | null;
  onHover?: (slug: string | null) => void;
  height?: number;
}) {
  const router = useRouter();
  const maxPop = Math.max(...points.map((p) => p.population), 1);

  return (
    <div className="overflow-hidden" style={{ height }}>
      <MapContainer
        center={[20, 10]}
        zoom={2}
        scrollWheelZoom={false}
        className="br-cinema-map"
        style={{ height: "100%", width: "100%", background: "#0a0a0a" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap &copy; CARTO"
        />
        <FitPoints points={points} />
        {points.map((p) => {
          const active = highlightedSlug === p.slug;
          return (
            <CircleMarker
              key={p.slug}
              center={[p.lat, p.lng]}
              radius={radiusFor(p.population, maxPop) * (active ? 1.15 : 1)}
              eventHandlers={{
                click: () => router.push(`/city/${p.slug}`),
                mouseover: () => onHover?.(p.slug),
                mouseout: () => onHover?.(null),
              }}
              pathOptions={{
                color: active ? "#f0d5a8" : "#c49660",
                fillColor: active ? "#e8b86d" : "#c49660",
                fillOpacity: active ? 0.95 : 0.72,
                weight: active ? 2 : 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -4]}>
                <span className="font-medium">{p.name}</span>
                <span className="opacity-70"> · {p.country}</span>
                <br />
                <span className="tabular-nums">
                  {formatCompact(p.population)} metro
                </span>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
