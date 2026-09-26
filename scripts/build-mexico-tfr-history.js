#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Mexico state TFR history from CONAPO / INEGI compilations (Wikipedia).
 *
 * Usage: node scripts/build-mexico-tfr-history.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const CATALOG = path.join(ROOT, "src/lib/data/subnational-maps.json");
const CACHE = path.join(ROOT, ".tmp/mex-tfr-wiki.html");
const WIKI = "https://en.wikipedia.org/wiki/List_of_Mexican_states_by_fertility_rate";

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

function stripTags(s) {
  return String(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

const ALIASES = {
  michoacandeocampo: "michoacan",
  coahuiladezaragoza: "coahuila",
  mexico: "mexicostate",
  estadodemexico: "mexicostate",
  queretaroarteaga: "queretaro",
  queretarodearteaga: "queretaro",
  veracruzdeignaciodelallave: "veracruz",
  ciudaddemexico: "mexicocity",
  distritofederal: "mexicocity",
};

function resolveCatalog(byNorm, name) {
  const n = norm(name);
  return byNorm.get(ALIASES[n] || n) || byNorm.get(n);
}

function parseTable(html) {
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
      ...rows[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi),
    ].map((m) => stripTags(m[1]));
    const yearCols = [];
    headerCells.forEach((h, i) => {
      const m = /(20\d{2})/.exec(h);
      if (m) yearCols.push({ year: Number(m[1]), col: i });
    });
    if (yearCols.length < 1) continue;
    for (const row of rows.slice(1)) {
      const cells = [
        ...row.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi),
      ].map((m) => stripTags(m[1]));
      // Usually Rank | State | year values — find first alpha cell after rank
      let name = null;
      let nameIdx = -1;
      for (let i = 0; i < cells.length; i++) {
        if (/^[A-Za-zÁÉÍÓÚáéíóúñÑ]/.test(cells[i]) && !/^\d/.test(cells[i])) {
          name = cells[i];
          nameIdx = i;
          break;
        }
      }
      if (!name || /mexico|total|national/i.test(name)) continue;
      const series = all.get(name) || {};
      for (const { year, col } of yearCols) {
        const v = Number((cells[col] || "").replace(/,/g, ""));
        if (Number.isFinite(v)) series[year] = v;
      }
      // Fallback: values after the name column in year order
      if (Object.keys(series).length === 0 && nameIdx >= 0) {
        yearCols.forEach((yc, j) => {
          const v = Number((cells[nameIdx + 1 + j] || "").replace(/,/g, ""));
          if (Number.isFinite(v)) series[yc.year] = v;
        });
      }
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
  const all = parseTable(html);
  console.log("parsed", all.size, "states");

  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const mex = catalog.maps.find((m) => m.id === "mex-tfr-2024");
  if (!mex) throw new Error("mex-tfr-2024 missing");
  const byNorm = new Map(mex.regions.map((r) => [norm(r.name), r]));

  const years = [...new Set([...all.values()].flatMap((s) => Object.keys(s).map(Number)))]
    .sort((a, b) => a - b)
    .filter((y) => y !== mex.year);

  const drop = new Set(years.map((y) => `mex-tfr-${y}`));
  const frames = [];
  for (const year of years) {
    const regions = [];
    for (const [name, series] of all) {
      if (series[year] == null) continue;
      const r = resolveCatalog(byNorm, name);
      if (!r) {
        console.warn("unmatched", name, "→", norm(name));
        continue;
      }
      regions.push({
        id: r.id,
        slug: r.slug,
        name: r.name,
        value: Math.round(series[year] * 100) / 100,
      });
    }
    if (regions.length < 28) {
      console.log("skip", year, regions.length);
      continue;
    }
    const vals = regions.map((r) => r.value);
    frames.push({
      id: `mex-tfr-${year}`,
      iso3: "MEX",
      country: "Mexico",
      title: `Total fertility rate, Mexico ${year}`,
      metric: "tfr",
      unit: "children per woman",
      kind: "state",
      year,
      national: null,
      source: `CONAPO / INEGI state total fertility rate, ${year} (via Wikipedia compilation).`,
      sourceUrl: WIKI,
      credit: null,
      geoUrl: mex.geoUrl,
      scale: "plasma",
      mid: 2.1,
      labelValues: true,
      note: "State TFR from CONAPO/INEGI compilations. Colour domain fixed (1–3.5) across years.",
      regions,
      min: Math.round(Math.min(...vals) * 100) / 100,
      max: Math.round(Math.max(...vals) * 100) / 100,
    });
    console.log(year, regions.length);
  }

  if (mex.note && !String(mex.note).includes("year scrubber")) {
    mex.note =
      String(mex.note).replace(/\.$/, "") +
      ". Earlier CONAPO/INEGI years are on the year scrubber.";
  }

  const maps = catalog.maps.filter((m) => !drop.has(m.id));
  maps.push(...frames);
  fs.writeFileSync(CATALOG, JSON.stringify({ maps }, null, 2) + "\n");
  console.log("wrote", frames.length, "mexico frames");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
