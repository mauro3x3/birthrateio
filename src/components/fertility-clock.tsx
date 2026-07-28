"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface FertilityClockProps {
  /** Mid-year population estimate for `asOfYear`. */
  population: number;
  /** Year the population figure refers to (mid-year assumed). */
  asOfYear: number;
  /** Annual population growth rate (%). */
  growthRatePct: number;
  /** Crude birth rate per 1,000 people per year. */
  birthRate: number;
  /** Crude death rate per 1,000 people per year. */
  deathRate: number;
  /** Total fertility rate (births per woman), optional display only. */
  tfr: number | null;
  tfrYear: number | null;
  birthRateYear: number;
  deathRateYear: number;
  growthYear: number;
}

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

function midYearMs(year: number): number {
  // World Bank / UN mid-year convention ≈ July 1.
  return Date.UTC(year, 6, 1);
}

function formatInt(n: number): string {
  return Math.floor(n).toLocaleString("en-US");
}

function formatRate(n: number, decimals = 1): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function ClockCell({
  label,
  value,
  sub,
  accent,
  large,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "up" | "down" | "neutral";
  large?: boolean;
}) {
  return (
    <div
      className={cn(
        "border border-border/80 bg-white px-4 py-5 sm:px-5 sm:py-6",
        large && "sm:col-span-2 lg:col-span-2",
      )}
    >
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-sans tabular-nums tracking-tight text-foreground",
          large
            ? "text-4xl font-bold sm:text-5xl md:text-6xl"
            : "text-2xl font-semibold sm:text-3xl",
          accent === "up" && "text-[hsl(155_45%_28%)]",
          accent === "down" && "text-[hsl(4_65%_42%)]",
        )}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">{sub}</p>
      )}
    </div>
  );
}

/**
 * Live demographic clock. Extrapolates from latest annual World Bank / UN
 * rates — illustrative only, not an official live registry.
 *
 * Method:
 * - Population: compound-growth from mid-year estimate using annual growth %.
 * - Births/deaths this year & today: apply crude rates (per 1,000) to the
 *   live population estimate; prorate by fraction of calendar year elapsed
 *   (today) or full year (this year run-rate).
 */
export function FertilityClock(props: FertilityClockProps) {
  const {
    population: basePop,
    asOfYear,
    growthRatePct,
    birthRate,
    deathRate,
    tfr,
    tfrYear,
    birthRateYear,
    deathRateYear,
    growthYear,
  } = props;

  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, []);

  const growth = growthRatePct / 100;
  const baseMs = midYearMs(asOfYear);
  const yearsElapsed = (now - baseMs) / MS_PER_YEAR;
  const livePop = basePop * Math.pow(1 + growth, yearsElapsed);

  // Instantaneous annual flows from crude rates applied to live population.
  const birthsPerYear = livePop * (birthRate / 1000);
  const deathsPerYear = livePop * (deathRate / 1000);
  const netPerYear = birthsPerYear - deathsPerYear;

  const yearStart = Date.UTC(new Date(now).getUTCFullYear(), 0, 1);
  const yearFraction = Math.max(0, (now - yearStart) / MS_PER_YEAR);
  const dayStart = Date.UTC(
    new Date(now).getUTCFullYear(),
    new Date(now).getUTCMonth(),
    new Date(now).getUTCDate(),
  );
  const dayFraction = Math.max(0, (now - dayStart) / (24 * 60 * 60 * 1000));

  const birthsToday = birthsPerYear * (dayFraction / 365.25);
  const deathsToday = deathsPerYear * (dayFraction / 365.25);
  const birthsYtd = birthsPerYear * yearFraction;
  const deathsYtd = deathsPerYear * yearFraction;
  const netYtd = birthsYtd - deathsYtd;
  const netToday = birthsToday - deathsToday;

  const perSecond = {
    births: birthsPerYear / (365.25 * 24 * 3600),
    deaths: deathsPerYear / (365.25 * 24 * 3600),
    net: netPerYear / (365.25 * 24 * 3600),
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
        <ClockCell
          large
          label="World population (estimated)"
          value={formatInt(livePop)}
          sub={`Extrapolated from ${formatInt(basePop)} mid-${asOfYear} at ${formatRate(growthRatePct, 2)}% / yr (${growthYear})`}
        />
        <ClockCell
          large
          label="Net change this year"
          value={`${netYtd >= 0 ? "+" : ""}${formatInt(netYtd)}`}
          sub={`≈ ${formatRate(perSecond.net, 1)} people / second · today ${netToday >= 0 ? "+" : ""}${formatInt(netToday)}`}
          accent={netYtd >= 0 ? "up" : "down"}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ClockCell
          label="Births today"
          value={formatInt(birthsToday)}
          sub={`${formatRate(perSecond.births, 1)} / sec`}
          accent="up"
        />
        <ClockCell
          label="Deaths today"
          value={formatInt(deathsToday)}
          sub={`${formatRate(perSecond.deaths, 1)} / sec`}
          accent="down"
        />
        <ClockCell
          label="Births this year"
          value={formatInt(birthsYtd)}
          sub={`Run-rate ${formatInt(birthsPerYear)} / yr`}
          accent="up"
        />
        <ClockCell
          label="Deaths this year"
          value={formatInt(deathsYtd)}
          sub={`Run-rate ${formatInt(deathsPerYear)} / yr`}
          accent="down"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ClockCell
          label="Crude birth rate"
          value={`${formatRate(birthRate, 1)}`}
          sub={`per 1,000 · ${birthRateYear}`}
        />
        <ClockCell
          label="Crude death rate"
          value={`${formatRate(deathRate, 1)}`}
          sub={`per 1,000 · ${deathRateYear}`}
        />
        <ClockCell
          label="Total fertility rate"
          value={tfr != null ? formatRate(tfr, 2) : "—"}
          sub={
            tfr != null
              ? `births per woman · ${tfrYear}`
              : "not available for World"
          }
        />
      </div>
    </div>
  );
}
