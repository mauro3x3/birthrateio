"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  layer: string;
  bounds: [number, number, number, number];
  minZoom: number;
  maxZoom: number;
  growthColor?: string;
  declineColor?: string;
  tilesPath?: string;
  className?: string;
};

const MAPLIBRE_JS = "/maplibre-gl.js";
const MAPLIBRE_CSS = "/maplibre-gl.css";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`,
    );
    if (existing) {
      if ((window as unknown as { maplibregl?: unknown }).maplibregl) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error(src)));
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function loadCss(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

type MapLibreGl = {
  Map: new (opts: Record<string, unknown>) => {
    on: (event: string, cb: (...args: unknown[]) => void) => void;
    addControl: (c: unknown, pos?: string) => void;
    fitBounds: (b: number[][], opts?: Record<string, unknown>) => void;
    remove: () => void;
  };
  NavigationControl: new (opts?: Record<string, unknown>) => unknown;
  setWorkerUrl?: (url: string) => void;
};

/**
 * GHSL-style population change: green growth / pink decline over a light basemap.
 * Vector tiles from /api/tiles/europe-popchange/{z}/{x}/{y}.
 */
export function PopulationChangeMap({
  layer,
  bounds,
  minZoom,
  maxZoom,
  growthColor = "#2f9e6b",
  declineColor = "#e45c8a",
  tilesPath = "/api/tiles/europe-popchange/{z}/{x}/{y}",
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    // CDN MapLibre instance — typed loosely on purpose
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any = null;

    void (async () => {
      try {
        loadCss(MAPLIBRE_CSS);
        await loadScript(MAPLIBRE_JS);
        if (cancelled) return;
        const maplibregl = (
          window as unknown as { maplibregl: MapLibreGl }
        ).maplibregl;
        maplibregl.setWorkerUrl?.(
          `${window.location.origin}/maplibre-gl-csp-worker.js`,
        );

        const midLon = (bounds[0] + bounds[2]) / 2;
        const midLat = (bounds[1] + bounds[3]) / 2;

        map = new maplibregl.Map({
          container: el,
          center: [midLon, midLat],
          zoom: 3.4,
          minZoom: 2,
          maxZoom: maxZoom + 1,
          attributionControl: { compact: true },
          style: {
            version: 8,
            sources: {
              basemap: {
                type: "raster",
                tiles: [
                  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
                ],
                tileSize: 256,
                attribution: "Tiles © Esri",
              },
              popchange: {
                type: "vector",
                tiles: [`${window.location.origin}${tilesPath}`],
                minzoom: minZoom,
                maxzoom: maxZoom,
              },
            },
            layers: [
              {
                id: "basemap",
                type: "raster",
                source: "basemap",
              },
              {
                id: "popchange-cells",
                type: "circle",
                source: "popchange",
                "source-layer": layer,
                paint: {
                  "circle-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    2,
                    0.55,
                    5,
                    1.1,
                    8,
                    1.8,
                    11,
                    2.6,
                  ],
                  "circle-color": [
                    "match",
                    ["get", "chg"],
                    1,
                    growthColor,
                    -1,
                    declineColor,
                    "#94a3b8",
                  ],
                  "circle-opacity": 0.92,
                  "circle-pitch-alignment": "map",
                },
              },
            ],
          },
        });

        map.on("load", () => {
          map.fitBounds(
            [
              [bounds[0], bounds[1]],
              [bounds[2], bounds[3]],
            ],
            { padding: 28, maxZoom: 4.2, duration: 0 },
          );
        });
        map.addControl(
          new maplibregl.NavigationControl({ showCompass: false }),
          "top-right",
        );
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [
    layer,
    bounds,
    minZoom,
    maxZoom,
    growthColor,
    declineColor,
    tilesPath,
  ]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={
          className ??
          "h-[min(75vh,720px)] w-full overflow-hidden rounded-sm bg-[#e8e8e8]"
        }
      />
      {error && (
        <p className="absolute inset-x-0 bottom-3 text-center text-sm text-red-700">
          Map failed to load: {error}
        </p>
      )}
    </div>
  );
}
