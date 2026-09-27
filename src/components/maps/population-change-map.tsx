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
  growthColor?: string;
  declineColor?: string;
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
  removeProtocol?: (name: string) => void;
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
 * GHSL-style population change: green growth / pink decline over a light basemap.
 * Streams from a PMTiles archive (range requests) — set
 * NEXT_PUBLIC_EU_POPCHANGE_PMTILES_URL in production.
 */
export function PopulationChangeMap({
  url,
  layer,
  bounds,
  minZoom,
  maxZoom,
  growthColor = "#2f9e6b",
  declineColor = "#e45c8a",
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

        if (!protocolRegistered && maplibregl.addProtocol) {
          ensurePmtilesProtocol(maplibregl);
        }

        const tilesUrl = resolveTilesUrl(url);
        // Probe early so a missing archive shows a clear banner instead of an
        // empty basemap. Prefer a tiny range GET — some hosts reject HEAD.
        const probe = await fetch(tilesUrl, {
          headers: { Range: "bytes=0-15" },
          mode: "cors",
        }).catch(() => null);
        if (cancelled) return;
        if (!probe || !(probe.ok || probe.status === 206)) {
          setError(
            "Population-change tiles are missing on this host. Expected /tiles/europe-popchange.pmtiles (or set NEXT_PUBLIC_EU_POPCHANGE_PMTILES_URL).",
          );
          return;
        }

        const midLon = (bounds[0] + bounds[2]) / 2;
        const midLat = (bounds[1] + bounds[3]) / 2;
        const pmtilesUrl = tilesUrl.startsWith("pmtiles://")
          ? tilesUrl
          : `pmtiles://${tilesUrl}`;

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
                    0.9,
                    4,
                    1.4,
                    6,
                    2.2,
                    8,
                    3.2,
                    11,
                    4.5,
                  ],
                  "circle-color": [
                    "case",
                    [">=", ["to-number", ["get", "chg"]], 0.5],
                    growthColor,
                    ["<=", ["to-number", ["get", "chg"]], -0.5],
                    declineColor,
                    "#94a3b8",
                  ],
                  "circle-opacity": 0.9,
                  "circle-pitch-alignment": "map",
                },
              },
            ],
          },
        });

        map.on("error", (e: { error?: { message?: string } }) => {
          const msg = e?.error?.message ?? "";
          if (/pmtiles|popchange|Failed to fetch|404/i.test(msg)) {
            setError(
              "Could not load population-change tiles from /tiles/europe-popchange.pmtiles.",
            );
          }
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
    url,
    layer,
    bounds,
    minZoom,
    maxZoom,
    growthColor,
    declineColor,
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
        <div className="absolute inset-x-3 bottom-3 rounded-sm border border-rose-300 bg-rose-50 px-3 py-2 text-center text-sm text-rose-900 shadow-sm sm:inset-x-6">
          {error}
        </div>
      )}
    </div>
  );
}
