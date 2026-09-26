#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Indonesia province TFR history from IDHS (DHS STATcompiler).
 * Catalog latest is BPS 2025; DHS frames share idn-tfr.json geometry.
 *
 * Usage: node scripts/build-indonesia-tfr-history.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const CATALOG = path.join(ROOT, "src/lib/data/subnational-maps.json");
const CACHE = path.join(ROOT, ".tmp-map-build");
const SURVEYS = [
  { id: "ID2007DHS", year: 2007 },
  { id: "ID2012DHS", year: 2012 },
  { id: "ID2017DHS", year: 2017 },
];

/** DHS English / mixed labels → catalog Indonesian names. */
const DHS_TO_CATALOG = {
  "di aceh": "Aceh",
  aceh: "Aceh",
  "north sumatera": "Sumatera Utara",
  "north sumatra": "Sumatera Utara",
  "west sumatera": "Sumatera Barat",
  "west sumatra": "Sumatera Barat",
  riau: "Riau",
  jambi: "Jambi",
  "south sumatera": "Sumatera Selatan",
  "south sumatra": "Sumatera Selatan",
  bengkulu: "Bengkulu",
  lampung: "Lampung",
  "bangka belitung": "Kepulauan Bangka Belitung",
  "riau islands": "Kepulauan Riau",
  "dki jakarta": "DKI Jakarta",
  "west java": "Jawa Barat",
  "central java": "Jawa Tengah",
  "di yogyakarta": "Daerah Istimewa Yogyakarta",
  "east java": "Jawa Timur",
  banten: "Banten",
  bali: "Bali",
  "west nusa tenggara": "Nusa Tenggara Barat",
  "east nusa tenggara": "Nusa Tenggara Timur",
  "west kalimantan": "Kalimantan Barat",
  "central kalimantan": "Kalimantan Tengah",
  "south kalimantan": "Kalimantan Selatan",
  "east kalimantan": "Kalimantan Timur",
  "east kalimantan (since 2017)": "Kalimantan Timur",
  "north kalimantan": "Kalimantan Utara",
  "north kalimantan (since 2017)": "Kalimantan Utara",
  "north sulawesi": "Sulawesi Utara",
  "central sulawesi": "Sulawesi Tengah",
  "south sulawesi": "Sulawesi Selatan",
  "southeast sulawesi": "Sulawesi Tenggara",
  gorontalo: "Gorontalo",
  "west sulawesi": "Sulawesi Barat",
  maluku: "Maluku",
  "north maluku": "Maluku Utara",
  papua: "Papua",
  "west papua": "Papua Barat",
};

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
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function dhsLeaves(recs) {
  const out = new Map();
  for (const r of recs) {
    if (r.Value == null) continue;
    let lab = r.CharacteristicLabel || "";
    if (!lab.startsWith("..")) continue;
    lab = lab.replace(/^\.+/, "").trim();
    const key = norm(lab.replace(/\([^)]*\)/g, " "));
    let mapped = DHS_TO_CATALOG[key];
    if (!mapped) {
      // fuzzy: strip timing notes like "(since 2017)"
      for (const [k, v] of Object.entries(DHS_TO_CATALOG)) {
        if (key.startsWith(k) || k.startsWith(key)) {
          mapped = v;
          break;
        }
      }
    }
    if (!mapped) {
      console.warn("unmapped DHS label", lab);
      continue;
    }
    out.set(norm(mapped), Number(r.Value));
  }
  return out;
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const idn = catalog.maps.find((m) => m.id === "idn-tfr");
  if (!idn) throw new Error("idn-tfr missing");
  const byNorm = new Map(idn.regions.map((r) => [norm(r.name), r]));

  const drop = new Set(SURVEYS.map((s) => `idn-tfr-${s.year}`));
  const frames = [];
  for (const s of SURVEYS) {
    const data = await cached(
      `https://api.dhsprogram.com/rest/dhs/data?indicatorIds=FE_FRTR_W_TFR&surveyIds=${s.id}&breakdown=subnational&f=json&perpage=1000`,
      `dhs-tfr-${s.id}.json`,
    );
    const table = dhsLeaves(data.Data || []);
    const regions = [];
    for (const [key, value] of table) {
      const r = byNorm.get(key);
      if (!r) continue;
      regions.push({
        id: r.id,
        slug: r.slug,
        name: r.name,
        value: Math.round(value * 100) / 100,
      });
    }
    if (regions.length < 25) {
      console.log("skip", s.year, regions.length);
      continue;
    }
    const vals = regions.map((x) => x.value);
    frames.push({
      id: `idn-tfr-${s.year}`,
      iso3: "IDN",
      country: "Indonesia",
      title: `Total fertility rate, Indonesia ${s.year}`,
      metric: "tfr",
      unit: "children per woman",
      kind: "province",
      year: s.year,
      national: null,
      source: `BPS/ICF, Indonesia Demographic and Health Survey ${s.year} — total fertility rate by province (three years before interview).`,
      sourceUrl: "https://dhsprogram.com/countries/country_main.cfm?ctry_id=17",
      credit: null,
      geoUrl: idn.geoUrl,
      scale: "plasma",
      mid: 2.1,
      labelValues: true,
      note: "IDHS province TFR. Newer Papua splits and some provinces are omitted when the survey geography does not match. Colour domain fixed (1.5–5.5) across years.",
      regions,
      min: Math.round(Math.min(...vals) * 100) / 100,
      max: Math.round(Math.max(...vals) * 100) / 100,
    });
    console.log(s.year, regions.length);
  }

  if (idn.note && !String(idn.note).includes("year scrubber")) {
    idn.note =
      String(idn.note).replace(/\.$/, "") +
      ". Earlier IDHS rounds are on the year scrubber.";
  } else if (!idn.note) {
    idn.note =
      "BPS provincial TFR 2025. Earlier IDHS rounds are on the year scrubber. Colour domain fixed (1.5–5.5).";
  }

  const maps = catalog.maps.filter((m) => !drop.has(m.id));
  maps.push(...frames);
  fs.writeFileSync(CATALOG, JSON.stringify({ maps }, null, 2) + "\n");
  console.log("wrote", frames.length, "indonesia frames");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
