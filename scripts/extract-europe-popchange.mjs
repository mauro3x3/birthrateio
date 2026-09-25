#!/usr/bin/env node
/**
 * Extract Europe GHSL pop-change points (2000→2025) as GeoJSONL for tippecanoe.
 *
 * Reads GHS-POP 30 arc-sec WGS84 GeoTIFFs with geotiff.js (windowed), classifies
 * each inhabited cell as growth (chg=1) or decline (chg=-1), writes NDJSON features.
 *
 * Usage:
 *   node scripts/extract-europe-popchange.mjs
 *   node scripts/extract-europe-popchange.mjs --min-pop 1 --out data/pmtiles/europe-popchange.geojsonl
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fromFile } from "geotiff";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GHSL = path.join(ROOT, "data/ghsl");

const TIF_2000 = path.join(
  GHSL,
  "GHS_POP_E2000_GLOBE_R2023A_4326_30ss_V1_0.tif",
);
const TIF_2025 = path.join(
  GHSL,
  "GHS_POP_E2025_GLOBE_R2023A_4326_30ss_V1_0.tif",
);

// west, south, east, north
const EUROPE_BOUNDS = [-25, 34, 45, 72];

function parseArgs(argv) {
  const out = {
    minPop: 1,
    outPath: path.join(ROOT, "data/pmtiles/europe-popchange.geojsonl"),
    strip: 128,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--min-pop") out.minPop = Number(argv[++i]);
    else if (a === "--out") out.outPath = path.resolve(argv[++i]);
    else if (a === "--strip") out.strip = Number(argv[++i]);
  }
  return out;
}

function lonLatToPixel(image, lon, lat) {
  const origin = image.getOrigin();
  const res = image.getResolution();
  const px = Math.floor((lon - origin[0]) / res[0]);
  const py = Math.floor((lat - origin[1]) / res[1]);
  return [px, py];
}

function pixelToLonLat(image, px, py) {
  const origin = image.getOrigin();
  const res = image.getResolution();
  // cell center
  const lon = origin[0] + (px + 0.5) * res[0];
  const lat = origin[1] + (py + 0.5) * res[1];
  return [lon, lat];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  for (const p of [TIF_2000, TIF_2025]) {
    if (!fs.existsSync(p)) {
      console.error(`Missing ${p}`);
      process.exit(1);
    }
  }

  console.log("Opening GeoTIFFs…");
  const [t0, t1] = await Promise.all([fromFile(TIF_2000), fromFile(TIF_2025)]);
  const [img0, img1] = await Promise.all([t0.getImage(), t1.getImage()]);

  const w = img0.getWidth();
  const h = img0.getHeight();
  if (w !== img1.getWidth() || h !== img1.getHeight()) {
    throw new Error("2000 and 2025 grids must match");
  }

  const [west, south, east, north] = EUROPE_BOUNDS;
  const [x0a, y0a] = lonLatToPixel(img0, west, north); // NW
  const [x1a, y1a] = lonLatToPixel(img0, east, south); // SE
  const col0 = Math.max(0, Math.min(x0a, x1a));
  const col1 = Math.min(w - 1, Math.max(x0a, x1a));
  const row0 = Math.max(0, Math.min(y0a, y1a));
  const row1 = Math.min(h - 1, Math.max(y0a, y1a));
  const winW = col1 - col0 + 1;
  const winH = row1 - row0 + 1;
  console.log(
    `Window cols ${col0}–${col1} (${winW}) rows ${row0}–${row1} (${winH})`,
  );

  fs.mkdirSync(path.dirname(args.outPath), { recursive: true });
  const out = fs.createWriteStream(args.outPath);
  let nGrowth = 0;
  let nDecline = 0;
  const tStart = Date.now();

  for (let r = row0; r <= row1; r += args.strip) {
    const rh = Math.min(args.strip, row1 - r + 1);
    const window = [col0, r, col0 + winW, r + rh];
    const [ras0, ras1] = await Promise.all([
      img0.readRasters({ window, interleave: true }),
      img1.readRasters({ window, interleave: true }),
    ]);
    const a = ras0;
    const b = ras1;
    const n = winW * rh;
    for (let i = 0; i < n; i++) {
      const v0 = Number(a[i]);
      const v1 = Number(b[i]);
      if (!Number.isFinite(v0) && !Number.isFinite(v1)) continue;
      const p0 = Number.isFinite(v0) && v0 > -1e20 ? v0 : 0;
      const p1 = Number.isFinite(v1) && v1 > -1e20 ? v1 : 0;
      if (p0 < args.minPop && p1 < args.minPop) continue;
      const delta = p1 - p0;
      if (delta === 0) continue;
      const chg = delta > 0 ? 1 : -1;
      const px = col0 + (i % winW);
      const py = r + Math.floor(i / winW);
      const [lon, lat] = pixelToLonLat(img0, px, py);
      out.write(
        JSON.stringify({
          type: "Feature",
          properties: { chg },
          geometry: { type: "Point", coordinates: [lon, lat] },
        }) + "\n",
      );
      if (chg === 1) nGrowth++;
      else nDecline++;
    }
    const done = r + rh - row0;
    if (done % (args.strip * 8) < args.strip || r + rh > row1) {
      const sec = ((Date.now() - tStart) / 1000).toFixed(0);
      console.log(
        `  row ${r}/${row1} · growth ${nGrowth.toLocaleString()} · decline ${nDecline.toLocaleString()} · ${sec}s`,
      );
    }
  }

  await new Promise((resolve, reject) => {
    out.end(() => resolve());
    out.on("error", reject);
  });

  const mb = fs.statSync(args.outPath).size / 1e6;
  console.log(
    `Wrote ${(nGrowth + nDecline).toLocaleString()} features ` +
      `(${nGrowth.toLocaleString()} growth / ${nDecline.toLocaleString()} decline) → ` +
      `${args.outPath} (${mb.toFixed(1)} MB)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
