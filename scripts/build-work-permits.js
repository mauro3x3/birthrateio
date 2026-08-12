#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Build Eurostat first residence permits for employment (migr_resfirst, reason=EMP)
 * by citizenship for major EU reporting countries. Writes a compact JSON seed file.
 *
 * Usage: node scripts/build-work-permits.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const GEOS = [
  "DE",
  "PL",
  "FR",
  "IT",
  "ES",
  "NL",
  "SE",
  "BE",
  "AT",
  "PT",
  "IE",
  "DK",
  "FI",
  "CZ",
  "HU",
  "RO",
  "SK",
  "HR",
  "LT",
  "LV",
  "EE",
  "SI",
  "BG",
  "EL",
  "LU",
];

const GEO_TO_ISO3 = {
  DE: "DEU",
  PL: "POL",
  FR: "FRA",
  IT: "ITA",
  ES: "ESP",
  NL: "NLD",
  SE: "SWE",
  BE: "BEL",
  AT: "AUT",
  PT: "PRT",
  IE: "IRL",
  DK: "DNK",
  FI: "FIN",
  CZ: "CZE",
  HU: "HUN",
  RO: "ROU",
  SK: "SVK",
  HR: "HRV",
  LT: "LTU",
  LV: "LVA",
  EE: "EST",
  SI: "SVN",
  BG: "BGR",
  EL: "GRC",
  LU: "LUX",
};

/** Aggregate / non-country citizenship codes to skip. */
const SKIP_CITIZEN = new Set([
  "TOTAL",
  "EU27_2020",
  "EU28",
  "EFTA",
  "NEU27_2020_FOR",
  "NEU_FOR",
  "EUR_NEU27_2020_FOR",
  "EUR",
  "AFR",
  "AME",
  "ASI",
  "OCE",
  "UNK",
  "FOR",
  "NAT",
  "STLS",
  "EXT_EU27_2020",
  "EXT_EU28",
  "NMS10",
  "NMS13",
]);

const TOP_N = 8;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
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

function posToCoords(pos, sizes) {
  const coords = [];
  let p = pos;
  for (let i = sizes.length - 1; i >= 0; i--) {
    coords.push(p % sizes[i]);
    p = Math.floor(p / sizes[i]);
  }
  return coords.reverse();
}

function parseDataset(d) {
  const ids = d.id;
  const sizes = d.size;
  const indexes = {};
  const labels = {};
  for (const k of ids) {
    indexes[k] = d.dimension[k].category.index;
    labels[k] = d.dimension[k].category.label;
  }
  const inv = {};
  for (const k of ids) {
    inv[k] = {};
    for (const [code, i] of Object.entries(indexes[k])) inv[k][i] = code;
  }

  /** year -> Map(citizenCode -> value) */
  const byYear = new Map();
  for (const [posStr, val] of Object.entries(d.value || {})) {
    const coords = posToCoords(Number(posStr), sizes);
    const keys = {};
    ids.forEach((dim, i) => {
      keys[dim] = inv[dim][coords[i]];
    });
    const cit = keys.citizen;
    if (SKIP_CITIZEN.has(cit)) continue;
    // Keep ISO-like codes (2–3 chars) and XK
    if (cit.length > 3 && !cit.includes("_")) continue;
    const year = Number(keys.time);
    if (!byYear.has(year)) byYear.set(year, new Map());
    byYear.get(year).set(cit, Number(val) || 0);
  }
  return { byYear, labels: labels.citizen || {} };
}

function compactCountry(byYear, citizenLabels) {
  const years = [...byYear.keys()].sort((a, b) => a - b);
  if (years.length === 0) return null;

  // Rank citizenships by sum of last up-to-5 years
  const recent = years.slice(-5);
  const totals = new Map();
  for (const y of recent) {
    for (const [c, v] of byYear.get(y)) {
      totals.set(c, (totals.get(c) || 0) + v);
    }
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const top = ranked.slice(0, TOP_N).map(([c]) => c);
  const topSet = new Set(top);

  const order = top.map((c) => citizenLabels[c] || c);
  order.push("Other");

  const yearsOut = [];
  for (const y of years) {
    const m = byYear.get(y);
    const groups = {};
    let other = 0;
    for (const [c, v] of m) {
      const name = citizenLabels[c] || c;
      if (topSet.has(c)) groups[name] = (groups[name] || 0) + v;
      else other += v;
    }
    for (const name of order) {
      if (name === "Other") groups[name] = other;
      else if (groups[name] == null) groups[name] = 0;
    }
    yearsOut.push({ year: y, groups });
  }

  return { order, years: yearsOut };
}

async function main() {
  const countries = [];
  for (const geo of GEOS) {
    const url =
      "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/migr_resfirst?" +
      new URLSearchParams({
        format: "JSON",
        lang: "en",
        geo,
        reason: "EMP",
        duration: "TOTAL",
        unit: "PER",
        freq: "A",
      }).toString();
    process.stdout.write(`Fetching ${geo}… `);
    try {
      const d = await fetchJson(url);
      const { byYear, labels } = parseDataset(d);
      const compact = compactCountry(byYear, labels);
      if (!compact || compact.years.length === 0) {
        console.log("no data");
        continue;
      }
      countries.push({
        iso3: GEO_TO_ISO3[geo],
        geo,
        ...compact,
      });
      console.log(
        `${compact.years.length} years, top: ${compact.order.slice(0, 3).join(", ")}`,
      );
    } catch (e) {
      console.log("FAIL", e.message);
    }
  }

  const out = {
    source: "Eurostat",
    dataset: "migr_resfirst",
    reason: "EMP",
    reasonLabel: "Employment reasons",
    definition:
      "First residence permits issued during the year to non-EU citizens for employment-related reasons, by citizenship of the permit holder. EU free-movement workers are not included. National administrative definitions of “employment” permits vary; figures are not identical to every country’s domestic “work permit” count.",
    sourceUrl:
      "https://ec.europa.eu/eurostat/databrowser/view/migr_resfirst/default/table",
    updated: new Date().toISOString().slice(0, 10),
    countries,
  };

  const dest = path.join(
    __dirname,
    "../src/lib/data/eurostat-work-permits-citizenship.json",
  );
  fs.writeFileSync(dest, JSON.stringify(out));
  console.log(
    `\nWrote ${dest} (${countries.length} countries, ${(fs.statSync(dest).size / 1024).toFixed(0)} KB)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
