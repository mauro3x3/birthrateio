#!/usr/bin/env python3
"""
Download + extract GHSL GHS-POP 2000/2025 (30 arc-sec WGS84) for Europe change maps.

The actual point extraction + PMTiles build is Node/tippecanoe. Preferred:

  python3 scripts/build-europe-popchange-pmtiles.py --build

Or step by step:

  python3 scripts/build-europe-popchange-pmtiles.py
  npm run build:europe-popchange-pmtiles
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GHSL_DIR = ROOT / "data/ghsl"

EPOCHS = {
    2000: {
        "zip": "GHS_POP_E2000_GLOBE_R2023A_4326_30ss_V1_0.zip",
        "tif": "GHS_POP_E2000_GLOBE_R2023A_4326_30ss_V1_0.tif",
        "url": (
            "https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/"
            "GHS_POP_GLOBE_R2023A/GHS_POP_E2000_GLOBE_R2023A_4326_30ss/V1-0/"
            "GHS_POP_E2000_GLOBE_R2023A_4326_30ss_V1_0.zip"
        ),
    },
    2025: {
        "zip": "GHS_POP_E2025_GLOBE_R2023A_4326_30ss_V1_0.zip",
        "tif": "GHS_POP_E2025_GLOBE_R2023A_4326_30ss_V1_0.tif",
        "url": (
            "https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/"
            "GHS_POP_GLOBE_R2023A/GHS_POP_E2025_GLOBE_R2023A_4326_30ss/V1-0/"
            "GHS_POP_E2025_GLOBE_R2023A_4326_30ss_V1_0.zip"
        ),
    },
}


def download_zip(url: str, dest: Path) -> None:
    import urllib.request

    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 10_000_000:
        print(f"Using existing {dest} ({dest.stat().st_size / 1e6:.1f} MB)")
        return
    print(f"Downloading {url}\n  → {dest}")
    urllib.request.urlretrieve(url, dest)
    print(f"Downloaded {dest.stat().st_size / 1e6:.1f} MB")


def extract_tif(zip_path: Path, member: str, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    tif_path = out_dir / member
    if tif_path.exists() and tif_path.stat().st_size > 10_000_000:
        print(f"Using existing {tif_path} ({tif_path.stat().st_size / 1e6:.1f} MB)")
        return tif_path
    print(f"Extracting {member} from {zip_path.name}")
    with zipfile.ZipFile(zip_path) as zf:
        with zf.open(member) as src, open(tif_path, "wb") as dst:
            while True:
                chunk = src.read(8 * 1024 * 1024)
                if not chunk:
                    break
                dst.write(chunk)
    print(f"Extracted {tif_path} ({tif_path.stat().st_size / 1e6:.1f} MB)")
    return tif_path


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--skip-download", action="store_true")
    p.add_argument(
        "--build",
        action="store_true",
        help="After download, run npm run build:europe-popchange-pmtiles",
    )
    args = p.parse_args()

    for _year, meta in EPOCHS.items():
        zpath = GHSL_DIR / meta["zip"]
        if not args.skip_download:
            download_zip(meta["url"], zpath)
        if not zpath.exists():
            print(f"Missing {zpath}", file=sys.stderr)
            return 1
        extract_tif(zpath, meta["tif"], GHSL_DIR)

    if args.build:
        print("Running npm run build:europe-popchange-pmtiles …")
        return subprocess.call(
            ["npm", "run", "build:europe-popchange-pmtiles"],
            cwd=ROOT,
        )

    print(
        "GeoTIFFs ready. Next:\n"
        "  npm run build:europe-popchange-pmtiles\n"
        "Or re-run with --build."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
