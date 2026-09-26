#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Multi-survey DHS TFR history for existing subnational DHS maps.
 *
 * For each DHS country already in the catalog, pull every DHS round with
 * subnational FE_FRTR_W_TFR and emit year frames sharing the latest geoUrl.
 *
 * Usage: node scripts/build-dhs-tfr-history.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const CATALOG = path.join(ROOT, "src/lib/data/subnational-maps.json");
const CACHE = path.join(ROOT, ".tmp-map-build");

/** iso3 → STATcompiler country id (2-letter). */
const DHS_COUNTRIES = [
  { iso3: "NGA", countryId: "NG", kind: "state", prefix: "nigeria", catalogId: "nga-tfr" },
  { iso3: "KEN", countryId: "KE", kind: "county", prefix: "kenya", catalogId: "ken-tfr" },
  { iso3: "PHL", countryId: "PH", kind: "region", prefix: "philippines", catalogId: "phl-tfr" },
  { iso3: "ZAF", countryId: "ZA", kind: "province", prefix: "south-africa", catalogId: "zaf-tfr" },
  { iso3: "JOR", countryId: "JO", kind: "governorate", prefix: "jordan", catalogId: "jor-tfr" },
  { iso3: "AGO", countryId: "AO", kind: "province", prefix: "angola", catalogId: "ago-tfr" },
  { iso3: "NPL", countryId: "NP", kind: "province", prefix: "nepal", catalogId: "npl-tfr" },
  { iso3: "GHA", countryId: "GH", kind: "region", prefix: "ghana", catalogId: "gha-tfr" },
  { iso3: "BGD", countryId: "BD", kind: "division", prefix: "bangladesh", catalogId: "bgd-tfr" },
  { iso3: "TZA", countryId: "TZ", kind: "region", prefix: "tanzania", catalogId: "tza-tfr" },
  { iso3: "ZMB", countryId: "ZM", kind: "province", prefix: "zambia", catalogId: "zmb-tfr" },
  { iso3: "MWI", countryId: "MW", kind: "district", prefix: "malawi", catalogId: "mwi-tfr" },
  { iso3: "MLI", countryId: "ML", kind: "region", prefix: "mali", catalogId: "mli-tfr" },
  { iso3: "SEN", countryId: "SN", kind: "region", prefix: "senegal", catalogId: "sen-tfr" },
  { iso3: "BFA", countryId: "BF", kind: "region", prefix: "burkina-faso", catalogId: "bfa-tfr" },
  { iso3: "KHM", countryId: "KH", kind: "province", prefix: "cambodia", catalogId: "khm-tfr" },
  { iso3: "TJK", countryId: "TJ", kind: "region", prefix: "tajikistan", catalogId: "tjk-tfr" },
  { iso3: "MOZ", countryId: "MZ", kind: "province", prefix: "mozambique", catalogId: "moz-tfr" },
  { iso3: "PAK", countryId: "PK", kind: "province", prefix: "pakistan", catalogId: "pak-tfr" },
  { iso3: "IDN", countryId: "ID", kind: "province", prefix: "indonesia", catalogId: "idn-tfr" },
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : require("http");
    mod
      .get(url, { headers: { "User-Agent": "birthrate.io/1.0" } }, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode} ${url}`));
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

async function cachedJson(url, name) {
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
  const rows = recs
    .filter((r) => r.Value != null)
    .map((r) => ({
      lab: r.CharacteristicLabel || "",
      val: Number(r.Value),
    }));
  const by = new Map();
  for (let i = 0; i < rows.length; i++) {
    const { lab, val } = rows[i];
    const nxt = rows[i + 1]?.lab || "";
    let name;
    if (lab.startsWith("..")) name = lab.replace(/^\.+/, "").trim();
    else if (nxt.startsWith("..")) continue;
    else name = lab.trim();
    if (!name) continue;
    by.set(norm(name), { name, val });
  }
  return by;
}

function matchRegions(table, templateRegions) {
  const out = [];
  for (const r of templateRegions) {
    const key = norm(r.name);
    let hit = table.get(key);
    if (!hit) {
      for (const [k, v] of table) {
        if (k.includes(key) || key.includes(k)) {
          hit = v;
          break;
        }
      }
    }
    if (!hit) continue;
    out.push({
      id: r.id,
      slug: r.slug,
      name: r.name,
      value: Math.round(hit.val * 100) / 100,
    });
  }
  return out;
}

async function surveysForCountry(countryId) {
  const data = await cachedJson(
    `https://api.dhsprogram.com/rest/dhs/surveys?countryIds=${countryId}&f=json`,
    `dhs-surveys-${countryId}.json`,
  );
  return (data.Data || []).filter(
    (s) =>
      s.SurveyType === "DHS" &&
      Number(s.SurveyYear) >= 1990 &&
      s.SurveyId,
  );
}

async function subnationalTfr(surveyId) {
  const data = await cachedJson(
    `https://api.dhsprogram.com/rest/dhs/data?indicatorIds=FE_FRTR_W_TFR&surveyIds=${surveyId}&breakdown=subnational&f=json&perpage=1000`,
    `dhs-tfr-${surveyId}.json`,
  );
  return dhsLeaves(data.Data || []);
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const byId = Object.fromEntries(catalog.maps.map((m) => [m.id, m]));
  const newFrames = [];
  const drop = new Set();

  for (const spec of DHS_COUNTRIES) {
    const latest = byId[spec.catalogId];
    if (!latest) {
      console.log(`skip ${spec.iso3}: no ${spec.catalogId}`);
      continue;
    }
    const surveys = await surveysForCountry(spec.countryId);
    console.log(`${spec.iso3}: ${surveys.length} DHS rounds`);

    // Prefer one frame per calendar year (latest survey that year).
    const byYear = new Map();
    for (const s of surveys) {
      const y = Number(s.SurveyYear);
      const prev = byYear.get(y);
      if (!prev || String(s.SurveyId) > String(prev.SurveyId)) byYear.set(y, s);
    }

    for (const [year, survey] of [...byYear.entries()].sort((a, b) => a[0] - b[0])) {
      if (year === latest.year) continue; // keep curated latest row
      try {
        const table = await subnationalTfr(survey.SurveyId);
        const regions = matchRegions(table, latest.regions);
        const minMatch = Math.max(5, Math.floor(latest.regions.length * 0.45));
        if (regions.length < minMatch) {
          console.log(
            `  ${year} ${survey.SurveyId}: matched ${regions.length}/${latest.regions.length} — skip`,
          );
          continue;
        }
        const id = `${spec.catalogId}-${year}`;
        drop.add(id);
        const vals = regions.map((r) => r.value);
        newFrames.push({
          id,
          iso3: spec.iso3,
          country: latest.country,
          title: `Total fertility rate, ${latest.country} ${year}`,
          metric: "tfr",
          unit: "children per woman",
          kind: latest.kind,
          year,
          national: null,
          source: `${survey.SurveyYearLabel || survey.SurveyId} — total fertility rate by ${latest.kind} (STATcompiler FE_FRTR_W_TFR).`,
          sourceUrl: "https://www.statcompiler.com/en/",
          credit: null,
          geoUrl: latest.geoUrl,
          scale: "plasma",
          mid: 2.1,
          labelValues: latest.labelValues !== false,
          note:
            (latest.note || "") +
            " Earlier DHS rounds are shown when geography still matches; colour domain is fixed across survey years.",
          regions,
          min: Math.round(Math.min(...vals) * 100) / 100,
          max: Math.round(Math.max(...vals) * 100) / 100,
        });
        console.log(
          `  ${year}: ${regions.length}/${latest.regions.length} [${Math.min(...vals).toFixed(2)}–${Math.max(...vals).toFixed(2)}]`,
        );
      } catch (e) {
        console.log(`  ${year} fail`, e.message);
      }
    }

    if (latest.note && !String(latest.note).includes("Earlier DHS")) {
      latest.note =
        latest.note.replace(/\.$/, "") +
        ". Earlier DHS rounds are available on the year scrubber when geography matches.";
    }
  }

  const maps = catalog.maps.filter((m) => !drop.has(m.id));
  maps.push(...newFrames);
  fs.writeFileSync(CATALOG, JSON.stringify({ maps }, null, 2) + "\n");
  console.log(`wrote ${newFrames.length} DHS history frames`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
