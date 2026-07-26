/* eslint-disable */
// Dev-only build step. Parses the UN DESA "International Migrant Stock 2024 —
// destination and origin" workbook (Table 1, bilateral long format) into a
// compact JSON keyed by ISO3 country codes, committed at
// src/lib/data/migration-flows.json. The runtime seeder reads that JSON, so
// the heavy xlsx dependency stays dev-only.
//
// Usage:
//   node scripts/build-migration-flows.js [path-to-xlsx]
// If no path is given (or the file is missing) the UN workbook is downloaded.

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");
const XLSX = require("xlsx");

const UN_URL =
  "https://www.un.org/development/desa/pd/sites/www.un.org.development.desa.pd/files/undesa_pd_2024_ims_stock_by_sex_destination_and_origin.xlsx";
const ISO_URL =
  "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.csv";

// Years available in the both-sexes block (Table 1 columns 7..14).
const ALL_YEARS = [1990, 1995, 2000, 2005, 2010, 2015, 2020, 2024];
// Keep a lean set of snapshots that still tells the growth story.
const KEEP_YEARS = [1990, 2000, 2010, 2015, 2020, 2024];

function curl(url, out) {
  execSync(
    `curl -sS -L --max-time 180 -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" -o "${out}" "${url}"`,
    { stdio: "inherit" },
  );
}

function parseCsv(text) {
  // Minimal CSV parser good enough for the ISO file (handles quoted commas).
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    const cells = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) {
        cells.push(cur);
        cur = "";
      } else cur += ch;
    }
    cells.push(cur);
    rows.push(cells);
  }
  return rows;
}

function loadM49ToIso3() {
  const csvPath = path.join(os.tmpdir(), "iso3166.csv");
  if (!fs.existsSync(csvPath)) curl(ISO_URL, csvPath);
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  const header = rows[0];
  const iA3 = header.indexOf("alpha-3");
  const iNum = header.indexOf("country-code");
  const map = new Map();
  for (const r of rows.slice(1)) {
    const a3 = (r[iA3] || "").trim();
    const num = parseInt((r[iNum] || "").trim(), 10);
    if (a3 && Number.isFinite(num)) map.set(num, a3);
  }
  // UN DESA / World Bank reconciliation overrides (WB API ISO3 quirks).
  map.set(275, "PSE"); // State of Palestine
  map.set(158, "TWN"); // Taiwan
  return map;
}

function main() {
  const xlsxPath = process.argv[2] || path.join(os.tmpdir(), "un2024.xlsx");
  if (!fs.existsSync(xlsxPath)) {
    console.log("Downloading UN workbook…");
    curl(UN_URL, xlsxPath);
  }
  const m49 = loadM49ToIso3();

  const wb = XLSX.readFile(xlsxPath);
  const ws = wb.Sheets["Table 1"];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
  const data = rows.slice(8); // header is row index 7

  const keepIdx = KEEP_YEARS.map((y) => 7 + ALL_YEARS.indexOf(y));
  const flows = [];
  let skippedNoMap = 0;
  const unmatched = new Set();

  for (const r of data) {
    const destCode = r[4];
    const origCode = r[6];
    if (destCode == null || origCode == null) continue;
    const dest = m49.get(Number(destCode));
    const orig = m49.get(Number(origCode));
    if (!dest || !orig) {
      // One side is an aggregate/region (no ISO3) — expected, skip silently
      // unless it looks like a real country code we failed to map.
      if (!dest && Number(destCode) < 900) unmatched.add(destCode);
      if (!orig && Number(origCode) < 900) unmatched.add(origCode);
      skippedNoMap++;
      continue;
    }
    if (dest === orig) continue;
    const vals = keepIdx.map((i) => {
      const v = r[i];
      return typeof v === "number" && v > 0 ? Math.round(v) : null;
    });
    // Require a current (2024) value so the table only carries live corridors.
    if (vals[vals.length - 1] == null) continue;
    flows.push([dest, orig, vals]);
  }

  const out = {
    source: "UN DESA — International Migrant Stock 2024 (destination & origin)",
    citation:
      "United Nations, Department of Economic and Social Affairs, Population Division (2024). International Migrant Stock 2024.",
    metric: "stock",
    note: "Migrant stock = people living in the destination country who were born in the origin country (includes refugees). Mid-year estimates.",
    years: KEEP_YEARS,
    flows,
  };

  const outDir = path.join(__dirname, "..", "src", "lib", "data");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "migration-flows.json");
  fs.writeFileSync(outPath, JSON.stringify(out));
  const kb = (fs.statSync(outPath).size / 1024).toFixed(0);
  console.log(`✔ wrote ${flows.length} corridors → ${outPath} (${kb} KB)`);
  console.log(`  skipped (region/aggregate side): ${skippedNoMap}`);
  if (unmatched.size)
    console.log(`  ⚠ unmatched country-like codes:`, [...unmatched].sort());
}

main();
