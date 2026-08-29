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

/**
 * Thin / hide contrasting polygon seams when zoomed out so dense areas
 * (London MSOAs) don’t wash out. Always keep a fill-matched stroke so
 * anti-aliased gaps don’t show the ocean as a black/white spiderweb.
 */
function AdaptiveStrokeSync({
  layerRef,
  cinema,
  enabled,
}: {
  layerRef: React.MutableRefObject<L.GeoJSON | null>;
  cinema: boolean;
  enabled: boolean;
}) {
  const map = useMap();

  const apply = React.useCallback(() => {
    const layer = layerRef.current;
    if (!layer || !enabled) return;
    const z = map.getZoom();
    layer.eachLayer((l) => {
      const path = l as L.Path & {
        feature?: Feature;
        options: PathOptions;
      };
      if (!path.setStyle) return;
      const fill =
        typeof path.options.fillColor === "string" && path.options.fillColor
          ? path.options.fillColor
          : cinema
            ? "#161616"
            : "#cfd6de";

      // National / regional: fill-matched stroke seals anti-alias gaps
      // (ocean peeking through as a white/black spiderweb).
      if (z < 10.25) {
        path.setStyle({
          stroke: true,
          weight: 2.75,
          opacity: 1,
          color: fill,
          lineJoin: "round",
          lineCap: "round",
        });
        return;
      }
      // Borough / city: light seams on top of a thin seal.
      if (z < 11.5) {
        path.setStyle({
          stroke: true,
          weight: 0.55,
          opacity: 1,
          color: cinema ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.65)",
          lineJoin: "round",
          lineCap: "round",
        });
        return;
      }
      path.setStyle({
        stroke: true,
        weight: 0.75,
        opacity: 1,
        color: cinema ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.85)",
        lineJoin: "round",
        lineCap: "round",
      });
    });
  }, [cinema, enabled, layerRef, map]);

  React.useEffect(() => {
    if (!enabled) return;
    apply();
    map.on("zoomend", apply);
    map.on("br:restyle-borders", apply);
    // Dense GeoJSON (7k MSOAs) mounts async — retry a few times.
    const timers = [60, 200, 500, 1200].map((ms) =>
      window.setTimeout(apply, ms),
    );
    return () => {
      map.off("zoomend", apply);
      map.off("br:restyle-borders", apply);
      for (const t of timers) window.clearTimeout(t);
    };
  }, [apply, enabled, map]);

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
const DEFAULT_FIT_PADDING: [number, number] = [28, 28];

function FitGeo({
  geo,
  maxZoom = 5.5,
  padding = DEFAULT_FIT_PADDING,
  paddingTopLeft,
  paddingBottomRight,
}: {
  geo: GeoJsonObject;
  maxZoom?: number;
  padding?: [number, number];
  paddingTopLeft?: [number, number];
  paddingBottomRight?: [number, number];
}) {
  const map = useMap();
  const padY = paddingTopLeft?.[0] ?? paddingBottomRight?.[0] ?? padding[0];
  const padXLeft = paddingTopLeft?.[1] ?? padding[1];
  const padXRight = paddingBottomRight?.[1] ?? padding[1];
  const padBottom = paddingBottomRight?.[0] ?? padding[0];

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
        map.fitBounds(b, {
          maxZoom,
          paddingTopLeft: [padY, padXLeft],
          paddingBottomRight: [padBottom, padXRight],
        });
      }
    } catch {
      /* ignore */
    }
    setTimeout(() => map.invalidateSize(), 60);
  }, [map, geo, maxZoom, padY, padXLeft, padXRight, padBottom]);
  return null;
}

export function RegionChoroplethMap({
  geoUrl,
  data,
  colorFor,
  unit = "",
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
  /** Override legend header (defaults from unit). */
  legendTitle,
  /** Custom value formatter for tooltips (defaults to locale + unit). */
  formatValue,
  /** Only render / fit these feature ids (e.g. MSOAs inside one LAD). */
  filterIds,
  /**
   * Hide/thin borders at low zoom so dense neighbourhood layers don’t
   * wash out as white city blobs (UK MSOA national view).
   */
  adaptiveStroke = false,
  fitPadding,
  fitPaddingTopLeft,
  fitPaddingBottomRight,
  legendPlacement = "bottom-left",
  preferCanvas = false,
  oceanColor,
  className,
}: {
  geoUrl: string;
  data: RegionChoroplethDatum[];
  colorFor: (value: number) => string;
  unit?: string;
  decimals?: number;
  height?: number | string;
  hrefPrefix?: string;
  revision?: string;
  variant?: "light" | "cinema";
  legend?: { label: string; color: string }[];
  fit?: "bounds" | "usa";
  fitMaxZoom?: number;
  navigate?: boolean;
  legendTitle?: string;
  formatValue?: (value: number) => string;
  filterIds?: string[] | null;
  adaptiveStroke?: boolean;
  /** Uniform fitBounds padding [y, x] in px. */
  fitPadding?: [number, number];
  /** Asymmetric fitBounds padding when a floating panel covers part of the map. */
  fitPaddingTopLeft?: [number, number];
  fitPaddingBottomRight?: [number, number];
  legendPlacement?: "bottom-left" | "bottom-right";
  /** Canvas renderer — cleaner dense choropleths (UK MSOA). */
  preferCanvas?: boolean;
  /** Override stage / ocean background. */
  oceanColor?: string;
  className?: string;
}) {
  const router = useRouter();
  const [geo, setGeo] = React.useState<GeoJsonObject | null>(null);
  const geoJsonRef = React.useRef<L.GeoJSON | null>(null);
  const cinema = variant === "cinema";
  const border = countryBorderStyle(cinema ? "cinema" : "light");
  const ocean =
    oceanColor ?? (cinema ? MAP_OCEAN.cinema : MAP_OCEAN.light);

  React.useEffect(() => {
    let active = true;
    setGeo(null);
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

  const filterSet = React.useMemo(() => {
    if (!filterIds?.length) return null;
    return new Set(filterIds);
  }, [filterIds]);

  const displayGeo = React.useMemo(() => {
    if (!geo || !filterSet) return geo;
    const fc = geo as FeatureCollection;
    if (!Array.isArray(fc.features)) return geo;
    return {
      type: "FeatureCollection",
      features: fc.features.filter((f) => {
        const p = (f.properties ?? {}) as Record<string, unknown>;
        const id =
          (typeof p.code === "string" && p.code) ||
          (typeof p.id === "string" && p.id) ||
          (typeof p.MSOA21CD === "string" && p.MSOA21CD) ||
          (typeof p.LAD22CD === "string" && p.LAD22CD) ||
          (f.id != null ? String(f.id) : "");
        return id ? filterSet.has(id) : false;
      }),
    } as FeatureCollection;
  }, [geo, filterSet]);

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
    const code =
      p.code ??
      p.MSOA21CD ??
      p.msoa21cd ??
      p.LAD22CD ??
      p.lad22cd ??
      p.GEOID ??
      p.geoid ??
      p.id;
    if (typeof code === "string" && code.length > 2) return code;
    if (typeof code === "number") return String(code);
    if (feature.id != null && String(feature.id).length > 2) {
      const id = String(feature.id);
      if (id.includes("-") || /^[A-Z]\d/.test(id)) return id;
    }
    if (feature.id != null) return String(feature.id).padStart(2, "0");
    const fp = p.STATEFP ?? p.statefp ?? p.fips;
    if (fp != null) return String(fp).padStart(2, "0");
    return undefined;
  }, []);

  const style = React.useCallback(
    (feature?: Feature): PathOptions => {
      const id = featureId(feature);
      const datum = id ? byId.get(id) : undefined;
      const fillColor = datum
        ? colorFor(datum.value)
        : cinema
          ? "#161616"
          : "rgba(120, 130, 145, 0.22)";
      return {
        fillColor,
        fillOpacity: 1,
        ...border,
        // Dense layers: start with fill-matched stroke to seal SVG gaps;
        // AdaptiveStrokeSync then tunes seams by zoom.
        ...(adaptiveStroke
          ? {
              stroke: true,
              weight: 2.75,
              opacity: 1,
              color: fillColor,
              lineJoin: "round" as const,
              lineCap: "round" as const,
            }
          : null),
      };
    },
    [adaptiveStroke, byId, border, cinema, colorFor, featureId],
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
          ? formatValue
            ? formatValue(datum.value)
            : `${datum.value.toLocaleString("en-US", {
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
          const t = e.target as {
            setStyle: (s: PathOptions) => void;
            _map?: L.Map;
          };
          t.setStyle(style(feature));
          // Re-apply zoom-based seam weight after hover resets style.
          t._map?.fire("br:restyle-borders");
        },
        click: () => {
          if (!navigate || !datum?.slug) return;
          router.push(`${hrefPrefix}/${datum.slug}`);
        },
      });
    },
    [
      byId,
      cinema,
      decimals,
      featureId,
      formatValue,
      hrefPrefix,
      navigate,
      router,
      style,
      unit,
    ],
  );

  const center: [number, number] = fit === "usa" ? [39.8, -98.5] : [20, 0];
  const zoom = fit === "usa" ? 4.15 : 2;
  const filterKey = filterSet ? [...filterSet].sort().join(",") : "all";

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        cinema
          ? "rounded-none border-0 bg-black"
          : "rounded-none border border-border bg-card",
        className,
      )}
      style={{ height }}
    >
      {displayGeo ? (
        <MapContainer
          key={`${geoUrl}-${revision ?? "x"}-${filterKey}-${preferCanvas ? "c" : "s"}`}
          center={center}
          zoom={zoom}
          zoomSnap={0.25}
          minZoom={1}
          maxZoom={Math.max(12, Math.ceil(fitMaxZoom + 2))}
          scrollWheelZoom
          zoomControl={false}
          preferCanvas={false}
          className={cinema ? "br-cinema-map" : adaptiveStroke ? "br-dense-choropleth" : undefined}
          style={{ height: "100%", width: "100%", background: ocean }}
        >
          {fit === "usa" ? (
            <FitUsaContiguous />
          ) : (
            <FitGeo
              geo={displayGeo}
              maxZoom={fitMaxZoom}
              padding={fitPadding}
              paddingTopLeft={fitPaddingTopLeft}
              paddingBottomRight={fitPaddingBottomRight}
            />
          )}
          <AdaptiveStrokeSync
            layerRef={geoJsonRef}
            cinema={cinema}
            enabled={adaptiveStroke}
          />
          <ZoomControl position="bottomright" />
          <GeoJSON
            key={`${revision ?? "regions"}-${filterKey}`}
            ref={(instance) => {
              geoJsonRef.current = instance;
            }}
            data={displayGeo as FeatureCollection}
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
            "pointer-events-none absolute bottom-3 z-[1000] rounded-md px-3 py-2.5 shadow-sm backdrop-blur-md",
            legendPlacement === "bottom-right" ? "right-3" : "left-3",
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
            {legendTitle ??
              (unit === "%" ? "Percent of population" : unit || "Value")}
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
