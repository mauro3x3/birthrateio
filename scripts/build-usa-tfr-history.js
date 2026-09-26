#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * US state TFR history from NCHS tables (Wikipedia compilation).
 *
 * Usage: node scripts/build-usa-tfr-history.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const CATALOG = path.join(ROOT, "src/lib/data/subnational-maps.json");
const CACHE = path.join(ROOT, ".tmp/usa-tfr-wiki.html");
const WIKI =
  "https://en.wikipedia.org/wiki/List_of_U.S._states_and_territories_by_fertility_rate";
const EMIT = [2008, 2010, 2012, 2014, 2016, 2018, 2020, 2021, 2022, 2024];
const SKIP = /guam|samoa|mariana|puerto rico|virgin islands|^total/i;

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "birthrate.io/1.0" } }, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      })
      .on("error", reject);
  });
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function stripTags(s) {
  return String(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTables(html) {
  const tables = [
    ...html.matchAll(
      /<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/gi,
    ),
  ].map((m) => m[1]);
  const all = new Map();
  for (const t of tables) {
    const rows = [...t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]);
    if (!rows.length) continue;
    const headerCells = [
      ...rows[0].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi),
    ].map((m) => stripTags(m[1]));
    const years = [];
    for (const h of headerCells) {
      const m = /TFR\s*(20\d{2})/i.exec(h);
      if (m) years.push(Number(m[1]));
    }
    if (!years.length) continue;
    for (const row of rows.slice(1)) {
      const cells = [
        ...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi),
      ].map((m) => stripTags(m[1]));
      const name = cells[0];
      if (!name || SKIP.test(name)) continue;
      const series = all.get(name) || {};
      years.forEach((y, i) => {
        const raw = (cells[i + 1] || "").replace(/[–—]/g, "").trim();
        const v = Number(raw);
        if (Number.isFinite(v)) series[y] = v;
      });
      all.set(name, series);
    }
  }
  return all;
}

async function main() {
  let html;
  if (fs.existsSync(CACHE)) html = fs.readFileSync(CACHE, "utf8");
  else {
    html = await fetchText(WIKI);
    fs.mkdirSync(path.dirname(CACHE), { recursive: true });
    fs.writeFileSync(CACHE, html);
  }
  const all = parseTables(html);
  console.log("parsed", all.size, "areas");

  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const usa = catalog.maps.find((m) => m.id === "usa-tfr");
  if (!usa) throw new Error("usa-tfr missing");
  const byNorm = new Map(usa.regions.map((r) => [norm(r.name), r]));
  const drop = new Set(EMIT.map((y) => `usa-tfr-${y}`));
  const frames = [];
  for (const year of EMIT) {
    if (year === usa.year) continue;
    const regions = [];
    for (const [name, series] of all) {
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
    if (regions.length < 40) {
      console.log("skip", year, regions.length);
      continue;
    }
    const vals = regions.map((r) => r.value);
    frames.push({
      id: `usa-tfr-${year}`,
      iso3: "USA",
      country: "United States",
      title: `Total fertility rate, United States ${year}`,
      metric: "tfr",
      unit: "children per woman",
      kind: "state",
      year,
      national: null,
      source: `NCHS / CDC Births: Final Data for ${year} — total fertility rate by state (via Wikipedia compilation of NCHS tables).`,
      sourceUrl: "https://www.cdc.gov/nchs/nvss/births.htm",
      credit: null,
      geoUrl: usa.geoUrl,
      scale: "plasma",
      mid: 2.1,
      labelValues: true,
      note: "NCHS state TFR. Colour domain fixed (1–3.5) across years.",
      regions,
      min: Math.round(Math.min(...vals) * 100) / 100,
      max: Math.round(Math.max(...vals) * 100) / 100,
    });
    console.log(year, regions.length);
  }
  if (usa.note && !String(usa.note).includes("Earlier NCHS")) {
    usa.note =
      String(usa.note).replace(/\.$/, "") +
      ". Earlier NCHS years are on the year scrubber.";
  }
  const maps = catalog.maps.filter((m) => !drop.has(m.id));
  maps.push(...frames);
  fs.writeFileSync(CATALOG, JSON.stringify({ maps }, null, 2) + "\n");
  console.log("wrote", frames.length, "usa frames");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
