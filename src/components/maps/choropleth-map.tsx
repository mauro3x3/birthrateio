"use client";

import * as React from "react";
import { MapContainer, GeoJSON, ZoomControl, useMap } from "react-leaflet";
import type { Layer, PathOptions } from "leaflet";
import type { Feature, GeoJsonObject } from "geojson";
import { useRouter } from "next/navigation";
import { buildColorScale, type ScaleType } from "@/lib/color-scale";

// High-resolution Natural Earth 1:50m country polygons (smooth coastlines),
// with a low-res fallback. Country codes live in feature properties (ISO_A3 /
// ISO_A3_EH / ADM0_A3), resolved by `isoOf` below.
const GEOJSON_URL =
  "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_50m_admin_0_countries.geojson";
const GEOJSON_FALLBACK_URL =
  "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json";

let geoCache: GeoJsonObject | null = null;

/** Resolve a feature's ISO alpha-3, tolerating Natural Earth's "-99" gaps
 * (France/Norway carry the real code in ISO_A3_EH/ADM0_A3). */
function isoOf(feature?: Feature): string | undefined {
  const p = (feature?.properties ?? {}) as Record<string, unknown>;
  const candidates = [p.ISO_A3, p.ISO_A3_EH, p.ADM0_A3, feature?.id];
  for (const c of candidates) {
    const s = typeof c === "string" ? c.toUpperCase() : undefined;
    if (s && s.length === 3 && s !== "-99") return s;
  }
  return undefined;
}

export interface ChoroplethDatum {
  iso3: string;
  slug: string;
  name: string;
  value: number;
}

// Centered on populated latitudes; the poles (esp. Mercator-stretched
// Antarctica) are cropped via maxBounds for a cleaner frame.
const DEFAULT_CENTER: [number, number] = [30, 10];
const DEFAULT_ZOOM = 2.3;
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [-58, -169],
  [84, 191],
];

function FitBounds() {
  const map = useMap();
  React.useEffect(() => {
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    setTimeout(() => map.invalidateSize(), 50);
  }, [map]);
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
}: {
  data: ChoroplethDatum[];
  unit?: string;
  decimals?: number;
  scaleType?: ScaleType;
  mid?: number;
  domain?: { min: number; max: number };
  height?: number;
}) {
  const router = useRouter();
  const [geo, setGeo] = React.useState<GeoJsonObject | null>(geoCache);

  React.useEffect(() => {
    if (geoCache) return;
    let active = true;
    const load = async () => {
      for (const url of [GEOJSON_URL, GEOJSON_FALLBACK_URL]) {
        try {
          const json = await fetch(url).then((r) => r.json());
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

  // Continuous legend bar: sample the scale across its domain (so a diverging
  // mid-point bends the gradient where it actually is).
  const gradientCss = React.useMemo(() => {
    const steps = 24;
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
      return {
        fillColor: datum ? scale.color(datum.value) : "rgba(120,130,145,0.16)",
        // Mid-grey hairline reads crisp on both light and dark cards (Leaflet
        // can't resolve CSS variables in SVG stroke attributes).
        weight: 0.4,
        color: "rgba(120,132,150,0.5)",
        fillOpacity: 1,
        lineJoin: "round",
        lineCap: "round",
      };
    },
    [byIso, scale],
  );

  const onEach = React.useCallback(
    (feature: Feature, layer: Layer) => {
      const iso = isoOf(feature);
      const datum = iso ? byIso.get(iso) : undefined;
      const name =
        datum?.name ??
        (feature.properties as { name?: string })?.name ??
        "Unknown";
      const valueText =
        datum !== undefined
          ? `${datum.value.toLocaleString("en-US", {
              maximumFractionDigits: decimals,
            })}${unit ? ` ${unit}` : ""}`
          : "No data";
      layer.bindTooltip(
        `<strong>${name}</strong><br/>${valueText}`,
        { sticky: true, direction: "top" },
      );
      layer.on({
        mouseover: (e) => {
          const t = e.target as {
            setStyle: (s: PathOptions) => void;
            bringToFront?: () => void;
          };
          t.setStyle({
            weight: 1.8,
            color: "#ffffff",
            fillOpacity: 1,
          });
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
    [byIso, decimals, unit, router, style],
  );

  return (
    <div className="relative">
      {scale.legend.length > 0 && (
        <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-md border bg-card/85 px-2.5 py-2 shadow-sm backdrop-blur-sm">
          {unit && (
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {unit}
            </div>
          )}
          <div
            className="h-2 w-32 rounded-full"
            style={{ background: gradientCss }}
          />
          <div className="mt-1 flex w-32 justify-between text-[10px] tabular-nums text-muted-foreground">
            <span>{fmt(scale.min)}</span>
            {scale.mid !== undefined && <span>{fmt(scale.mid)}</span>}
            <span>{fmt(scale.max)}</span>
          </div>
        </div>
      )}
      <div
        className="overflow-hidden rounded-lg border"
        style={{ height }}
      >
        {geo ? (
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            zoomSnap={0.1}
            minZoom={1.5}
            maxZoom={6}
            maxBounds={MAX_BOUNDS}
            maxBoundsViscosity={0.8}
            scrollWheelZoom={false}
            worldCopyJump
            zoomControl={false}
            style={{ height: "100%", width: "100%" }}
            attributionControl={false}
          >
            <ZoomControl position="bottomright" />
            <FitBounds />
            <GeoJSON
              key={`${data.length}-${data[0]?.iso3 ?? ""}-${data[0]?.value ?? 0}`}
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
