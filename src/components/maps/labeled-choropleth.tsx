"use client";

import * as React from "react";
import type { FeatureCollection, GeoJsonObject } from "geojson";
import { buildColorScale, type ScaleType } from "@/lib/color-scale";
import type { SubnationalMap } from "@/lib/subnational-maps";
import { cn } from "@/lib/utils";

type Ring = [number, number][];

function walkRings(geom: GeoJsonObject | null | undefined): Ring[] {
  if (!geom || !("type" in geom)) return [];
  const rings: Ring[] = [];
  const asRing = (c: number[][]) =>
    c.filter((p) => p.length >= 2).map((p) => [p[0], p[1]] as [number, number]);
  const g = geom as {
    type?: string;
    coordinates?: number[][][] | number[][][][];
  };
  if (g.type === "Polygon" && g.coordinates) {
    const coords = g.coordinates as number[][][];
    if (coords[0]) rings.push(asRing(coords[0]));
  } else if (g.type === "MultiPolygon" && g.coordinates) {
    const coords = g.coordinates as number[][][][];
    for (const poly of coords) {
      if (poly[0]) rings.push(asRing(poly[0]));
    }
  }
  return rings;
}

function ringArea(ring: Ring): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return Math.abs(a / 2);
}

function ringCentroid(ring: Ring): [number, number] {
  let x = 0;
  let y = 0;
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const cross = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    a += cross;
    x += (ring[j][0] + ring[i][0]) * cross;
    y += (ring[j][1] + ring[i][1]) * cross;
  }
  if (Math.abs(a) < 1e-12) {
    const n = ring.length || 1;
    return [
      ring.reduce((s, p) => s + p[0], 0) / n,
      ring.reduce((s, p) => s + p[1], 0) / n,
    ];
  }
  return [x / (3 * a), y / (3 * a)];
}

function pathFromRing(ring: Ring, project: (p: [number, number]) => [number, number]) {
  if (ring.length < 3) return "";
  const pts = ring.map(project);
  return (
    pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
      .join(" ") + " Z"
  );
}

function contrastColor(fill: string): string {
  const m = fill.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return "#111";
  const lum =
    (0.2126 * Number(m[1]) + 0.7152 * Number(m[2]) + 0.0722 * Number(m[3])) / 255;
  return lum > 0.55 ? "#1a1a1a" : "#f7f7f7";
}

export function LabeledChoropleth({
  map,
  className,
}: {
  map: SubnationalMap;
  className?: string;
}) {
  const [geo, setGeo] = React.useState<FeatureCollection | null>(null);
  const [hover, setHover] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    fetch(map.geoUrl)
      .then((r) => r.json())
      .then((json) => {
        if (active) setGeo(json as FeatureCollection);
      })
      .catch(() => {
        if (active) setGeo(null);
      });
    return () => {
      active = false;
    };
  }, [map.geoUrl]);

  const byId = React.useMemo(() => {
    const m = new Map<string, (typeof map.regions)[number]>();
    for (const r of map.regions) {
      m.set(r.id, r);
      m.set(r.slug, r);
    }
    return m;
  }, [map.regions]);

  const values = map.regions
    .map((r) => r.value)
    .filter((v): v is number => v != null && Number.isFinite(v));

  const scale = React.useMemo(
    () =>
      buildColorScale(
        values,
        map.scale as ScaleType,
        map.mid,
        map.min != null && map.max != null
          ? { min: map.min, max: map.max }
          : undefined,
      ),
    [map.max, map.mid, map.min, map.scale, values],
  );

  const decimals = map.metric === "tfr" ? 2 : 0;
  const format = (v: number) =>
    map.metric === "pop-change"
      ? `${v > 0 ? "+" : ""}${v.toFixed(0)}%`
      : v.toFixed(decimals);

  const width = 960;
  const height = 620;
  const poster = map.scale === "diverging-tfr";
  const padTop = poster || (map.highlights?.length ?? 0) > 0 ? 118 : 92;
  const padRight = 28;
  const padBottom = 48;
  const padLeft = 28;
  const gradientId = `leg-${map.id}`;
  const legendWidth = poster ? 320 : 138;

  let projected: {
    id: string;
    name: string;
    value: number | null;
    fill: string;
    d: string;
    cx: number;
    cy: number;
    area: number;
  }[] | null = null;
  try {
    if (geo?.features?.length) {
      const features = geo.features.filter(
        (f) => f.geometry && f.geometry.type !== "GeometryCollection",
      );
      const rings = features.flatMap((f) =>
        walkRings(f.geometry as GeoJsonObject),
      );
      const pts = rings.flat();
      if (pts.length > 0) {
        let minLng = Infinity;
        let maxLng = -Infinity;
        let minLat = Infinity;
        let maxLat = -Infinity;
        for (const [lng, lat] of pts) {
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        }
        const innerW = width - padLeft - padRight;
        const innerH = height - padTop - padBottom;
        const spanLng = maxLng - minLng || 1;
        const spanLat = maxLat - minLat || 1;
        const k = Math.min(innerW / spanLng, innerH / spanLat);
        const ox = padLeft + (innerW - k * spanLng) / 2;
        const oy = padTop + (innerH - k * spanLat) / 2;
        const project = ([lng, lat]: [number, number]): [number, number] => [
          ox + (lng - minLng) * k,
          oy + (maxLat - lat) * k,
        ];
        projected = features.map((feature) => {
          const p = (feature.properties ?? {}) as {
            slug?: string;
            name?: string;
          };
          const id = p.slug || (feature.id != null ? String(feature.id) : "");
          const datum = byId.get(id);
          const featRings = walkRings(feature.geometry as GeoJsonObject);
          const main =
            featRings.slice().sort((a, b) => ringArea(b) - ringArea(a))[0] ?? [];
          const area = ringArea(main) * k * k;
          const centroid = main.length
            ? project(ringCentroid(main))
            : [0, 0];
          const fill =
            datum?.value != null
              ? scale.color(datum.value)
              : "rgb(226, 226, 222)";
          return {
            id,
            name: datum?.name ?? p.name ?? id,
            value: datum?.value ?? null,
            fill,
            d: featRings.map((ring) => pathFromRing(ring, project)).join(" "),
            cx: centroid[0],
            cy: centroid[1],
            area,
          };
        });
      }
    }
  } catch {
    projected = null;
  }

  const legendStops = scale.legend.filter((_, i, arr) => {
    if (arr.length <= 3) return true;
    return i === 0 || i === Math.floor(arr.length / 2) || i === arr.length - 1;
  });
  const legendTicks = poster
    ? [0.8, 1, 1.2, 1.4, 1.6, 1.8]
    : legendStops.map((s) => s.value);

  return (
    <div className={cn("overflow-hidden bg-white text-neutral-900", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={map.title}
        className="h-auto w-full"
      >
        <rect width={width} height={height} fill="#ffffff" />
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
            {Array.from({ length: 25 }, (_, i) => {
              const t = i / 24;
              const value = scale.min + t * (scale.max - scale.min);
              return (
                <stop
                  key={i}
                  offset={`${t * 100}%`}
                  stopColor={scale.color(value)}
                />
              );
            })}
          </linearGradient>
        </defs>
        <text
          x={28}
          y={32}
          fill="#111111"
          fontSize="20"
          fontWeight="700"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {map.title}
        </text>

        {legendStops.length > 1 && (
          <g transform="translate(28, 44)">
            <rect
              x={0}
              y={0}
              width={legendWidth}
              height={10}
              fill={`url(#${gradientId})`}
            />
            {(poster
              ? legendTicks
              : [
                  legendStops[0].value,
                  legendStops[legendStops.length - 1].value,
                ]
            ).map((tick, i, arr) => {
                const x = poster
                  ? ((tick - 0.8) / (1.8 - 0.8)) * legendWidth
                  : i === 0
                    ? 0
                    : legendWidth;
                return (
                  <text
                    key={tick}
                    x={x}
                    y={24}
                    fill="#555"
                    fontSize="10"
                    textAnchor={
                      i === 0 ? "start" : i === arr.length - 1 ? "end" : "middle"
                    }
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                  >
                    {format(tick)}
                  </text>
                );
              })}
          </g>
        )}

        {(map.national != null || (map.highlights?.length ?? 0) > 0) && (
          <text
            x={28}
            y={poster || (map.highlights?.length ?? 0) > 0 ? 92 : 84}
            fill="#444444"
            fontSize="13"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            {map.national != null
              ? `${map.country}: ${
                  map.metric === "pop-change"
                    ? `+${map.national.toFixed(0)}%`
                    : map.national.toFixed(2)
                }`
              : ""}
            {(map.highlights ?? []).map((h) => `    ${h.name}: ${h.value.toFixed(2)}`)}
          </text>
        )}

        {projected?.map((s) => (
          <path
            key={s.id}
            d={s.d}
            fill={s.fill}
            stroke="#ffffff"
            strokeWidth={0.8}
            onMouseEnter={() => setHover(s.id)}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: "default" }}
          />
        ))}

        {!projected && (
          <text
            x={width / 2}
            y={height / 2}
            textAnchor="middle"
            fill="#888888"
            fontSize="14"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            Loading map…
          </text>
        )}

        {map.labelValues &&
          projected
            ?.filter(
              (s) =>
                s.value != null &&
                (map.regions.length <= 40 || s.area > 420),
            )
            .map((s) => (
              <text
                key={`lbl-${s.id}`}
                x={s.cx}
                y={s.cy + 3}
                textAnchor="middle"
                fill={contrastColor(s.fill)}
                fontSize={s.area > 2800 ? 11 : 9}
                fontWeight="600"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                style={{ pointerEvents: "none" }}
              >
                {format(s.value!)}
              </text>
            ))}

        <text
          x={28}
          y={height - 16}
          fill="#777777"
          fontSize="10"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {map.credit ?? map.source}
        </text>
      </svg>

      {hover && byId.get(hover) && (
        <p className="border-t border-neutral-200 px-4 py-2 text-sm text-neutral-700">
          <span className="font-medium">{byId.get(hover)!.name}</span>
          {" · "}
          {byId.get(hover)!.value != null
            ? `${format(byId.get(hover)!.value!)} ${map.unit}`
            : "No data"}
        </p>
      )}
    </div>
  );
}
