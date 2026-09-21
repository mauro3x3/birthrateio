#!/usr/bin/env python3
"""
Build an India population dot-density PMTiles from WorldPop.

Pipeline mirrors Kyle Walker's freestiler workflow:
  WorldPop grid → random dots within cells → GeoParquet → PMTiles (MVT)

Default uses 1 km WorldPop 2025 and 1 dot per 100 people so a full-country
tileset stays buildable on a laptop. Pass --people-per-dot 1 for the full
1.46B-point treatment (needs ~20+ minutes and multi-GB disk).

Example:
  python3 scripts/build-india-population-pmtiles.py
  python3 scripts/build-india-population-pmtiles.py --people-per-dot 50 --max-zoom 12
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

import numpy as np
import pyarrow as pa
import pyarrow.parquet as pq
import rasterio
from rasterio.transform import xy

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TIF = ROOT / "data/worldpop/ind_pop_2025_cn_1km.tif"
DEFAULT_PARQUET = ROOT / "data/pmtiles/india-pop-dots.parquet"
DEFAULT_PMTILES = ROOT / "public/tiles/india-population.pmtiles"
WORLDPOP_URL = (
    "https://data.worldpop.org/GIS/Population/Global_2015_2030/R2025A/2025/IND/"
    "v1/1km_ua/constrained/ind_pop_2025_CN_1km_R2025A_UA_v1.tif"
)


def download_tif(path: Path) -> None:
    import urllib.request

    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.stat().st_size > 1_000_000:
        print(f"Using existing {path} ({path.stat().st_size / 1e6:.1f} MB)")
        return
    print(f"Downloading WorldPop → {path}")
    urllib.request.urlretrieve(WORLDPOP_URL, path)
    print(f"Downloaded {path.stat().st_size / 1e6:.1f} MB")


def write_dots_parquet(
    tif_path: Path,
    parquet_path: Path,
    *,
    people_per_dot: float,
    seed: int,
    batch_rows: int = 250_000,
) -> dict:
    parquet_path.parent.mkdir(parents=True, exist_ok=True)
    if parquet_path.exists():
        parquet_path.unlink()

    rng = np.random.default_rng(seed)
    schema = pa.schema(
        [
            ("lon", pa.float32()),
            ("lat", pa.float32()),
        ]
    )
    writer: pq.ParquetWriter | None = None

    total_people = 0.0
    total_dots = 0
    t0 = time.time()

    with rasterio.open(tif_path) as src:
        transform = src.transform
        nodata = src.nodata
        height, width = src.height, src.width
        # Process in row windows to keep memory low
        window_h = 64
        lon_buf: list[np.ndarray] = []
        lat_buf: list[np.ndarray] = []
        buffered = 0

        def flush() -> None:
            nonlocal writer, lon_buf, lat_buf, buffered
            if not lon_buf:
                return
            lon = np.concatenate(lon_buf)
            lat = np.concatenate(lat_buf)
            table = pa.Table.from_arrays(
                [pa.array(lon, type=pa.float32()), pa.array(lat, type=pa.float32())],
                schema=schema,
            )
            if writer is None:
                writer = pq.ParquetWriter(parquet_path, schema, compression="zstd")
            writer.write_table(table)
            lon_buf = []
            lat_buf = []
            buffered = 0

        for row0 in range(0, height, window_h):
            h = min(window_h, height - row0)
            data = src.read(1, window=rasterio.windows.Window(0, row0, width, h))
            if nodata is not None:
                mask = np.isfinite(data) & (data != nodata) & (data > 0)
            else:
                mask = np.isfinite(data) & (data > 0)
            if not mask.any():
                continue

            rows_i, cols_i = np.where(mask)
            pops = data[rows_i, cols_i].astype(np.float64)
            total_people += float(pops.sum())
            # Stochastic rounding so expected dots ≈ people / people_per_dot
            expected = pops / people_per_dot
            n_dots = np.floor(expected).astype(np.int64)
            frac = expected - n_dots
            n_dots += rng.random(len(frac)) < frac
            keep = n_dots > 0
            if not keep.any():
                continue
            rows_i = rows_i[keep]
            cols_i = cols_i[keep]
            n_dots = n_dots[keep]

            # Expand to one row per dot
            abs_rows = rows_i + row0
            rep_rows = np.repeat(abs_rows, n_dots)
            rep_cols = np.repeat(cols_i, n_dots)
            # Random position within the pixel
            row_f = rep_rows + rng.random(len(rep_rows))
            col_f = rep_cols + rng.random(len(rep_cols))
            xs, ys = xy(transform, row_f, col_f, offset="ul")
            lon_buf.append(np.asarray(xs, dtype=np.float32))
            lat_buf.append(np.asarray(ys, dtype=np.float32))
            buffered += len(rep_rows)
            total_dots += int(n_dots.sum())

            if buffered >= batch_rows:
                flush()
                elapsed = time.time() - t0
                print(
                    f"  row {row0}/{height} · {total_dots:,} dots · "
                    f"{elapsed:.0f}s",
                    flush=True,
                )

        flush()

    if writer is not None:
        writer.close()

    elapsed = time.time() - t0
    stats = {
        "people": total_people,
        "dots": total_dots,
        "people_per_dot": people_per_dot,
        "seconds": elapsed,
        "parquet_mb": parquet_path.stat().st_size / 1e6 if parquet_path.exists() else 0,
    }
    print(
        f"Wrote {total_dots:,} dots (~{total_people/1e9:.2f}B people, "
        f"1:{people_per_dot:g}) → {parquet_path} ({stats['parquet_mb']:.1f} MB) "
        f"in {elapsed:.0f}s"
    )
    return stats


def tile_pmtiles(
    parquet_path: Path,
    pmtiles_path: Path,
    *,
    min_zoom: int,
    max_zoom: int,
    drop_rate: float,
) -> None:
    from freestiler import freestile_query

    pmtiles_path.parent.mkdir(parents=True, exist_ok=True)
    # DuckDB spatial: geometry from lon/lat columns
    q = f"""
      SELECT
        ST_Point(lon, lat) AS geometry
      FROM read_parquet('{parquet_path.as_posix()}')
    """
    print(f"Tiling → {pmtiles_path} (z{min_zoom}–{max_zoom}, drop_rate={drop_rate})")
    t0 = time.time()
    freestile_query(
        query=q,
        output=str(pmtiles_path),
        layer_name="population",
        tile_format="mvt",
        min_zoom=min_zoom,
        max_zoom=max_zoom,
        base_zoom=max_zoom,
        drop_rate=drop_rate,
        streaming="always",
        overwrite=True,
    )
    mb = pmtiles_path.stat().st_size / 1e6
    print(f"Created {pmtiles_path} ({mb:.1f} MB) in {time.time() - t0:.0f}s")


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--tif", type=Path, default=DEFAULT_TIF)
    p.add_argument("--parquet", type=Path, default=DEFAULT_PARQUET)
    p.add_argument("--pmtiles", type=Path, default=DEFAULT_PMTILES)
    p.add_argument(
        "--people-per-dot",
        type=float,
        default=100,
        help="People represented by each dot (1 = Walker-style 1:1)",
    )
    p.add_argument("--min-zoom", type=int, default=3)
    p.add_argument("--max-zoom", type=int, default=12)
    p.add_argument("--drop-rate", type=float, default=2.5)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--skip-download", action="store_true")
    p.add_argument("--skip-dots", action="store_true")
    p.add_argument("--skip-tiles", action="store_true")
    args = p.parse_args()

    if not args.skip_download:
        download_tif(args.tif)
    if not args.tif.exists():
        print(f"Missing GeoTIFF: {args.tif}", file=sys.stderr)
        return 1

    if not args.skip_dots:
        write_dots_parquet(
            args.tif,
            args.parquet,
            people_per_dot=args.people_per_dot,
            seed=args.seed,
        )
    elif not args.parquet.exists():
        print(f"Missing parquet: {args.parquet}", file=sys.stderr)
        return 1

    if not args.skip_tiles:
        tile_pmtiles(
            args.parquet,
            args.pmtiles,
            min_zoom=args.min_zoom,
            max_zoom=args.max_zoom,
            drop_rate=args.drop_rate,
        )

    meta = ROOT / "src/lib/data/india-population-pmtiles.json"
    meta.parent.mkdir(parents=True, exist_ok=True)
    import json

    payload = {
        "title": "India population — WorldPop dot density",
        "source": "WorldPop R2025A constrained 1 km UN-adjusted population counts for India (2025).",
        "sourceUrl": "https://hub.worldpop.org/geodata/listing?id=135",
        "year": 2025,
        "resolution": "1km",
        "peoplePerDot": args.people_per_dot,
        "pmtilesPath": "/tiles/india-population.pmtiles",
        "layer": "population",
        "note": "Dots are placed randomly inside WorldPop grid cells. This is modeled population, not a census microdata point map. At 1:100, each dot stands for about 100 people so the national tileset stays browser-friendly; rebuild with --people-per-dot 1 for a full 1:1 map.",
        "bounds": [68.19, 6.75, 97.39, 35.51],
        "minZoom": args.min_zoom,
        "maxZoom": args.max_zoom,
    }
    meta.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"Wrote metadata {meta}")
    return 0


if __name__ == "__main__":
    # Fix typo guard — WORLDPOP_URL must exist
    raise SystemExit(main())
