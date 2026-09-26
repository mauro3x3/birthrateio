#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Australia state/territory TFR history from ABS Births, Australia releases.
 *
 * Curated from the state TFR comparison tables on each annual release page
 * (single-year registration rates, matching the catalog 2023 figures).
 *
 * Usage: node scripts/build-australia-tfr-history.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CATALOG = path.join(ROOT, "src/lib/data/subnational-maps.json");

/** Year → { state name → TFR }. From ABS Births, Australia state tables. */
const HISTORY = {
  2010: {
    "New South Wales": 2.02,
    Victoria: 1.79,
    Queensland: 2.09,
    "South Australia": 1.9,
    "Western Australia": 1.94,
    Tasmania: 2.08,
    "Northern Territory": 2.12,
    "Australian Capital Territory": 1.78,
  },
  2011: {
    "New South Wales": 1.96,
    Victoria: 1.78,
    Queensland: 2.02,
    "South Australia": 1.87,
    "Western Australia": 1.92,
    Tasmania: 2.15,
    "Northern Territory": 2.15,
    "Australian Capital Territory": 1.74,
  },
  2012: {
    "New South Wales": 1.93,
    Victoria: 1.88,
    Queensland: 2.0,
    "South Australia": 1.9,
    "Western Australia": 1.92,
    Tasmania: 2.03,
    "Northern Territory": 2.16,
    "Australian Capital Territory": 1.78,
  },
  2014: {
    "New South Wales": 1.72,
    Victoria: 1.72,
    Queensland: 1.91,
    "South Australia": 1.85,
    "Western Australia": 1.91,
    Tasmania: 1.96,
    "Northern Territory": 2.04,
    "Australian Capital Territory": 1.74,
  },
  2020: {
    "New South Wales": 1.62,
    Victoria: 1.43,
    Queensland: 1.64,
    "South Australia": 1.59,
    "Western Australia": 1.7,
    Tasmania: 1.77,
    "Northern Territory": 1.86,
    "Australian Capital Territory": 1.52,
  },
  2021: {
    "New South Wales": 1.78,
    Victoria: 1.53,
    Queensland: 1.79,
    "South Australia": 1.66,
    "Western Australia": 1.75,
    Tasmania: 1.64,
    "Northern Territory": 1.82,
    "Australian Capital Territory": 1.45,
  },
  2022: {
    "New South Wales": 1.71,
    Victoria: 1.51,
    Queensland: 1.71,
    "South Australia": 1.62,
    "Western Australia": 1.62,
    Tasmania: 1.49,
    "Northern Territory": 1.73,
    "Australian Capital Territory": 1.41,
  },
  2024: {
    "New South Wales": 1.46,
    Victoria: 1.52,
    Queensland: 1.51,
    "South Australia": 1.46,
    "Western Australia": 1.43,
    Tasmania: 1.49,
    "Northern Territory": 1.63,
    "Australian Capital Territory": 1.27,
  },
};

const NATIONAL = {
  2010: 1.95,
  2011: 1.92,
  2012: 1.93,
  2014: 1.8,
  2020: 1.58,
  2021: 1.7,
  2022: 1.63,
  2024: 1.48,
};

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const aus = catalog.maps.find((m) => m.id === "aus-tfr");
  if (!aus) throw new Error("aus-tfr missing");
  const byNorm = new Map(aus.regions.map((r) => [norm(r.name), r]));

  const years = Object.keys(HISTORY)
    .map(Number)
    .sort((a, b) => a - b);
  const drop = new Set(years.map((y) => `aus-tfr-${y}`));
  const frames = [];
  for (const year of years) {
    if (year === aus.year) continue;
    const table = HISTORY[year];
    const regions = [];
    for (const [name, value] of Object.entries(table)) {
      const r = byNorm.get(norm(name));
      if (!r) continue;
      regions.push({
        id: r.id,
        slug: r.slug,
        name: r.name,
        value: Math.round(value * 100) / 100,
      });
    }
    if (regions.length < 8) {
      console.log("skip", year, regions.length);
      continue;
    }
    const vals = regions.map((r) => r.value);
    frames.push({
      id: `aus-tfr-${year}`,
      iso3: "AUS",
      country: "Australia",
      title: `Total fertility rate, Australia ${year}`,
      metric: "tfr",
      unit: "children per woman",
      kind: "state",
      year,
      national: NATIONAL[year] ?? null,
      source: `Australian Bureau of Statistics, Births, Australia, ${year} — total fertility rate by state and territory of usual residence.`,
      sourceUrl: `https://www.abs.gov.au/statistics/people/population/births-australia/${year}`,
      credit: null,
      geoUrl: aus.geoUrl,
      scale: "plasma",
      mid: 2.1,
      labelValues: true,
      note: "ABS state/territory TFR (year of registration). Colour domain fixed (1.2–2.3) across years.",
      regions,
      min: Math.round(Math.min(...vals) * 100) / 100,
      max: Math.round(Math.max(...vals) * 100) / 100,
    });
    console.log(year, regions.length, NATIONAL[year]);
  }

  if (aus.note && !String(aus.note).includes("year scrubber")) {
    aus.note =
      String(aus.note).replace(/\.$/, "") +
      ". Earlier ABS years are on the year scrubber.";
  } else if (!aus.note) {
    aus.note =
      "ABS state/territory TFR. Earlier years are on the year scrubber. Colour domain fixed (1.2–2.3).";
  }

  const maps = catalog.maps.filter((m) => !drop.has(m.id));
  maps.push(...frames);
  fs.writeFileSync(CATALOG, JSON.stringify({ maps }, null, 2) + "\n");
  console.log("wrote", frames.length, "australia frames");
}

main();
