#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * India state/UT TFR history from NFHS-3 (2005–06) and NFHS-4 (2015–16).
 * Shares ind-tfr.json with the catalog NFHS-5 (2019–21) frame.
 *
 * Figures from IIPS/MoHFW NFHS national reports, Table 4.3.
 *
 * Usage: node scripts/build-india-tfr-history.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CATALOG = path.join(ROOT, "src/lib/data/subnational-maps.json");

/** NFHS-4 (2015–16) TFR by state/UT. */
const NFHS4 = {
  India: 2.18,
  Chandigarh: 1.57,
  Delhi: 1.78,
  Haryana: 2.05,
  "Himachal Pradesh": 1.88,
  "Jammu and Kashmir": 2.01,
  Punjab: 1.62,
  Rajasthan: 2.4,
  Uttarakhand: 2.07,
  Chhattisgarh: 2.23,
  "Madhya Pradesh": 2.32,
  "Uttar Pradesh": 2.74,
  Bihar: 3.41,
  Jharkhand: 2.55,
  Odisha: 2.05,
  "West Bengal": 1.77,
  "Arunachal Pradesh": 2.1,
  Assam: 2.21,
  Manipur: 2.61,
  Meghalaya: 3.04,
  Mizoram: 2.27,
  Nagaland: 2.74,
  Sikkim: 1.17,
  Tripura: 1.68,
  "Dadra and Nagar Haveli": 2.32,
  "Daman and Diu": 1.68,
  Goa: 1.66,
  Gujarat: 2.03,
  Maharashtra: 1.87,
  "Andaman and Nicobar Islands": 1.44,
  "Andhra Pradesh": 1.83,
  Karnataka: 1.8,
  Kerala: 1.56,
  Lakshadweep: 1.82,
  Puducherry: 1.7,
  "Tamil Nadu": 1.7,
  Telangana: 1.78,
};

/** NFHS-3 (2005–06) TFR where published. */
const NFHS3 = {
  India: 2.68,
  Delhi: 2.13,
  Haryana: 2.69,
  "Himachal Pradesh": 1.94,
  "Jammu and Kashmir": 2.38,
  Punjab: 1.99,
  Rajasthan: 3.21,
  Uttarakhand: 2.55,
  Chhattisgarh: 2.62,
  "Madhya Pradesh": 3.12,
  "Uttar Pradesh": 3.82,
  Bihar: 4.0,
  Jharkhand: 3.31,
  Odisha: 2.37,
  "West Bengal": 2.27,
  "Arunachal Pradesh": 3.03,
  Assam: 2.42,
  Manipur: 2.83,
  Meghalaya: 3.8,
  Mizoram: 2.86,
  Nagaland: 3.74,
  Sikkim: 2.02,
  Tripura: 2.22,
  Goa: 1.79,
  Gujarat: 2.42,
  Maharashtra: 2.11,
  Karnataka: 2.07,
  Kerala: 1.93,
  "Tamil Nadu": 1.8,
};

const FRAMES = [
  {
    year: 2005,
    table: NFHS3,
    national: 2.68,
    label: "NFHS-3 (2005–06)",
    source:
      "IIPS/MoHFW, National Family Health Survey (NFHS-3), 2005–06 — total fertility rate by state/union territory (Table 4.3).",
    sourceUrl: "https://dhsprogram.com/publications/publication-frind3-dhs-final-reports.cfm",
  },
  {
    year: 2015,
    table: NFHS4,
    national: 2.18,
    label: "NFHS-4 (2015–16)",
    source:
      "IIPS/MoHFW, National Family Health Survey (NFHS-4), 2015–16 — total fertility rate by state/union territory (Table 4.3).",
    sourceUrl: "https://dhsprogram.com/publications/publication-fr339-dhs-final-reports.cfm",
  },
];

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Map survey labels onto current catalog geography. */
function resolveValue(table, catalogName) {
  const n = norm(catalogName);
  if (table[catalogName] != null) return table[catalogName];
  for (const [k, v] of Object.entries(table)) {
    if (norm(k) === n) return v;
  }
  // Merged UT: use population-ish midpoint of the two NFHS-4 figures when both exist
  if (n.includes("dadra") && n.includes("daman")) {
    const a = table["Dadra and Nagar Haveli"];
    const b = table["Daman and Diu"];
    if (a != null && b != null) return Math.round(((a + b) / 2) * 100) / 100;
    return a ?? b ?? null;
  }
  // Ladakh was inside J&K in NFHS-3/4
  if (n === "ladakh") return table["Jammu and Kashmir"] ?? null;
  return null;
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const ind = catalog.maps.find((m) => m.id === "ind-tfr");
  if (!ind) throw new Error("ind-tfr missing");

  const drop = new Set(FRAMES.map((f) => `ind-tfr-${f.year}`));
  const frames = [];
  for (const f of FRAMES) {
    const regions = [];
    for (const r of ind.regions) {
      const v = resolveValue(f.table, r.name);
      if (v == null) continue;
      regions.push({
        id: r.id,
        slug: r.slug,
        name: r.name,
        value: Math.round(v * 100) / 100,
      });
    }
    if (regions.length < 20) {
      console.log("skip", f.year, regions.length);
      continue;
    }
    const vals = regions.map((x) => x.value);
    frames.push({
      id: `ind-tfr-${f.year}`,
      iso3: "IND",
      country: "India",
      title: `Total fertility rate, India ${f.year}`,
      metric: "tfr",
      unit: "children per woman",
      kind: "state",
      year: f.year,
      national: f.national,
      source: f.source,
      sourceUrl: f.sourceUrl,
      credit: null,
      geoUrl: ind.geoUrl,
      scale: "plasma",
      mid: 2.1,
      labelValues: true,
      note: `${f.label} TFR for the three years before interview. Ladakh uses the Jammu & Kashmir figure; Dadra and Nagar Haveli and Daman and Diu uses the mean of the two NFHS-4 UTs. Colour domain fixed (1–5) across years.`,
      regions,
      min: Math.round(Math.min(...vals) * 100) / 100,
      max: Math.round(Math.max(...vals) * 100) / 100,
    });
    console.log(f.year, regions.length, f.national);
  }

  if (ind.note && !String(ind.note).includes("year scrubber")) {
    ind.note =
      String(ind.note).replace(/\.$/, "") +
      ". Earlier NFHS rounds are on the year scrubber.";
  }

  const maps = catalog.maps.filter((m) => !drop.has(m.id));
  maps.push(...frames);
  fs.writeFileSync(CATALOG, JSON.stringify({ maps }, null, 2) + "\n");
  console.log("wrote", frames.length, "india frames");
}

main();
