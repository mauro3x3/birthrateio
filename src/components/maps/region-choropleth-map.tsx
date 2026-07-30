"use client";

import * as React from "react";
import { MapContainer, GeoJSON, ZoomControl, useMap } from "react-leaflet";
import type { Layer, PathOptions } from "leaflet";
import type { Feature, GeoJsonObject } from "geojson";
import { useRouter } from "next/navigation";

export type RegionChoroplethDatum = {
  id: string;
  slug: string;
  name: string;
  value: number;
};

function FitUsa() {
  const map = useMap();
  React.useEffect(() => {
    // Contiguous US framing (Alaska/Hawaii still in the layer, slightly off-frame).
    map.setView([39.5, -98.5], 4);
    setTimeout(() => map.invalidateSize(), 50);
  }, [map]);
  return null;
}

export function RegionChoroplethMap({
  geoUrl,
  data,
  colorFor,
  unit = "%",
  decimals = 1,
  height = 560,
  hrefPrefix = "/state",
  revision,
}: {
  geoUrl: string;
  data: RegionChoroplethDatum[];
  colorFor: (value: number) => string;
  unit?: string;
  decimals?: number;
  height?: number;
  hrefPrefix?: string;
  /** Change when the metric changes so Leaflet restyles polygons. */
  revision?: string;
}) {
  const router = useRouter();
  const [geo, setGeo] = React.useState<GeoJsonObject | null>(null);

  React.useEffect(() => {
    let active = true;
    fetch(geoUrl)
      .then((r) => r.json())
      .then((json) => {
        if (active) setGeo(json);
      })
      .catch(() => {
        if (active) setGeo(null);
      });
    return () => {
      active = false;
    };
  }, [geoUrl]);

  const byId = React.useMemo(() => {
    const m = new Map<string, RegionChoroplethDatum>();
    for (const d of data) m.set(d.id, d);
    return m;
  }, [data]);

  const featureId = React.useCallback((feature?: Feature): string | undefined => {
    if (!feature) return undefined;
    if (feature.id != null) return String(feature.id).padStart(2, "0");
    const p = (feature.properties ?? {}) as Record<string, unknown>;
    const fp = p.STATEFP ?? p.statefp ?? p.fips ?? p.GEOID;
    if (fp != null) return String(fp).padStart(2, "0");
    return undefined;
  }, []);

  const style = React.useCallback(
    (feature?: Feature): PathOptions => {
      const id = featureId(feature);
      const datum = id ? byId.get(id) : undefined;
      return {
        fillColor: datum ? colorFor(datum.value) : "rgba(120,130,145,0.16)",
        weight: 0.7,
        color: "rgba(40,50,60,0.55)",
        fillOpacity: 1,
        lineJoin: "round",
        lineCap: "round",
      };
    },
    [byId, colorFor, featureId],
  );

  const onEach = React.useCallback(
    (feature: Feature, layer: Layer) => {
      const id = featureId(feature);
      const datum = id ? byId.get(id) : undefined;
      const name =
        datum?.name ??
        ((feature.properties as { name?: string } | null)?.name ?? "Unknown");
      const valueText =
        datum !== undefined
          ? `${datum.value.toLocaleString("en-US", {
              maximumFractionDigits: decimals,
              minimumFractionDigits: decimals,
            })}${unit ? ` ${unit}` : ""}`
          : "No data";
      layer.bindTooltip(`<strong>${name}</strong><br/>${valueText}`, {
        sticky: true,
        direction: "top",
      });
      layer.on({
        mouseover: (e) => {
          const t = e.target as {
            setStyle: (s: PathOptions) => void;
            bringToFront?: () => void;
          };
          t.setStyle({ weight: 2, color: "#111", fillOpacity: 1 });
          t.bringToFront?.();
        },
        mouseout: (e) => {
          (e.target as { setStyle: (s: PathOptions) => void }).setStyle(
            style(feature),
          );
        },
        click: () => {
          if (datum?.slug) router.push(`${hrefPrefix}/${datum.slug}`);
        },
      });
    },
    [byId, decimals, featureId, hrefPrefix, router, style, unit],
  );

  return (
    <div className="overflow-hidden rounded-sm border bg-[#f4f7f4]" style={{ height }}>
      {geo ? (
        <MapContainer
          center={[39.5, -98.5]}
          zoom={4}
          zoomSnap={0.25}
          minZoom={3}
          maxZoom={8}
          scrollWheelZoom
          zoomControl={false}
          style={{ height: "100%", width: "100%", background: "#e8eee8" }}
        >
          <FitUsa />
          <ZoomControl position="topleft" />
          <GeoJSON
            key={revision ?? "regions"}
            data={geo}
            style={style}
            onEachFeature={onEach}
          />
        </MapContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Loading map…
        </div>
      )}
    </div>
  );
}
