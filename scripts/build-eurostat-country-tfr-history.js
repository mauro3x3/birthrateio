#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Eurostat TFR history for individual EU country maps (NUTS slugs like fra-frf2).
 * Reuses the cached demo_r_find3 extract from build-eurostat-nuts-tfr-history.js.
 *
 * Usage: node scripts/build-eurostat-country-tfr-history.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CATALOG = path.join(ROOT, "src/lib/data/subnational-maps.json");
const CACHE = path.join(ROOT, ".tmp-map-build");
const YEARS = [2014, 2016, 2018, 2020, 2022, 2023];

const EU_COUNTRY_IDS = [
  "fra-tfr",
  "ita-tfr",
  "esp-tfr",
  "pol-tfr",
  "nld-tfr",
  "swe-tfr",
  "aut-tfr",
  "bel-tfr",
  "bgr-tfr",
  "hrv-tfr",
  "cze-tfr",
  "dnk-tfr",
  "fin-tfr",
  "deu-tfr",
  "grc-tfr",
  "hun-tfr",
  "irl-tfr",
  "prt-tfr",
  "rou-tfr",
  "svk-tfr",
];

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

function nutsFromSlug(slug, prefix) {
  // fra-frf2 → FRF2 ; deu-de1 → DE1
  const re = new RegExp(`^${prefix}-(.+)$`, "i");
  const m = re.exec(slug);
  return m ? m[1].toUpperCase() : null;
}

function main() {
  const cachePath = path.join(CACHE, "eurostat-demo_r_find3-history.json");
  if (!fs.existsSync(cachePath)) {
    console.error("Run build-eurostat-nuts-tfr-history.js first (needs cache).");
    process.exit(1);
  }
  const byYear = parseEurostat(JSON.parse(fs.readFileSync(cachePath, "utf8")));
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const byId = Object.fromEntries(catalog.maps.map((m) => [m.id, m]));
  const drop = new Set();
  const frames = [];

  for (const catalogId of EU_COUNTRY_IDS) {
    const latest = byId[catalogId];
    if (!latest) {
      console.log("skip missing", catalogId);
      continue;
    }
    const prefix = catalogId.replace(/-tfr$/, "");
    let added = 0;
    for (const year of YEARS) {
      if (year === latest.year) continue;
      const table = byYear.get(year);
      if (!table) continue;
      const regions = [];
      for (const r of latest.regions) {
        const nuts = nutsFromSlug(r.slug, prefix);
        if (!nuts) continue;
        const v = table.get(nuts);
        if (v == null || !Number.isFinite(v)) continue;
        regions.push({
          id: r.id,
          slug: r.slug,
          name: r.name,
          value: Math.round(v * 100) / 100,
        });
      }
      const minMatch = Math.max(3, Math.floor(latest.regions.length * 0.6));
      if (regions.length < minMatch) continue;
      const id = `${catalogId}-${year}`;
      drop.add(id);
      const vals = regions.map((x) => x.value);
      frames.push({
        id,
        iso3: latest.iso3,
        country: latest.country,
        title: `Total fertility rate, ${latest.country} ${year}`,
        metric: "tfr",
        unit: "children per woman",
        kind: latest.kind,
        year,
        national: null,
        source: `Eurostat demo_r_find3 — total fertility rate by region, ${year}.`,
        sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/demo_r_find3",
        credit: null,
        geoUrl: latest.geoUrl,
        scale: "plasma",
        mid: 2.1,
        labelValues: latest.labelValues !== false,
        note:
          (latest.note || "Eurostat regional TFR.") +
          " Colour domain fixed across years on the scrubber.",
        regions,
        min: Math.round(Math.min(...vals) * 100) / 100,
        max: Math.round(Math.max(...vals) * 100) / 100,
      });
      added++;
    }
    console.log(`${latest.iso3}: +${added} years`);
    if (latest.note && !String(latest.note).includes("scrubber")) {
      latest.note =
        String(latest.note).replace(/\.$/, "") +
        ". Earlier Eurostat years are on the year scrubber.";
    }
  }

  const maps = catalog.maps.filter((m) => !drop.has(m.id));
  maps.push(...frames);
  fs.writeFileSync(CATALOG, JSON.stringify({ maps }, null, 2) + "\n");
  console.log(`wrote ${frames.length} country-region frames`);
}

main();
