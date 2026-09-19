#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Build UNHCR end-year refugee + asylum-seeker stocks by country of asylum.
 * Batches ISO3 coa filters (API aggregates when coa is omitted).
 *
 * Usage: node scripts/build-unhcr-refugees.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "birthrate.io/1.0" } }, (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          fetchJson(res.headers.location).then(resolve, reject);
          res.resume();
          return;
        }
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

function num(v) {
  if (v == null || v === "-" || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  const yearFrom = 2000;
  const yearTo = new Date().getFullYear();

  console.log("Fetching UNHCR country list…");
  const countriesRes = await fetchJson(
    "https://api.unhcr.org/population/v1/countries/?limit=500",
  );
  const isoList = (countriesRes.items || [])
    .map((c) => c.iso)
    .filter((iso) => iso && /^[A-Z]{3}$/.test(iso));
  console.log(`${isoList.length} countries`);

  /** @type {Record<string, { refugees: {year:number,value:number}[], asylumSeekers: {year:number,value:number}[] }>} */
  const countries = {};
  const BATCH = 40;
  for (let i = 0; i < isoList.length; i += BATCH) {
    const batch = isoList.slice(i, i + BATCH);
    process.stdout.write(
      `batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(isoList.length / BATCH)}… `,
    );
    const url =
      `https://api.unhcr.org/population/v1/population/?` +
      new URLSearchParams({
        yearFrom: String(yearFrom),
        yearTo: String(yearTo),
        coa: batch.join(","),
        cf_type: "ISO",
        limit: "10000",
      }).toString();
    try {
      const data = await fetchJson(url);
      const items = data.items || [];
      console.log(`${items.length} rows`);
      for (const r of items) {
        const iso3 = (r.coa_iso || "").toUpperCase();
        const year = Number(r.year);
        if (!iso3 || iso3.length !== 3 || !Number.isFinite(year)) continue;
        const refugees = num(r.refugees);
        const asylum = num(r.asylum_seekers);
        if (!countries[iso3]) {
          countries[iso3] = { refugees: [], asylumSeekers: [] };
        }
        if (refugees != null) {
          countries[iso3].refugees.push({ year, value: refugees });
        }
        if (asylum != null) {
          countries[iso3].asylumSeekers.push({ year, value: asylum });
        }
      }
    } catch (e) {
      console.log("FAIL", e.message);
    }
  }

  for (const c of Object.values(countries)) {
    const dedupe = (arr) => {
      const m = new Map();
      for (const p of arr) m.set(p.year, p.value);
      return [...m.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([year, value]) => ({ year, value }));
    };
    c.refugees = dedupe(c.refugees);
    c.asylumSeekers = dedupe(c.asylumSeekers);
  }

  const out = {
    source: "UNHCR",
    definition:
      "End-year stock of refugees (incl. refugee-like situations) and asylum-seekers by country of asylum. Aggregated across all countries of origin. Does not include IDPs or UNRWA-registered Palestine refugees.",
    sourceUrl: "https://www.unhcr.org/refugee-statistics/",
    api: "https://api.unhcr.org/population/v1/population/",
    updated: new Date().toISOString().slice(0, 10),
    yearFrom,
    yearTo,
    countries,
  };

  const dest = path.join(__dirname, "../src/lib/data/unhcr-refugees.json");
  fs.writeFileSync(dest, JSON.stringify(out));
  console.log(
    `Wrote ${dest} (${Object.keys(countries).length} countries, ${(fs.statSync(dest).size / 1024).toFixed(0)} KB)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
