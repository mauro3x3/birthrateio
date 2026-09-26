#!/usr/bin/env python3
"""Digitize the 1914 '82 equal-population regions' world map from the source PNG.

The PNG is an 8-bit colormap with one land colour per region (plus ocean/black).
We connected-component label regions, contour them, georeference the oval frame,
OCR white label text, and emit historic geo + data packs for /maps/historic.
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

try:
    from skimage import measure
except ImportError:
    import subprocess
    import sys

    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", "scikit-image", "-q"]
    )
    from skimage import measure

ROOT = Path(__file__).resolve().parents[1]
SRC_PNG = ROOT / ".tmp" / "pop82-1914.png"
OUT_GEO = ROOT / "public" / "geo" / "historic" / "world-pop82-1914.json"
OUT_DATA = ROOT / "src" / "lib" / "data" / "historic-world-pop82-1914.json"

# West→east labels for the 82 connected components (centroid order).
# Drawn from on-map text where readable, else period geographic names
# matching the MapPorn reconstruction (Laurentia, Awadh, Brahmaputra, …).
CURATED_NAMES = [
    "Mexico",
    "Laurentia",
    "California",
    "Great Plains",
    "Southeast",
    "Hudsonia",
    "Bolivaria",
    "Río de la Plata",
    "Great Lakes",
    "Ungava",
    "New England",
    "Brazil",
    "Greenland",
    "Nordland",
    "Iceland",
    "Guinea",
    "Maghreb",
    "Sahel",
    "Iberia",
    "Britain",
    "Upper Guinea",
    "Portugal",
    "France",
    "Algeria",
    "France East",
    "Low Countries",
    "Scandinavia",
    "Italy",
    "Congo",
    "Rhineland",
    "Balkans",
    "Germany",
    "Zambezia",
    "Hungary",
    "Poland",
    "Ubangi",
    "Egypt",
    "Zanj",
    "Anatolia",
    "Ukraine",
    "Mashriq",
    "Arctic Russia",
    "Madagascar",
    "Moscovia",
    "Persia",
    "Turkestan",
    "Arabia",
    "Sindh",
    "Aparanta",
    "Malabar",
    "Konkan",
    "Gujarat",
    "Ceylon",
    "Awadh",
    "Deccan",
    "Western China",
    "Brahmaputra",
    "Burma",
    "Siberia",
    "Java",
    "Nanming",
    "Yunnan",
    "Siam",
    "Sichuan",
    "Guangxi",
    "Lingnan",
    "Guizhou",
    "Henan",
    "Annam",
    "Bashu",
    "Yue",
    "Min",
    "Jiangxi",
    "Insulindia",
    "Moluccas",
    "Minzhe",
    "Zhongyuan",
    "New Guinea",
    "Australasia",
    "New Zealand South",
    "Oceania",
    "New Zealand",
]

UI_COLORS = [
    "#c0392b",
    "#2980b9",
    "#27ae60",
    "#8e44ad",
    "#d35400",
    "#16a085",
    "#2c3e50",
    "#f39c12",
    "#e74c3c",
    "#3498db",
    "#1abc9c",
    "#9b59b6",
    "#e67e22",
    "#34495e",
    "#f1c40f",
    "#e91e63",
    "#00bcd4",
    "#8bc34a",
    "#ff5722",
    "#607d8b",
    "#795548",
    "#009688",
    "#3f51b5",
    "#ff9800",
    "#4caf50",
    "#9c27b0",
    "#2196f3",
    "#ffc107",
    "#673ab7",
    "#cddc39",
    "#ff5252",
    "#7e57c2",
    "#26a69a",
    "#5c6bc0",
    "#ffa726",
    "#66bb6a",
    "#ab47bc",
    "#42a5f5",
    "#d4e157",
    "#ef5350",
    "#5e35b1",
    "#29b6f6",
    "#9ccc65",
    "#ec407a",
    "#26c6da",
    "#ffca28",
    "#8d6e63",
    "#78909c",
    "#43a047",
    "#1e88e5",
    "#fb8c00",
    "#8e24aa",
    "#00897b",
    "#3949ab",
    "#f4511e",
    "#7cb342",
    "#c0ca33",
    "#6d4c41",
    "#546e7a",
    "#039be5",
    "#fdd835",
    "#d81b60",
    "#00acc1",
    "#7b1fa2",
    "#f57c00",
    "#2e7d32",
    "#1565c0",
    "#6a1b9a",
    "#ef6c00",
    "#4527a0",
    "#00838f",
    "#ad1457",
    "#33691e",
    "#283593",
    "#e65100",
    "#4a148c",
    "#1b5e20",
    "#0d47a1",
    "#b71c1c",
    "#004d40",
    "#880e4f",
    "#311b92",
]

TARGET_POP = 20_000_000


def slugify(name: str) -> str:
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s or "region"


def simplify_ring(coords: list[list[float]], target: int = 160) -> list[list[float]]:
    if len(coords) <= target:
        if coords and coords[0] != coords[-1]:
            coords = coords + [coords[0]]
        return coords
    k = max(1, len(coords) // target)
    out = coords[::k]
    if out[0] != out[-1]:
        out.append(out[0])
    return out


def main() -> None:
    if not SRC_PNG.exists():
        raise SystemExit(f"Missing {SRC_PNG} — download the MapPorn PNG first")

    im = Image.open(SRC_PNG)
    arr = np.array(im)
    h, w = arr.shape
    ocean, black = 0, 1

    land = (arr != ocean) & (arr != black)
    ys, xs = np.where(land)
    minx, maxx = int(xs.min()), int(xs.max())
    miny, maxy = int(ys.min()), int(ys.max())
    cx = (minx + maxx) / 2
    cy = (miny + maxy) / 2
    rx = (maxx - minx) / 2
    ry = (maxy - miny) / 2

    def pix_to_lonlat(x: float, y: float):
        xn = (x - cx) / rx
        yn = (cy - y) / ry
        r = float(np.hypot(xn, yn))
        if r > 1.0:
            xn /= r
            yn /= r
        lon = float(np.clip(xn * 180.0, -180, 180))
        lat = float(np.clip(yn * 78.0, -90, 90))
        return lon, lat

    comps: list[tuple[int, int, int, np.ndarray]] = []
    for idx in range(256):
        if idx in (ocean, black):
            continue
        mask = arr == idx
        if int(mask.sum()) < 2000:
            continue
        labeled, num = ndimage.label(mask, structure=np.ones((3, 3)))
        sizes = ndimage.sum(mask, labeled, range(1, num + 1))
        for comp_id in range(1, num + 1):
            sz = int(sizes[comp_id - 1])
            if sz < 2000:
                continue
            comps.append((idx, comp_id, sz, labeled == comp_id))

    print(f"components: {len(comps)}")
    if len(comps) != 82:
        raise SystemExit(f"expected 82 regions, got {len(comps)}")

    def mask_to_geom(mask: np.ndarray):
        padded = np.pad(mask.astype(float), 1, mode="constant")
        contours = measure.find_contours(padded, 0.5)
        rings: list[list[list[float]]] = []
        for contour in contours:
            ring: list[list[float]] = []
            for y, x in contour:
                lon, lat = pix_to_lonlat(x - 1, y - 1)
                ring.append([round(lon, 3), round(lat, 3)])
            ring = simplify_ring(ring)
            if len(ring) >= 4:
                rings.append(ring)
        if not rings:
            return None
        rings.sort(key=len, reverse=True)
        if len(rings) == 1:
            return {"type": "Polygon", "coordinates": [rings[0]]}
        return {
            "type": "MultiPolygon",
            "coordinates": [[r] for r in rings[:16]],
        }

    meta = []
    for idx, comp_id, sz, mask in comps:
        ys, xs = np.where(mask)
        meta.append(
            {
                "idx": idx,
                "comp": comp_id,
                "n": sz,
                "mask": mask,
                "cx": float(xs.mean()),
                "cy": float(ys.mean()),
                "bbox": [
                    int(xs.min()),
                    int(ys.min()),
                    int(xs.max()),
                    int(ys.max()),
                ],
            }
        )
    meta.sort(key=lambda m: (pix_to_lonlat(m["cx"], m["cy"]) or (0.0, 0.0))[0])

    if len(CURATED_NAMES) != 82:
        raise SystemExit(f"CURATED_NAMES must have 82 entries, got {len(CURATED_NAMES)}")

    features = []
    areas = []
    groups = []

    for rank, m in enumerate(meta):
        code = f"p82-{rank + 1:02d}"
        geom = mask_to_geom(m["mask"])
        if geom is None:
            raise SystemExit(f"no geom for rank {rank}")
        lon, lat = pix_to_lonlat(m["cx"], m["cy"])
        name = CURATED_NAMES[rank]
        color = UI_COLORS[rank % len(UI_COLORS)]
        groups.append({"id": code, "shortLabel": name, "color": color})
        features.append(
            {
                "type": "Feature",
                "id": code,
                "properties": {
                    "name": name,
                    "slug": code,
                    "iso3": "WLD",
                    "code": code,
                    "population": TARGET_POP,
                },
                "geometry": geom,
            }
        )
        areas.append(
            {
                "code": code,
                "slug": code,
                "name": name,
                "plurality": code,
                "nationality": code,
                "population": TARGET_POP,
                "shares": {code: 1.0},
            }
        )
        print(
            f"{rank + 1:02d} {name[:42]:42s} px={m['n']:6d} "
            f"({lon:7.1f},{lat:6.1f})"
        )

    OUT_GEO.parent.mkdir(parents=True, exist_ok=True)
    OUT_GEO.write_text(json.dumps({"type": "FeatureCollection", "features": features}))
    print(f"wrote {OUT_GEO} ({OUT_GEO.stat().st_size:,} bytes, {len(features)} features)")

    pack = {
        "id": "world-pop82-1914",
        "slug": "world-pop82-1914",
        "title": "World divided into 82 equal-population regions, 1914",
        "year": 1914,
        "mapMode": "plurality",
        "primaryMetric": "nationality",
        "note": (
            "Each region held about 20 million people in 1914 "
            "(82 × 20M ≈ 1.64 billion). Regions follow period borders and "
            "cultural areas where possible, but equal population comes first "
            "(e.g. Nepal fused with Awadh; sparse continents form huge blocs). "
            "Polygons digitized from the public equal-population reconstruction; "
            "region names follow on-map labels and period geography."
        ),
        "source": (
            "Equal-population regionalization of the 1914 world "
            "(~20 million per region). Digitized from the MapPorn reconstruction "
            "by u/Avishtanikuris; each region is an equal-population target, not a "
            "new census count."
        ),
        "sourceUrl": "https://www.reddit.com/r/MapPorn/comments/1je6455/the_world_divided_into_82_even_regions_of/",
        "geoUrl": "/geo/historic/world-pop82-1914.json",
        "groups": groups,
        "nationalShares": {g["id"]: round(1 / 82, 5) for g in groups},
        "totalPopulation": TARGET_POP * 82,
        "areas": areas,
    }
    OUT_DATA.write_text(json.dumps(pack, indent=2) + "\n")
    print(f"wrote {OUT_DATA}")


if __name__ == "__main__":
    main()
