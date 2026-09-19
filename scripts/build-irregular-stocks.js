#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Build MIrreM / Zenodo irregular migrant stock estimates.
 * Downloads the public XLSX and picks one estimate per country-year
 * (prefer “All irregular” groups + CentralEstimate / mid of low–high).
 *
 * Usage: node scripts/build-irregular-stocks.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const { execSync } = require("child_process");

const NAME_TO_ISO3 = {
  Austria: "AUT",
  Belgium: "BEL",
  Canada: "CAN",
  Finland: "FIN",
  France: "FRA",
  Germany: "DEU",
  Greece: "GRC",
  Ireland: "IRL",
  Italy: "ITA",
  Netherlands: "NLD",
  Poland: "POL",
  Portugal: "PRT",
  Spain: "ESP",
  "United Kingdom": "GBR",
  "United States": "USA",
};

const URL =
  "https://zenodo.org/api/records/15862994/files/MIRREM-Kierans%20et%20al-2025-Public%20Database%20on%20Irregular%20Stocks-v3.xlsx/content";

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, { headers: { "User-Agent": "birthrate.io/1.0" } }, (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          file.close();
          download(res.headers.location, dest).then(resolve, reject);
          res.resume();
          return;
        }
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}`));
          res.resume();
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve(dest)));
      })
      .on("error", reject);
  });
}

function scoreGroup(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("all irregular") && !n.includes("asylum")) return 3;
  if (n.includes("all irregular")) return 2;
  if (n.includes("unauthorized") || n.includes("undocumented")) return 2;
  return 1;
}

function scoreAgg(s) {
  if (s === "High") return 3;
  if (s === "Medium") return 2;
  return 1;
}

function estimateValue(row) {
  const c = Number(row.CentralEstimate);
  if (Number.isFinite(c) && c > 0) return c;
  const lo = Number(row.LowEstimate);
  const hi = Number(row.HighEstimate);
  if (Number.isFinite(lo) && Number.isFinite(hi) && lo > 0 && hi > 0) {
    return Math.round((lo + hi) / 2);
  }
  if (Number.isFinite(lo) && lo > 0) return lo;
  if (Number.isFinite(hi) && hi > 0) return hi;
  return null;
}

async function main() {
  const xlsx = path.join(__dirname, "../tmp-mirrem-stocks.xlsx");
  console.log("Downloading MIrreM irregular stocks…");
  await download(URL, xlsx);

  const raw = execSync(
    `python3 ${JSON.stringify(path.join(__dirname, "parse-mirrem-stocks.py"))} ${JSON.stringify(xlsx)}`,
    {
      maxBuffer: 20 * 1024 * 1024,
      encoding: "utf8",
    },
  );
  const rows = JSON.parse(raw);
  console.log(`${rows.length} estimate rows`);

  /** country|year -> best row */
  const best = new Map();
  for (const row of rows) {
    const iso3 = NAME_TO_ISO3[row.Country];
    if (!iso3) continue;
    const year = Number(row.Year);
    const value = estimateValue(row);
    if (!Number.isFinite(year) || value == null) continue;
    const key = `${iso3}|${year}`;
    const rank =
      scoreGroup(row.PopulationGroup) * 10 + scoreAgg(row.AggregateScore);
    const prev = best.get(key);
    if (!prev || rank > prev.rank) {
      best.set(key, {
        rank,
        iso3,
        year,
        value,
        group: row.PopulationGroup,
        score: row.AggregateScore,
      });
    }
  }

  const countries = {};
  for (const e of best.values()) {
    if (!countries[e.iso3]) countries[e.iso3] = { stock: [] };
    countries[e.iso3].stock.push({
      year: e.year,
      value: e.value,
      group: e.group,
      quality: e.score,
    });
  }
  for (const c of Object.values(countries)) {
    c.stock.sort((a, b) => a.year - b.year);
  }

  const out = {
    source: "MIrreM / Zenodo",
    doi: "10.5281/zenodo.15862994",
    definition:
      "Research estimates of irregular / unauthorized migrant stocks compiled by the MIrreM project for selected European countries, Canada and the United States (2008–2023). Methodologies and population definitions differ by estimate; where a central figure is missing, the midpoint of the published low–high range is used. Treat as order-of-magnitude, not an official census.",
    sourceUrl: "https://zenodo.org/records/15862994",
    updated: new Date().toISOString().slice(0, 10),
    countries,
  };

  const dest = path.join(__dirname, "../src/lib/data/irregular-migrant-stocks.json");
  fs.writeFileSync(dest, JSON.stringify(out, null, 0));
  try {
    fs.unlinkSync(xlsx);
  } catch (_) {}
  console.log(
    `Wrote ${dest} (${Object.keys(countries).length} countries, ${(fs.statSync(dest).size / 1024).toFixed(0)} KB)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
