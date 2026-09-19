#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Build Eurostat enforcement of immigration legislation series:
 *   migr_eiord — third-country nationals ordered to leave
 *   migr_eirtn — third-country nationals returned following an order
 * Plus derived return-rate = returns / orders × 100.
 *
 * Usage: node scripts/build-eurostat-returns.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const GEOS = [
  "DE", "PL", "FR", "IT", "ES", "NL", "SE", "BE", "AT", "PT", "IE", "DK",
  "FI", "CZ", "HU", "RO", "SK", "HR", "LT", "LV", "EE", "SI", "BG", "EL",
  "LU", "MT", "CY", "NO", "CH", "IS",
];

const GEO_TO_ISO3 = {
  DE: "DEU", PL: "POL", FR: "FRA", IT: "ITA", ES: "ESP", NL: "NLD",
  SE: "SWE", BE: "BEL", AT: "AUT", PT: "PRT", IE: "IRL", DK: "DNK",
  FI: "FIN", CZ: "CZE", HU: "HUN", RO: "ROU", SK: "SVK", HR: "HRV",
  LT: "LTU", LV: "LVA", EE: "EST", SI: "SVN", BG: "BGR", EL: "GRC",
  LU: "LUX", MT: "MLT", CY: "CYP", NO: "NOR", CH: "CHE", IS: "ISL",
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "birthrate.io/1.0" } }, (res) => {
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

/** Extract year → value for a single-geo Eurostat JSON-stat response. */
function yearValues(d) {
  const ids = d.id;
  const sizes = d.size;
  const indexes = {};
  for (const k of ids) indexes[k] = d.dimension[k].category.index;
  const inv = {};
  for (const k of ids) {
    inv[k] = {};
    for (const [code, i] of Object.entries(indexes[k])) inv[k][i] = code;
  }
  const out = new Map();
  for (const [posStr, val] of Object.entries(d.value || {})) {
    const coords = posToCoords(Number(posStr), sizes);
    const keys = {};
    ids.forEach((dim, i) => {
      keys[dim] = inv[dim][coords[i]];
    });
    const year = Number(keys.time);
    if (!Number.isFinite(year)) continue;
    out.set(year, Number(val) || 0);
  }
  return out;
}

async function fetchSeries(dataset, geo) {
  const url =
    `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${dataset}?` +
    new URLSearchParams({
      format: "JSON",
      lang: "en",
      geo,
      freq: "A",
    }).toString();
  const d = await fetchJson(url);
  return yearValues(d);
}

async function main() {
  const countries = {};
  for (const geo of GEOS) {
    process.stdout.write(`${geo}… `);
    try {
      const [orders, returns] = await Promise.all([
        fetchSeries("migr_eiord", geo),
        fetchSeries("migr_eirtn", geo),
      ]);
      const years = new Set([...orders.keys(), ...returns.keys()]);
      const orderedToLeave = [];
      const returnedAfterOrder = [];
      const returnRate = [];
      for (const y of [...years].sort((a, b) => a - b)) {
        const o = orders.get(y);
        const r = returns.get(y);
        if (o != null) orderedToLeave.push({ year: y, value: o });
        if (r != null) returnedAfterOrder.push({ year: y, value: r });
        if (o != null && o > 0 && r != null) {
          returnRate.push({
            year: y,
            value: Math.round((r / o) * 1000) / 10,
          });
        }
      }
      if (!orderedToLeave.length && !returnedAfterOrder.length) {
        console.log("no data");
        continue;
      }
      countries[GEO_TO_ISO3[geo]] = {
        orderedToLeave,
        returnedAfterOrder,
        returnRate,
      };
      console.log(
        `${orderedToLeave.length} order yrs / ${returnedAfterOrder.length} return yrs`,
      );
    } catch (e) {
      console.log("FAIL", e.message);
    }
  }

  const out = {
    source: "Eurostat",
    datasets: ["migr_eiord", "migr_eirtn"],
    definition:
      "Third-country nationals ordered to leave (migr_eiord) and returned following an order to leave (migr_eirtn), annual, rounded. Return rate = returns ÷ orders × 100 in the same calendar year — not a matched cohort.",
    sourceUrl:
      "https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Enforcement_of_immigration_legislation_statistics",
    updated: new Date().toISOString().slice(0, 10),
    countries,
  };

  const dest = path.join(__dirname, "../src/lib/data/eurostat-returns.json");
  fs.writeFileSync(dest, JSON.stringify(out));
  console.log(
    `\nWrote ${dest} (${Object.keys(countries).length} countries, ${(fs.statSync(dest).size / 1024).toFixed(0)} KB)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
