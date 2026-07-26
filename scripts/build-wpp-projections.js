/* eslint-disable */
// Dev-only build step. Parses the UN World Population Prospects 2024
// "Total Population by Sex" CSV (which carries every projection variant for
// every country, keyed by ISO3) into a compact JSON committed at
// src/lib/data/wpp-projections.json. The runtime seeder reads that JSON, so the
// heavy ~17 MB download stays dev-only.
//
// We keep the three headline variants — Low / Medium / High — which bracket the
// official UN range, sampled at the base year plus every 5 years to 2100.
//
// Usage:
//   node scripts/build-wpp-projections.js [path-to-csv-or-gz]
// If no path is given (or the file is missing) the UN CSV.gz is downloaded.

const fs = require("fs");
const path = require("path");
const os = require("os");
const zlib = require("zlib");
const readline = require("readline");
const { execSync } = require("child_process");

const WPP_URL =
  "https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/CSV_FILES/WPP2024_TotalPopulationBySex.csv.gz";

const VARIANTS = { Low: "low", Medium: "medium", High: "high" };
const BASE_YEAR = 2024;
const END_YEAR = 2100;
const keepYear = (y) => y === BASE_YEAR || (y % 5 === 0 && y >= BASE_YEAR && y <= END_YEAR);

// Column indices (0-based) in WPP2024_TotalPopulationBySex.csv:
// 0 SortOrder 1 LocID 2 Notes 3 ISO3_code 4 ISO2_code 5 SDMX_code 6 LocTypeID
// 7 LocTypeName 8 ParentID 9 Location 10 VarID 11 Variant 12 Time 13 MidPeriod
// 14 PopMale 15 PopFemale 16 PopTotal 17 PopDensity
const I = { iso3: 3, locType: 6, variant: 11, time: 12, popTotal: 16 };

function curl(url, out) {
  execSync(
    `curl -sS -L --max-time 300 -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" -o "${out}" "${url}"`,
    { stdio: "inherit" },
  );
}

// Split a single CSV line, honouring double-quoted fields (commas inside quotes).
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

async function main() {
  let src = process.argv[2] || path.join(os.tmpdir(), "wpp_pop.csv.gz");
  if (!fs.existsSync(src)) {
    console.log("Downloading UN WPP 2024 total-population CSV…");
    curl(WPP_URL, src);
  }

  const raw = fs.createReadStream(src);
  const input = src.endsWith(".gz") ? raw.pipe(zlib.createGunzip()) : raw;
  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  // data[iso3][variantKey] = Map<year, popPeople>
  const data = {};
  let isHeader = true;
  let kept = 0;

  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    if (!line) continue;
    const c = splitCsv(line);
    if (c[I.locType] !== "4") continue; // 4 = Country/Area
    const variantKey = VARIANTS[c[I.variant]];
    if (!variantKey) continue;
    const year = Number(c[I.time]);
    if (!keepYear(year)) continue;
    const iso3 = c[I.iso3];
    if (!/^[A-Z]{3}$/.test(iso3)) continue;
    const thousands = Number(c[I.popTotal]);
    if (!Number.isFinite(thousands)) continue;

    const country = (data[iso3] = data[iso3] || {});
    const series = (country[variantKey] = country[variantKey] || new Map());
    series.set(year, Math.round(thousands * 1000));
    kept++;
  }

  const years = [];
  for (let y = BASE_YEAR; y <= END_YEAR; y++) if (keepYear(y)) years.push(y);

  const out = {};
  let countries = 0;
  for (const [iso3, variants] of Object.entries(data)) {
    const entry = {};
    let hasAll = true;
    for (const vk of ["low", "medium", "high"]) {
      const m = variants[vk];
      if (!m) {
        hasAll = false;
        break;
      }
      entry[vk] = years.map((y) => (m.has(y) ? m.get(y) : null));
    }
    if (!hasAll) continue;
    out[iso3] = entry;
    countries++;
  }

  const payload = {
    source: "UN World Population Prospects 2024",
    citation:
      "United Nations, Department of Economic and Social Affairs, Population Division (2024). World Population Prospects 2024, Online Edition. Total population, Low / Medium / High variants.",
    note: "Official UN projections. Low and High variants differ from Medium by ±0.5 children per woman in the fertility assumption; all variants share the same mortality and international-migration assumptions.",
    unit: "people",
    years,
    data: out,
  };

  const outDir = path.join(__dirname, "..", "src", "lib", "data");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "wpp-projections.json");
  fs.writeFileSync(outPath, JSON.stringify(payload));
  const kb = (fs.statSync(outPath).size / 1024).toFixed(0);
  console.log(
    `✔ wrote ${countries} countries × 3 variants × ${years.length} years → ${outPath} (${kb} KB)`,
  );
  console.log(`  (${kept} source rows kept)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
