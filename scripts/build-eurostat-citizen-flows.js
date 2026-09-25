#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Citizens leaving vs returning home — EU + EFTA, citizenship-based flows.
 *
 *   migr_emi1ctz  — nationals emigrating from the reporting country
 *   migr_imm1ctz  — nationals immigrating (returning) to the reporting country
 *   migr_pop1ctz  — nationals resident on 1 January (denominator)
 *
 * Rates = flow / citizen population × 1,000. Bubble size = absolute leavers.
 *
 * Usage: node scripts/build-eurostat-citizen-flows.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const OUT = path.join(
  __dirname,
  "..",
  "src",
  "lib",
  "data",
  "eurostat-citizen-flows.json",
);

/** Prefer 2024; fall back one year when a series is missing. */
const YEARS = [2024, 2023, 2022];

const GEOS = [
  "BE", "BG", "CZ", "DK", "DE", "EE", "IE", "EL", "ES", "FR",
  "HR", "IT", "CY", "LV", "LT", "LU", "HU", "MT", "NL", "AT",
  "PL", "PT", "RO", "SI", "SK", "FI", "SE",
  // EFTA
  "IS", "LI", "NO", "CH",
];

const GEO_META = {
  BE: { iso3: "BEL", name: "Belgium", flag: "🇧🇪", efta: false },
  BG: { iso3: "BGR", name: "Bulgaria", flag: "🇧🇬", efta: false },
  CZ: { iso3: "CZE", name: "Czechia", flag: "🇨🇿", efta: false },
  DK: { iso3: "DNK", name: "Denmark", flag: "🇩🇰", efta: false },
  DE: { iso3: "DEU", name: "Germany", flag: "🇩🇪", efta: false },
  EE: { iso3: "EST", name: "Estonia", flag: "🇪🇪", efta: false },
  IE: { iso3: "IRL", name: "Ireland", flag: "🇮🇪", efta: false },
  EL: { iso3: "GRC", name: "Greece", flag: "🇬🇷", efta: false },
  ES: { iso3: "ESP", name: "Spain", flag: "🇪🇸", efta: false },
  FR: { iso3: "FRA", name: "France", flag: "🇫🇷", efta: false },
  HR: { iso3: "HRV", name: "Croatia", flag: "🇭🇷", efta: false },
  IT: { iso3: "ITA", name: "Italy", flag: "🇮🇹", efta: false },
  CY: { iso3: "CYP", name: "Cyprus", flag: "🇨🇾", efta: false },
  LV: { iso3: "LVA", name: "Latvia", flag: "🇱🇻", efta: false },
  LT: { iso3: "LTU", name: "Lithuania", flag: "🇱🇹", efta: false },
  LU: { iso3: "LUX", name: "Luxembourg", flag: "🇱🇺", efta: false },
  HU: { iso3: "HUN", name: "Hungary", flag: "🇭🇺", efta: false },
  MT: { iso3: "MLT", name: "Malta", flag: "🇲🇹", efta: false },
  NL: { iso3: "NLD", name: "Netherlands", flag: "🇳🇱", efta: false },
  AT: { iso3: "AUT", name: "Austria", flag: "🇦🇹", efta: false },
  PL: { iso3: "POL", name: "Poland", flag: "🇵🇱", efta: false },
  PT: { iso3: "PRT", name: "Portugal", flag: "🇵🇹", efta: false },
  RO: { iso3: "ROU", name: "Romania", flag: "🇷🇴", efta: false },
  SI: { iso3: "SVN", name: "Slovenia", flag: "🇸🇮", efta: false },
  SK: { iso3: "SVK", name: "Slovakia", flag: "🇸🇰", efta: false },
  FI: { iso3: "FIN", name: "Finland", flag: "🇫🇮", efta: false },
  SE: { iso3: "SWE", name: "Sweden", flag: "🇸🇪", efta: false },
  IS: { iso3: "ISL", name: "Iceland", flag: "🇮🇸", efta: true },
  LI: { iso3: "LIE", name: "Liechtenstein", flag: "🇱🇮", efta: true },
  NO: { iso3: "NOR", name: "Norway", flag: "🇳🇴", efta: true },
  CH: { iso3: "CHE", name: "Switzerland", flag: "🇨🇭", efta: true },
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

function firstValue(d) {
  if (!d || !d.value) return null;
  const vals = Object.values(d.value);
  if (!vals.length) return null;
  const v = Number(vals[0]);
  return Number.isFinite(v) ? v : null;
}

/**
 * Nationals are coded as citizen=NAT ("Reporting country") in these tables —
 * not as the geo ISO2. Some older extracts store the same cell under citizen=geo;
 * try NAT first, then geo.
 */
async function fetchCitizenSeries(dataset, geo, year, extra = {}) {
  for (const citizen of ["NAT", geo]) {
    const params = new URLSearchParams({
      format: "JSON",
      lang: "en",
      geo,
      citizen,
      sex: "T",
      age: "TOTAL",
      freq: "A",
      time: String(year),
      ...extra,
    });
    const url =
      `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${dataset}?` +
      params.toString();
    try {
      const d = await fetchJson(url);
      const v = firstValue(d);
      if (v != null) return v;
    } catch {
      /* try next citizen code */
    }
  }
  return null;
}

async function fetchTriple(geo, year) {
  // Prefer completed age for flows; fall back without agedef if empty.
  const tryFlows = async (withAgedef) => {
    const extra = withAgedef ? { agedef: "COMPLET" } : {};
    const [emi, imm, pop] = await Promise.all([
      fetchCitizenSeries("migr_emi1ctz", geo, year, extra),
      fetchCitizenSeries("migr_imm1ctz", geo, year, extra),
      fetchCitizenSeries("migr_pop1ctz", geo, year),
    ]);
    return { emi, imm, pop };
  };
  let t = await tryFlows(true);
  if (t.emi == null || t.imm == null || t.pop == null) {
    t = await tryFlows(false);
  }
  return t;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const rows = [];
  const missing = [];

  for (const geo of GEOS) {
    const meta = GEO_META[geo];
    let picked = null;
    for (const year of YEARS) {
      const t = await fetchTriple(geo, year);
      await sleep(80);
      if (
        t.emi != null &&
        t.imm != null &&
        t.pop != null &&
        t.pop > 0
      ) {
        picked = { year, ...t };
        break;
      }
    }
    if (!picked) {
      missing.push(meta.name);
      console.log(`  skip ${geo} (${meta.name}) — incomplete series`);
      continue;
    }
    const leavePer1000 = (picked.emi / picked.pop) * 1000;
    const returnPer1000 = (picked.imm / picked.pop) * 1000;
    rows.push({
      iso3: meta.iso3,
      geo,
      slug: meta.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: meta.name,
      flagEmoji: meta.flag,
      efta: meta.efta,
      year: picked.year,
      emigrants: Math.round(picked.emi),
      returnImmigrants: Math.round(picked.imm),
      citizenPopulation: Math.round(picked.pop),
      leavePer1000: Math.round(leavePer1000 * 100) / 100,
      returnPer1000: Math.round(returnPer1000 * 100) / 100,
    });
    console.log(
      `  ${geo} ${picked.year}: leave ${leavePer1000.toFixed(2)} / return ${returnPer1000.toFixed(2)} (emi ${picked.emi})`,
    );
  }

  rows.sort((a, b) => b.emigrants - a.emigrants);

  const pack = {
    id: "eurostat-citizen-flows",
    yearPreferred: 2024,
    title: "Citizens leaving and coming home",
    subtitle: "EU and EFTA",
    definition:
      "Each point is a reporting country. X = nationals who emigrated that year, per 1,000 nationals living there on 1 January. Y = nationals who immigrated (returned) that year, per 1,000. Bubble area scales with the absolute number who left. Points above the diagonal had more nationals come back than leave; points below had more leave than return. Foreign residents are not counted.",
    note:
      missing.length
        ? `No complete citizenship flow trio for: ${missing.join(", ")}. Years fall back to 2023/2022 when 2024 is unpublished. EFTA members are marked.`
        : "Years fall back to 2023/2022 when 2024 is unpublished. EFTA members are marked.",
    source:
      "Eurostat migr_emi1ctz, migr_imm1ctz, migr_pop1ctz — nationals only (citizen = reporting country), age total, both sexes.",
    sourceUrl:
      "https://ec.europa.eu/eurostat/databrowser/view/migr_emi1ctz/default/table",
    missing,
    rows,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(pack, null, 2) + "\n");
  console.log(`wrote ${OUT} (${rows.length} countries)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
