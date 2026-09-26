#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Country share of world population and births, 1950–2100 (UN WPP via OWID).
 *
 * Writes src/lib/data/world-shares.json for /population/world-shares.
 *
 * Usage: node scripts/build-world-shares.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const zlib = require("zlib");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "src/lib/data/world-shares.json");
const CACHE = path.join(ROOT, ".tmp-map-build");

const POP_URL =
  "https://ourworldindata.org/grapher/population-with-un-projections.csv?v=1&csvType=full&useColumnShortNames=false";
const BIRTHS_URL =
  "https://ourworldindata.org/grapher/number-of-births-per-year.csv?v=1&csvType=full&useColumnShortNames=false";

const CHART_DEFAULT = [
  "CHN",
  "IND",
  "USA",
  "NGA",
  "IDN",
  "PAK",
  "BRA",
  "BGD",
];

/** UN M49-ish continent buckets for the latest-year treemap. */
const CONTINENT = {
  AFG: "Asia",
  ALB: "Europe",
  DZA: "Africa",
  AGO: "Africa",
  ARG: "South America",
  ARM: "Asia",
  AUS: "Oceania",
  AUT: "Europe",
  AZE: "Asia",
  BHS: "North America",
  BHR: "Asia",
  BGD: "Asia",
  BRB: "North America",
  BLR: "Europe",
  BEL: "Europe",
  BLZ: "North America",
  BEN: "Africa",
  BTN: "Asia",
  BOL: "South America",
  BIH: "Europe",
  BWA: "Africa",
  BRA: "South America",
  BRN: "Asia",
  BGR: "Europe",
  BFA: "Africa",
  BDI: "Africa",
  KHM: "Asia",
  CMR: "Africa",
  CAN: "North America",
  CPV: "Africa",
  CAF: "Africa",
  TCD: "Africa",
  CHL: "South America",
  CHN: "Asia",
  COL: "South America",
  COM: "Africa",
  COD: "Africa",
  COG: "Africa",
  CRI: "North America",
  CIV: "Africa",
  HRV: "Europe",
  CUB: "North America",
  CYP: "Asia",
  CZE: "Europe",
  DNK: "Europe",
  DJI: "Africa",
  DOM: "North America",
  ECU: "South America",
  EGY: "Africa",
  SLV: "North America",
  GNQ: "Africa",
  ERI: "Africa",
  EST: "Europe",
  SWZ: "Africa",
  ETH: "Africa",
  FJI: "Oceania",
  FIN: "Europe",
  FRA: "Europe",
  GAB: "Africa",
  GMB: "Africa",
  GEO: "Asia",
  DEU: "Europe",
  GHA: "Africa",
  GRC: "Europe",
  GTM: "North America",
  GIN: "Africa",
  GNB: "Africa",
  GUY: "South America",
  HTI: "North America",
  HND: "North America",
  HUN: "Europe",
  ISL: "Europe",
  IND: "Asia",
  IDN: "Asia",
  IRN: "Asia",
  IRQ: "Asia",
  IRL: "Europe",
  ISR: "Asia",
  ITA: "Europe",
  JAM: "North America",
  JPN: "Asia",
  JOR: "Asia",
  KAZ: "Asia",
  KEN: "Africa",
  PRK: "Asia",
  KOR: "Asia",
  KWT: "Asia",
  KGZ: "Asia",
  LAO: "Asia",
  LVA: "Europe",
  LBN: "Asia",
  LSO: "Africa",
  LBR: "Africa",
  LBY: "Africa",
  LTU: "Europe",
  LUX: "Europe",
  MDG: "Africa",
  MWI: "Africa",
  MYS: "Asia",
  MDV: "Asia",
  MLI: "Africa",
  MLT: "Europe",
  MRT: "Africa",
  MUS: "Africa",
  MEX: "North America",
  MDA: "Europe",
  MNG: "Asia",
  MNE: "Europe",
  MAR: "Africa",
  MOZ: "Africa",
  MMR: "Asia",
  NAM: "Africa",
  NPL: "Asia",
  NLD: "Europe",
  NZL: "Oceania",
  NIC: "North America",
  NER: "Africa",
  NGA: "Africa",
  MKD: "Europe",
  NOR: "Europe",
  OMN: "Asia",
  PAK: "Asia",
  PAN: "North America",
  PNG: "Oceania",
  PRY: "South America",
  PER: "South America",
  PHL: "Asia",
  POL: "Europe",
  PRT: "Europe",
  QAT: "Asia",
  ROU: "Europe",
  RUS: "Europe",
  RWA: "Africa",
  SAU: "Asia",
  SEN: "Africa",
  SRB: "Europe",
  SLE: "Africa",
  SGP: "Asia",
  SVK: "Europe",
  SVN: "Europe",
  SOM: "Africa",
  ZAF: "Africa",
  SSD: "Africa",
  ESP: "Europe",
  LKA: "Asia",
  SDN: "Africa",
  SUR: "South America",
  SWE: "Europe",
  CHE: "Europe",
  SYR: "Asia",
  TWN: "Asia",
  TJK: "Asia",
  TZA: "Africa",
  THA: "Asia",
  TLS: "Asia",
  TGO: "Africa",
  TTO: "North America",
  TUN: "Africa",
  TUR: "Asia",
  TKM: "Asia",
  UGA: "Africa",
  UKR: "Europe",
  ARE: "Asia",
  GBR: "Europe",
  USA: "North America",
  URY: "South America",
  UZB: "Asia",
  VEN: "South America",
  VNM: "Asia",
  YEM: "Asia",
  ZMB: "Africa",
  ZWE: "Africa",
  XKX: "Europe",
  PSE: "Asia",
};

const CONTINENT_COLOR = {
  Asia: "#c0392b",
  Africa: "#e67e22",
  Europe: "#1a5276",
  "North America": "#5dade2",
  "South America": "#27ae60",
  Oceania: "#8e44ad",
};

const FLAGS = {
  CHN: "🇨🇳",
  IND: "🇮🇳",
  USA: "🇺🇸",
  NGA: "🇳🇬",
  IDN: "🇮🇩",
  PAK: "🇵🇰",
  BRA: "🇧🇷",
  BGD: "🇧🇩",
  RUS: "🇷🇺",
  JPN: "🇯🇵",
  MEX: "🇲🇽",
  ETH: "🇪🇹",
  PHL: "🇵🇭",
  EGY: "🇪🇬",
  VNM: "🇻🇳",
  COD: "🇨🇩",
  TUR: "🇹🇷",
  IRN: "🇮🇷",
  DEU: "🇩🇪",
  THA: "🇹🇭",
  GBR: "🇬🇧",
  FRA: "🇫🇷",
  ITA: "🇮🇹",
  TZA: "🇹🇿",
  ZAF: "🇿🇦",
  KOR: "🇰🇷",
  COL: "🇨🇴",
  ESP: "🇪🇸",
  ARG: "🇦🇷",
  DZA: "🇩🇿",
  SDN: "🇸🇩",
  UGA: "🇺🇬",
  IRQ: "🇮🇶",
  POL: "🇵🇱",
  CAN: "🇨🇦",
  MAR: "🇲🇦",
  UKR: "🇺🇦",
  SAU: "🇸🇦",
  UZB: "🇺🇿",
  PER: "🇵🇪",
  MYS: "🇲🇾",
  AGO: "🇦🇴",
  MOZ: "🇲🇿",
  GHA: "🇬🇭",
  YEM: "🇾🇪",
  NPL: "🇳🇵",
  VEN: "🇻🇪",
  MDG: "🇲🇬",
  CMR: "🇨🇲",
  CIV: "🇨🇮",
  AUS: "🇦🇺",
  NER: "🇳🇪",
  LKA: "🇱🇰",
  BFA: "🇧🇫",
  MLI: "🇲🇱",
  ROU: "🇷🇴",
  MWI: "🇲🇼",
  CHL: "🇨🇱",
  KAZ: "🇰🇿",
  ZMB: "🇿🇲",
  GTM: "🇬🇹",
  ECU: "🇪🇨",
  SYR: "🇸🇾",
  NLD: "🇳🇱",
  SEN: "🇸🇳",
  KHM: "🇰🇭",
  TCD: "🇹🇩",
  SOM: "🇸🇴",
  ZWE: "🇿🇼",
  GIN: "🇬🇳",
  RWA: "🇷🇼",
  BEN: "🇧🇯",
  BDI: "🇧🇮",
  TUN: "🇹🇳",
  BOL: "🇧🇴",
  BEL: "🇧🇪",
  HTI: "🇭🇹",
  CUB: "🇨🇺",
  SSD: "🇸🇸",
  DOM: "🇩🇴",
  CZE: "🇨🇿",
  GRC: "🇬🇷",
  JOR: "🇯🇴",
  AZE: "🇦🇿",
  PRT: "🇵🇹",
  SWE: "🇸🇪",
  HUN: "🇭🇺",
  ARE: "🇦🇪",
  BLR: "🇧🇾",
  TJK: "🇹🇯",
  AUT: "🇦🇹",
  PNG: "🇵🇬",
  ISR: "🇮🇱",
  CHE: "🇨🇭",
  TGO: "🇹🇬",
  SLE: "🇸🇱",
  HKG: "🇭🇰",
  LAO: "🇱🇦",
  PAR: "🇵🇾",
  PRY: "🇵🇾",
  BGR: "🇧🇬",
  LBY: "🇱🇾",
  SRB: "🇷🇸",
  LBN: "🇱🇧",
  NIC: "🇳🇮",
  KGZ: "🇰🇬",
  SLV: "🇸🇻",
  TKM: "🇹🇲",
  SGP: "🇸🇬",
  DNK: "🇩🇰",
  FIN: "🇫🇮",
  SVK: "🇸🇰",
  COG: "🇨🇬",
  NOR: "🇳🇴",
  CRI: "🇨🇷",
  NZL: "🇳🇿",
  PSE: "🇵🇸",
  IRL: "🇮🇪",
  OMN: "🇴🇲",
  LBR: "🇱🇷",
  CAF: "🇨🇫",
  MRT: "🇲🇷",
  PAN: "🇵🇦",
  KWT: "🇰🇼",
  HRV: "🇭🇷",
  GEO: "🇬🇪",
  ERI: "🇪🇷",
  URY: "🇺🇾",
  MNG: "🇲🇳",
  BIH: "🇧🇦",
  PRI: "🇵🇷",
  QAT: "🇶🇦",
  MDA: "🇲🇩",
  NAM: "🇳🇦",
  ARM: "🇦🇲",
  LTU: "🇱🇹",
  JAM: "🇯🇲",
  ALB: "🇦🇱",
  GAB: "🇬🇦",
  BWA: "🇧🇼",
  LSO: "🇱🇸",
  GNB: "🇬🇼",
  SVN: "🇸🇮",
  LVA: "🇱🇻",
  MKD: "🇲🇰",
  GMB: "🇬🇲",
  GNQ: "🇬🇶",
  TTO: "🇹🇹",
  EST: "🇪🇪",
  CYP: "🇨🇾",
  MUS: "🇲🇺",
  SWZ: "🇸🇿",
  DJI: "🇩🇯",
  FJI: "🇫🇯",
  COM: "🇰🇲",
  GUY: "🇬🇾",
  BTN: "🇧🇹",
  SLB: "🇸🇧",
  LUX: "🇱🇺",
  SUR: "🇸🇷",
  MNE: "🇲🇪",
  CPV: "🇨🇻",
  MLT: "🇲🇹",
  MDV: "🇲🇻",
  BRN: "🇧🇳",
  BHS: "🇧🇸",
  BLZ: "🇧🇿",
  ISL: "🇮🇸",
  BRB: "🇧🇧",
  VUT: "🇻🇺",
  STP: "🇸🇹",
  WSM: "🇼🇸",
};

function fetchText(url, cachePath) {
  if (fs.existsSync(cachePath) && fs.statSync(cachePath).size > 1000) {
    return Promise.resolve(fs.readFileSync(cachePath, "utf8"));
  }
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(cachePath);
    https
      .get(url, { headers: { "User-Agent": "birthrate.io/1.0" } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(cachePath);
          fetchText(res.headers.location, cachePath).then(resolve, reject);
          return;
        }
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          res.resume();
          return;
        }
        const stream =
          res.headers["content-encoding"] === "gzip"
            ? res.pipe(zlib.createGunzip())
            : res;
        stream.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve(fs.readFileSync(cachePath, "utf8"));
        });
      })
      .on("error", reject);
  });
}

function splitCsv(line) {
  const cells = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      cells.push(cur);
      cur = "";
    } else cur += ch;
  }
  cells.push(cur);
  return cells;
}

/**
 * Parse OWID dual-column history/projection CSVs into
 * Map<code, { name, series: Map<year,{value,projected}> }>
 */
function parseDual(text, histCol, projCol) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = splitCsv(lines[0]);
  const iEntity = header.indexOf("Entity");
  const iCode = header.indexOf("Code");
  const iYear = header.indexOf("Year");
  const iHist = header.indexOf(histCol);
  const iProj = header.indexOf(projCol);
  if (iCode < 0 || iYear < 0 || iHist < 0 || iProj < 0) {
    throw new Error(`Unexpected columns: ${header.join("|")}`);
  }
  /** @type {Map<string, { name: string, series: Map<number, {value:number, projected:boolean}> }>} */
  const out = new Map();
  for (let li = 1; li < lines.length; li++) {
    const c = splitCsv(lines[li]);
    const code = (c[iCode] || "").trim().toUpperCase();
    if (!code) continue;
    const year = Number(c[iYear]);
    if (!Number.isFinite(year) || year < 1950 || year > 2100) continue;
    const hist = (c[iHist] || "").trim();
    const proj = (c[iProj] || "").trim();
    let value = null;
    let projected = false;
    if (hist) {
      value = Number(hist);
    } else if (proj) {
      value = Number(proj);
      projected = true;
    }
    if (value == null || !Number.isFinite(value)) continue;
    let entry = out.get(code);
    if (!entry) {
      entry = { name: (c[iEntity] || code).trim(), series: new Map() };
      out.set(code, entry);
    }
    entry.series.set(year, { value, projected });
  }
  return out;
}

function shareSeries(country, world) {
  const years = [...world.series.keys()].sort((a, b) => a - b);
  const out = [];
  for (const year of years) {
    const w = world.series.get(year);
    const c = country.series.get(year);
    if (!w || !c || !(w.value > 0)) continue;
    out.push({
      year,
      value: Math.round((c.value / w.value) * 1000) / 10, // 1 decimal %
      projected: Boolean(c.projected || w.projected),
    });
  }
  return out;
}

function latestNonProjected(series, countrySeries, worldSeries) {
  const hist = series.filter((p) => !p.projected);
  const pool = hist.length ? hist : series;
  const point = pool[pool.length - 1] ?? null;
  if (!point) return null;
  const abs = countrySeries.get(point.year)?.value ?? null;
  return {
    year: point.year,
    value: point.value,
    absolute: abs != null ? Math.round(abs) : null,
  };
}

async function main() {
  fs.mkdirSync(CACHE, { recursive: true });
  console.log("Fetching OWID population + births…");
  const [popText, birthText] = await Promise.all([
    fetchText(POP_URL, path.join(CACHE, "owid-population-with-un-projections.csv")),
    fetchText(BIRTHS_URL, path.join(CACHE, "owid-number-of-births.csv")),
  ]);

  const pop = parseDual(
    popText,
    "Population",
    "Population (Projected)",
  );
  const births = parseDual(
    birthText,
    "Number of births",
    "Projected (Projected)",
  );

  const worldPop = pop.get("OWID_WRL");
  const worldBirths = births.get("OWID_WRL");
  if (!worldPop || !worldBirths) throw new Error("World series missing");

  const forecastFromPop = [...worldPop.series.entries()]
    .filter(([, v]) => v.projected)
    .map(([y]) => y)
    .sort((a, b) => a - b)[0];
  const forecastFromBirths = [...worldBirths.series.entries()]
    .filter(([, v]) => v.projected)
    .map(([y]) => y)
    .sort((a, b) => a - b)[0];
  const forecastFrom = Math.min(
    forecastFromPop ?? 2024,
    forecastFromBirths ?? 2024,
  );

  const countries = [];
  for (const [iso3, entry] of pop) {
    if (!/^[A-Z]{3}$/.test(iso3)) continue;
    const birthEntry = births.get(iso3);
    const popShare = shareSeries(entry, worldPop);
    const birthShare = birthEntry
      ? shareSeries(birthEntry, worldBirths)
      : [];
    if (popShare.length < 10) continue;
    const latestPop = latestNonProjected(popShare, entry.series, worldPop.series);
    const latestBirth = birthEntry
      ? latestNonProjected(birthShare, birthEntry.series, worldBirths.series)
      : null;
    if (!latestPop || (latestPop.absolute ?? 0) < 500_000) continue;

    countries.push({
      iso3,
      name: entry.name
        .replace(/^Russian Federation$/, "Russia")
        .replace(/^Iran \(Islamic Republic of\)$/, "Iran")
        .replace(/^Viet Nam$/, "Vietnam")
        .replace(/^Democratic Republic of Congo$/, "DR Congo")
        .replace(/^Congo \(Democratic Republic of\)$/, "DR Congo")
        .replace(/^Korea \(Republic of\)$/, "South Korea")
        .replace(/^United Republic of Tanzania$/, "Tanzania")
        .replace(/^Bolivia \(Plurinational State of\)$/, "Bolivia")
        .replace(/^Venezuela \(Bolivarian Republic of\)$/, "Venezuela"),
      flag: FLAGS[iso3] ?? "",
      continent: CONTINENT[iso3] ?? "Other",
      population: popShare,
      births: birthShare,
      latestPopulation: latestPop,
      latestBirths: latestBirth,
    });
  }

  countries.sort(
    (a, b) => (b.latestPopulation?.value ?? 0) - (a.latestPopulation?.value ?? 0),
  );

  // Full annual series for chart defaults + top 40; thin the rest.
  const fullIso = new Set([
    ...CHART_DEFAULT,
    ...countries.slice(0, 40).map((c) => c.iso3),
  ]);
  const keepYears = new Set([
    1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020,
    forecastFrom - 1, forecastFrom, 2030, 2040, 2050, 2060, 2075, 2100,
  ]);
  for (const c of countries) {
    if (fullIso.has(c.iso3)) continue;
    const latestY = c.latestPopulation?.year;
    const thin = (series) =>
      (series ?? []).filter(
        (p) => keepYears.has(p.year) || p.year === latestY,
      );
    c.population = thin(c.population);
    c.births = thin(c.births);
  }

  const snapYear = countries[0]?.latestPopulation?.year ?? 2023;
  const birthSnapYear =
    countries.find((c) => c.latestBirths)?.latestBirths?.year ?? snapYear;

  const pack = {
    title: "Share of world population and births",
    subtitle: "UN World Population Prospects via Our World in Data",
    definition:
      "Each country’s people (or births) as a percent of the world total that year. Forecast years use the UN medium variant.",
    note:
      "History through the last estimate year; shaded forecast uses UN WPP medium projections. Births are annual counts, not lifetime fertility.",
    source:
      "UN World Population Prospects (via Our World in Data) — population with projections; number of births per year.",
    sourceUrl:
      "https://ourworldindata.org/grapher/population-with-un-projections",
    birthsSourceUrl:
      "https://ourworldindata.org/grapher/number-of-births-per-year",
    forecastFrom,
    unit: "% of world",
    chartDefault: CHART_DEFAULT.filter((iso) =>
      countries.some((c) => c.iso3 === iso),
    ),
    continentColors: CONTINENT_COLOR,
    snapshot: {
      populationYear: snapYear,
      birthsYear: birthSnapYear,
      worldPopulation:
        worldPop.series.get(snapYear)?.value ??
        worldPop.series.get(forecastFrom - 1)?.value ??
        null,
      worldBirths:
        worldBirths.series.get(birthSnapYear)?.value ??
        worldBirths.series.get(forecastFrom - 1)?.value ??
        null,
    },
    countries,
    updated: new Date().toISOString().slice(0, 10),
  };

  fs.writeFileSync(OUT, JSON.stringify(pack) + "\n");
  console.log(
    `Wrote ${OUT} (${countries.length} countries, forecastFrom=${forecastFrom}, ${(fs.statSync(OUT).size / 1e6).toFixed(2)} MB)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
