"use client";

import { useEffect, useRef, useState } from "react";
import { Protocol } from "pmtiles";

type Props = {
  /** Absolute or same-origin URL to the `.pmtiles` archive. */
  url: string;
  layer: string;
  bounds: [number, number, number, number];
  minZoom: number;
  maxZoom: number;
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

function resolveTilesUrl(url: string): string {
  if (/^https?:\/\//i.test(url) || url.startsWith("pmtiles://")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${window.location.origin}${path}`;
}

type MapLibreGl = {
  Map: new (opts: Record<string, unknown>) => {
    on: (event: string, cb: (...args: unknown[]) => void) => void;
    addControl: (c: unknown, pos?: string) => void;
    fitBounds: (b: number[][], opts?: Record<string, unknown>) => void;
    remove: () => void;
  };
  NavigationControl: new (opts?: Record<string, unknown>) => unknown;
  addProtocol?: (
    name: string,
    fn: (...args: unknown[]) => unknown,
  ) => void;
  setWorkerUrl?: (url: string) => void;
};

let protocolRegistered = false;

function ensurePmtilesProtocol(maplibregl: MapLibreGl) {
  const g = window as unknown as { __brPmtilesProtocol?: boolean };
  if (g.__brPmtilesProtocol || protocolRegistered) return;
  if (!maplibregl.addProtocol) return;
  const protocol = new Protocol();
  maplibregl.addProtocol(
    "pmtiles",
    protocol.tile as unknown as (...args: unknown[]) => unknown,
  );
  protocolRegistered = true;
  g.__brPmtilesProtocol = true;
}

/**
 * Population dots via MapLibre + PMTiles (range requests).
 * Set NEXT_PUBLIC_INDIA_POP_PMTILES_URL in production.
 */
export function PopulationDotsMap({
  url,
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

        if (!protocolRegistered && maplibregl.addProtocol) {
          ensurePmtilesProtocol(maplibregl);
        }

        const tilesUrl = resolveTilesUrl(url);
        const probe = await fetch(tilesUrl, {
          headers: { Range: "bytes=0-1" },
          mode: "cors",
        }).catch(() => null);
        if (cancelled) return;
        if (!probe || !(probe.ok || probe.status === 206)) {
          setError(
            "India population tiles are missing on this host. Set NEXT_PUBLIC_INDIA_POP_PMTILES_URL to a public .pmtiles URL, or place india-population.pmtiles in public/tiles for local dev.",
          );
          return;
        }

        const pmtilesUrl = tilesUrl.startsWith("pmtiles://")
          ? tilesUrl
          : `pmtiles://${tilesUrl}`;

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
                url: pmtilesUrl,
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

        map.on("error", (e: { error?: { message?: string } }) => {
          const msg = e?.error?.message ?? "";
          if (/pmtiles|population|Failed to fetch|404/i.test(msg)) {
            setError(
              "Could not load India population tiles. Check NEXT_PUBLIC_INDIA_POP_PMTILES_URL / public/tiles/india-population.pmtiles.",
            );
          }
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
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [url, layer, bounds, minZoom, maxZoom]);

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
        <div className="absolute inset-x-3 bottom-3 rounded-sm border border-rose-400/40 bg-rose-950/90 px-3 py-2 text-center text-sm text-rose-100 sm:inset-x-6">
          {error}
        </div>
      )}
    </div>
  );
}
