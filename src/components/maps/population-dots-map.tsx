"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  url: string;
  layer: string;
  bounds: [number, number, number, number];
  minZoom: number;
  maxZoom: number;
  className?: string;
};

const MAPLIBRE_JS = "/maplibre-gl.js";
const MAPLIBRE_CSS = "/maplibre-gl.css";
const MAPLIBRE_WORKER = "/maplibre-gl-csp-worker.js";

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
 * Population dots via /api/tiles/india-pop/{z}/{x}/{y}.
 * Uses MapLibre 4 from CDN so the worker loads correctly under Next.js.
 */
export function PopulationDotsMap({
  layer,
  bounds,
  minZoom,
  maxZoom,
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

        map = new maplibregl.Map({
          container: el,
          center: [78.9, 22.5],
          zoom: 4.5,
          minZoom: 2,
          maxZoom: maxZoom + 1,
          attributionControl: { compact: true },
          style: {
            version: 8,
            sources: {
              basemap: {
                type: "raster",
                tiles: [
                  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
                ],
                tileSize: 256,
                attribution: "Tiles © Esri",
              },
              population: {
                type: "vector",
                tiles: [
                  `${window.location.origin}/api/tiles/india-pop/{z}/{x}/{y}`,
                ],
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
                id: "population-glow",
                type: "circle",
                source: "population",
                "source-layer": layer,
                paint: {
                  "circle-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    3,
                    0.6,
                    7,
                    1.1,
                    11,
                    1.8,
                  ],
                  "circle-color": "#f0c14b",
                  "circle-opacity": 0.55,
                  "circle-blur": 0.25,
                },
              },
              {
                id: "population-core",
                type: "circle",
                source: "population",
                "source-layer": layer,
                paint: {
                  "circle-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    3,
                    0.35,
                    7,
                    0.7,
                    11,
                    1.2,
                  ],
                  "circle-color": "#ffe29a",
                  "circle-opacity": 0.9,
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
            { padding: 32, maxZoom: 5.5, duration: 0 },
          );
        });
        map.addControl(
          new maplibregl.NavigationControl({ showCompass: false }),
          "top-right",
        );
        (window as unknown as { __popMap?: unknown }).__popMap = map;
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [layer, bounds, minZoom, maxZoom]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={
          className ??
          "h-[min(70vh,640px)] w-full overflow-hidden rounded-sm bg-[hsl(215_40%_8%)]"
        }
      />
      {error && (
        <p className="absolute inset-x-0 bottom-3 text-center text-sm text-red-300">
          Map failed to load: {error}
        </p>
      )}
    </div>
  );
}
