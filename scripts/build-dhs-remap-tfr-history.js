#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Nepal / Tajikistan / Ghana TFR history from DHS with name remapping
 * onto the current catalog geography.
 *
 * Usage: node scripts/build-dhs-remap-tfr-history.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const CATALOG = path.join(ROOT, "src/lib/data/subnational-maps.json");
const CACHE = path.join(ROOT, ".tmp-map-build");

const SPECS = [
  {
    catalogId: "npl-tfr",
    iso3: "NPL",
    country: "Nepal",
    kind: "province",
    domain: { min: 1.5, max: 6.5 },
    surveys: [
      { id: "NP2016DHS", year: 2016 },
    ],
    /** DHS label → catalog name */
    map: {
      "koshi province": "Province 1",
      "madhesh province": "Province 2",
      "bagmati province": "Bagmati",
      "gandaki province": "Gandaki",
      "lumbini province": "Lumbini",
      "karnali province": "Karnali",
      "sudurpashchim province": "Sudurpaschim",
      "sudurpaschim province": "Sudurpaschim",
    },
    minMatch: 6,
  },
  {
    catalogId: "tjk-tfr",
    iso3: "TJK",
    country: "Tajikistan",
    kind: "region",
    domain: { min: 1.5, max: 6.5 },
    surveys: [
      { id: "TJ2012DHS", year: 2012 },
      { id: "TJ2017DHS", year: 2017 },
    ],
    map: {
      dushanbe: "Dushanbe",
      gbao: "Gorno-Badakhshan Autonomous Region",
      "gorno badakhshan": "Gorno-Badakhshan Autonomous Region",
      sughd: "Sughd Region",
      drs: "Districts of Republican Subordination",
      "districts of republican subordination": "Districts of Republican Subordination",
      khatlon: "Khatlon Region",
    },
    minMatch: 5,
  },
  {
    catalogId: "gha-tfr",
    iso3: "GHA",
    country: "Ghana",
    kind: "region",
    domain: { min: 2.0, max: 7.5 },
    surveys: [
      { id: "GH2008DHS", year: 2008 },
      { id: "GH2014DHS", year: 2014 },
    ],
    map: {
      "western pre 2022": "Western Region",
      western: "Western Region",
      central: "Central Region",
      "greater accra": "Greater Accra Region",
      "volta pre 2022": "Volta Region",
      volta: "Volta Region",
      eastern: "Eastern Region",
      ashanti: "Ashanti Region",
      "upper west": "Upper West Region",
      "upper east": "Upper East Region",
      "northern pre 2022": "Northern Region",
      northern: "Northern Region",
    },
    minMatch: 8,
    noteExtra:
      "Pre-2018/2019 split regions: Western/Volta/Northern values are assigned to the parent region only; newly created regions are blank in historic years.",
  },
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "birthrate.io/1.0" } }, (res) => {
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

async function cached(url, name) {
  fs.mkdirSync(CACHE, { recursive: true });
  const dest = path.join(CACHE, name);
  if (fs.existsSync(dest)) return JSON.parse(fs.readFileSync(dest, "utf8"));
  const data = await fetchJson(url);
  fs.writeFileSync(dest, JSON.stringify(data));
  return data;
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function leaves(recs) {
  const out = [];
  for (const r of recs) {
    if (r.Value == null) continue;
    let lab = String(r.CharacteristicLabel || "").trim();
    if (!lab) continue;
    lab = lab.replace(/^\.+/, "").trim();
    out.push({ lab, val: Number(r.Value) });
  }
  return out;
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const drop = new Set();
  const frames = [];

  for (const spec of SPECS) {
    const latest = catalog.maps.find((m) => m.id === spec.catalogId);
    if (!latest) {
      console.log("missing", spec.catalogId);
      continue;
    }
    const byNorm = new Map(latest.regions.map((r) => [norm(r.name), r]));

    for (const s of spec.surveys) {
      if (s.year === latest.year) continue;
      const data = await cached(
        `https://api.dhsprogram.com/rest/dhs/data?indicatorIds=FE_FRTR_W_TFR&surveyIds=${s.id}&breakdown=subnational&f=json&perpage=1000`,
        `dhs-tfr-${s.id}.json`,
      );
      const rows = leaves(data.Data || []);
      const regions = [];
      const used = new Set();
      for (const row of rows) {
        const key = norm(row.lab);
        const mapped = spec.map[key];
        if (!mapped) continue;
        const r = byNorm.get(norm(mapped));
        if (!r || used.has(r.id)) continue;
        used.add(r.id);
        regions.push({
          id: r.id,
          slug: r.slug,
          name: r.name,
          value: Math.round(row.val * 100) / 100,
        });
      }
      if (regions.length < spec.minMatch) {
        console.log(spec.iso3, s.year, "skip", regions.length);
        continue;
      }
      const id = `${spec.catalogId.replace(/-tfr.*/, "-tfr")}-${s.year}`;
      // npl-tfr-2016, tjk-tfr-2017, gha-tfr-2014
      const frameId = `${spec.iso3.toLowerCase()}-tfr-${s.year}`;
      drop.add(frameId);
      const vals = regions.map((x) => x.value);
      frames.push({
        id: frameId,
        iso3: spec.iso3,
        country: spec.country,
        title: `Total fertility rate, ${spec.country} ${s.year}`,
        metric: "tfr",
        unit: "children per woman",
        kind: spec.kind,
        year: s.year,
        national: null,
        source: `DHS STATcompiler — ${s.id} total fertility rate by region (three years before interview).`,
        sourceUrl: "https://www.statcompiler.com",
        credit: null,
        geoUrl: latest.geoUrl,
        scale: "plasma",
        mid: 2.1,
        labelValues: true,
        note:
          (spec.noteExtra || "DHS regional TFR.") +
          ` Colour domain fixed (${spec.domain.min}–${spec.domain.max}) across years.`,
        regions,
        min: Math.round(Math.min(...vals) * 100) / 100,
        max: Math.round(Math.max(...vals) * 100) / 100,
      });
      console.log(spec.iso3, s.year, regions.length);
    }

    if (latest.note && !String(latest.note).includes("year scrubber")) {
      latest.note =
        String(latest.note).replace(/\.$/, "") +
        ". Earlier DHS rounds are on the year scrubber when geography matches.";
    }
  }

  const maps = catalog.maps.filter((m) => !drop.has(m.id));
  maps.push(...frames);
  fs.writeFileSync(CATALOG, JSON.stringify({ maps }, null, 2) + "\n");
  console.log("wrote", frames.length, "remap frames");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
