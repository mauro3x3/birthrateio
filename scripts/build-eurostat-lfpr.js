#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Build Eurostat labour-force participation (activity rates) by citizenship
 * for nationals vs foreign citizens, ages 15–64 (lfsa_argan).
 *
 * Usage: node scripts/build-eurostat-lfpr.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const GEOS = [
  "DE", "PL", "FR", "IT", "ES", "NL", "SE", "BE", "AT", "PT", "IE", "DK",
  "FI", "CZ", "HU", "RO", "SK", "HR", "LT", "LV", "EE", "SI", "BG", "EL",
  "LU", "MT", "CY", "NO", "CH", "IS", "UK",
];

const GEO_TO_ISO3 = {
  DE: "DEU", PL: "POL", FR: "FRA", IT: "ITA", ES: "ESP", NL: "NLD",
  SE: "SWE", BE: "BEL", AT: "AUT", PT: "PRT", IE: "IRL", DK: "DNK",
  FI: "FIN", CZ: "CZE", HU: "HUN", RO: "ROU", SK: "SVK", HR: "HRV",
  LT: "LTU", LV: "LVA", EE: "EST", SI: "SVN", BG: "BGR", EL: "GRC",
  LU: "LUX", MT: "MLT", CY: "CYP", NO: "NOR", CH: "CHE", IS: "ISL",
  UK: "GBR",
};

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

function posToCoords(pos, sizes) {
  const coords = [];
  let p = pos;
  for (let i = sizes.length - 1; i >= 0; i--) {
    coords.push(p % sizes[i]);
    p = Math.floor(p / sizes[i]);
  }
  return coords.reverse();
}

function extractByCitizen(d) {
  const ids = d.id;
  const sizes = d.size;
  const indexes = {};
  for (const k of ids) indexes[k] = d.dimension[k].category.index;
  const inv = {};
  for (const k of ids) {
    inv[k] = {};
    for (const [code, i] of Object.entries(indexes[k])) inv[k][i] = code;
  }
  /** citizen -> Map(year -> value) */
  const byCit = new Map();
  for (const [posStr, val] of Object.entries(d.value || {})) {
    const coords = posToCoords(Number(posStr), sizes);
    const keys = {};
    ids.forEach((dim, i) => {
      keys[dim] = inv[dim][coords[i]];
    });
    const cit = keys.citizen || keys.citizen_group || keys.c_birth;
    const year = Number(keys.time);
    if (!cit || !Number.isFinite(year)) continue;
    if (!byCit.has(cit)) byCit.set(cit, new Map());
    byCit.get(cit).set(year, Number(val));
  }
  return byCit;
}

async function fetchGeo(geo) {
  // Activity rates by sex, age, citizenship and NUTS 2 region — use TOTAL sex, Y15-64.
  const url =
    "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lfsa_argan?" +
    new URLSearchParams({
      format: "JSON",
      lang: "en",
      geo,
      sex: "T",
      age: "Y15-64",
      unit: "PC",
      freq: "A",
    }).toString();
  const d = await fetchJson(url);
  return extractByCitizen(d);
}

function toPoints(m) {
  if (!m) return [];
  return [...m.entries()]
    .filter(([, v]) => Number.isFinite(v))
    .sort((a, b) => a[0] - b[0])
    .map(([year, value]) => ({ year, value }));
}

async function main() {
  const countries = {};
  for (const geo of GEOS) {
    process.stdout.write(`${geo}… `);
    try {
      const byCit = await fetchGeo(geo);
      // Eurostat codes: NAT = nationals, FOR = foreign citizens, TOTAL = all
      const nat = byCit.get("NAT") || byCit.get("NAT_CTZ");
      const for_ = byCit.get("FOR") || byCit.get("FOR_CTZ") || byCit.get("N_NAT");
      const nationals = toPoints(nat);
      const foreignCitizens = toPoints(for_);
      if (!nationals.length && !foreignCitizens.length) {
        console.log("no NAT/FOR (", [...byCit.keys()].slice(0, 8).join(","), ")");
        continue;
      }
      countries[GEO_TO_ISO3[geo]] = { nationals, foreignCitizens };
      console.log(
        `NAT ${nationals.length} / FOR ${foreignCitizens.length}`,
      );
    } catch (e) {
      console.log("FAIL", e.message);
    }
  }

  const out = {
    source: "Eurostat",
    dataset: "lfsa_argan",
    definition:
      "Activity (labour-force participation) rates of nationals and foreign citizens aged 15–64, Eurostat Labour Force Survey. Citizenship ≠ foreign-born; naturalised immigrants count as nationals.",
    sourceUrl:
      "https://ec.europa.eu/eurostat/databrowser/view/lfsa_argan/default/table",
    updated: new Date().toISOString().slice(0, 10),
    countries,
  };

  const dest = path.join(__dirname, "../src/lib/data/eurostat-lfpr-citizenship.json");
  fs.writeFileSync(dest, JSON.stringify(out));
  console.log(
    `\nWrote ${dest} (${Object.keys(countries).length} countries, ${(fs.statSync(dest).size / 1024).toFixed(0)} KB)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
