#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Build Eurostat migr_eipre — third-country nationals found to be illegally
 * present in the EU-27, by citizenship (annual, rounded). Powers the particle
 * flow visualisation on /migration.
 *
 * Usage: node scripts/build-eurostat-illegal-presence.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const GEO = "EU27_2020";
const START = 2008;
const END = 2024;

/** Approximate capital / country centroids [lng, lat] for particle origins. */
const CENTROIDS = {
  AF: [69.2, 34.5], AL: [19.8, 41.3], DZ: [3.0, 28.0], AO: [17.9, -12.3],
  AR: [-64.0, -34.0], AM: [44.5, 40.2], AU: [133.8, -25.3], AZ: [47.6, 40.1],
  BH: [50.5, 26.0], BD: [90.4, 23.7], BY: [27.9, 53.7], BJ: [2.3, 9.3],
  BO: [-63.6, -16.3], BA: [17.7, 43.9], BR: [-51.9, -14.2], BG: [25.5, 42.7],
  BF: [-1.6, 12.2], BI: [29.9, -3.4], KH: [104.9, 12.6], CM: [12.4, 7.4],
  CA: [-106.3, 56.1], CV: [-24.0, 16.0], CF: [20.9, 6.6], TD: [18.7, 15.5],
  CL: [-71.5, -35.7], CN: [104.2, 35.9], CO: [-74.3, 4.6], CG: [15.8, -0.2],
  CD: [21.8, -4.0], CR: [-83.8, 9.7], CI: [-5.5, 7.5], HR: [15.2, 45.1],
  CU: [-77.8, 21.5], CY: [33.4, 35.1], CZ: [15.5, 49.8], DK: [9.5, 56.3],
  DJ: [42.6, 11.8], DO: [-70.2, 18.7], EC: [-78.2, -1.8], EG: [30.8, 26.8],
  SV: [-88.9, 13.8], GQ: [10.3, 1.6], ER: [39.1, 15.2], EE: [25.0, 58.6],
  SZ: [31.5, -26.5], ET: [40.5, 9.1], FJ: [178.1, -17.7], FI: [25.7, 61.9],
  FR: [2.2, 46.2], GA: [11.6, -0.8], GM: [-15.3, 13.4], GE: [43.4, 42.3],
  DE: [10.5, 51.2], GH: [-1.0, 7.9], GR: [21.8, 39.1], GT: [-90.2, 15.8],
  GN: [-9.7, 9.9], GW: [-15.2, 12.0], GY: [-58.9, 4.9], HT: [-72.3, 18.9],
  HN: [-86.2, 15.2], HU: [19.5, 47.2], IS: [-19.0, 64.9], IN: [78.9, 20.6],
  ID: [113.9, -0.8], IR: [53.7, 32.4], IQ: [43.7, 33.2], IE: [-8.2, 53.1],
  IL: [34.9, 31.0], IT: [12.6, 41.9], JM: [-77.3, 18.1], JP: [138.3, 36.2],
  JO: [36.2, 30.6], KZ: [66.9, 48.0], KE: [37.9, 0.0], XK: [20.9, 42.6],
  KW: [47.5, 29.3], KG: [74.8, 41.2], LA: [102.5, 19.9], LV: [24.6, 56.9],
  LB: [35.9, 33.9], LS: [28.2, -29.6], LR: [-9.4, 6.4], LY: [17.2, 26.3],
  LT: [23.9, 55.2], LU: [6.1, 49.8], MG: [46.9, -18.8], MW: [34.3, -13.3],
  MY: [101.9, 4.2], ML: [-2.0, 17.6], MT: [14.4, 35.9], MR: [-10.9, 21.0],
  MU: [57.6, -20.3], MX: [-102.6, 23.6], MD: [28.4, 47.4], MN: [103.8, 46.9],
  ME: [19.4, 42.7], MA: [-7.1, 31.8], MZ: [35.5, -18.7], MM: [95.9, 21.9],
  NA: [18.5, -22.9], NP: [84.1, 28.4], NL: [5.3, 52.1], NZ: [174.9, -40.9],
  NI: [-85.2, 12.9], NE: [8.1, 17.6], NG: [8.7, 9.1], MK: [21.7, 41.6],
  NO: [8.5, 60.5], OM: [55.9, 21.5], PK: [69.3, 30.4], PS: [35.2, 31.9],
  PA: [-80.8, 8.5], PY: [-58.4, -23.4], PE: [-75.0, -9.2], PH: [121.8, 12.9],
  PL: [19.1, 51.9], PT: [-8.2, 39.4], QA: [51.2, 25.4], RO: [24.9, 45.9],
  RU: [105.3, 61.5], RW: [29.9, -1.9], SA: [45.1, 23.9], SN: [-14.5, 14.5],
  RS: [21.0, 44.0], SL: [-11.8, 8.5], SG: [103.8, 1.4], SK: [19.7, 48.7],
  SI: [14.9, 46.2], SO: [46.2, 5.2], ZA: [25.1, -29.0], KR: [127.8, 35.9],
  SS: [31.3, 6.9], ES: [-3.7, 40.5], LK: [80.8, 7.9], SD: [30.2, 12.9],
  SR: [-56.0, 4.0], SE: [18.6, 60.1], CH: [8.2, 46.8], SY: [38.9, 35.0],
  TW: [120.9, 23.7], TJ: [71.3, 38.9], TZ: [34.9, -6.4], TH: [100.9, 15.9],
  TL: [125.7, -8.9], TG: [0.8, 8.6], TT: [-61.2, 10.7], TN: [9.5, 33.9],
  TR: [35.2, 38.9], TM: [59.6, 38.9], UG: [32.3, 1.4], UA: [31.2, 48.4],
  AE: [53.8, 23.4], GB: [-3.4, 55.4], UK: [-3.4, 55.4], US: [-95.7, 37.1],
  UY: [-55.8, -32.5], UZ: [64.6, 41.4], VE: [-66.6, 6.4], VN: [108.3, 14.1],
  YE: [48.5, 15.6], ZM: [27.8, -13.1], ZW: [29.2, -19.0],
  // Eurostat extras / territories
  EL: [21.8, 39.1], XK: [20.9, 42.6], UK_OCT: [-5.0, 36.1],
  EH: [-13.0, 24.5], ST: [6.6, 0.2], KM: [43.3, -11.6], SC: [55.5, -4.7],
  BW: [24.7, -22.3], LS: [28.2, -29.6],
};

/** Random landing points across EU-27 (approx.). */
const EU_LANDINGS = [
  [10.5, 51.2], [2.2, 46.2], [12.6, 41.9], [-3.7, 40.5], [4.9, 52.4],
  [16.4, 48.2], [19.1, 51.9], [14.4, 50.1], [23.7, 38.0], [25.5, 42.7],
  [24.9, 45.9], [19.5, 47.2], [21.0, 52.2], [18.1, 59.3], [12.6, 55.7],
  [24.9, 60.2], [8.2, 46.8], [4.4, 50.8], [6.1, 49.8], [14.5, 35.9],
  [23.9, 55.2], [24.1, 56.9], [25.0, 58.6], [14.5, 46.1], [15.2, 45.1],
  [33.0, 35.0], [26.1, 44.4],
];

const SKIP_CITIZENS = new Set([
  "TOTAL", "EUR", "NEU", "UNK", "OTH", "EU27_2020", "EU28", "EA19", "EA20",
  "EFTA", "WORLD",
]);

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

async function main() {
  const params = new URLSearchParams({
    format: "JSON",
    lang: "en",
    geo: GEO,
    freq: "A",
    reason: "TOTAL",
    apprehen: "TOTAL",
    sex: "T",
    age: "TOTAL",
    unit: "PER",
  });
  for (let y = START; y <= END; y++) params.append("time", String(y));

  const url =
    "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/migr_eipre?" +
    params.toString();
  console.log("Fetching migr_eipre…");
  const d = await fetchJson(url);

  const ids = d.id;
  const sizes = d.size;
  const inv = {};
  for (const k of ids) {
    inv[k] = {};
    for (const [code, i] of Object.entries(d.dimension[k].category.index)) {
      inv[k][i] = code;
    }
  }
  const labels = d.dimension.citizen.category.label || {};

  /** @type {Record<number, Array<{citizen:string,name:string,value:number,lng:number,lat:number}>>} */
  const byYear = {};

  for (const [posStr, val] of Object.entries(d.value || {})) {
    const coords = posToCoords(Number(posStr), sizes);
    const keys = {};
    ids.forEach((dim, i) => {
      keys[dim] = inv[dim][coords[i]];
    });
    const citizen = keys.citizen;
    if (!citizen || SKIP_CITIZENS.has(citizen)) continue;
    const year = Number(keys.time);
    const value = Number(val) || 0;
    if (!Number.isFinite(year) || value <= 0) continue;
    const c = CENTROIDS[citizen];
    if (!c) continue; // skip tiny territories without a point
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push({
      citizen,
      name: String(labels[citizen] || citizen).replace(/\*$/, "").trim(),
      value,
      lng: c[0],
      lat: c[1],
    });
  }

  const years = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => a - b);

  for (const y of years) {
    byYear[y].sort((a, b) => b.value - a.value);
  }

  const annualTotals = {};
  let cumulative = 0;
  const cumulativeThrough = {};
  for (const y of years) {
    const t = byYear[y].reduce((s, r) => s + r.value, 0);
    annualTotals[y] = t;
    cumulative += t;
    cumulativeThrough[y] = cumulative;
  }

  const out = {
    source: "Eurostat migr_eipre",
    sourceUrl:
      "https://ec.europa.eu/eurostat/databrowser/view/migr_eipre/default/table",
    definition:
      "Third-country nationals found to be illegally present in the EU-27 — annual counts by citizenship. Administrative detections only; not an estimate of the total unauthorised population.",
    geo: GEO,
    geoLabel: "European Union (27 countries from 2020)",
    peoplePerParticleDefault: 100,
    years,
    annualTotals,
    cumulativeThrough,
    euLandings: EU_LANDINGS,
    byYear,
  };

  const outPath = path.join(
    __dirname,
    "../src/lib/data/eurostat-illegal-presence.json",
  );
  fs.writeFileSync(outPath, JSON.stringify(out));
  console.log(
    `✔ ${years.length} years, ${Object.values(byYear).reduce((s, r) => s + r.length, 0)} origin-year rows → ${outPath}`,
  );
  console.log(
    `  2008 top: ${byYear[2008]?.slice(0, 3).map((r) => `${r.name} ${r.value}`).join(", ")}`,
  );
  console.log(`  Cumulative through ${years[years.length - 1]}: ${cumulative.toLocaleString()}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
