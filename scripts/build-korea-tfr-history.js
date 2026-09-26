#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * South Korea sido TFR history from KOSTAT (via Korean Wikipedia compilation)
 * plus the catalog 2024 frame.
 *
 * Usage: node scripts/build-korea-tfr-history.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const CATALOG = path.join(ROOT, "src/lib/data/subnational-maps.json");
const CACHE = path.join(ROOT, ".tmp/kor-tfr-wiki.html");
const WIKI =
  "https://ko.wikipedia.org/wiki/%EB%8C%80%ED%95%9C%EB%AF%BC%EA%B5%AD%EC%9D%98_%EC%A7%80%EC%97%AD%EB%B3%84_%ED%95%A9%EA%B3%84%EC%B6%9C%EC%82%B0%EC%9C%A8_%EB%AA%A9%EB%A1%9D";
const EMIT = [2005, 2010, 2015, 2019];

const KO_EN = {
  전국: null,
  서울특별시: "Seoul",
  서울: "Seoul",
  부산광역시: "Busan",
  부산: "Busan",
  대구광역시: "Daegu",
  대구: "Daegu",
  인천광역시: "Incheon",
  인천: "Incheon",
  광주광역시: "Gwangju",
  광주: "Gwangju",
  대전광역시: "Daejeon",
  대전: "Daejeon",
  울산광역시: "Ulsan",
  울산: "Ulsan",
  세종특별자치시: "Sejong",
  세종: "Sejong",
  경기도: "Gyeonggi",
  경기: "Gyeonggi",
  강원특별자치도: "Gangwon",
  강원도: "Gangwon",
  강원: "Gangwon",
  충청북도: "North Chungcheong",
  충북: "North Chungcheong",
  충청남도: "South Chungcheong",
  충남: "South Chungcheong",
  전북특별자치도: "North Jeolla",
  전라북도: "North Jeolla",
  전북: "North Jeolla",
  전라남도: "South Jeolla",
  전남: "South Jeolla",
  경상북도: "North Gyeongsang",
  경북: "North Gyeongsang",
  경상남도: "South Gyeongsang",
  경남: "South Gyeongsang",
  제주특별자치도: "Jeju",
  제주: "Jeju",
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
    .replace(/\s+/g, " ")
    .trim();
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function parseWiki(html) {
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
    if (years.length < 5) continue;
    for (const row of rows.slice(1)) {
      const cells = [
        ...row.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi),
      ].map((m) => stripTags(m[1]));
      const label = cells[0];
      if (!label) continue;
      const en = KO_EN[label];
      if (en === null) {
        years.forEach((y, i) => {
          const v = Number(cells[i + 1]);
          if (Number.isFinite(v)) national[y] = v;
        });
        continue;
      }
      if (!en) continue;
      const series = all.get(en) || {};
      years.forEach((y, i) => {
        const v = Number(cells[i + 1]);
        if (Number.isFinite(v)) series[y] = v;
      });
      all.set(en, series);
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
  const { all, national } = parseWiki(html);
  console.log("parsed", all.size, "areas");

  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const kor = catalog.maps.find((m) => m.id === "kor-tfr");
  if (!kor) throw new Error("kor-tfr missing");
  const byNorm = new Map(kor.regions.map((r) => [norm(r.name), r]));

  const drop = new Set(EMIT.map((y) => `kor-tfr-${y}`));
  const frames = [];
  for (const year of EMIT) {
    if (year === kor.year) continue;
    const regions = [];
    for (const [name, series] of all) {
      if (series[year] == null) continue;
      const r = byNorm.get(norm(name));
      if (!r) continue;
      regions.push({
        id: r.id,
        slug: r.slug,
        name: r.name,
        value: Math.round(series[year] * 1000) / 1000,
      });
    }
    if (regions.length < 14) {
      console.log("skip", year, regions.length);
      continue;
    }
    const vals = regions.map((r) => r.value);
    frames.push({
      id: `kor-tfr-${year}`,
      iso3: "KOR",
      country: "South Korea",
      title: `Total fertility rate, South Korea ${year}`,
      metric: "tfr",
      unit: "children per woman",
      kind: "province",
      year,
      national: national[year] ?? null,
      source: `Statistics Korea (KOSTAT) / KOSIS — total fertility rate by province and metropolitan city, ${year} (via Wikipedia compilation of KOSTAT tables).`,
      sourceUrl: "https://kosis.kr",
      credit: null,
      geoUrl: kor.geoUrl,
      scale: "plasma",
      mid: 2.1,
      labelValues: true,
      note: "KOSTAT sido TFR. Sejong is omitted in years before it was published. Colour domain fixed (0.5–2.5) across years.",
      regions,
      min: Math.round(Math.min(...vals) * 1000) / 1000,
      max: Math.round(Math.max(...vals) * 1000) / 1000,
    });
    console.log(year, regions.length, national[year]);
  }

  if (kor.note && !String(kor.note).includes("year scrubber")) {
    kor.note =
      String(kor.note).replace(/\.$/, "") +
      ". Earlier KOSTAT years are on the year scrubber.";
  } else if (!kor.note) {
    kor.note =
      "KOSTAT / KOSIS sido TFR. Earlier years are on the year scrubber. Colour domain fixed (0.5–2.5).";
  }

  const maps = catalog.maps.filter((m) => !drop.has(m.id));
  maps.push(...frames);
  fs.writeFileSync(CATALOG, JSON.stringify({ maps }, null, 2) + "\n");
  console.log("wrote", frames.length, "korea frames");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
