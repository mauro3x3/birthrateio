#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Russia federal-subject TFR history from Rosstat (Wikipedia compilation).
 *
 * Usage: node scripts/build-russia-tfr-history.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const CATALOG = path.join(ROOT, "src/lib/data/subnational-maps.json");
const CACHE = path.join(ROOT, ".tmp/rus-tfr-wiki.html");
const WIKI =
  "https://en.wikipedia.org/wiki/List_of_federal_subjects_of_Russia_by_total_fertility_rate";
const EMIT = [2005, 2010, 2015, 2020, 2023];

const ALIASES = {
  chechnya: "republic of chechnya",
  tuva: "tuva republic",
  "tyva republic": "tuva republic",
  "yamalo nenets a o": "yamalo nenets autonomous okrug",
  "yamalo nenets autonomous okrug": "yamalo nenets autonomous okrug",
  ingushetia: "republic of ingushetia",
  "kabardino balkaria": "kabardino balkar republic",
  "karachay cherkessia": "karachay cherkess republic",
  "north ossetia alania": "republic of north ossetia alania",
  "sakha yakutia": "sakha republic",
  yakutia: "sakha republic",
  karelia: "republic of karelia",
  "komi republic": "komi republic",
  adygea: "republic of adygea",
  buryatia: "buryat republic",
  khakassia: "republic of khakassia",
  kalmykia: "republic of kalmykia",
  tatarstan: "republic of tatarstan",
  bashkortostan: "republic of bashkortostan",
  chuvashia: "chuvash republic",
  udmurtia: "udmurt republic",
  "mari el": "mari el republic",
  mordovia: "republic of mordovia",
  "altai republic": "altai republic",
  moscow: "moscow",
  "saint petersburg": "saint petersburg",
  "st petersburg": "saint petersburg",
  chukotka: "chukotka autonomous okrug",
  "jewish autonomous oblast": "jewish autonomous oblast",
  "khanty mansi a o yugra": "khanty mansi autonomous okrug",
  "khanty mansi autonomous okrug yugra": "khanty mansi autonomous okrug",
  "nenets autonomous okrug": "nenets autonomous okrug",
  "republic of crimea": "republic of crimea",
  sevastopol: "sevastopol",
};

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "birthrate.io/1.0" } }, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      })
      .on("error", reject);
  });
}

function stripTags(s) {
  return String(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/–|—/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function canon(s) {
  const n = norm(s)
    .replace(/\brepublic of\b/g, "")
    .replace(/\brepublic\b/g, "")
    .replace(/\boblast\b/g, "")
    .replace(/\bkrai\b/g, "")
    .replace(/\bautonomous okrug\b/g, "")
    .replace(/\ba o\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return ALIASES[norm(s)] || ALIASES[n] || n;
}

function parseTables(html) {
  const tables = [
    ...html.matchAll(
      /<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/gi,
    ),
  ].map((m) => m[1]);
  const all = new Map();
  let national = {};
  for (const t of tables) {
    const rows = [...t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]);
    if (!rows.length) continue;
    const headerCells = [
      ...rows[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi),
    ].map((m) => stripTags(m[1]));
    const years = [];
    for (const h of headerCells) {
      const m = /^(20\d{2})$/.exec(h);
      if (m) years.push(Number(m[1]));
    }
    if (years.length < 3) continue;
    for (const row of rows.slice(1)) {
      const cells = [
        ...row.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi),
      ].map((m) => stripTags(m[1]));
      const name = cells[0];
      if (!name) continue;
      if (/russian federation|as a whole|^total$/i.test(name)) {
        years.forEach((y, i) => {
          const v = Number((cells[i + 1] || "").replace(/,/g, ""));
          if (Number.isFinite(v)) national[y] = v;
        });
        continue;
      }
      if (/federal district/i.test(name)) continue;
      const series = all.get(name) || {};
      years.forEach((y, i) => {
        const raw = (cells[i + 1] || "").replace(/[–—,…]/g, "").trim();
        const v = Number(raw);
        if (Number.isFinite(v)) series[y] = v;
      });
      all.set(name, series);
    }
  }
  return { all, national };
}

async function main() {
  let html;
  if (fs.existsSync(CACHE)) html = fs.readFileSync(CACHE, "utf8");
  else {
    html = await fetchText(WIKI);
    fs.mkdirSync(path.dirname(CACHE), { recursive: true });
    fs.writeFileSync(CACHE, html);
  }
  const { all, national } = parseTables(html);
  console.log("parsed", all.size, "subjects");

  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const rus = catalog.maps.find((m) => m.id === "rus-tfr");
  if (!rus) throw new Error("rus-tfr missing");
  const byCanon = new Map();
  for (const r of rus.regions) {
    byCanon.set(canon(r.name), r);
    byCanon.set(norm(r.name), r);
  }

  const drop = new Set(EMIT.map((y) => `rus-tfr-${y}`));
  const frames = [];
  for (const year of EMIT) {
    if (year === rus.year) continue;
    const regions = [];
    const used = new Set();
    for (const [name, series] of all) {
      if (series[year] == null) continue;
      const r = byCanon.get(canon(name)) || byCanon.get(norm(name));
      if (!r || used.has(r.id)) continue;
      used.add(r.id);
      regions.push({
        id: r.id,
        slug: r.slug,
        name: r.name,
        value: Math.round(series[year] * 100) / 100,
      });
    }
    if (regions.length < 60) {
      console.log("skip", year, regions.length);
      continue;
    }
    const vals = regions.map((r) => r.value);
    frames.push({
      id: `rus-tfr-${year}`,
      iso3: "RUS",
      country: "Russia",
      title: `Total fertility rate, Russia ${year}`,
      metric: "tfr",
      unit: "children per woman",
      kind: "region",
      year,
      national: national[year] ?? null,
      source: `Rosstat — total fertility rate by federal subject, ${year} (via Wikipedia compilation of Rosstat tables).`,
      sourceUrl:
        "https://en.wikipedia.org/wiki/List_of_federal_subjects_of_Russia_by_total_fertility_rate",
      credit: null,
      geoUrl: rus.geoUrl,
      scale: "plasma",
      mid: 2.1,
      labelValues: false,
      note: "Rosstat federal-subject TFR. Colour domain fixed (1–3) across years.",
      regions,
      min: Math.round(Math.min(...vals) * 100) / 100,
      max: Math.round(Math.max(...vals) * 100) / 100,
    });
    console.log(year, regions.length, national[year]);
  }

  if (rus.note && !String(rus.note).includes("year scrubber")) {
    rus.note =
      String(rus.note).replace(/\.$/, "") +
      ". Earlier Rosstat years are on the year scrubber.";
  } else if (!rus.note) {
    rus.note =
      "Rosstat federal-subject TFR. Earlier years are on the year scrubber. Colour domain fixed (1–3).";
  }

  const maps = catalog.maps.filter((m) => !drop.has(m.id));
  maps.push(...frames);
  fs.writeFileSync(CATALOG, JSON.stringify({ maps }, null, 2) + "\n");
  console.log("wrote", frames.length, "russia frames");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
