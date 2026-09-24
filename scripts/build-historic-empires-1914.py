#!/usr/bin/env python3
"""Build a live 1914 empires overview choropleth from historical-basemaps.

This is intentionally empire-/state-level (not uyezd/vilayet). District-level
historic census maps still need dedicated GIS (Heidelberg / Ristat / etc.).
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path
from urllib.request import urlopen, Request

ROOT = Path(__file__).resolve().parents[1]
OUT_GEO = ROOT / "public" / "geo" / "historic" / "empires-1914.json"
OUT_DATA = ROOT / "src" / "lib" / "data" / "historic-empires-1914.json"
CACHE = ROOT / ".cache" / "historic" / "world_1914.geojson"
SRC_URL = (
    "https://raw.githubusercontent.com/aourednik/historical-basemaps/"
    "master/geojson/world_1914.geojson"
)

# Dominant civilizational / religious identity of the polity as a whole —
# not district majorities. Used only for the overview layer.
PLURALITY = {
    "Russian Empire": "orthodox",
    "Sakhalin (RU)": "orthodox",
    "Ottoman Empire": "muslim",
    "Persia": "shia",
    "German Empire": "protestant",
    "German E. Africa (Tanganyika)": "other",
    "German South-West Africa": "other",
    "Austro-Hungarian Empire": "catholic",
    "United Kingdom of Great Britain and Ireland": "protestant",
    "British Raj": "hindu",
    "British East Africa": "other",
    "British Protectorate": "other",
    "British Somaliland": "muslim",
    "France": "catholic",
    "French Indochina": "other",
    "Algeria": "muslim",  # French Algeria — Muslim majority population
    "Italy": "catholic",
    "Spain": "catholic",
    "Portugal": "catholic",
    "Netherlands": "protestant",
    "Belgium": "catholic",
    "Switzerland": "mixed",
    "Sweden": "protestant",
    "Norway": "protestant",
    "Denmark": "protestant",
    "Romania": "orthodox",
    "Bulgaria": "orthodox",
    "Serbia": "orthodox",
    "Greece": "orthodox",
    "Montenegro": "orthodox",
    "Albania": "muslim",
    "Egypt": "muslim",
    "China": "other",
    "Japan": "other",
    "United States": "protestant",
    "Mexico": "catholic",
    "Brazil": "catholic",
    "Argentina": "catholic",
    "Chile": "catholic",
    "Canada": "protestant",
    "Australia": "protestant",
    "New Zealand": "protestant",
    "Ethiopia": "orthodox",
    "Afghanistan": "muslim",
    "Siam": "buddhist",
    "Nepal": "hindu",
    "Arabia (Nejd)": "muslim",
    "Anglo-Egyptian Sudan": "muslim",
    "Finland": "protestant",
    "Luxembourg": "catholic",
}

GROUPS = [
    {"id": "orthodox", "shortLabel": "Christian (Orthodox)", "color": "#4a2c6a"},
    {"id": "catholic", "shortLabel": "Christian (Catholic)", "color": "#f4d03f"},
    {"id": "protestant", "shortLabel": "Christian (Protestant)", "color": "#5dade2"},
    {"id": "muslim", "shortLabel": "Muslim (Sunni-majority)", "color": "#27ae60"},
    {"id": "shia", "shortLabel": "Muslim (Shiʿa-majority)", "color": "#1e8449"},
    {"id": "hindu", "shortLabel": "Hindu", "color": "#e67e22"},
    {"id": "buddhist", "shortLabel": "Buddhist", "color": "#8e44ad"},
    {"id": "mixed", "shortLabel": "Mixed / confessional", "color": "#95a5a6"},
    {"id": "other", "shortLabel": "Other / colonial", "color": "#bdc3c7"},
]

# Keep the map readable: Europe, Near East, North Africa, South / Central Asia.
FOCUS_BOX = dict(west=-25, south=5, east=150, north=75)


def slugify(name: str) -> str:
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return f"empire-{s}"


def simplify_ring(ring, step: int):
    if step <= 1 or len(ring) < 20:
        return ring
    out = ring[::step]
    if out[-1] != ring[-1]:
        out.append(ring[-1])
    return out


def simplify_geom(geom: dict, max_pts: int = 1200) -> dict:
    def count(coords):
        n = 0

        def walk(c):
            nonlocal n
            if isinstance(c[0], (int, float)):
                n += 1
                return
            for x in c:
                walk(x)

        walk(coords)
        return n

    def simp(coords, step):
        if isinstance(coords[0][0], (int, float)):
            return simplify_ring(coords, step)
        return [simp(c, step) for c in coords]

    n = count(geom["coordinates"])
    if n <= max_pts:
        return geom
    step = max(2, n // max_pts)
    return {"type": geom["type"], "coordinates": simp(geom["coordinates"], step)}


def bbox_overlaps(geom: dict) -> bool:
    coords = []

    def walk(c):
        if isinstance(c[0], (int, float)):
            coords.append(c)
            return
        for x in c:
            walk(x)

    walk(geom["coordinates"])
    if not coords:
        return False
    xs = [c[0] for c in coords]
    ys = [c[1] for c in coords]
    return not (
        max(xs) < FOCUS_BOX["west"]
        or min(xs) > FOCUS_BOX["east"]
        or max(ys) < FOCUS_BOX["south"]
        or min(ys) > FOCUS_BOX["north"]
    )


def load_basemap() -> dict:
    if CACHE.exists():
        return json.loads(CACHE.read_text())
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    req = Request(SRC_URL, headers={"User-Agent": "birthrateio-historic-build"})
    with urlopen(req, timeout=60) as r:
        data = r.read()
    CACHE.write_bytes(data)
    return json.loads(data.decode("utf-8"))


def main() -> None:
    raw = load_basemap()
    features = []
    areas = []
    for f in raw["features"]:
        name = f["properties"].get("NAME") or ""
        if name not in PLURALITY:
            continue
        if not bbox_overlaps(f["geometry"]):
            continue
        plural = PLURALITY[name]
        slug = slugify(name)
        geom = simplify_geom(f["geometry"])
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "name": name,
                    "slug": slug,
                    "code": slug,
                    "plurality": plural,
                },
                "geometry": geom,
            }
        )
        areas.append(
            {
                "code": slug,
                "slug": slug,
                "name": name,
                "plurality": plural,
                "population": 0,
                "shares": {plural: 1.0},
            }
        )

    OUT_GEO.parent.mkdir(parents=True, exist_ok=True)
    OUT_GEO.write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":"))
    )
    OUT_DATA.write_text(
        json.dumps(
            {
                "id": "empires-1914-overview",
                "slug": "empires-1914",
                "title": "Great powers & empires, 1914",
                "year": 1914,
                "mapMode": "plurality",
                "note": "State-level overview only: each polity is painted by its overall religious majority, not by district. Uyezd / vilayet / kreis layers still need historic census GIS.",
                "source": "Borders: historical-basemaps (aourednik) world_1914. Plurality colors: birthrate.io overview coding from period majorities.",
                "sourceUrl": "https://github.com/aourednik/historical-basemaps",
                "geoUrl": "/geo/historic/empires-1914.json",
                "groups": GROUPS,
                "areas": areas,
            },
            indent=2,
        )
        + "\n"
    )
    print(f"wrote {OUT_GEO} ({len(features)} features)")
    print(f"wrote {OUT_DATA}")


if __name__ == "__main__":
    main()
