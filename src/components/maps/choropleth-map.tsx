"use client";

import * as React from "react";
import { MapContainer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import type { Layer, PathOptions } from "leaflet";
import type { Feature, FeatureCollection, GeoJsonObject } from "geojson";
import { useRouter } from "next/navigation";
import { buildColorScale, type ScaleType } from "@/lib/color-scale";
import {
  MAP_OCEAN,
  countryBorderStyle,
  countryHoverBorder,
} from "@/lib/map-path-style";
import { cn } from "@/lib/utils";

// Natural Earth 1:50m — crisp enough for continental zoom without a 10MB hit.
const GEOJSON_URL =
  "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_50m_admin_0_countries.geojson";
const GEOJSON_FALLBACK_URL =
  "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json";

let geoCache: GeoJsonObject | null = null;

function isoOf(feature?: Feature): string | undefined {
  const p = (feature?.properties ?? {}) as Record<string, unknown>;
  const candidates = [p.ISO_A3, p.ISO_A3_EH, p.ADM0_A3, feature?.id];
  for (const c of candidates) {
    const s = typeof c === "string" ? c.toUpperCase() : undefined;
    if (s && s.length === 3 && s !== "-99") return s;
  }
  return undefined;
}

/** Drop Antarctica / tiny uninhabited scraps so the frame reads cleaner. */
function prepareGeo(raw: GeoJsonObject): GeoJsonObject {
  if (raw.type !== "FeatureCollection") return raw;
  const fc = raw as FeatureCollection;
  const features = fc.features.filter((f) => {
    const iso = isoOf(f);
    if (iso === "ATA") return false;
    const p = (f.properties ?? {}) as Record<string, unknown>;
    const name = String(p.NAME ?? p.name ?? p.ADMIN ?? "").toLowerCase();
    if (name.includes("antarctica")) return false;
    return true;
  });
  return { type: "FeatureCollection", features } as FeatureCollection;
}

export interface ChoroplethDatum {
  iso3: string;
  slug: string;
  name: string;
  value: number;
}

const DEFAULT_CENTER: [number, number] = [12, 12];
const DEFAULT_ZOOM = 1.55;
const CINEMA_CENTER: [number, number] = [8, 10];
const CINEMA_ZOOM = 1.85;
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [-55, -170],
  [78, 180],
];

function FitWorld({
  center,
  zoom,
  enabled,
}: {
  center: [number, number];
  zoom: number;
  enabled: boolean;
}) {
  const map = useMap();
  React.useEffect(() => {
    if (!enabled) return;
    map.flyTo(center, zoom, { duration: 0.8 });
    setTimeout(() => map.invalidateSize(), 100);
  }, [map, center, zoom, enabled]);
  return null;
}

/** Fly the viewport to the union of the given ISO3 country polygons. */
function FitToIso3s({
  geo,
  iso3s,
  clamp,
  camera,
}: {
  geo: GeoJsonObject | null;
  iso3s: string[];
  clamp?: { west: number; south: number; east: number; north: number } | null;
  camera?: { center: [number, number]; zoom: number } | null;
}) {
  const map = useMap();
  const key = iso3s.slice().sort().join(",");
  const clampKey = clamp
    ? `${clamp.west},${clamp.south},${clamp.east},${clamp.north}`
    : "";
  const cameraKey = camera
    ? `${camera.center[0]},${camera.center[1]},${camera.zoom}`
    : "";

  React.useEffect(() => {
    // Layout can be 0×0 on first paint (flex stage); invalidate then frame.
    const frame = () => {
      map.invalidateSize();

      // Clamp first — overseas polygons (France→Guiana) and WDI “Europe”
      // (Russia/Central Asia) must not dictate the frame.
      if (clamp) {
        map.fitBounds(
          L.latLngBounds(
            [clamp.south, clamp.west],
            [clamp.north, clamp.east],
          ),
          { padding: [20, 20], maxZoom: 6, animate: true },
        );
        return;
      }

      if (camera) {
        map.setView(camera.center, camera.zoom, { animate: true, duration: 0.85 });
        return;
      }

      if (!geo || geo.type !== "FeatureCollection" || iso3s.length === 0) return;

      const want = new Set(iso3s.map((s) => s.toUpperCase()));
      const bounds = L.latLngBounds([]);
      let hit = 0;
      for (const f of (geo as FeatureCollection).features) {
        const iso = isoOf(f);
        if (!iso || !want.has(iso) || !f.geometry) continue;
        try {
          const b = L.geoJSON(f).getBounds();
          if (b.isValid()) {
            bounds.extend(b);
            hit += 1;
          }
        } catch {
          /* skip bad geometry */
        }
      }
      if (hit === 0 || !bounds.isValid()) return;

      map.fitBounds(bounds, {
        padding: [28, 28],
        maxZoom: 6,
        animate: true,
      });
    };

    frame();
    const t = window.setTimeout(frame, 120);
    return () => window.clearTimeout(t);
  }, [map, geo, key, iso3s.length, clampKey, cameraKey]);

  return null;
}

export function ChoroplethMap({
  data,
  unit,
  decimals = 2,
  scaleType = "sequential",
  mid,
  domain,
  height = 480,
  variant = "default",
  hideLegend = false,
  /** When set, animate-zoom to these countries; empty / omit = world view. */
  focusIso3s,
  regionMaskIso3s,
  focusClamp,
  focusCamera,
}: {
  data: ChoroplethDatum[];
  unit?: string;
  decimals?: number;
  scaleType?: ScaleType;
  mid?: number;
  domain?: { min: number; max: number };
  height?: number;
  /** Immersive = borderless stage; cinema = dark Replacement Clock–like stage. */
  variant?: "default" | "immersive" | "cinema";
  hideLegend?: boolean;
  focusIso3s?: string[] | null;
  /** Countries that belong to the active region (may lack data this year). */
  regionMaskIso3s?: string[] | null;
  focusClamp?: { west: number; south: number; east: number; north: number } | null;
  focusCamera?: { center: [number, number]; zoom: number } | null;
}) {
  const router = useRouter();
  const [geo, setGeo] = React.useState<GeoJsonObject | null>(geoCache);
  const immersive = variant === "immersive" || variant === "cinema";
  const cinema = variant === "cinema";
  const focusing = Boolean(focusIso3s && focusIso3s.length > 0);
  const regionMask = React.useMemo(() => {
    if (!regionMaskIso3s?.length) return null;
    return new Set(regionMaskIso3s.map((s) => s.toUpperCase()));
  }, [regionMaskIso3s]);

  React.useEffect(() => {
    if (geoCache) return;
    let active = true;
    const load = async () => {
      for (const url of [GEOJSON_URL, GEOJSON_FALLBACK_URL]) {
        try {
          const json = prepareGeo(await fetch(url).then((r) => r.json()));
          geoCache = json;
          if (active) setGeo(json);
          return;
        } catch {
          /* try fallback */
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const byIso = React.useMemo(() => {
    const m = new Map<string, ChoroplethDatum>();
    for (const d of data) m.set(d.iso3.toUpperCase(), d);
    return m;
  }, [data]);

  const scale = React.useMemo(
    () => buildColorScale(data.map((d) => d.value), scaleType, mid, domain),
    [data, scaleType, mid, domain],
  );

  const gradientCss = React.useMemo(() => {
    const steps = 32;
    const stops: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const v = scale.min + (scale.max - scale.min) * t;
      stops.push(`${scale.color(v)} ${(t * 100).toFixed(0)}%`);
    }
    return `linear-gradient(to right, ${stops.join(", ")})`;
  }, [scale]);

  const fmt = React.useCallback(
    (v: number) =>
      v.toLocaleString("en-US", { maximumFractionDigits: decimals }),
    [decimals],
  );

  const style = React.useCallback(
    (feature?: Feature): PathOptions => {
      const iso = isoOf(feature);
      const datum = iso ? byIso.get(iso) : undefined;
      const inRegion = !regionMask || (iso ? regionMask.has(iso) : false);
      const borderKind = "cinema";
      const border = countryBorderStyle(borderKind);

      if (cinema) {
        if (!inRegion) {
          return {
            fillColor: MAP_OCEAN.cinema,
            fillOpacity: 1,
            stroke: false,
            weight: 0,
            opacity: 0,
          };
        }
        if (datum) {
          return {
            fillColor: scale.color(datum.value),
            fillOpacity: 1,
            ...border,
          };
        }
        return {
          fillColor: "#161616",
          fillOpacity: 1,
          ...border,
        };
      }

      const fill = datum
        ? scale.color(datum.value)
        : immersive
          ? "rgba(55, 62, 70, 0.14)"
          : "rgba(120, 130, 145, 0.14)";

      return {
        fillColor: fill,
        fillOpacity: 1,
        ...border,
      };
    },
    [byIso, cinema, immersive, scale, regionMask],
  );

  const onEach = React.useCallback(
    (feature: Feature, layer: Layer) => {
      const iso = isoOf(feature);
      const datum = iso ? byIso.get(iso) : undefined;
      const name =
        datum?.name ??
        (feature.properties as { NAME?: string; name?: string; ADMIN?: string })
          ?.NAME ??
        (feature.properties as { name?: string })?.name ??
        (feature.properties as { ADMIN?: string })?.ADMIN ??
        "Unknown";
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
          // Soft lift on hover — keep the dark seam language.
          t.setStyle(countryHoverBorder(cinema ? "cinema" : "light"));
          t.bringToFront?.();
        },
        mouseout: (e) => {
          (e.target as { setStyle: (s: PathOptions) => void }).setStyle(
            style(feature),
          );
        },
        click: () => {
          if (datum?.slug) router.push(`/country/${datum.slug}`);
        },
      });
    },
    [byIso, cinema, decimals, unit, router, style],
  );

  return (
    <div className="relative h-full">
      {scale.legend.length > 0 && !hideLegend && (
        <div
          className={cn(
            "pointer-events-none absolute z-[1000] px-3 py-2",
            cinema
              ? "bottom-3 left-3 rounded-sm bg-black/55 backdrop-blur-md"
              : immersive
                ? "bottom-3 left-3 rounded-sm bg-[hsl(40_30%_98%/0.92)] shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-md"
                : "left-3 top-3 rounded-md border bg-card/85 shadow-sm backdrop-blur-sm",
          )}
        >
          {unit && (
            <div
              className={cn(
                "mb-1.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
                cinema ? "text-white/45" : "text-muted-foreground",
              )}
            >
              {unit}
            </div>
          )}
          <div
            className="h-1.5 w-36 rounded-full"
            style={{ background: gradientCss }}
          />
          <div
            className={cn(
              "mt-1.5 flex w-36 justify-between text-[10px] tabular-nums",
              cinema ? "text-white/50" : "text-muted-foreground",
            )}
          >
            <span>{fmt(scale.min)}</span>
            {scale.mid !== undefined && (
              <span className={cinema ? "text-white/75" : "text-foreground/70"}>
                {fmt(scale.mid)}
              </span>
            )}
            <span>{fmt(scale.max)}</span>
          </div>
        </div>
      )}
      <div
        className={cn(
          "overflow-hidden",
          immersive ? "rounded-none border-0" : "rounded-lg border",
        )}
        style={{
          height,
          background: cinema
            ? MAP_OCEAN.cinema
            : immersive
              ? MAP_OCEAN.soft
              : "hsl(var(--map-ocean))",
        }}
      >
        {geo ? (
          <MapContainer
            key={cinema ? "cinema" : immersive ? "immersive" : "default"}
            center={cinema ? CINEMA_CENTER : DEFAULT_CENTER}
            zoom={cinema ? CINEMA_ZOOM : DEFAULT_ZOOM}
            zoomSnap={0.05}
            minZoom={1.2}
            maxZoom={6}
            maxBounds={MAX_BOUNDS}
            maxBoundsViscosity={1}
            scrollWheelZoom={focusing}
            dragging={focusing || !immersive}
            doubleClickZoom={false}
            boxZoom={false}
            keyboard={false}
            worldCopyJump={!cinema}
            zoomControl={false}
            className={cinema ? "br-cinema-map" : undefined}
            style={{ height: "100%", width: "100%", background: "transparent" }}
            attributionControl={false}
          >
            {focusing ? (
              <FitToIso3s
                geo={geo}
                iso3s={focusIso3s ?? []}
                clamp={focusClamp}
                camera={focusCamera}
              />
            ) : (
              <FitWorld
                center={cinema ? CINEMA_CENTER : DEFAULT_CENTER}
                zoom={cinema ? CINEMA_ZOOM : DEFAULT_ZOOM}
                enabled
              />
            )}
            <GeoJSON
              key={`${variant}-${data.length}-${data[0]?.iso3 ?? ""}-${data[Math.floor(data.length / 2)]?.value ?? 0}-${regionMask?.size ?? 0}-${hideLegend}`}
              data={geo}
              style={style as never}
              onEachFeature={onEach as never}
            />
          </MapContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading map…
          </div>
        )}
      </div>
    </div>
  );
}
