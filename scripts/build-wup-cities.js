/* eslint-disable */
// Dev-only build step. Parses the UN World Urbanization Prospects 2018
// "File 12: Annual Population of Urban Agglomerations with 300,000 Inhabitants
// or More, 1950-2035 (thousands)" into a compact JSON committed at
// src/lib/data/wup-cities.json. The runtime seeder reads that JSON and matches
// each city in our database to the nearest agglomeration by lat/long, so the
// heavy Excel download stays dev-only and new cities auto-inherit history.
//
// Usage:
//   node scripts/build-wup-cities.js [path-to-xls]
// If no path is given (or the file is missing) the UN .xls is downloaded.

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");
const XLSX = require("xlsx");

// The 2018 revision (classic "urban agglomeration" definition, consistent with
// the Tokyo=37M figures people expect) is now distributed as an archive zip.
// F22 is the ANNUAL series (1950-2035); it also carries Latitude/Longitude.
const WUP_ZIP_URL =
  "https://population.un.org/wup/assets/Download/Archive/WUP2018-Excel-files.zip";
const WUP_MEMBER = "WUP2018-F22-Cities_Over_300K_Annual.xls";

const BASE_YEAR = 2018; // estimates <= 2018, projections thereafter

function curl(url, out) {
  execSync(
    `curl -sS -L --max-time 300 -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" -o "${out}" "${url}"`,
    { stdio: "inherit" },
  );
}

// Ensure we have the annual xls locally, downloading + extracting if needed.
function ensureSource(explicit) {
  if (explicit && fs.existsSync(explicit)) return explicit;
  const xls = path.join(os.tmpdir(), WUP_MEMBER);
  if (fs.existsSync(xls)) return xls;
  const zip = path.join(os.tmpdir(), "wup2018.zip");
  if (!fs.existsSync(zip)) {
    console.log("Downloading UN WUP 2018 archive…");
    curl(WUP_ZIP_URL, zip);
  }
  console.log("Extracting annual cities file…");
  execSync(`unzip -o "${zip}" "${WUP_MEMBER}" -d "${os.tmpdir()}"`, {
    stdio: "inherit",
  });
  return xls;
}

const norm = (s) =>
  String(s == null ? "" : s)
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

async function main() {
  const src = ensureSource(process.argv[2]);
  const wb = XLSX.readFile(src, { cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, blankrows: false });

  // Locate the header row (it contains "Urban Agglomeration").
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const cells = (rows[i] || []).map(norm);
    if (cells.includes("urban agglomeration")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) throw new Error("Could not find WUP header row");

  const header = rows[headerIdx].map(norm);
  const col = (name) => header.findIndex((h) => h === name);
  const cCountry = col("country or area");
  const cCity = col("urban agglomeration");
  const cLat = col("latitude");
  const cLng = col("longitude");
  if (cCity < 0 || cLat < 0 || cLng < 0)
    throw new Error(
      `Missing expected columns (city=${cCity} lat=${cLat} lng=${cLng})`,
    );

  // Year columns: header cells that are 4-digit years.
  const yearCols = [];
  header.forEach((h, i) => {
    const y = Number(h);
    if (Number.isInteger(y) && y >= 1950 && y <= 2035) yearCols.push({ y, i });
  });
  yearCols.sort((a, b) => a.y - b.y);
  const years = yearCols.map((yc) => yc.y);

  const cities = [];
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row.length) continue;
    const name = row[cCity];
    const lat = Number(row[cLat]);
    const lng = Number(row[cLng]);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const values = yearCols.map(({ i }) => {
      const thousands = Number(row[i]);
      return Number.isFinite(thousands) ? Math.round(thousands * 1000) : null;
    });
    // Skip rows with no numeric data.
    if (!values.some((v) => v != null)) continue;

    cities.push({
      name: String(name).replace(/\s+/g, " ").trim(),
      country: cCountry >= 0 ? String(row[cCountry] ?? "").trim() : "",
      lat,
      lng,
      values,
    });
  }

  const payload = {
    source: "UN World Urbanization Prospects 2018",
    citation:
      "United Nations, Department of Economic and Social Affairs, Population Division (2018). World Urbanization Prospects: The 2018 Revision — Annual Population of Urban Agglomerations with 300,000 Inhabitants or More, 1950–2035.",
    unit: "people",
    baseYear: BASE_YEAR,
    years,
    cities,
  };

  const outDir = path.join(__dirname, "..", "src", "lib", "data");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "wup-cities.json");
  fs.writeFileSync(outPath, JSON.stringify(payload));
  const kb = (fs.statSync(outPath).size / 1024).toFixed(0);
  console.log(
    `✔ wrote ${cities.length} agglomerations × ${years.length} years → ${outPath} (${kb} KB)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
