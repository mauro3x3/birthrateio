#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Canada province/territory TFR history from StatCan table 13-10-0418.
 *
 * Usage: node scripts/build-canada-tfr-history.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const CATALOG = path.join(ROOT, "src/lib/data/subnational-maps.json");
const CACHE_DIR = path.join(ROOT, ".tmp/can-statcan");
const ZIP = path.join(ROOT, ".tmp/can-13100418.zip");
const CSV = path.join(CACHE_DIR, "13100418.csv");
const ZIP_URL = "https://www150.statcan.gc.ca/n1/tbl/csv/13100418-eng.zip";
const EMIT = [1991, 2001, 2011, 2016, 2020, 2022, 2023];

const GEO_MAP = {
  "Newfoundland and Labrador": "Newfoundland and Labrador",
  "Prince Edward Island": "Prince Edward Island",
  "Nova Scotia": "Nova Scotia",
  "New Brunswick": "New Brunswick",
  Quebec: "Quebec",
  Ontario: "Ontario",
  Manitoba: "Manitoba",
  Saskatchewan: "Saskatchewan",
  Alberta: "Alberta",
  "British Columbia": "British Columbia",
  Yukon: "Yukon",
  "Northwest Territories": "Northwest Territories",
  Nunavut: "Nunavut",
};

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "birthrate.io/1.0" } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchBuf(res.headers.location).then(resolve, reject);
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = splitCsv(lines[0]);
  const iDate = header.indexOf("REF_DATE");
  const iGeo = header.indexOf("GEO");
  const iChar = header.indexOf("Characteristics");
  const iVal = header.indexOf("VALUE");
  const byGeo = new Map();
  let national = {};
  for (const line of lines.slice(1)) {
    const cells = splitCsv(line);
    if (cells[iChar] !== "Total fertility rate per female") continue;
    const year = Number(cells[iDate]);
    const geoRaw = cells[iGeo] || "";
    const geo = geoRaw.replace(/, place of residence of mother$/i, "").trim();
    const v = Number(cells[iVal]);
    if (!Number.isFinite(year) || !Number.isFinite(v)) continue;
    if (geo === "Canada") {
      national[year] = v;
      continue;
    }
    if (geo.includes("including Nunavut")) continue;
    const name = GEO_MAP[geo];
    if (!name) continue;
    const series = byGeo.get(name) || {};
    series[year] = v;
    byGeo.set(name, series);
  }
  return { byGeo, national };
}

function splitCsv(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      q = !q;
      continue;
    }
    if (c === "," && !q) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

async function main() {
  if (!fs.existsSync(CSV)) {
    console.log("fetching StatCan 13-10-0418…");
    const buf = await fetchBuf(ZIP_URL);
    fs.mkdirSync(path.dirname(ZIP), { recursive: true });
    fs.writeFileSync(ZIP, buf);
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    execFileSync("unzip", ["-o", ZIP, "-d", CACHE_DIR], { stdio: "inherit" });
  }
  const { byGeo, national } = parseCsv(
    fs.readFileSync(CSV, "utf8").replace(/^\uFEFF/, ""),
  );
  console.log("parsed", byGeo.size, "areas");

  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const can = catalog.maps.find((m) => m.id === "can-tfr");
  if (!can) throw new Error("can-tfr missing");
  const byNorm = new Map(can.regions.map((r) => [norm(r.name), r]));

  const drop = new Set(EMIT.map((y) => `can-tfr-${y}`));
  const frames = [];
  for (const year of EMIT) {
    if (year === can.year) continue;
    const regions = [];
    for (const [name, series] of byGeo) {
      if (series[year] == null) continue;
      const r = byNorm.get(norm(name));
      if (!r) continue;
      regions.push({
        id: r.id,
        slug: r.slug,
        name: r.name,
        value: Math.round(series[year] * 100) / 100,
      });
    }
    if (regions.length < 10) {
      console.log("skip", year, regions.length);
      continue;
    }
    const vals = regions.map((r) => r.value);
    frames.push({
      id: `can-tfr-${year}`,
      iso3: "CAN",
      country: "Canada",
      title: `Total fertility rate, Canada ${year}`,
      metric: "tfr",
      unit: "children per woman",
      kind: "province",
      year,
      national: national[year] ?? null,
      source: `Statistics Canada table 13-10-0418 — total fertility rate by province and territory, ${year}.`,
      sourceUrl: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1310041801",
      credit: null,
      geoUrl: can.geoUrl,
      scale: "plasma",
      mid: 2.1,
      labelValues: true,
      note: "StatCan provincial/territorial TFR. Colour domain fixed (1–3.5) across years.",
      regions,
      min: Math.round(Math.min(...vals) * 100) / 100,
      max: Math.round(Math.max(...vals) * 100) / 100,
    });
    console.log(year, regions.length, national[year]);
  }

  if (can.note && !String(can.note).includes("year scrubber")) {
    can.note =
      String(can.note).replace(/\.$/, "") +
      ". Earlier StatCan years are on the year scrubber.";
  } else if (!can.note) {
    can.note =
      "Statistics Canada provincial TFR. Earlier years are on the year scrubber. Colour domain fixed (1–3.5).";
  }

  const maps = catalog.maps.filter((m) => !drop.has(m.id));
  maps.push(...frames);
  fs.writeFileSync(CATALOG, JSON.stringify({ maps }, null, 2) + "\n");
  console.log("wrote", frames.length, "canada frames");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
