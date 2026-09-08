"use client";

import * as React from "react";
import { expandFiveYearToSingleYear } from "@/lib/pyramid-animation";
import { formatCompact, formatNumber } from "@/lib/utils";

/** Paper, matching `--background`. Concrete hex so GIF/PNG export stays crisp. */
export const CINEMA_BG = "#fbfcfd";
export const CINEMA_W = 900;
export const CINEMA_H = 640;
export const CINEMA_ASPECT = `${CINEMA_W} / ${CINEMA_H}`;

/** Same male / female pair as `PopulationPyramid`. */
const MALE = "hsl(211 62% 45%)";
const FEMALE = "hsl(344 62% 52%)";
const TEXT = "hsl(210 28% 12%)";
const MUTED = "hsl(210 10% 38%)";
const AXIS = "hsl(210 14% 72%)";
const FONT =
  'var(--font-sans), "Open Sans", Arial, Helvetica, sans-serif';

const PAD_X = 28;
const HEADER_H = 28;
const FOOTER_H = 36;
const SPINE = 44;

export function PyramidLegend({
  year,
  total,
  maleTotal,
  femaleTotal,
}: {
  year: number;
  total: number;
  maleTotal: number;
  femaleTotal: number;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3 px-0.5 text-xs">
      <span className="flex items-center gap-1.5 font-medium" style={{ color: MALE }}>
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: MALE }} />
        Male
        <span className="tabular-nums text-muted-foreground">
          {formatCompact(maleTotal)}
        </span>
      </span>
      <span className="text-center text-muted-foreground">
        <span className="font-serif text-base font-semibold tabular-nums tracking-tight text-foreground">
          {year}
        </span>
        <span className="ml-2">
          Total{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatCompact(total)}
          </span>
        </span>
      </span>
      <span className="flex items-center gap-1.5 font-medium" style={{ color: FEMALE }}>
        <span className="tabular-nums text-muted-foreground">
          {formatCompact(femaleTotal)}
        </span>
        Female
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: FEMALE }} />
      </span>
    </div>
  );
}

export function CinematicPyramid({
  country,
  year,
  male,
  female,
  maxValue,
  watermark = "birthrate.io",
}: {
  country: string;
  year: number;
  male: number[];
  female: number[];
  maxValue: number;
  watermark?: string;
}) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [hover, setHover] = React.useState<{
    age: number;
    male: number;
    female: number;
  } | null>(null);

  const expanded = React.useMemo(
    () => expandFiveYearToSingleYear(male, female),
    [male, female],
  );

  const chartTop = HEADER_H;
  const chartBottom = CINEMA_H - FOOTER_H;
  const chartH = chartBottom - chartTop;
  const center = CINEMA_W / 2;
  const leftEdge = PAD_X;
  const rightEdge = CINEMA_W - PAD_X;
  const leftW = center - SPINE / 2 - leftEdge;
  const rightW = rightEdge - (center + SPINE / 2);
  const n = expanded.male.length;
  const slot = chartH / n;
  const barH = slot;
  const scale = maxValue > 0 ? 1 / maxValue : 0;

  const ageY = (age: number) => chartBottom - (age + 0.5) * slot;

  const toViewBox = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * CINEMA_W,
      y: ((clientY - rect.top) / rect.height) * CINEMA_H,
    };
  };

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const loc = toViewBox(e.clientX, e.clientY);
    if (!loc) return;
    if (loc.y < chartTop || loc.y > chartBottom) {
      setHover(null);
      return;
    }
    const age = Math.max(
      0,
      Math.min(n - 1, Math.floor((chartBottom - loc.y) / slot)),
    );
    setHover({
      age,
      male: expanded.male[age] ?? 0,
      female: expanded.female[age] ?? 0,
    });
  };

  let maleD = "";
  let femaleD = "";
  for (let age = 0; age < n; age++) {
    const y = chartBottom - (age + 1) * slot + (slot - barH) / 2;
    const mw = Math.max(0, (expanded.male[age] ?? 0) * scale * leftW);
    const fw = Math.max(0, (expanded.female[age] ?? 0) * scale * rightW);
    if (mw > 0.4) {
      maleD += `M${(center - SPINE / 2 - mw).toFixed(2)} ${y.toFixed(2)}h${mw.toFixed(2)}v${barH.toFixed(2)}h${(-mw).toFixed(2)}z`;
    }
    if (fw > 0.4) {
      femaleD += `M${(center + SPINE / 2).toFixed(2)} ${y.toFixed(2)}h${fw.toFixed(2)}v${barH.toFixed(2)}h${(-fw).toFixed(2)}z`;
    }
  }

  const ageLabels: React.ReactNode[] = [];
  for (let age = 0; age <= 100; age += 10) {
    const y = ageY(age);
    const label = age === 100 ? "100+" : String(age);
    ageLabels.push(
      <text
        key={age}
        x={center}
        y={y + 3.5}
        textAnchor="middle"
        fill={MUTED}
        fontSize={11}
        fontFamily={FONT}
      >
        {label}
      </text>,
    );
  }

  const scaleLabel = formatCompact(Math.round(maxValue));
  const hoverY = hover ? ageY(hover.age) : 0;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CINEMA_W} ${CINEMA_H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${country} population pyramid, ${year}`}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
      style={{
        width: "100%",
        height: "auto",
        aspectRatio: CINEMA_ASPECT,
        display: "block",
        background: CINEMA_BG,
      }}
    >
      <rect width={CINEMA_W} height={CINEMA_H} fill={CINEMA_BG} />

      {hover && (
        <text
          x={center}
          y={18}
          fill={TEXT}
          fontSize={12}
          fontFamily={FONT}
          textAnchor="middle"
        >
          Age {hover.age === 100 ? "100+" : hover.age}
          <tspan fill={MALE}>
            {"  "}
            {formatNumber(
              Math.round(hover.age === 100 ? hover.male * 5 : hover.male),
              0,
            )}
          </tspan>
          <tspan fill={MUTED}> · </tspan>
          <tspan fill={FEMALE}>
            {formatNumber(
              Math.round(hover.age === 100 ? hover.female * 5 : hover.female),
              0,
            )}
          </tspan>
        </text>
      )}

      {hover && (
        <rect
          x={leftEdge}
          y={hoverY - slot / 2}
          width={rightEdge - leftEdge}
          height={slot}
          fill="hsl(210 14% 12% / 0.05)"
        />
      )}

      <path d={maleD} fill={MALE} shapeRendering="geometricPrecision" />
      <path d={femaleD} fill={FEMALE} shapeRendering="geometricPrecision" />

      <rect
        x={center - SPINE / 2}
        y={chartTop}
        width={SPINE}
        height={chartH}
        fill={CINEMA_BG}
      />
      <line
        x1={center}
        y1={chartTop}
        x2={center}
        y2={chartBottom}
        stroke={AXIS}
        strokeWidth={1}
      />
      {ageLabels}

      <line
        x1={leftEdge}
        y1={chartBottom}
        x2={rightEdge}
        y2={chartBottom}
        stroke={AXIS}
        strokeWidth={1}
      />

      <text
        x={leftEdge}
        y={chartBottom + 20}
        fill={MUTED}
        fontSize={11}
        fontFamily={FONT}
      >
        {scaleLabel}
      </text>
      <text
        x={center}
        y={chartBottom + 20}
        fill={MUTED}
        fontSize={11}
        fontFamily={FONT}
        textAnchor="middle"
      >
        Age
      </text>
      <text
        x={rightEdge}
        y={chartBottom + 20}
        fill={MUTED}
        fontSize={11}
        fontFamily={FONT}
        textAnchor="end"
      >
        {scaleLabel}
      </text>
      <text
        x={center}
        y={CINEMA_H - 8}
        fill={MUTED}
        fontSize={10}
        fontFamily={FONT}
        textAnchor="middle"
        opacity={0.7}
      >
        {watermark}
      </text>
    </svg>
  );
}
