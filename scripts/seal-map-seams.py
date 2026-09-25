#!/usr/bin/env python3
"""Seal micro-gaps between neighbouring polygons in public/geo/maps/*.json.

Heavy RDP simplification in write_geo leaves ocean-coloured cracks between
states/countries. Buffer each polygon, then clip to the hole-filled national
outline so neighbours overlap while the coastline does not grow.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from shapely.geometry import Polygon, mapping, shape
from shapely.ops import unary_union
from shapely.validation import make_valid

ROOT = Path(__file__).resolve().parents[1]
MAPS = ROOT / "public" / "geo" / "maps"

# Degrees — enough to close simplify seams without swallowing enclaves.
PAD = 0.04


def fill_holes(geom):
    if geom.geom_type == "Polygon":
        return Polygon(geom.exterior)
    if geom.geom_type == "MultiPolygon":
        return unary_union([Polygon(p.exterior) for p in geom.geoms])
    return geom


def seal_features(features: list[dict], pad: float = PAD) -> int:
    """Outline-clipped buffer seal. Mutates features in place. Returns count."""
    geoms = []
    for f in features:
        geom = f.get("geometry")
        if not geom:
            geoms.append(None)
            continue
        try:
            g = make_valid(shape(geom))
            # Skip antimeridian sprawl (Russia, Fiji…) — buffering them voids Siberia.
            minx, _, maxx, _ = g.bounds
            if (maxx - minx) > 180:
                geoms.append(None)
            else:
                geoms.append(g)
        except Exception:
            geoms.append(None)

    valid = [g for g in geoms if g is not None and not g.is_empty]
    if not valid:
        return 0

    outline = fill_holes(make_valid(unary_union(valid)))
    n = 0
    for feat, geom in zip(features, geoms):
        if geom is None or geom.is_empty:
            continue
        try:
            expanded = geom.buffer(
                pad, join_style=1, mitre_limit=2.5, quad_segs=8
            )
            clipped = make_valid(expanded.intersection(outline))
            if clipped.is_empty or clipped.area < geom.area * 0.5:
                continue
            simplified = clipped.simplify(
                min(pad / 12, 0.002), preserve_topology=True
            )
            if simplified.is_empty or simplified.area < geom.area * 0.5:
                simplified = clipped
            feat["geometry"] = mapping(make_valid(simplified))
            n += 1
        except Exception:
            continue
    return n


def seal_file(path: Path, pad: float = PAD) -> int:
    data = json.loads(path.read_text())
    feats = data.get("features") or []
    n = seal_features(feats, pad)
    path.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    return n


def main() -> None:
    pad = float(sys.argv[1]) if len(sys.argv) > 1 else PAD
    only = sys.argv[2:] if len(sys.argv) > 2 else None
    if only:
        paths = [MAPS / name if not name.startswith("/") else Path(name) for name in only]
        paths = [p if p.exists() else MAPS / p.name for p in paths]
    else:
        paths = sorted(MAPS.glob("*.json"))
    if not paths:
        raise SystemExit(f"no maps in {MAPS}")
    for path in paths:
        n = seal_file(path, pad)
        print(f"  sealed {path.name} ({n} features, pad={pad})")
    print(f"done {len(paths)} files")


if __name__ == "__main__":
    main()
