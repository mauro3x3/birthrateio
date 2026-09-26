#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Türkiye NUTS-2 TFR history from Eurostat demo_r_find3.
 * Shares tur-tfr.json geometry.
 *
 * Usage: node scripts/build-turkey-tfr-history.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const CATALOG = path.join(ROOT, "src/lib/data/subnational-maps.json");
const CACHE = path.join(ROOT, ".tmp-map-build/eurostat-demo_r_find3-turkey.json");
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

function parseEurostat(payload) {
  const geoIdx = payload.dimension?.geo?.category?.index || {};
  const timeIdx = payload.dimension?.time?.category?.index || {};
  const size = payload.size || [];
  const id = payload.id || [];
  const geoDim = id.indexOf("geo");
  const timeDim = id.indexOf("time");
  if (geoDim < 0 || timeDim < 0) throw new Error("unexpected eurostat dims " + id);

  const out = new Map();
  for (const [key, raw] of Object.entries(payload.value || {})) {
    const idx = Number(key);
    if (!Number.isFinite(idx) || raw == null) continue;
    let rem = idx;
    const coords = [];
    for (let d = size.length - 1; d >= 0; d--) {
      const s = size[d];
      coords[d] = rem % s;
      rem = Math.floor(rem / s);
    }
    const nuts = Object.entries(geoIdx).find(([, i]) => i === coords[geoDim])?.[0];
    const year = Number(
      Object.entries(timeIdx).find(([, i]) => i === coords[timeDim])?.[0],
    );
    if (!nuts || !nuts.startsWith("TR") || !Number.isFinite(year)) continue;
    if (!out.has(year)) out.set(year, new Map());
    out.get(year).set(nuts, Number(raw));
  }
  return out;
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const tur = catalog.maps.find((m) => m.id === "tur-tfr");
  if (!tur) throw new Error("tur-tfr missing");

  const slugToNuts = new Map();
  for (const r of tur.regions) {
    const m = /^tur-(tr[a-z0-9]+)$/i.exec(r.slug);
    if (m) slugToNuts.set(r.slug, m[1].toUpperCase());
  }

  let payload;
  if (fs.existsSync(CACHE)) {
    payload = JSON.parse(fs.readFileSync(CACHE, "utf8"));
  } else {
    const times = YEARS.map((y) => `time=${y}`).join("&");
    const url =
      "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_r_find3?" +
      `format=JSON&lang=EN&indic_de=TOTFERRT&unit=NR&geoLevel=nuts2&${times}`;
    // Broader fetch without geoLevel filter — filter TR in parse
    const urlAll =
      "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_r_find3?" +
      `format=JSON&lang=EN&indic_de=TOTFERRT&unit=NR&${times}`;
    console.log("fetching Eurostat…");
    payload = await fetchJson(urlAll);
    fs.mkdirSync(path.dirname(CACHE), { recursive: true });
    fs.writeFileSync(CACHE, JSON.stringify(payload));
  }

  const byYear = parseEurostat(payload);
  const drop = new Set(YEARS.map((y) => `tur-tfr-${y}`));
  const frames = [];
  for (const year of YEARS) {
    if (year === tur.year) continue;
    const table = byYear.get(year);
    if (!table) {
      console.log(year, "no data");
      continue;
    }
    const regions = [];
    for (const r of tur.regions) {
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
    if (regions.length < 20) {
      console.log("skip", year, regions.length);
      continue;
    }
    const vals = regions.map((x) => x.value);
    frames.push({
      id: `tur-tfr-${year}`,
      iso3: "TUR",
      country: "Türkiye",
      title: `Total fertility rate, Türkiye ${year}`,
      metric: "tfr",
      unit: "children per woman",
      kind: "province",
      year,
      national: null,
      source: `Eurostat demo_r_find3 — total fertility rate by NUTS 2 region, Türkiye ${year}.`,
      sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/demo_r_find3",
      credit: null,
      geoUrl: tur.geoUrl,
      scale: "plasma",
      mid: 2.1,
      labelValues: true,
      note: "Eurostat NUTS 2 TFR for Türkiye. Colour domain fixed (1–4) across years.",
      regions,
      min: Math.round(Math.min(...vals) * 100) / 100,
      max: Math.round(Math.max(...vals) * 100) / 100,
    });
    console.log(year, regions.length);
  }

  if (tur.note && !String(tur.note).includes("year scrubber")) {
    tur.note =
      String(tur.note).replace(/\.$/, "") +
      ". Earlier Eurostat years are on the year scrubber.";
  } else if (!tur.note) {
    tur.note =
      "Eurostat NUTS 2 TFR. Earlier years are on the year scrubber. Colour domain fixed (1–4).";
  }

  const maps = catalog.maps.filter((m) => !drop.has(m.id));
  maps.push(...frames);
  fs.writeFileSync(CATALOG, JSON.stringify({ maps }, null, 2) + "\n");
  console.log("wrote", frames.length, "turkey frames");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
