#!/usr/bin/env python3
"""Seal micro-gaps between neighbouring polygons in public/geo/maps/*.json.

Heavy RDP simplification in write_geo leaves ocean-coloured cracks between
states/countries. A tiny positive buffer overlaps neighbours so Leaflet fills
read continuous (same trick as historic empire builds).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from shapely.geometry import mapping, shape
from shapely.validation import make_valid

ROOT = Path(__file__).resolve().parents[1]
MAPS = ROOT / "public" / "geo" / "maps"

# Degrees — enough to close simplify seams without swallowing enclaves.
PAD = 0.004


def seal_geom(geom: dict, pad: float = PAD):
    try:
        g = make_valid(shape(geom))
        if g.is_empty:
            return geom
        # Buffering antimeridian multipolygons (Russia, Fiji…) creates voids.
        minx, _, maxx, _ = g.bounds
        if (maxx - minx) > 180:
            return geom
        sealed = make_valid(g.buffer(pad))
        if sealed.is_empty:
            return geom
        return mapping(sealed)
    except Exception:
        return geom


def seal_file(path: Path, pad: float = PAD) -> int:
    data = json.loads(path.read_text())
    feats = data.get("features") or []
    n = 0
    for f in feats:
        geom = f.get("geometry")
        if not geom:
            continue
        f["geometry"] = seal_geom(geom, pad)
        n += 1
    path.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    return n


def main() -> None:
    pad = float(sys.argv[1]) if len(sys.argv) > 1 else PAD
    paths = sorted(MAPS.glob("*.json"))
    if not paths:
        raise SystemExit(f"no maps in {MAPS}")
    for path in paths:
        n = seal_file(path, pad)
        print(f"  sealed {path.name} ({n} features, pad={pad})")
    print(f"done {len(paths)} files")


if __name__ == "__main__":
    main()
