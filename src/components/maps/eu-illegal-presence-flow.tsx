"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCompact, formatNumber } from "@/lib/utils";
import {
  ILLEGAL_PRESENCE,
  annualTotal,
  cumulativeThrough,
  originsForYear,
  type IllegalPresenceOrigin,
} from "@/lib/sources/eurostat-illegal-presence-data";

const GEOJSON_URL =
  "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson";

const EU27 = new Set([
  "AUT", "BEL", "BGR", "HRV", "CYP", "CZE", "DNK", "EST", "FIN", "FRA",
  "DEU", "GRC", "HUN", "IRL", "ITA", "LVA", "LTU", "LUX", "MLT", "NLD",
  "POL", "PRT", "ROU", "SVK", "SVN", "ESP", "SWE",
]);

const VIEW = { minLng: -25, maxLng: 125, minLat: -35, maxLat: 72 };
/** Cap for the full cumulative run — earlier years add fewer figures. */
const MAX_PARTICLES = 9000;
const YEAR_MS = 1600;

type Particle = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  cx: number;
  cy: number;
  born: number;
  duration: number;
  citizen: string;
  year: number;
};

type GeoFeature = {
  type: string;
  properties?: Record<string, unknown>;
  geometry?: {
    type: string;
    coordinates: unknown;
  };
};

function isoOf(f: GeoFeature): string | undefined {
  const p = f.properties ?? {};
  for (const k of ["ISO_A3", "ISO_A3_EH", "ADM0_A3"]) {
    const v = p[k];
    if (typeof v === "string" && v.length === 3 && v !== "-99") return v;
  }
  return undefined;
}

function project(
  lng: number,
  lat: number,
  w: number,
  h: number,
): [number, number] {
  const padX = w * 0.04;
  const padY = h * 0.06;
  const x =
    padX +
    ((lng - VIEW.minLng) / (VIEW.maxLng - VIEW.minLng)) * (w - 2 * padX);
  const y =
    padY +
    ((VIEW.maxLat - lat) / (VIEW.maxLat - VIEW.minLat)) * (h - 2 * padY);
  return [x, y];
}

function bezier(
  t: number,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
): [number, number] {
  const u = 1 - t;
  return [
    u * u * x0 + 2 * u * t * cx + t * t * x1,
    u * u * y0 + 2 * u * t * cy + t * t * y1,
  ];
}

function drawStick(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  accent: boolean,
  alpha: number,
) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = accent ? "#c45c26" : "#1a1f26";
  ctx.beginPath();
  ctx.arc(x, y - 3.2, 1.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 0.7, y - 1.7, 1.4, 3.4);
  ctx.fillRect(x - 1.3, y + 1.6, 0.9, 2.2);
  ctx.fillRect(x + 0.4, y + 1.6, 0.9, 2.2);
  ctx.globalAlpha = 1;
}

function ring(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Fixed scale so the full 2008→end run fills ~MAX_PARTICLES. */
function peoplePerParticle(): number {
  const years = ILLEGAL_PRESENCE.years;
  const finalYear = years[years.length - 1]!;
  const total = cumulativeThrough(finalYear);
  return Math.max(
    ILLEGAL_PRESENCE.peoplePerParticleDefault,
    Math.ceil(total / MAX_PARTICLES),
  );
}

function particlesForYear(
  origins: IllegalPresenceOrigin[],
  year: number,
  w: number,
  h: number,
  landings: number[][],
  now: number,
  /** If true, particles appear already landed (for rebuild / scrub). */
  instant: boolean,
  peoplePer: number,
  budgetLeft: number,
): Particle[] {
  const particles: Particle[] = [];
  let seed = year * 10007 + 1;
  for (const o of origins) {
    let n = Math.max(0, Math.round(o.value / peoplePer));
    if (n === 0 && o.value >= peoplePer * 0.4) n = 1;
    if (n === 0) continue;
    const [ox, oy] = project(o.lng, o.lat, w, h);
    for (let i = 0; i < n && particles.length < budgetLeft; i++) {
      const rnd = ring(++seed * 9973 + o.value + i);
      const land = landings[Math.floor(rnd() * landings.length)]!;
      const [dx, dy] = project(
        land[0]! + (rnd() - 0.5) * 6,
        land[1]! + (rnd() - 0.5) * 4,
        w,
        h,
      );
      const x0 = ox + (rnd() - 0.5) * 14;
      const y0 = oy + (rnd() - 0.5) * 10;
      const midX = (x0 + dx) / 2 + (rnd() - 0.5) * 80;
      const midY = Math.min(y0, dy) - 40 - rnd() * 90;
      const duration = 1100 + rnd() * 1000;
      particles.push({
        x0,
        y0,
        x1: dx,
        y1: dy,
        cx: midX,
        cy: midY,
        born: instant ? now - duration - 100 : now + rnd() * 500,
        duration,
        citizen: o.citizen,
        year,
      });
    }
  }
  return particles;
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  ringCoords: number[][],
  w: number,
  h: number,
) {
  if (!ringCoords.length) return;
  const [lng0, lat0] = ringCoords[0]!;
  const [x0, y0] = project(lng0, lat0, w, h);
  ctx.moveTo(x0, y0);
  for (let i = 1; i < ringCoords.length; i++) {
    const [lng, lat] = ringCoords[i]!;
    const [x, y] = project(lng, lat, w, h);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function paintMap(
  ctx: CanvasRenderingContext2D,
  features: GeoFeature[],
  w: number,
  h: number,
) {
  ctx.fillStyle = "#f3f1eb";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(0,0,0,0.015)";
  for (let i = 0; i < 80; i++) {
    ctx.fillRect((i * 97) % w, (i * 53) % h, 2, 2);
  }

  for (const f of features) {
    const iso = isoOf(f);
    if (!iso || iso === "ATA") continue;
    const g = f.geometry;
    if (!g) continue;
    const isEu = EU27.has(iso);
    ctx.beginPath();
    if (g.type === "Polygon") {
      for (const r of g.coordinates as number[][][]) {
        drawPolygon(ctx, r, w, h);
      }
    } else if (g.type === "MultiPolygon") {
      for (const poly of g.coordinates as number[][][][]) {
        for (const r of poly) drawPolygon(ctx, r, w, h);
      }
    } else continue;

    if (isEu) {
      ctx.fillStyle = "rgba(196, 92, 38, 0.22)";
      ctx.fill();
      ctx.strokeStyle = "rgba(196, 92, 38, 0.55)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(26, 31, 38, 0.04)";
      ctx.fill();
      ctx.strokeStyle = "rgba(26, 31, 38, 0.12)";
      ctx.lineWidth = 0.45;
      ctx.stroke();
    }
  }
}

export function EuIllegalPresenceFlow({
  className,
}: {
  className?: string;
}) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const mapCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const particlesRef = React.useRef<Particle[]>([]);
  /** Highest year index already represented in the particle cloud. */
  const builtThroughRef = React.useRef(-1);
  const yearIdxRef = React.useRef(0);
  const playingRef = React.useRef(true);
  const lastYearSwitchRef = React.useRef(0);
  const sizeRef = React.useRef({ w: 0, h: 0 });
  const peoplePer = React.useMemo(() => peoplePerParticle(), []);

  const years = ILLEGAL_PRESENCE.years;
  const [yearIdx, setYearIdx] = React.useState(0);
  const [playing, setPlaying] = React.useState(true);
  const [ready, setReady] = React.useState(false);
  const year = years[yearIdx] ?? years[0]!;

  const origins = originsForYear(year);
  const top = origins.slice(0, 5);
  const topCitizen = top[0]?.citizen ?? null;
  const yearTotal = annualTotal(year);
  const cumulative = cumulativeThrough(year);

  const rebuildThrough = React.useCallback(
    (throughIdx: number, animateLast: boolean) => {
      const { w, h } = sizeRef.current;
      if (w <= 0 || h <= 0) return;
      const now = performance.now();
      const landings = ILLEGAL_PRESENCE.euLandings;
      const next: Particle[] = [];
      for (let i = 0; i <= throughIdx; i++) {
        const y = years[i]!;
        const instant = !(animateLast && i === throughIdx);
        const budget = MAX_PARTICLES - next.length;
        if (budget <= 0) break;
        next.push(
          ...particlesForYear(
            originsForYear(y),
            y,
            w,
            h,
            landings,
            now,
            instant,
            peoplePer,
            budget,
          ),
        );
      }
      particlesRef.current = next;
      builtThroughRef.current = throughIdx;
    },
    [peoplePer, years],
  );

  const appendYear = React.useCallback(
    (idx: number) => {
      const { w, h } = sizeRef.current;
      if (w <= 0 || h <= 0) return;
      const y = years[idx]!;
      const budget = MAX_PARTICLES - particlesRef.current.length;
      if (budget <= 0) {
        builtThroughRef.current = idx;
        return;
      }
      const added = particlesForYear(
        originsForYear(y),
        y,
        w,
        h,
        ILLEGAL_PRESENCE.euLandings,
        performance.now(),
        false,
        peoplePer,
        budget,
      );
      particlesRef.current = particlesRef.current.concat(added);
      builtThroughRef.current = idx;
    },
    [peoplePer, years],
  );

  // Load geo + size
  React.useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    async function setup() {
      const res = await fetch(GEOJSON_URL);
      const geo = (await res.json()) as { features: GeoFeature[] };
      if (cancelled) return;

      const resize = () => {
        if (!wrap || !canvas) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = wrap.clientWidth;
        const h = Math.max(480, Math.round(w * 0.62));
        sizeRef.current = { w, h };
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const map = document.createElement("canvas");
        map.width = canvas.width;
        map.height = canvas.height;
        const mctx = map.getContext("2d");
        if (mctx) {
          mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          paintMap(mctx, geo.features, w, h);
          mapCanvasRef.current = map;
        }
        // Keep cloud through current year after resize (reproject).
        rebuildThrough(Math.max(0, yearIdxRef.current), false);
        setReady(true);
      };

      resize();
      const ro = new ResizeObserver(resize);
      if (wrap) ro.observe(wrap);
      return () => ro.disconnect();
    }

    let cleanup: (() => void) | undefined;
    setup().then((c) => {
      cleanup = c;
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [rebuildThrough]);

  // Year changes: append forward, rebuild on scrub/back/loop
  React.useEffect(() => {
    if (!ready) return;
    const prev = builtThroughRef.current;
    yearIdxRef.current = yearIdx;

    if (yearIdx === prev) return;

    if (yearIdx === prev + 1) {
      // Continuous buildup — only fly in the new year.
      appendYear(yearIdx);
      return;
    }

    if (yearIdx < prev || yearIdx === 0) {
      // Scrub backward or loop — rebuild landed cloud through this year.
      rebuildThrough(yearIdx, yearIdx === 0);
      return;
    }

    // Scrub jumped forward — land prior years instantly, animate the last.
    rebuildThrough(yearIdx, true);
  }, [yearIdx, ready, appendYear, rebuildThrough]);

  React.useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  // Animation loop
  React.useEffect(() => {
    if (!ready) return;
    let raf = 0;
    const tick = (now: number) => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      const map = mapCanvasRef.current;
      if (!canvas || !wrap) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const { w, h } = sizeRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        raf = requestAnimationFrame(tick);
        return;
      }

      if (playingRef.current) {
        if (!lastYearSwitchRef.current) lastYearSwitchRef.current = now;
        if (now - lastYearSwitchRef.current >= YEAR_MS) {
          lastYearSwitchRef.current = now;
          setYearIdx((i) => (i + 1 >= years.length ? 0 : i + 1));
        }
      } else {
        lastYearSwitchRef.current = now;
      }

      if (map) ctx.drawImage(map, 0, 0, w, h);
      else {
        ctx.fillStyle = "#f3f1eb";
        ctx.fillRect(0, 0, w, h);
      }

      const accent = topCitizen;
      // Draw landed (older) first, then in-flight on top.
      const parts = particlesRef.current;
      for (const p of parts) {
        const age = now - p.born;
        if (age < 0) continue;
        const t = Math.min(1, age / p.duration);
        if (t < 1) continue;
        const [x, y] = bezier(1, p.x0, p.y0, p.cx, p.cy, p.x1, p.y1);
        drawStick(ctx, x, y, p.citizen === accent, 0.72);
      }
      for (const p of parts) {
        const age = now - p.born;
        if (age < 0) continue;
        const t = Math.min(1, age / p.duration);
        if (t >= 1) continue;
        const ease = t * (2 - t);
        const [x, y] = bezier(ease, p.x0, p.y0, p.cx, p.cy, p.x1, p.y1);
        drawStick(ctx, x, y, p.citizen === accent, 0.55 + 0.35 * t);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, years.length, topCitizen]);

  const progress =
    years.length <= 1 ? 1 : yearIdx / Math.max(1, years.length - 1);

  return (
    <section className={className}>
      <div
        ref={wrapRef}
        className="relative overflow-hidden border border-border bg-[#f3f1eb]"
      >
        <canvas ref={canvasRef} className="block w-full" aria-hidden />

        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-md">
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                EU-27 · {years[0]}–{years[years.length - 1]}
              </p>
              <h2 className="mt-1 font-serif text-xl font-semibold leading-tight tracking-tight text-primary md:text-2xl lg:text-3xl">
                Found illegally present in the{" "}
                <span className="text-[#c45c26]">European Union</span>
              </h2>
              <p className="mt-2 max-w-sm text-[0.7rem] leading-relaxed text-muted-foreground md:text-xs">
                {ILLEGAL_PRESENCE.definition} Each year&apos;s figures fly in and
                stay — the cloud builds through the period.
              </p>
              <p className="mt-2 text-[0.65rem] text-muted-foreground">
                · each figure ≈ {formatNumber(peoplePer, 0)} people
              </p>
            </div>
            <div className="text-right">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Year
              </p>
              <p className="font-serif text-4xl font-semibold tabular-nums text-primary md:text-5xl lg:text-6xl">
                {year}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="pointer-events-auto flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="bg-white/80"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </Button>
              <input
                type="range"
                min={0}
                max={years.length - 1}
                value={yearIdx}
                onChange={(e) => {
                  setPlaying(false);
                  setYearIdx(Number(e.target.value));
                }}
                className="h-1.5 w-40 accent-[#c45c26] md:w-56"
                aria-label="Year"
              />
            </div>

            <div className="text-center md:flex-1">
              <p className="font-serif text-3xl font-semibold tabular-nums tracking-tight text-primary md:text-4xl lg:text-5xl">
                {formatNumber(cumulative, 0)}
              </p>
              <p className="mt-1 text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                Cumulative detections · all shown years through {year}
              </p>
              <div className="mx-auto mt-2 h-1.5 max-w-md overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full bg-[#c45c26] transition-[width] duration-500"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className="mt-1 text-[0.65rem] text-muted-foreground">
                {formatCompact(yearTotal)} this year
              </p>
            </div>

            <div className="min-w-[11rem] self-end rounded-sm bg-white/75 px-3 py-2 backdrop-blur-sm">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#c45c26]">
                Top origins · {year}
              </p>
              <ol className="mt-1.5 space-y-0.5">
                {top.map((o, i) => (
                  <li
                    key={o.citizen}
                    className="flex items-baseline justify-between gap-3 text-xs"
                  >
                    <span
                      className={
                        i === 0
                          ? "font-medium text-[#c45c26]"
                          : "text-foreground"
                      }
                    >
                      <span className="mr-1.5 tabular-nums text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {o.name}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatNumber(o.value, 0)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f3f1eb] text-sm text-muted-foreground">
            Loading flow map…
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Source:{" "}
        <a
          href={ILLEGAL_PRESENCE.sourceUrl}
          className="link-editorial"
          target="_blank"
          rel="noopener noreferrer"
        >
          {ILLEGAL_PRESENCE.source}
        </a>
        . Not a stock of unauthorised residents — only people detected by
        authorities that year.
      </p>
    </section>
  );
}
