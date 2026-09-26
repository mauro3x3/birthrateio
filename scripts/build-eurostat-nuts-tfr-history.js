#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Eurostat NUTS-2 TFR history frames for the Europe provinces tab.
 *
 * Shares eu-prov-tfr.json geometry. Years with sparse coverage are skipped.
 *
 * Usage: node scripts/build-eurostat-nuts-tfr-history.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const CATALOG = path.join(ROOT, "src/lib/data/subnational-maps.json");
const CACHE = path.join(ROOT, ".tmp-map-build");
const YEARS = [2014, 2016, 2018, 2020, 2022, 2023];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "birthrate.io/1.0" } }, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

async function cached(url, name) {
  fs.mkdirSync(CACHE, { recursive: true });
  const dest = path.join(CACHE, name);
  if (fs.existsSync(dest)) return JSON.parse(fs.readFileSync(dest, "utf8"));
  const data = await fetchJson(url);
  fs.writeFileSync(dest, JSON.stringify(data));
  return data;
}

function parseEurostat(payload) {
  const geoIdx = payload.dimension?.geo?.category?.index || {};
  const timeIdx = payload.dimension?.time?.category?.index || {};
  const size = payload.size || [];
  // Typical dims: freq, unit, indic_de, geo, time — verify order
  const id = payload.id || [];
  const geoDim = id.indexOf("geo");
  const timeDim = id.indexOf("time");
  if (geoDim < 0 || timeDim < 0) throw new Error("unexpected eurostat dims " + id);

  const out = new Map(); // year -> Map(nuts, value)
  for (const [key, raw] of Object.entries(payload.value || {})) {
    const idx = Number(key);
    if (!Number.isFinite(idx) || raw == null) continue;
    // Decode flat index into dim coordinates
    let rem = idx;
    const coords = [];
    for (let d = size.length - 1; d >= 0; d--) {
      const s = size[d];
      coords[d] = rem % s;
      rem = Math.floor(rem / s);
    }
    const geoPos = coords[geoDim];
    const timePos = coords[timeDim];
    const nuts = Object.entries(geoIdx).find(([, i]) => i === geoPos)?.[0];
    const year = Number(
      Object.entries(timeIdx).find(([, i]) => i === timePos)?.[0],
    );
    if (!nuts || !Number.isFinite(year)) continue;
    if (!out.has(year)) out.set(year, new Map());
    out.get(year).set(nuts, Number(raw));
  }
  return out;
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const latest = catalog.maps.find((m) => m.id === "eu-prov-tfr");
  if (!latest) throw new Error("eu-prov-tfr missing");

  // Map slug eu-be10 → BE10
  const slugToNuts = new Map();
  for (const r of latest.regions) {
    const m = /^eu-([a-z0-9]+)$/i.exec(r.slug);
    if (m) slugToNuts.set(r.slug, m[1].toUpperCase());
  }

  const times = YEARS.map((y) => `time=${y}`).join("&");
  const url =
    "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_r_find3?" +
    `format=JSON&lang=EN&indic_de=TOTFERRT&unit=NR&${times}`;
  console.log("fetching Eurostat…");
  const payload = await cached(url, "eurostat-demo_r_find3-history.json");
  const byYear = parseEurostat(payload);
  console.log(
    "years in payload",
    [...byYear.keys()].sort((a, b) => a - b).join(", "),
  );

  const drop = new Set(YEARS.map((y) => `eu-prov-tfr-${y}`));
  const frames = [];
  for (const year of YEARS) {
    const table = byYear.get(year);
    if (!table) {
      console.log(`  ${year}: no data`);
      continue;
    }
    const regions = [];
    for (const r of latest.regions) {
      const nuts = slugToNuts.get(r.slug);
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
    if (regions.length < 80) {
      console.log(`  ${year}: only ${regions.length} — skip`);
      continue;
    }
    const vals = regions.map((x) => x.value);
    frames.push({
      id: `eu-prov-tfr-${year}`,
      iso3: "EU",
      country: "Europe",
      title: `Total fertility rate, Europe by NUTS 2 region ${year}`,
      metric: "tfr",
      unit: "children per woman",
      kind: "province",
      year,
      national: null,
      source: `Eurostat demo_r_find3 — total fertility rate by NUTS 2 region, ${year}.`,
      sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/demo_r_find3",
      credit: null,
      geoUrl: latest.geoUrl,
      scale: "plasma",
      mid: 2.1,
      labelValues: false,
      note:
        "Eurostat NUTS 2 TFR. UK / non-NUTS fillers from the latest frame are omitted in historic years. Colour domain fixed (1–3) across years.",
      tab: "Provinces",
      regions,
      min: Math.round(Math.min(...vals) * 100) / 100,
      max: Math.round(Math.max(...vals) * 100) / 100,
    });
    console.log(
      `  ${year}: ${regions.length} regions [${Math.min(...vals).toFixed(2)}–${Math.max(...vals).toFixed(2)}]`,
    );
  }

  if (latest.note && !latest.note.includes("historic years")) {
    latest.note =
      latest.note.replace(/\.$/, "") +
      ". Scrub earlier Eurostat years (2014–2023) on the same geography.";
  }

  const maps = catalog.maps.filter((m) => !drop.has(m.id));
  maps.push(...frames);
  fs.writeFileSync(CATALOG, JSON.stringify({ maps }, null, 2) + "\n");
  console.log(`wrote ${frames.length} eu-prov frames`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
