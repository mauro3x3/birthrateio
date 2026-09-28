"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Protocol } from "pmtiles";
import {
  Camera,
  Expand,
  Minimize2,
  MousePointerClick,
  Share2,
} from "lucide-react";
import { cn, formatCompact, formatNumber } from "@/lib/utils";

type Props = {
  /** Absolute or same-origin URL to the `.pmtiles` archive. */
  url: string;
  layer: string;
  bounds: [number, number, number, number];
  minZoom: number;
  maxZoom: number;
  growthColor?: string;
  declineColor?: string;
  yearFrom?: number;
  yearTo?: number;
  className?: string;
};

export type PopChangeStyleId = "dense" | "dots" | "heat";

const STYLES: { id: PopChangeStyleId; label: string; hint: string }[] = [
  {
    id: "dense",
    label: "Dense",
    hint: "Filled settlement look (closest to classic GHSL maps)",
  },
  { id: "dots", label: "Dots", hint: "Discrete point markers" },
  { id: "heat", label: "Heat", hint: "Soft green / pink heat layers" },
];

const MAPLIBRE_JS = "/maplibre-gl.js";
const MAPLIBRE_CSS = "/maplibre-gl.css";

type InspectHit = {
  lng: number;
  lat: number;
  chg: number;
  d: number | null;
  p0: number | null;
  p1: number | null;
};

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

function numProp(props: Record<string, unknown>, key: string): number | null {
  const v = props[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

type MapLibreGl = {
  Map: new (opts: Record<string, unknown>) => {
    on: (event: string, cb: (...args: unknown[]) => void) => void;
    off?: (event: string, cb: (...args: unknown[]) => void) => void;
    addControl: (c: unknown, pos?: string) => void;
    fitBounds: (b: number[][], opts?: Record<string, unknown>) => void;
    remove: () => void;
    resize: () => void;
    getCanvas: () => HTMLCanvasElement;
    getContainer: () => HTMLElement;
    queryRenderedFeatures: (
      point: unknown,
      opts?: Record<string, unknown>,
    ) => Array<{ properties?: Record<string, unknown> }>;
    setLayoutProperty: (id: string, prop: string, value: unknown) => void;
    getLayer: (id: string) => unknown;
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

function buildLayers(
  layer: string,
  growthColor: string,
  declineColor: string,
): Record<string, unknown>[] {
  return [
    {
      id: "basemap",
      type: "raster",
      source: "basemap",
    },
    // Dense: small overlapping circles — reads like a filled raster at overview.
    {
      id: "popchange-dense-decline",
      type: "circle",
      source: "popchange",
      "source-layer": layer,
      filter: ["<=", ["to-number", ["get", "chg"]], -0.5],
      layout: { visibility: "visible" },
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          2,
          1.2,
          4,
          1.8,
          6,
          2.6,
          8,
          3.8,
          11,
          5.5,
        ],
        "circle-color": declineColor,
        "circle-opacity": 0.72,
        "circle-blur": 0.15,
        "circle-pitch-alignment": "map",
      },
    },
    {
      id: "popchange-dense-growth",
      type: "circle",
      source: "popchange",
      "source-layer": layer,
      filter: [">=", ["to-number", ["get", "chg"]], 0.5],
      layout: { visibility: "visible" },
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          2,
          1.2,
          4,
          1.8,
          6,
          2.6,
          8,
          3.8,
          11,
          5.5,
        ],
        "circle-color": growthColor,
        "circle-opacity": 0.78,
        "circle-blur": 0.15,
        "circle-pitch-alignment": "map",
      },
    },
    // Classic discrete dots
    {
      id: "popchange-dots",
      type: "circle",
      source: "popchange",
      "source-layer": layer,
      layout: { visibility: "none" },
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
    // Dual heatmaps (growth + decline)
    {
      id: "popchange-heat-decline",
      type: "heatmap",
      source: "popchange",
      "source-layer": layer,
      filter: ["<=", ["to-number", ["get", "chg"]], -0.5],
      layout: { visibility: "none" },
      paint: {
        "heatmap-weight": 1,
        "heatmap-intensity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          2,
          0.55,
          6,
          1.1,
          9,
          1.6,
        ],
        "heatmap-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          2,
          6,
          6,
          14,
          9,
          22,
        ],
        "heatmap-opacity": 0.85,
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0,
          "rgba(228,92,138,0)",
          0.2,
          "rgba(228,92,138,0.25)",
          0.55,
          "rgba(228,92,138,0.65)",
          1,
          "rgba(190,40,90,0.95)",
        ],
      },
    },
    {
      id: "popchange-heat-growth",
      type: "heatmap",
      source: "popchange",
      "source-layer": layer,
      filter: [">=", ["to-number", ["get", "chg"]], 0.5],
      layout: { visibility: "none" },
      paint: {
        "heatmap-weight": 1,
        "heatmap-intensity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          2,
          0.55,
          6,
          1.1,
          9,
          1.6,
        ],
        "heatmap-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          2,
          6,
          6,
          14,
          9,
          22,
        ],
        "heatmap-opacity": 0.85,
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0,
          "rgba(47,158,107,0)",
          0.2,
          "rgba(47,158,107,0.25)",
          0.55,
          "rgba(47,158,107,0.65)",
          1,
          "rgba(20,120,70,0.95)",
        ],
      },
    },
    // Invisible hit target for heat style (heatmaps aren't easily queryable)
    {
      id: "popchange-hit",
      type: "circle",
      source: "popchange",
      "source-layer": layer,
      layout: { visibility: "none" },
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          2,
          4,
          6,
          8,
          9,
          12,
        ],
        "circle-opacity": 0,
        "circle-pitch-alignment": "map",
      },
    },
  ];
}

function applyStyleVisibility(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map: any,
  style: PopChangeStyleId,
) {
  const show = (id: string, on: boolean) => {
    if (!map.getLayer(id)) return;
    map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
  };
  show("popchange-dense-growth", style === "dense");
  show("popchange-dense-decline", style === "dense");
  show("popchange-dots", style === "dots");
  show("popchange-heat-growth", style === "heat");
  show("popchange-heat-decline", style === "heat");
  show("popchange-hit", style === "heat");
}

/**
 * GHSL-style population change: green growth / pink decline over a light basemap.
 * Styles, click inspect, fullscreen, and PNG export.
 */
export function PopulationChangeMap({
  url,
  layer,
  bounds,
  minZoom,
  maxZoom,
  growthColor = "#2f9e6b",
  declineColor = "#e45c8a",
  yearFrom = 2000,
  yearTo = 2025,
  className,
}: Props) {
  const shellRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [style, setStyle] = useState<PopChangeStyleId>("dense");
  const [hit, setHit] = useState<InspectHit | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    applyStyleVisibility(map, style);
  }, [style]);

  useEffect(() => {
    const onFs = () => {
      setFullscreen(Boolean(document.fullscreenElement));
      mapRef.current?.resize();
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

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
          headers: { Range: "bytes=0-15" },
          mode: "cors",
        }).catch(() => null);
        if (cancelled) return;
        if (!probe || !(probe.ok || probe.status === 206)) {
          setError(
            "Population-change tiles are missing on this host. Expected /tiles/europe-popchange.pmtiles.",
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
          // Needed so html-to-image / canvas capture can read WebGL pixels.
          preserveDrawingBuffer: true,
          style: {
            version: 8,
            sources: {
              basemap: {
                type: "raster",
                tiles: [
                  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
                ],
                tileSize: 256,
                attribution: "Tiles © Esri · GHSL GHS-POP",
              },
              popchange: {
                type: "vector",
                url: pmtilesUrl,
                minzoom: minZoom,
                maxzoom: maxZoom,
              },
            },
            layers: buildLayers(layer, growthColor, declineColor),
          },
        });
        mapRef.current = map;

        map.on("error", (e: { error?: { message?: string } }) => {
          const msg = e?.error?.message ?? "";
          if (/pmtiles|popchange|Failed to fetch|404/i.test(msg)) {
            setError(
              "Could not load population-change tiles from /tiles/europe-popchange.pmtiles.",
            );
          }
        });

        map.on("load", () => {
          applyStyleVisibility(map, style);
          map.fitBounds(
            [
              [bounds[0], bounds[1]],
              [bounds[2], bounds[3]],
            ],
            { padding: 28, maxZoom: 4.2, duration: 0 },
          );
        });

        const queryLayers = [
          "popchange-dense-growth",
          "popchange-dense-decline",
          "popchange-dots",
          "popchange-hit",
        ];

        map.on("click", (e: {
          point: unknown;
          lngLat: { lng: number; lat: number };
        }) => {
          const feats = map.queryRenderedFeatures(e.point, {
            layers: queryLayers.filter((id: string) => map.getLayer(id)),
          }) as Array<{ properties?: Record<string, unknown> }>;
          const f = feats[0];
          if (!f?.properties) {
            setHit(null);
            return;
          }
          const props = f.properties;
          const chg = numProp(props, "chg") ?? 0;
          setHit({
            lng: e.lngLat.lng,
            lat: e.lngLat.lat,
            chg,
            d: numProp(props, "d"),
            p0: numProp(props, "p0"),
            p1: numProp(props, "p1"),
          });
        });

        map.on("mouseenter", "popchange-dense-growth", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "popchange-dense-growth", () => {
          map.getCanvas().style.cursor = "";
        });
        for (const id of [
          "popchange-dense-decline",
          "popchange-dots",
          "popchange-hit",
        ]) {
          map.on("mouseenter", id, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", id, () => {
            map.getCanvas().style.cursor = "";
          });
        }

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
      mapRef.current = null;
      map?.remove();
    };
    // style applied via separate effect once map exists
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, layer, bounds, minZoom, maxZoom, growthColor, declineColor]);

  const toggleFullscreen = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell) return;
    try {
      if (!document.fullscreenElement) {
        await shell.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
      window.setTimeout(() => mapRef.current?.resize(), 80);
    } catch {
      // ignore — browser may block
    }
  }, []);

  const downloadPng = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell) return;
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(shell, {
        backgroundColor: "#e8e8e8",
        pixelRatio: 2,
        cacheBust: true,
        filter: (node) => {
          if (!(node instanceof HTMLElement)) return true;
          return node.dataset.exportIgnore == null;
        },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "birthrate-europe-population-change.png";
      a.click();
    } finally {
      setExporting(false);
    }
  }, []);

  const shareLink = useCallback(async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Europe population change 2000–2025",
          url: shareUrl,
        });
        return;
      }
    } catch {
      // fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }, []);

  const mapHeight = fullscreen
    ? "h-[calc(100dvh-3rem)]"
    : (className ?? "h-[min(75vh,720px)]");

  return (
    <div
      ref={shellRef}
      className={cn(
        "relative bg-[#e8e8e8]",
        fullscreen && "flex flex-col bg-[#e8e8e8]",
      )}
    >
      <div
        data-export-ignore
        className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-white/80 px-3 py-2 text-[12px]"
      >
        <div className="flex items-center gap-1 rounded-sm border border-border p-0.5">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              title={s.hint}
              onClick={() => setStyle(s.id)}
              className={cn(
                "rounded-sm px-2 py-1 text-xs",
                style === s.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <span className="hidden items-center gap-1 text-muted-foreground sm:inline-flex">
          <MousePointerClick className="h-3.5 w-3.5" aria-hidden />
          Click a cell for detail
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => void shareLink()}
            className="inline-flex items-center gap-1 rounded-sm border border-border bg-card px-2 py-1 text-xs text-foreground hover:bg-muted"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden />
            {copied ? "Copied" : "Share"}
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={() => void downloadPng()}
            className="inline-flex items-center gap-1 rounded-sm border border-border bg-card px-2 py-1 text-xs text-foreground hover:bg-muted disabled:opacity-60"
          >
            <Camera className="h-3.5 w-3.5" aria-hidden />
            {exporting ? "…" : "PNG"}
          </button>
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className="inline-flex items-center gap-1 rounded-sm border border-border bg-card px-2 py-1 text-xs text-foreground hover:bg-muted"
          >
            {fullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Expand className="h-3.5 w-3.5" aria-hidden />
            )}
            {fullscreen ? "Exit" : "Full"}
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={containerRef}
          className={cn("w-full overflow-hidden", mapHeight)}
        />
        {hit && (
          <div
            data-export-ignore
            className="absolute left-3 top-3 z-10 max-w-xs rounded-sm border border-border bg-white/95 px-3 py-2 text-sm shadow-sm"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Grid cell · {yearFrom}→{yearTo}
            </p>
            <p
              className="mt-1 font-serif text-lg font-semibold tabular-nums"
              style={{
                color: hit.chg >= 0 ? growthColor : declineColor,
              }}
            >
              {hit.d != null
                ? `${hit.d > 0 ? "+" : ""}${formatCompact(hit.d)} people`
                : hit.chg >= 0
                  ? "Growth"
                  : "Decline"}
            </p>
            {hit.p0 != null && hit.p1 != null ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {formatNumber(hit.p0, 0)} → {formatNumber(hit.p1, 0)} residents
                (modeled)
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Direction for this ~1 km cell (absolute headcounts unavailable).
              </p>
            )}
            <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">
              {hit.lat.toFixed(3)}°N, {hit.lng.toFixed(3)}°E
            </p>
            <button
              type="button"
              className="mt-2 text-xs text-primary underline-offset-2 hover:underline"
              onClick={() => setHit(null)}
            >
              Dismiss
            </button>
          </div>
        )}
        {error && (
          <div className="absolute inset-x-3 bottom-3 rounded-sm border border-rose-300 bg-rose-50 px-3 py-2 text-center text-sm text-rose-900 shadow-sm sm:inset-x-6">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
