#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Germany NUTS-1 (Land) TFR history from Eurostat demo_r_find3.
 * Catalog slugs are english names (germany-bavaria), not NUTS codes.
 *
 * Usage: node scripts/build-germany-tfr-history.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CATALOG = path.join(ROOT, "src/lib/data/subnational-maps.json");
const CACHE = path.join(
  ROOT,
  ".tmp-map-build/eurostat-demo_r_find3-history.json",
);
const YEARS = [2014, 2016, 2018, 2020, 2022, 2023];

const NAME_TO_NUTS = {
  "baden-wurttemberg": "DE1",
  bavaria: "DE2",
  bayern: "DE2",
  berlin: "DE3",
  brandenburg: "DE4",
  bremen: "DE5",
  hamburg: "DE6",
  hesse: "DE7",
  hessen: "DE7",
  "mecklenburg-western pomerania": "DE8",
  "mecklenburg-vorpommern": "DE8",
  "lower saxony": "DE9",
  niedersachsen: "DE9",
  "north rhine-westphalia": "DEA",
  "nordrhein-westfalen": "DEA",
  "rhineland-palatinate": "DEB",
  "rheinland-pfalz": "DEB",
  saarland: "DEC",
  saxony: "DED",
  sachsen: "DED",
  "saxony-anhalt": "DEE",
  "sachsen-anhalt": "DEE",
  "schleswig-holstein": "DEF",
  thuringia: "DEG",
  thuringen: "DEG",
  thüringen: "DEG",
};

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseEurostat(payload) {
  const geoIdx = payload.dimension?.geo?.category?.index || {};
  const timeIdx = payload.dimension?.time?.category?.index || {};
  const size = payload.size || [];
  const id = payload.id || [];
  const geoDim = id.indexOf("geo");
  const timeDim = id.indexOf("time");
  const out = new Map();
  for (const [key, raw] of Object.entries(payload.value || {})) {
    const idx = Number(key);
    if (!Number.isFinite(idx) || raw == null) continue;
    let rem = idx;
    const coords = [];
    for (let d = size.length - 1; d >= 0; d--) {
      coords[d] = rem % size[d];
      rem = Math.floor(rem / size[d]);
    }
    const nuts = Object.entries(geoIdx).find(([, i]) => i === coords[geoDim])?.[0];
    const year = Number(
      Object.entries(timeIdx).find(([, i]) => i === coords[timeDim])?.[0],
    );
    if (!nuts || !Number.isFinite(year)) continue;
    if (!out.has(year)) out.set(year, new Map());
    out.get(year).set(nuts, Number(raw));
  }
  return out;
}

function nutsForRegion(r) {
  const stem = r.slug.replace(/^germany-/, "").replace(/-/g, " ");
  const key = norm(stem);
  for (const [name, code] of Object.entries(NAME_TO_NUTS)) {
    if (norm(name) === key) return code;
  }
  // try name field
  const n = norm(r.name);
  for (const [name, code] of Object.entries(NAME_TO_NUTS)) {
    if (norm(name) === n) return code;
  }
  return null;
}

function main() {
  if (!fs.existsSync(CACHE)) {
    console.error("Run build-eurostat-nuts-tfr-history.js first.");
    process.exit(1);
  }
  const byYear = parseEurostat(JSON.parse(fs.readFileSync(CACHE, "utf8")));
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const deu = catalog.maps.find((m) => m.id === "deu-tfr");
  if (!deu) throw new Error("deu-tfr missing");

  const drop = new Set(YEARS.map((y) => `deu-tfr-${y}`));
  const frames = [];
  for (const year of YEARS) {
    if (year === deu.year) continue;
    const table = byYear.get(year);
    if (!table) continue;
    const regions = [];
    for (const r of deu.regions) {
      const nuts = nutsForRegion(r);
      if (!nuts) {
        console.warn("unmatched", r.slug, r.name);
        continue;
      }
      const v = table.get(nuts);
      if (v == null || !Number.isFinite(v)) continue;
      regions.push({
        id: r.id,
        slug: r.slug,
        name: r.name,
        value: Math.round(v * 1000) / 1000,
      });
    }
    if (regions.length < 12) {
      console.log("skip", year, regions.length);
      continue;
    }
    const vals = regions.map((x) => x.value);
    frames.push({
      id: `deu-tfr-${year}`,
      iso3: "DEU",
      country: "Germany",
      title: `Total fertility rate, Germany ${year}`,
      metric: "tfr",
      unit: "children per woman",
      kind: "state",
      year,
      national: null,
      source: `Eurostat demo_r_find3 — total fertility rate by NUTS 1 Land, Germany ${year}.`,
      sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/demo_r_find3",
      credit: null,
      geoUrl: deu.geoUrl,
      scale: "plasma",
      mid: 2.1,
      labelValues: true,
      note: "Eurostat NUTS 1 (Land) TFR. Colour domain fixed (1–2.5) across years.",
      regions,
      min: Math.round(Math.min(...vals) * 1000) / 1000,
      max: Math.round(Math.max(...vals) * 1000) / 1000,
    });
    console.log(year, regions.length);
  }

  if (deu.note && !String(deu.note).includes("year scrubber")) {
    deu.note =
      String(deu.note).replace(/\.$/, "") +
      ". Earlier Eurostat years are on the year scrubber.";
  }

  const maps = catalog.maps.filter((m) => !drop.has(m.id));
  maps.push(...frames);
  fs.writeFileSync(CATALOG, JSON.stringify({ maps }, null, 2) + "\n");
  console.log("wrote", frames.length, "germany frames");
}

main();
