#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Eurostat demo_ndivind DIVMARPCT — divorces per 100 marriages.
 *
 * Writes:
 *   - Annual EU choropleth frames into subnational-maps.json (eu-tfr geo)
 *   - eurostat-divorce-marriage.json — full national series for the spotlight
 *     page (EU + EFTA + Türkiye + UK + Western Balkans + neighbours)
 *
 * Usage: node scripts/build-eurostat-divorce-marriage.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const CATALOG = path.join(ROOT, "src/lib/data/subnational-maps.json");
const OUT = path.join(ROOT, "src/lib/data/eurostat-divorce-marriage.json");

const SOURCE =
  "Eurostat demo_ndivind — divorces per 100 marriages (DIVMARPCT). Ratio of annual divorces to annual marriages × 100; not a lifetime divorce probability.";
const SOURCE_URL =
  "https://ec.europa.eu/eurostat/databrowser/view/demo_ndivind/default/table?lang=en";

/** Eurostat ISO2 → catalog region name on eu-tfr geo. */
const EU27_TO_NAME = {
  BE: "Belgium",
  BG: "Bulgaria",
  CZ: "Czechia",
  DK: "Denmark",
  DE: "Germany",
  EE: "Estonia",
  IE: "Ireland",
  EL: "Greece",
  ES: "Spain",
  FR: "France",
  HR: "Croatia",
  IT: "Italy",
  CY: "Cyprus",
  LV: "Latvia",
  LT: "Lithuania",
  LU: "Luxembourg",
  HU: "Hungary",
  MT: "Malta",
  NL: "Netherlands",
  AT: "Austria",
  PL: "Poland",
  PT: "Portugal",
  RO: "Romania",
  SI: "Slovenia",
  SK: "Slovak Republic",
  FI: "Finland",
  SE: "Sweden",
};

const GEO_META = {
  BE: { iso3: "BEL", name: "Belgium", flag: "🇧🇪" },
  BG: { iso3: "BGR", name: "Bulgaria", flag: "🇧🇬" },
  CZ: { iso3: "CZE", name: "Czechia", flag: "🇨🇿" },
  DK: { iso3: "DNK", name: "Denmark", flag: "🇩🇰" },
  DE: { iso3: "DEU", name: "Germany", flag: "🇩🇪" },
  EE: { iso3: "EST", name: "Estonia", flag: "🇪🇪" },
  IE: { iso3: "IRL", name: "Ireland", flag: "🇮🇪" },
  EL: { iso3: "GRC", name: "Greece", flag: "🇬🇷" },
  ES: { iso3: "ESP", name: "Spain", flag: "🇪🇸" },
  FR: { iso3: "FRA", name: "France", flag: "🇫🇷" },
  HR: { iso3: "HRV", name: "Croatia", flag: "🇭🇷" },
  IT: { iso3: "ITA", name: "Italy", flag: "🇮🇹" },
  CY: { iso3: "CYP", name: "Cyprus", flag: "🇨🇾" },
  LV: { iso3: "LVA", name: "Latvia", flag: "🇱🇻" },
  LT: { iso3: "LTU", name: "Lithuania", flag: "🇱🇹" },
  LU: { iso3: "LUX", name: "Luxembourg", flag: "🇱🇺" },
  HU: { iso3: "HUN", name: "Hungary", flag: "🇭🇺" },
  MT: { iso3: "MLT", name: "Malta", flag: "🇲🇹" },
  NL: { iso3: "NLD", name: "Netherlands", flag: "🇳🇱" },
  AT: { iso3: "AUT", name: "Austria", flag: "🇦🇹" },
  PL: { iso3: "POL", name: "Poland", flag: "🇵🇱" },
  PT: { iso3: "PRT", name: "Portugal", flag: "🇵🇹" },
  RO: { iso3: "ROU", name: "Romania", flag: "🇷🇴" },
  SI: { iso3: "SVN", name: "Slovenia", flag: "🇸🇮" },
  SK: { iso3: "SVK", name: "Slovakia", flag: "🇸🇰" },
  FI: { iso3: "FIN", name: "Finland", flag: "🇫🇮" },
  SE: { iso3: "SWE", name: "Sweden", flag: "🇸🇪" },
  // Wider Europe (spotlight map + series; not on eu-tfr geo)
  IS: { iso3: "ISL", name: "Iceland", flag: "🇮🇸" },
  NO: { iso3: "NOR", name: "Norway", flag: "🇳🇴" },
  CH: { iso3: "CHE", name: "Switzerland", flag: "🇨🇭" },
  LI: { iso3: "LIE", name: "Liechtenstein", flag: "🇱🇮" },
  UK: { iso3: "GBR", name: "United Kingdom", flag: "🇬🇧" },
  TR: { iso3: "TUR", name: "Türkiye", flag: "🇹🇷" },
  AL: { iso3: "ALB", name: "Albania", flag: "🇦🇱" },
  MK: { iso3: "MKD", name: "North Macedonia", flag: "🇲🇰" },
  RS: { iso3: "SRB", name: "Serbia", flag: "🇷🇸" },
  ME: { iso3: "MNE", name: "Montenegro", flag: "🇲🇪" },
  BA: { iso3: "BIH", name: "Bosnia and Herzegovina", flag: "🇧🇦" },
  XK: { iso3: "XKX", name: "Kosovo", flag: "🇽🇰" },
  UA: { iso3: "UKR", name: "Ukraine", flag: "🇺🇦" },
  MD: { iso3: "MDA", name: "Moldova", flag: "🇲🇩" },
  BY: { iso3: "BLR", name: "Belarus", flag: "🇧🇾" },
  RU: { iso3: "RUS", name: "Russia", flag: "🇷🇺" },
  GE: { iso3: "GEO", name: "Georgia", flag: "🇬🇪" },
  AM: { iso3: "ARM", name: "Armenia", flag: "🇦🇲" },
  AZ: { iso3: "AZE", name: "Azerbaijan", flag: "🇦🇿" },
};

/** Default overlay series on the spotlight chart. */
const CHART_DEFAULT = ["TR", "ES", "IT", "SE", "DE", "PL", "FR", "PT"];

/** Map frames: annual from this year onward (plus decade anchors earlier). */
const ANNUAL_FROM = 1990;
const DECADE_YEARS = [1960, 1970, 1980];

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

function slugify(name) {
  return String(name)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function decodeEurostat(d) {
  const dims = d.id;
  const size = d.size;
  const geoDim = dims.indexOf("geo");
  const timeDim = dims.indexOf("time");
  const geoIndex = d.dimension.geo.category.index;
  const timeIndex = d.dimension.time.category.index;
  const geoLabel = d.dimension.geo.category.label;

  const strides = size.map(() => 1);
  for (let i = size.length - 2; i >= 0; i--) {
    strides[i] = strides[i + 1] * size[i + 1];
  }

  /** @type {Record<string, Record<number, number>>} */
  const byGeo = {};
  for (const [flat, raw] of Object.entries(d.value ?? {})) {
    const v = Number(raw);
    if (!Number.isFinite(v)) continue;
    let rem = Number(flat);
    const coords = [];
    for (let i = 0; i < size.length; i++) {
      coords.push(Math.floor(rem / strides[i]));
      rem %= strides[i];
    }
    const geoPos = coords[geoDim];
    const timePos = coords[timeDim];
    const geo =
      Object.entries(geoIndex).find(([, i]) => i === geoPos)?.[0] ?? null;
    const yearStr =
      Object.entries(timeIndex).find(([, i]) => i === timePos)?.[0] ?? null;
    if (!geo || !yearStr) continue;
    const year = Number(yearStr);
    if (!Number.isFinite(year)) continue;
    if (!byGeo[geo]) byGeo[geo] = {};
    byGeo[geo][year] = Math.round(v * 10) / 10;
  }

  return { byGeo, geoLabel };
}

function pickMapYears(byGeo) {
  const euCodes = Object.keys(EU27_TO_NAME);
  const years = new Set();
  for (const y of DECADE_YEARS) years.add(y);
  for (const series of Object.values(byGeo)) {
    for (const y of Object.keys(series).map(Number)) {
      if (y >= ANNUAL_FROM) years.add(y);
    }
  }
  return [...years]
    .sort((a, b) => a - b)
    .filter((y) => {
      const n = euCodes.filter((g) => byGeo[g]?.[y] != null).length;
      return n >= 12;
    });
}

function euFrame(year, byGeo, template) {
  const regions = template.regions.map((r) => {
    const code = Object.entries(EU27_TO_NAME).find(
      ([, name]) => name === r.name,
    )?.[0];
    const value = code != null ? (byGeo[code]?.[year] ?? null) : null;
    return { id: r.id, slug: r.slug, name: r.name, value };
  });
  const vals = regions
    .map((r) => r.value)
    .filter((v) => v != null);
  const national =
    vals.length > 0
      ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
      : null;
  return {
    id: `eu-divorce-marriage-${year}`,
    iso3: "EU",
    country: "European Union",
    title: `Divorces per 100 marriages, European Union ${year}`,
    metric: "divorce-marriage",
    unit: "per 100 marriages",
    kind: "country",
    year,
    national,
    source: SOURCE,
    sourceUrl: SOURCE_URL,
    credit: null,
    geoUrl: template.geoUrl,
    scale: "plasma",
    labelValues: true,
    note:
      "Eurostat DIVMARPCT: annual divorces ÷ annual marriages × 100. Rising ratios often reflect fewer marriages as much as more divorces. Türkiye and non-EU neighbours appear on the divorce-marriage spotlight page.",
    regions,
    min: vals.length ? Math.min(...vals) : null,
    max: vals.length ? Math.max(...vals) : null,
  };
}

async function main() {
  const url =
    "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_ndivind?" +
    new URLSearchParams({
      format: "JSON",
      lang: "en",
      indic_de: "DIVMARPCT",
      geoLevel: "country",
      sinceTimePeriod: "1960",
    }).toString();

  console.log("Fetching Eurostat demo_ndivind DIVMARPCT…");
  const raw = await fetchJson(url);
  const { byGeo } = decodeEurostat(raw);

  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const template = catalog.maps.find((m) => m.id === "eu-tfr");
  if (!template) throw new Error("eu-tfr missing from catalog");

  const mapYears = pickMapYears(byGeo);
  const frames = mapYears.map((y) => euFrame(y, byGeo, template));

  catalog.maps = catalog.maps.filter(
    (m) => !(typeof m.id === "string" && m.id.startsWith("eu-divorce-marriage")),
  );
  // Keep divorce-marriage frames near other EU layers
  const euIdx = catalog.maps.findIndex((m) => m.id === "eu-tfr");
  const insertAt = euIdx >= 0 ? euIdx + 1 : catalog.maps.length;
  catalog.maps.splice(insertAt, 0, ...frames);
  fs.writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + "\n");
  console.log(
    `Catalog: ${frames.length} EU divorce-marriage frames (${mapYears[0]}–${mapYears[mapYears.length - 1]})`,
  );

  /** @type {typeof GEO_META[string] & { geo: string, series: {year:number,value:number}[] }[]} */
  const countries = [];
  for (const [geo, meta] of Object.entries(GEO_META)) {
    const seriesObj = byGeo[geo];
    if (!seriesObj) continue;
    const series = Object.entries(seriesObj)
      .map(([y, value]) => ({ year: Number(y), value }))
      .sort((a, b) => a.year - b.year);
    if (!series.length) continue;
    countries.push({
      geo,
      iso3: meta.iso3,
      name: meta.name,
      flag: meta.flag,
      slug: slugify(meta.name),
      eu27: Boolean(EU27_TO_NAME[geo]),
      series,
      latest: series[series.length - 1],
    });
  }
  countries.sort((a, b) => a.name.localeCompare(b.name));

  // Europe map frames for MapCard (iso3 keyed) — same years as EU catalog
  // plus any year where ≥8 wider-Europe countries report.
  const allYears = new Set(mapYears);
  for (const c of countries) {
    for (const p of c.series) {
      if (p.year >= ANNUAL_FROM) allYears.add(p.year);
    }
  }
  const europeYears = [...allYears].sort((a, b) => a - b).filter((y) => {
    const n = countries.filter((c) => c.series.some((p) => p.year === y)).length;
    return n >= 8;
  });

  const europeFrames = europeYears.map((year) => ({
    year,
    data: countries
      .map((c) => {
        const hit = c.series.find((p) => p.year === year);
        if (!hit) return null;
        return {
          iso3: c.iso3,
          slug: c.slug,
          name: c.name,
          value: hit.value,
        };
      })
      .filter(Boolean),
  }));

  const pack = {
    title: "Divorces per 100 marriages",
    subtitle: "Eurostat DIVMARPCT",
    definition:
      "Annual divorces divided by annual marriages, × 100. A value of 50 means one divorce for every two marriages that year — not that half of marriages eventually end in divorce.",
    note:
      "Coverage thins in recent years for some EU members (lags in national reporting). UK series ends after 2016 in Eurostat. Türkiye starts in 2003. Provincial maps (e.g. Turkish provinces) need national NSOs and are not in this Eurostat extract.",
    source: SOURCE,
    sourceUrl: SOURCE_URL,
    unit: "per 100 marriages",
    chartDefault: CHART_DEFAULT.map((g) => GEO_META[g].iso3),
    countries,
    europeFrames,
    updated: new Date().toISOString().slice(0, 10),
  };

  fs.writeFileSync(OUT, JSON.stringify(pack, null, 2) + "\n");
  console.log(
    `Wrote ${OUT} (${countries.length} countries, ${europeFrames.length} Europe map frames)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
