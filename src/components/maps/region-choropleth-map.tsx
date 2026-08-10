"use client";

import * as React from "react";
import { MapContainer, GeoJSON, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import type { Layer, PathOptions } from "leaflet";
import type { Feature, FeatureCollection, GeoJsonObject } from "geojson";
import { useRouter } from "next/navigation";
import {
  MAP_OCEAN,
  countryBorderStyle,
  countryHoverBorder,
} from "@/lib/map-path-style";
import { cn } from "@/lib/utils";

export type RegionChoroplethDatum = {
  id: string;
  slug: string;
  name: string;
  value: number;
};

function FitUsaContiguous() {
  const map = useMap();
  React.useEffect(() => {
    map.setView([39.8, -98.5], 4.15);
    setTimeout(() => map.invalidateSize(), 60);
  }, [map]);
  return null;
}

/** Walk ring/polygon/multi coordinates → [lng, lat] pairs. */
function collectLngLats(geo: GeoJsonObject): [number, number][] {
  const out: [number, number][] = [];
  const walk = (c: unknown): void => {
    if (!Array.isArray(c) || c.length === 0) return;
    if (typeof c[0] === "number" && typeof c[1] === "number") {
      out.push([c[0] as number, c[1] as number]);
      return;
    }
    for (const x of c) walk(x);
  };
  const fc = geo as FeatureCollection;
  if (Array.isArray(fc.features)) {
    for (const f of fc.features) {
      const g = f.geometry as { coordinates?: unknown } | null;
      if (g?.coordinates) walk(g.coordinates);
    }
    return out;
  }
  const g = geo as { coordinates?: unknown };
  if (g.coordinates) walk(g.coordinates);
  return out;
}

function shiftNegativeLngs(coords: unknown): unknown {
  if (!Array.isArray(coords) || coords.length === 0) return coords;
  if (typeof coords[0] === "number" && typeof coords[1] === "number") {
    const lng = coords[0] as number;
    return [lng < 0 ? lng + 360 : lng, coords[1]];
  }
  return coords.map(shiftNegativeLngs);
}

/**
 * Russia (and similar) GeoJSON often stores the Far East as lng ∈ [-180, 0],
 * which makes Leaflet bounds span the whole globe. Shift those longitudes into
 * [0, 360) so the layer draws continuously east of Siberia.
 */
function normalizeAntimeridianGeo(geo: GeoJsonObject): GeoJsonObject {
  const coords = collectLngLats(geo);
  if (coords.length === 0) return geo;
  let minLng = 180;
  let maxLng = -180;
  for (const [lng] of coords) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }
  if (maxLng - minLng <= 180) return geo;

  const fc = geo as FeatureCollection;
  if (!Array.isArray(fc.features)) return geo;

  const next: FeatureCollection = {
    type: "FeatureCollection",
    features: fc.features.map((f) => {
      if (!f.geometry || !("coordinates" in f.geometry)) return f;
      const geometry = f.geometry as {
        type: string;
        coordinates: unknown;
      };
      return {
        ...f,
        geometry: {
          ...geometry,
          coordinates: shiftNegativeLngs(geometry.coordinates),
        },
      } as Feature;
    }),
  };
  return next;
}

/**
 * Fit to geo bounds. When a layer crosses the antimeridian (e.g. Russia /
 * Chukotka), Leaflet's native getBounds() spans ~360° of longitude and the
 * map looks empty — shift western longitudes by +360° for framing only.
 */
function FitGeo({
  geo,
  maxZoom = 5.5,
}: {
  geo: GeoJsonObject;
  maxZoom?: number;
}) {
  const map = useMap();
  React.useEffect(() => {
    try {
      const coords = collectLngLats(geo);
      if (coords.length === 0) return;

      let minLat = 90;
      let maxLat = -90;
      let minLng = 180;
      let maxLng = -180;
      for (const [lng, lat] of coords) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      }

      const b = L.latLngBounds(
        L.latLng(minLat, minLng),
        L.latLng(maxLat, maxLng),
      );
      if (b.isValid()) {
        map.fitBounds(b, { padding: [28, 28], maxZoom });
      }
    } catch {
      /* ignore */
    }
    setTimeout(() => map.invalidateSize(), 60);
  }, [map, geo, maxZoom]);
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
  variant = "light",
  legend,
  /** "bounds" fits the geo layer; "usa" frames the contiguous US. */
  fit = "bounds",
  /** Max zoom when fitting to geo bounds (city layers need higher). */
  fitMaxZoom = 5.5,
  /** When false, polygons are not clickable for navigation. */
  navigate = true,
}: {
  geoUrl: string;
  data: RegionChoroplethDatum[];
  colorFor: (value: number) => string;
  unit?: string;
  decimals?: number;
  height?: number;
  hrefPrefix?: string;
  revision?: string;
  variant?: "light" | "cinema";
  legend?: { label: string; color: string }[];
  fit?: "bounds" | "usa";
  fitMaxZoom?: number;
  navigate?: boolean;
}) {
  const router = useRouter();
  const [geo, setGeo] = React.useState<GeoJsonObject | null>(null);
  const cinema = variant === "cinema";
  const border = countryBorderStyle(cinema ? "cinema" : "light");
  const ocean = cinema ? MAP_OCEAN.cinema : MAP_OCEAN.light;

  React.useEffect(() => {
    let active = true;
    fetch(geoUrl)
      .then((r) => r.json())
      .then((json) => {
        if (active) setGeo(normalizeAntimeridianGeo(json as GeoJsonObject));
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
    for (const d of data) {
      m.set(d.id, d);
      m.set(d.slug, d);
    }
    return m;
  }, [data]);

  const featureId = React.useCallback((feature?: Feature): string | undefined => {
    if (!feature) return undefined;
    const p = (feature.properties ?? {}) as Record<string, unknown>;
    if (typeof p.slug === "string" && p.slug) return p.slug;
    if (feature.id != null && String(feature.id).length > 2) {
      // Prefer slug-like ids over zero-padded FIPS
      const id = String(feature.id);
      if (id.includes("-")) return id;
    }
    if (feature.id != null) return String(feature.id).padStart(2, "0");
    const fp = p.STATEFP ?? p.statefp ?? p.fips ?? p.GEOID;
    if (fp != null) return String(fp).padStart(2, "0");
    return undefined;
  }, []);

  const style = React.useCallback(
    (feature?: Feature): PathOptions => {
      const id = featureId(feature);
      const datum = id ? byId.get(id) : undefined;
      return {
        fillColor: datum
          ? colorFor(datum.value)
          : cinema
            ? "#161616"
            : "rgba(120, 130, 145, 0.2)",
        fillOpacity: 1,
        ...border,
      };
    },
    [byId, border, cinema, colorFor, featureId],
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
              minimumFractionDigits: Math.min(decimals, 1),
            })}${unit ? ` ${unit}` : ""}`
          : "No data";
      layer.bindTooltip(
        `<div class="br-map-tip"><span class="br-map-tip-name">${name}</span><span class="br-map-tip-val">${valueText}</span></div>`,
        { sticky: true, direction: "top", opacity: 1, className: "br-map-tooltip" },
      );
      layer.on({
        mouseover: (e) => {
          const t = e.target as {
            setStyle: (s: PathOptions) => void;
            bringToFront?: () => void;
          };
          t.setStyle(countryHoverBorder(cinema ? "cinema" : "light"));
          t.bringToFront?.();
        },
        mouseout: (e) => {
          (e.target as { setStyle: (s: PathOptions) => void }).setStyle(
            style(feature),
          );
        },
        click: () => {
          if (!navigate || !datum?.slug) return;
          router.push(`${hrefPrefix}/${datum.slug}`);
        },
      });
    },
    [byId, cinema, decimals, featureId, hrefPrefix, navigate, router, style, unit],
  );

  const center: [number, number] = fit === "usa" ? [39.8, -98.5] : [20, 0];
  const zoom = fit === "usa" ? 4.15 : 2;

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        cinema
          ? "rounded-none border border-white/10 bg-black"
          : "rounded-none border border-border bg-card",
      )}
      style={{ height }}
    >
      {geo ? (
        <MapContainer
          key={`${geoUrl}-${revision ?? "x"}`}
          center={center}
          zoom={zoom}
          zoomSnap={0.25}
          minZoom={1}
          maxZoom={Math.max(8, Math.ceil(fitMaxZoom + 2))}
          scrollWheelZoom
          zoomControl={false}
          className={cinema ? "br-cinema-map" : undefined}
          style={{ height: "100%", width: "100%", background: ocean }}
        >
          {fit === "usa" ? (
            <FitUsaContiguous />
          ) : (
            <FitGeo geo={geo} maxZoom={fitMaxZoom} />
          )}
          <ZoomControl position="bottomright" />
          <GeoJSON
            key={revision ?? "regions"}
            data={geo as FeatureCollection}
            style={style}
            onEachFeature={onEach}
          />
        </MapContainer>
      ) : (
        <div
          className={cn(
            "flex h-full items-center justify-center text-sm",
            cinema ? "bg-black text-white/30" : "bg-muted/30 text-muted-foreground",
          )}
        >
          Loading map…
        </div>
      )}

      {legend && legend.length > 0 && (
        <div
          className={cn(
            "pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-md px-3 py-2.5 shadow-sm backdrop-blur-md",
            cinema
              ? "bg-black/55 text-white/70"
              : "border bg-white/95 text-muted-foreground",
          )}
        >
          <p
            className={cn(
              "mb-2 text-[10px] font-semibold uppercase tracking-[0.12em]",
              cinema ? "text-white/45" : "text-muted-foreground",
            )}
          >
            {unit === "%" ? "Percent of population" : unit || "Value"}
          </p>
          <ul className="space-y-1">
            {legend.map((bin) => (
              <li key={bin.label} className="flex items-center gap-2 text-[11px]">
                <span
                  className="h-3 w-3 shrink-0 rounded-sm border border-black/10"
                  style={{ background: bin.color }}
                />
                <span className={cinema ? "text-white/70" : "text-foreground/80"}>
                  {bin.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
