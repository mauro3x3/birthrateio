#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Japan prefecture TFR history from MHLW Vital Statistics table 4-5 (e-Stat).
 *
 * Shares jpn-tfr.json geometry. Downloads Shift_JIS CSV from e-Stat file API.
 *
 * Usage: node scripts/build-japan-tfr-history.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const { TextDecoder } = require("util");

const ROOT = path.join(__dirname, "..");
const CATALOG = path.join(ROOT, "src/lib/data/subnational-maps.json");
const CACHE = path.join(ROOT, ".tmp/jpn-tfr-4-5.cp932");
const STAT_INF_ID = "000040320380";
const EMIT = [1970, 1980, 1990, 2000, 2010, 2015, 2020, 2023];

/** e-Stat prefecture label (no code) → English stem matching catalog names. */
const JA_EN = {
  北海道: "Hokkaido",
  青森県: "Aomori",
  青森: "Aomori",
  岩手県: "Iwate",
  岩手: "Iwate",
  宮城県: "Miyagi",
  宮城: "Miyagi",
  秋田県: "Akita",
  秋田: "Akita",
  山形県: "Yamagata",
  山形: "Yamagata",
  福島県: "Fukushima",
  福島: "Fukushima",
  茨城県: "Ibaraki",
  茨城: "Ibaraki",
  栃木県: "Tochigi",
  栃木: "Tochigi",
  群馬県: "Gunma",
  群馬: "Gunma",
  埼玉県: "Saitama",
  埼玉: "Saitama",
  千葉県: "Chiba",
  千葉: "Chiba",
  東京都: "Tokyo",
  東京: "Tokyo",
  神奈川県: "Kanagawa",
  神奈川: "Kanagawa",
  新潟県: "Niigata",
  新潟: "Niigata",
  富山県: "Toyama",
  富山: "Toyama",
  石川県: "Ishikawa",
  石川: "Ishikawa",
  福井県: "Fukui",
  福井: "Fukui",
  山梨県: "Yamanashi",
  山梨: "Yamanashi",
  長野県: "Nagano",
  長野: "Nagano",
  岐阜県: "Gifu",
  岐阜: "Gifu",
  静岡県: "Shizuoka",
  静岡: "Shizuoka",
  愛知県: "Aichi",
  愛知: "Aichi",
  三重県: "Mie",
  三重: "Mie",
  滋賀県: "Shiga",
  滋賀: "Shiga",
  京都府: "Kyoto",
  京都: "Kyoto",
  大阪府: "Osaka",
  大阪: "Osaka",
  兵庫県: "Hyogo",
  兵庫: "Hyogo",
  奈良県: "Nara",
  奈良: "Nara",
  和歌山県: "Wakayama",
  和歌山: "Wakayama",
  鳥取県: "Tottori",
  鳥取: "Tottori",
  島根県: "Shimane",
  島根: "Shimane",
  岡山県: "Okayama",
  岡山: "Okayama",
  広島県: "Hiroshima",
  広島: "Hiroshima",
  山口県: "Yamaguchi",
  山口: "Yamaguchi",
  徳島県: "Tokushima",
  徳島: "Tokushima",
  香川県: "Kagawa",
  香川: "Kagawa",
  愛媛県: "Ehime",
  愛媛: "Ehime",
  高知県: "Kochi",
  高知: "Kochi",
  福岡県: "Fukuoka",
  福岡: "Fukuoka",
  佐賀県: "Saga",
  佐賀: "Saga",
  長崎県: "Nagasaki",
  長崎: "Nagasaki",
  熊本県: "Kumamoto",
  熊本: "Kumamoto",
  大分県: "Oita",
  大分: "Oita",
  宮崎県: "Miyazaki",
  宮崎: "Miyazaki",
  鹿児島県: "Kagoshima",
  鹿児島: "Kagoshima",
  沖縄県: "Okinawa",
  沖縄: "Okinawa",
};

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            "User-Agent": "birthrate.io/1.0",
            Referer: "https://www.e-stat.go.jp/",
          },
        },
        (res) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks)));
        },
      )
      .on("error", reject);
  });
}

function normEn(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/prefecture/g, "")
    .replace(/[^a-z]/g, "");
}

function parseTable(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let header = null;
  const rows = new Map(); // enStem -> {year: value}
  let national = {};
  for (const line of lines) {
    if (!line.includes(",")) continue;
    const cells = line.split(",").map((c) => c.replace(/\u3000/g, "").trim());
    if (!header) {
      const years = cells
        .slice(1)
        .map((c) => Number(c))
        .filter((y) => Number.isFinite(y) && y >= 1900);
      if (years.length >= 5) {
        header = years;
      }
      continue;
    }
    const label = cells[0].replace(/^\d+\s*/, "").trim();
    if (!label || label.startsWith("注") || label.startsWith("資料")) continue;
    if (/^全\s*国/.test(label)) {
      header.forEach((y, i) => {
        const v = Number(cells[i + 1]);
        if (Number.isFinite(v)) national[y] = v;
      });
      continue;
    }
    const en = JA_EN[label] || JA_EN[label.replace(/[都道府県]$/, "")];
    if (!en) continue;
    const series = rows.get(en) || {};
    header.forEach((y, i) => {
      const raw = cells[i + 1];
      if (!raw || raw === "…" || raw === "...") return;
      const v = Number(raw);
      if (Number.isFinite(v)) series[y] = v;
    });
    rows.set(en, series);
  }
  return { rows, national };
}

async function main() {
  let buf;
  if (fs.existsSync(CACHE)) buf = fs.readFileSync(CACHE);
  else {
    const url = `https://www.e-stat.go.jp/stat-search/file-download?statInfId=${STAT_INF_ID}&fileKind=1`;
    console.log("fetching e-Stat table 4-5…");
    buf = await fetchBuf(url);
    if (buf[0] === 0x3c) throw new Error("e-Stat returned HTML — download blocked");
    fs.mkdirSync(path.dirname(CACHE), { recursive: true });
    fs.writeFileSync(CACHE, buf);
  }
  const text = new TextDecoder("shift_jis").decode(buf);
  const { rows, national } = parseTable(text);
  console.log("parsed", rows.size, "prefectures");

  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const jpn = catalog.maps.find((m) => m.id === "jpn-tfr");
  if (!jpn) throw new Error("jpn-tfr missing");
  const byNorm = new Map(jpn.regions.map((r) => [normEn(r.name), r]));

  const drop = new Set(EMIT.map((y) => `jpn-tfr-${y}`));
  const frames = [];
  for (const year of EMIT) {
    if (year === jpn.year) continue;
    const regions = [];
    for (const [en, series] of rows) {
      if (series[year] == null) continue;
      const r = byNorm.get(normEn(en));
      if (!r) {
        console.warn("unmatched", en);
        continue;
      }
      regions.push({
        id: r.id,
        slug: r.slug,
        name: r.name,
        value: Math.round(series[year] * 100) / 100,
      });
    }
    if (regions.length < 40) {
      console.log("skip", year, regions.length);
      continue;
    }
    const vals = regions.map((r) => r.value);
    frames.push({
      id: `jpn-tfr-${year}`,
      iso3: "JPN",
      country: "Japan",
      title: `Total fertility rate, Japan ${year}`,
      metric: "tfr",
      unit: "children per woman",
      kind: "prefecture",
      year,
      national: national[year] ?? null,
      source: `Ministry of Health, Labour and Welfare, Vital Statistics of Japan — table 4-5 trends in total fertility rates by prefecture (${year}).`,
      sourceUrl:
        "https://www.e-stat.go.jp/stat-search/files?toukei=00450011&tstat=000001028897",
      credit: null,
      geoUrl: jpn.geoUrl,
      scale: "plasma",
      mid: 2.1,
      labelValues: true,
      note: "MHLW prefecture TFR. Colour domain fixed (0.8–2.5) across years.",
      regions,
      min: Math.round(Math.min(...vals) * 100) / 100,
      max: Math.round(Math.max(...vals) * 100) / 100,
    });
    console.log(year, regions.length, national[year]);
  }

  if (jpn.note && !String(jpn.note).includes("year scrubber")) {
    jpn.note =
      String(jpn.note).replace(/\.$/, "") +
      ". Earlier MHLW years are on the year scrubber.";
  } else if (!jpn.note) {
    jpn.note =
      "MHLW Vital Statistics prefecture TFR. Earlier years are on the year scrubber. Colour domain fixed (0.8–2.5).";
  }

  const maps = catalog.maps.filter((m) => !drop.has(m.id));
  maps.push(...frames);
  fs.writeFileSync(CATALOG, JSON.stringify({ maps }, null, 2) + "\n");
  console.log("wrote", frames.length, "japan frames");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
