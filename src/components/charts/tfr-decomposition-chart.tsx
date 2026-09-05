"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { TfrDecompositionRow } from "@/lib/sources/tfr-decomposition-data";

const MARGIN = { top: 18, right: 22, bottom: 44, left: 54 };
const VB_W = 900;
const VB_H = 560;

/** Countries labelled with a flag + name directly on the chart. */
export const DEFAULT_FEATURED_ISO3: readonly string[] = [
  "KOR",
  "JPN",
  "ITA",
  "ESP",
  "POL",
  "DEU",
  "FRA",
  "GBR",
  "PRT",
  "USA",
  "AUS",
  "RUS",
  "GEO",
  "BGR",
  "AZE",
  "ISR",
];

/** Small manual nudges (label text only, not the marker) to untangle
 * countries that sit almost on top of each other. */
const LABEL_DY: Record<string, number> = {
  GBR: -11,
  FRA: 10,
  DEU: -9,
  USA: 9,
  ESP: -9,
  ITA: 2,
  JPN: 11,
  BGR: -5,
  AZE: 8,
};

function niceStep(range: number, target: number) {
  const raw = range / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return step * mag;
}

function ticks(min: number, max: number, target: number) {
  const step = niceStep(max - min, target);
  const start = Math.ceil(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + 1e-9; v += step) {
    out.push(Math.round(v * 100) / 100);
  }
  return out;
}

/** Interpolate a soft pastel red -> cream -> green scale, like a fertility heat map. */
function tfrColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const stops: [number, [number, number, number]][] = [
    [0, [4, 62, 91]],
    [0.5, [42, 32, 96]],
    [1, [150, 38, 89]],
  ];
  let a = stops[0];
  let b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (clamped >= stops[i][0] && clamped <= stops[i + 1][0]) {
      a = stops[i];
      b = stops[i + 1];
      break;
    }
  }
  const span = b[0] - a[0] || 1;
  const f = (clamped - a[0]) / span;
  const h = a[1][0] + (b[1][0] - a[1][0]) * f;
  const s = a[1][1] + (b[1][1] - a[1][1]) * f;
  const l = a[1][2] + (b[1][2] - a[1][2]) * f;
  return `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`;
}

export function TfrDecompositionChart({
  rows,
  featuredIso3,
  onToggleFeatured,
  className,
}: {
  rows: TfrDecompositionRow[];
  featuredIso3: ReadonlySet<string>;
  onToggleFeatured?: (iso3: string) => void;
  className?: string;
}) {
  const [active, setActive] = React.useState<TfrDecompositionRow | null>(
    null,
  );

  const { xDomain, yDomain, plot } = React.useMemo(() => {
    const xs = rows.map((r) => r.cpm);
    const ys = rows.map((r) => r.tmrPct);
    const xMin = Math.floor((Math.min(...xs) - 0.12) * 10) / 10;
    const xMax = Math.ceil((Math.max(...xs) + 0.12) * 10) / 10;
    const yMin = Math.floor((Math.min(...ys) - 3) / 5) * 5;
    const yMax = Math.ceil((Math.max(...ys) + 3) / 5) * 5;
    return {
      xDomain: [Math.max(1, xMin), xMax] as [number, number],
      yDomain: [Math.max(0, yMin), Math.min(100, yMax)] as [number, number],
      plot: {
        x0: MARGIN.left,
        x1: VB_W - MARGIN.right,
        y0: MARGIN.top,
        y1: VB_H - MARGIN.bottom,
      },
    };
  }, [rows]);

  const px = React.useCallback(
    (x: number) =>
      plot.x0 +
      ((x - xDomain[0]) / (xDomain[1] - xDomain[0])) * (plot.x1 - plot.x0),
    [plot, xDomain],
  );
  const py = React.useCallback(
    (y: number) =>
      plot.y1 -
      ((y - yDomain[0]) / (yDomain[1] - yDomain[0])) * (plot.y1 - plot.y0),
    [plot, yDomain],
  );

  const tfrAtCorner = (x: number, y: number) => x * (y / 100);
  const tfrMin = tfrAtCorner(xDomain[0], yDomain[0]);
  const tfrMax = tfrAtCorner(xDomain[1], yDomain[1]);

  // Heat-map background: a fine grid of cells shaded by TFR = CPM x TMR.
  const cells = React.useMemo(() => {
    const nx = 54;
    const ny = 34;
    const out: { x: number; y: number; w: number; h: number; fill: string }[] =
      [];
    const cw = (plot.x1 - plot.x0) / nx;
    const ch = (plot.y1 - plot.y0) / ny;
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const cxPx = plot.x0 + (i + 0.5) * cw;
        const cyPx = plot.y0 + (j + 0.5) * ch;
        const dataX = xDomain[0] + (cxPx - plot.x0) / (plot.x1 - plot.x0) * (xDomain[1] - xDomain[0]);
        const dataY = yDomain[1] - (cyPx - plot.y0) / (plot.y1 - plot.y0) * (yDomain[1] - yDomain[0]);
        const tfr = tfrAtCorner(dataX, dataY);
        const t = (tfr - tfrMin) / (tfrMax - tfrMin || 1);
        out.push({
          x: plot.x0 + i * cw,
          y: plot.y0 + j * ch,
          w: cw + 0.6,
          h: ch + 0.6,
          fill: tfrColor(t),
        });
      }
    }
    return out;
  }, [plot, xDomain, yDomain, tfrMin, tfrMax]);

  // Labelled iso-fertility contours: TFR = CPM x (TMR/100), i.e. y = 100k/x.
  const contourLevels = React.useMemo(() => {
    const levels: number[] = [];
    const step = tfrMax - tfrMin > 2 ? 0.4 : 0.2;
    let k = Math.ceil(tfrMin / step) * step;
    for (; k < tfrMax; k += step) {
      const rounded = Math.round(k * 10) / 10;
      if (Math.abs(rounded - 2.1) > step / 2) levels.push(rounded);
    }
    return levels;
  }, [tfrMin, tfrMax]);

  const buildContour = React.useCallback(
    (k: number) => {
      const pts: { x: number; y: number }[] = [];
      const steps = 60;
      for (let i = 0; i <= steps; i++) {
        const x = xDomain[0] + ((xDomain[1] - xDomain[0]) * i) / steps;
        const y = (100 * k) / x;
        if (y >= yDomain[0] && y <= yDomain[1]) {
          pts.push({ x: px(x), y: py(y) });
        }
      }
      return pts;
    },
    [xDomain, yDomain, px, py],
  );

  const xTicks = ticks(xDomain[0], xDomain[1], 6);
  const yTicks = ticks(yDomain[0], yDomain[1], 6);

  const featured = rows.filter((r) => featuredIso3.has(r.iso3));
  const others = rows.filter((r) => !featuredIso3.has(r.iso3));

  const toggle = (r: TfrDecompositionRow) => {
    onToggleFeatured?.(r.iso3);
  };
  const onMarkerKeyDown = (
    e: React.KeyboardEvent,
    r: TfrDecompositionRow,
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle(r);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full select-none"
        role="img"
        aria-label="Scatter chart of total maternal rate versus children per mother, by country"
      >
        {/* Heat-map background */}
        <g>
          {cells.map((c, i) => (
            <rect
              key={i}
              x={c.x}
              y={c.y}
              width={c.w}
              height={c.h}
              fill={c.fill}
            />
          ))}
        </g>

        {/* Plot border */}
        <rect
          x={plot.x0}
          y={plot.y0}
          width={plot.x1 - plot.x0}
          height={plot.y1 - plot.y0}
          fill="none"
          stroke="hsl(var(--border))"
        />

        {/* Gridlines + axis ticks */}
        {xTicks.map((t) => (
          <g key={`x-${t}`}>
            <line
              x1={px(t)}
              x2={px(t)}
              y1={plot.y0}
              y2={plot.y1}
              stroke="hsl(var(--foreground) / 0.06)"
            />
            <text
              x={px(t)}
              y={plot.y1 + 20}
              textAnchor="middle"
              fontSize={12}
              className="fill-muted-foreground"
            >
              {t.toFixed(1)}
            </text>
          </g>
        ))}
        {yTicks.map((t) => (
          <g key={`y-${t}`}>
            <line
              x1={plot.x0}
              x2={plot.x1}
              y1={py(t)}
              y2={py(t)}
              stroke="hsl(var(--foreground) / 0.06)"
            />
            <text
              x={plot.x0 - 10}
              y={py(t) + 4}
              textAnchor="end"
              fontSize={12}
              className="fill-muted-foreground"
            >
              {t}%
            </text>
          </g>
        ))}

        {/* Axis titles */}
        <text
          x={(plot.x0 + plot.x1) / 2}
          y={VB_H - 6}
          textAnchor="middle"
          fontSize={13}
          fontWeight={600}
          className="fill-foreground"
        >
          Children per mother
        </text>
        <text
          x={16}
          y={(plot.y0 + plot.y1) / 2}
          textAnchor="middle"
          fontSize={13}
          fontWeight={600}
          className="fill-foreground"
          transform={`rotate(-90, 16, ${(plot.y0 + plot.y1) / 2})`}
        >
          Total maternal rate (share of women who become mothers)
        </text>

        {/* Iso-fertility contours */}
        {contourLevels.map((k) => {
          const pts = buildContour(k);
          if (pts.length < 2) return null;
          const d = pts
            .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
            .join(" ");
          const labelIdx = Math.round(pts.length * 0.28);
          const a = pts[Math.max(0, labelIdx - 1)];
          const b = pts[Math.min(pts.length - 1, labelIdx + 1)];
          const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
          const label = pts[labelIdx];
          return (
            <g key={k}>
              <path
                d={d}
                fill="none"
                stroke="hsl(var(--foreground) / 0.22)"
                strokeWidth={1}
              />
              {label && (
                <text
                  x={label.x}
                  y={label.y - 5}
                  transform={`rotate(${angle}, ${label.x}, ${label.y - 5})`}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={600}
                  className="fill-muted-foreground"
                  style={{ paintOrder: "stroke" }}
                  stroke="hsl(var(--background))"
                  strokeWidth={3}
                >
                  {k.toFixed(1)}
                </text>
              )}
            </g>
          );
        })}

        {/* Replacement-level contour (TFR = 2.1), emphasised */}
        {(() => {
          const pts = buildContour(2.1);
          if (pts.length < 2) return null;
          const d = pts
            .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
            .join(" ");
          const idx = Math.round(pts.length * 0.42);
          const a = pts[Math.max(0, idx - 1)];
          const b = pts[Math.min(pts.length - 1, idx + 1)];
          const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
          const label = pts[idx];
          return (
            <g>
              <path
                d={d}
                fill="none"
                stroke="hsl(var(--destructive))"
                strokeWidth={2.25}
              />
              {label && (
                <text
                  x={label.x}
                  y={label.y - 7}
                  transform={`rotate(${angle}, ${label.x}, ${label.y - 7})`}
                  textAnchor="middle"
                  fontSize={11.5}
                  fontWeight={700}
                  fill="hsl(var(--destructive))"
                  style={{ paintOrder: "stroke" }}
                  stroke="hsl(var(--background))"
                  strokeWidth={3}
                >
                  2.1 replacement level
                </text>
              )}
            </g>
          );
        })()}

        {/* Non-featured countries: small dots */}
        {others.map((r) => {
          const x = px(r.cpm);
          const y = py(r.tmrPct);
          return (
            <circle
              key={r.iso3}
              cx={x}
              cy={y}
              r={active?.iso3 === r.iso3 ? 5.5 : 3.5}
              fill="hsl(var(--primary))"
              fillOpacity={active?.iso3 === r.iso3 ? 0.95 : 0.55}
              stroke="hsl(var(--background))"
              strokeWidth={1}
              className="cursor-pointer transition-[r,fill-opacity]"
              tabIndex={0}
              role="button"
              aria-label={`${r.name}: total fertility rate ${r.tfr.toFixed(2)}. Click to pin label.`}
              onMouseEnter={() => setActive(r)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(r)}
              onBlur={() => setActive(null)}
              onClick={() => toggle(r)}
              onKeyDown={(e) => onMarkerKeyDown(e, r)}
            >
              <title>{markerTitle(r)}</title>
            </circle>
          );
        })}

        {/* Featured countries: flag + label */}
        {featured.map((r) => {
          const x = px(r.cpm);
          const y = py(r.tmrPct);
          const leftHalf = x < (plot.x0 + plot.x1) / 2;
          const isActive = active?.iso3 === r.iso3;
          return (
            <g
              key={r.iso3}
              className="cursor-pointer"
              tabIndex={0}
              role="button"
              aria-label={`${r.name}: total fertility rate ${r.tfr.toFixed(2)}. Click to unpin label.`}
              onMouseEnter={() => setActive(r)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(r)}
              onBlur={() => setActive(null)}
              onClick={() => toggle(r)}
              onKeyDown={(e) => onMarkerKeyDown(e, r)}
            >
              <title>{markerTitle(r)}</title>
              <circle
                cx={x}
                cy={y}
                r={isActive ? 12 : 9}
                fill="hsl(var(--background))"
                stroke="hsl(var(--border))"
                className="transition-[r]"
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={isActive ? 15 : 12}
                className="transition-[font-size]"
              >
                {countryFlag(r.iso2)}
              </text>
              <text
                x={leftHalf ? x + 14 : x - 14}
                y={y + 3.5 + (LABEL_DY[r.iso3] ?? 0)}
                textAnchor={leftHalf ? "start" : "end"}
                fontSize={11}
                fontWeight={isActive ? 700 : 500}
                className={isActive ? "fill-primary" : "fill-foreground"}
                style={{ paintOrder: "stroke" }}
                stroke="hsl(var(--background))"
                strokeWidth={3}
              >
                {r.name}
              </text>
            </g>
          );
        })}
      </svg>

      <div
        data-export-ignore
        className="mt-2 flex min-h-[2.25rem] items-center border-t border-border/70 pt-2 text-sm"
      >
        {active ? (
          <p className="flex flex-wrap items-baseline gap-x-2">
            <Link
              href={`/country/${active.slug}`}
              className="font-serif font-semibold text-primary hover:underline"
            >
              {countryFlag(active.iso2)} {active.name}
            </Link>
            <span className="text-muted-foreground">
              TFR {active.tfr.toFixed(2)} = {active.tmrPct.toFixed(1)}% of
              women becoming mothers × {active.cpm.toFixed(2)} children per
              mother
            </span>
            <span className="text-xs text-muted-foreground/80">
              ({active.year}, {active.source})
            </span>
          </p>
        ) : (
          <p className="text-muted-foreground">
            Hover for figures. Click a country — or use Add country — to pin
            or unpin its flag.
          </p>
        )}
      </div>
    </div>
  );
}

function markerTitle(r: TfrDecompositionRow): string {
  return `${r.name}: TFR ${r.tfr.toFixed(2)} = ${r.tmrPct.toFixed(1)}% mothers × ${r.cpm.toFixed(2)} children/mother (${r.year})`;
}

function countryFlag(iso2: string): string {
  if (!/^[A-Z]{2}$/i.test(iso2)) return "🏳️";
  const A = 0x1f1e6;
  const code = iso2.toUpperCase();
  return String.fromCodePoint(
    A + (code.charCodeAt(0) - 65),
    A + (code.charCodeAt(1) - 65),
  );
}
