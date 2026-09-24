#!/usr/bin/env python3
"""Build Russian Empire c. 1897 religion plurality map.

Modern admin-1 units inside the 1914 Russian Empire outline, painted by
approximate 1897 census religion majority (uyezd-level GIS not available).
"""

from __future__ import annotations

import json
import math
import re
import unicodedata
from pathlib import Path

import shapefile
from shapely.geometry import mapping, shape
from shapely.ops import unary_union
from shapely.validation import make_valid

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".cache" / "historic"
SHP_DIR = CACHE / "ne10_admin1"
OUTLINE = CACHE / "ru-1914-outline.geojson"
OUT_GEO = ROOT / "public" / "geo" / "historic" / "russian-empire-1897.json"
OUT_DATA = ROOT / "src" / "lib" / "data" / "historic-russian-empire-1897.json"

GROUPS = [
    {"id": "orthodox", "shortLabel": "Orthodox", "color": "#4a2c6a"},
    {"id": "protestant", "shortLabel": "Protestant", "color": "#5dade2"},
    {"id": "catholic", "shortLabel": "Catholic", "color": "#f4d03f"},
    {"id": "muslim", "shortLabel": "Muslim", "color": "#27ae60"},
    {"id": "buddhist", "shortLabel": "Buddhist", "color": "#e67e22"},
    {"id": "armenian", "shortLabel": "Armenian Apostolic", "color": "#922b21"},
    {"id": "jewish", "shortLabel": "Jewish", "color": "#a569bd"},
    {"id": "other", "shortLabel": "Other", "color": "#95a5a6"},
]

TARGET_POP = 125_640_000  # ~1897 census empire total (excl. Finland ~2.6M)

KEEP = {
    "RUS",
    "UKR",
    "BLR",
    "POL",
    "LTU",
    "LVA",
    "EST",
    "FIN",
    "MDA",
    "GEO",
    "ARM",
    "AZE",
    "KAZ",
    "UZB",
    "TKM",
    "KGZ",
    "TJK",
    "MNG",  # fringe
}


def slugify(name: str) -> str:
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return f"ru-{s}"


def simplify(geom, tol=0.02):
    try:
        g = make_valid(geom)
        return g.simplify(tol, preserve_topology=True)
    except Exception:
        return geom


def load_outline():
    g = json.loads(OUTLINE.read_text())
    geoms = [make_valid(shape(f["geometry"])) for f in g["features"]]
    return make_valid(unary_union(geoms)).buffer(0.15)


def normalize_shares(raw: dict[str, float]) -> dict[str, float]:
    s = sum(max(0.0, v) for v in raw.values())
    if s <= 0:
        return {"other": 1.0}
    return {k: round(v / s, 4) for k, v in raw.items() if v > 0}


def area_km2(geom) -> float:
    c = geom.centroid
    return float(geom.area * (111.32**2) * abs(math.cos(math.radians(c.y))))


def classify(a3: str, name: str) -> tuple[str, str, dict[str, float]] | None:
    """Return (display, religion plurality, shares) or None."""
    n = name or ""
    nl = n.lower()

    # Baltics — Lutheran Protestant majority (1897)
    if a3 in {"EST", "LVA"}:
        return (n, "protestant", normalize_shares({"protestant": 0.78, "orthodox": 0.12, "catholic": 0.05, "other": 0.05}))
    if a3 == "LTU":
        return (n, "catholic", normalize_shares({"catholic": 0.76, "jewish": 0.12, "orthodox": 0.07, "other": 0.05}))
    if a3 == "FIN":
        # Grand Duchy — Lutheran; not in 1897 census but inside empire
        return (n, "protestant", normalize_shares({"protestant": 0.98, "orthodox": 0.015, "other": 0.005}))

    # Congress Poland — Catholic
    if a3 == "POL":
        return (n, "catholic", normalize_shares({"catholic": 0.74, "jewish": 0.14, "orthodox": 0.08, "protestant": 0.04}))

    if a3 == "BLR":
        # Mixed Orthodox / Catholic; Orthodox plurality in east
        if any(x in nl for x in ["hrodna", "grodno", "brest"]):
            return (n, "catholic", normalize_shares({"catholic": 0.42, "orthodox": 0.40, "jewish": 0.14, "other": 0.04}))
        return (n, "orthodox", normalize_shares({"orthodox": 0.70, "catholic": 0.12, "jewish": 0.12, "other": 0.06}))

    if a3 == "UKR":
        # Right-bank / west more Catholic-Uniate historically under AH; under RU mostly Orthodox
        if any(x in nl for x in ["l'viv", "lviv", "ivano", "ternopil", "chernivtsi", "zakarp"]):
            # mostly AH in 1897 — skip fringe outside RU outline
            return None
        return (n, "orthodox", normalize_shares({"orthodox": 0.78, "jewish": 0.10, "catholic": 0.06, "other": 0.06}))

    if a3 == "MDA":
        return (n, "orthodox", normalize_shares({"orthodox": 0.82, "jewish": 0.10, "other": 0.08}))

    if a3 == "GEO":
        if "ajaria" in nl or "adjara" in nl:
            return (n, "muslim", normalize_shares({"muslim": 0.55, "orthodox": 0.40, "other": 0.05}))
        return (n, "orthodox", normalize_shares({"orthodox": 0.85, "armenian": 0.08, "muslim": 0.04, "other": 0.03}))

    if a3 == "ARM":
        return (n, "armenian", normalize_shares({"armenian": 0.88, "orthodox": 0.05, "muslim": 0.04, "other": 0.03}))

    if a3 == "AZE":
        return (n, "muslim", normalize_shares({"muslim": 0.82, "armenian": 0.10, "orthodox": 0.05, "other": 0.03}))

    # Central Asia — Muslim
    if a3 in {"UZB", "TKM", "KGZ", "TJK"}:
        return (n, "muslim", normalize_shares({"muslim": 0.90, "orthodox": 0.06, "other": 0.04}))

    if a3 == "KAZ":
        # Steppe: Muslim Kazakh + Orthodox settler pockets
        if any(x in nl for x in ["north", "kostanay", "pavlodar", "akmola", "karaganda"]):
            return (n, "orthodox", normalize_shares({"orthodox": 0.48, "muslim": 0.45, "other": 0.07}))
        return (n, "muslim", normalize_shares({"muslim": 0.72, "orthodox": 0.22, "other": 0.06}))

    if a3 == "MNG":
        return None

    if a3 == "RUS":
        # Muslim Volga–Urals / Caucasus / Crimea
        muslim_keys = [
            "tatarstan",
            "bashkort",
            "chechen",
            "dagestan",
            "ingushet",
            "kabardino",
            "karachay",
            "adygea",
            "crimea",
            "sevastopol",
        ]
        if any(k in nl for k in muslim_keys):
            return (n, "muslim", normalize_shares({"muslim": 0.55, "orthodox": 0.35, "other": 0.10}))
        # Buddhist Kalmyk / Buryat / Tuva
        if any(k in nl for k in ["kalmyk", "buryat", "tuva", "tyva"]):
            return (n, "buddhist", normalize_shares({"buddhist": 0.48, "orthodox": 0.40, "other": 0.12}))
        # Far-east Orthodox
        return (n, "orthodox", normalize_shares({"orthodox": 0.88, "muslim": 0.04, "protestant": 0.02, "other": 0.06}))

    return None


def base_density(religion: str, a3: str, name: str) -> float:
    nl = name.lower()
    if any(x in nl for x in ["moscow", "moskva", "petersburg", "warsaw", "warszawa", "kyiv", "kiev"]):
        return 1800
    if a3 in {"POL", "UKR", "BLR", "MDA"}:
        return 70
    if a3 in {"EST", "LVA", "LTU", "FIN"}:
        return 25
    if religion == "muslim" and a3 in {"UZB", "TKM", "KGZ", "TJK", "AZE"}:
        return 18
    if a3 == "KAZ":
        return 8
    if religion == "buddhist":
        return 4
    if a3 == "RUS":
        if any(x in nl for x in ["siber", "yakut", "chukot", "magadan", "kamchat", "arkhangelsk", "murmansk"]):
            return 2
        return 22
    return 20


def main() -> None:
    outline = load_outline()
    shp = next(SHP_DIR.glob("*.shp"))
    reader = shapefile.Reader(str(shp))
    fields = [f[0] for f in reader.fields[1:]]

    features = []
    areas = []
    counts: dict[str, int] = {}
    dissolve_buckets: dict[str, list] = {
        "Courland–Livonia (Latvia)": [],
    }

    for sr in reader.iterShapeRecords():
        rec = dict(zip(fields, sr.record))
        a3 = rec.get("adm0_a3")
        if a3 not in KEEP:
            continue
        name = rec.get("name") or ""
        type_en = (rec.get("type_en") or "").lower()
        # Latvia NE10 is municipal — dissolve to one Baltic unit.
        if a3 == "LVA":
            try:
                geom = make_valid(shape(sr.shape.__geo_interface__))
            except Exception:
                continue
            if not geom.is_empty:
                dissolve_buckets["Courland–Livonia (Latvia)"].append(geom)
            continue
        if a3 == "FIN" and type_en == "region":
            # Prefer provinces over overlapping regions
            continue
        classified = classify(a3, name)
        if not classified:
            continue
        display, religion, shares = classified
        try:
            geom = make_valid(shape(sr.shape.__geo_interface__))
        except Exception:
            continue
        if geom.is_empty:
            continue
        try:
            pt = geom.representative_point()
        except Exception:
            continue
        if not outline.contains(pt) and not outline.intersects(geom):
            if a3 not in {"RUS", "UKR", "BLR", "POL", "FIN", "EST", "LTU"}:
                continue
        try:
            clipped = make_valid(geom.intersection(outline))
            if clipped.is_empty:
                clipped = geom
        except Exception:
            clipped = geom
        if clipped.is_empty or clipped.area < 1e-3:
            continue
        clipped = simplify(clipped)
        slug = slugify(f"{a3}-{name}")
        km2 = max(1.0, area_km2(clipped))
        dens = base_density(religion, a3, name)
        area = {
            "code": slug,
            "slug": slug,
            "name": display,
            "plurality": religion,
            "religion": religion,
            "nationality": None,
            "adm0": a3,
            "areaKm2": round(km2, 1),
            "density": dens,
            "population": 0,
            "shares": shares,
            "religionShares": shares,
        }
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "name": display,
                    "slug": slug,
                    "code": slug,
                    "plurality": religion,
                    "religion": religion,
                    "adm0": a3,
                },
                "geometry": mapping(clipped),
            }
        )
        areas.append(area)
        counts[religion] = counts.get(religion, 0) + 1

    # Dissolved Latvia
    for label, geoms in dissolve_buckets.items():
        if not geoms:
            continue
        merged = simplify(unary_union(geoms), 0.03)
        try:
            clipped = make_valid(merged.intersection(outline))
            if clipped.is_empty:
                clipped = merged
        except Exception:
            clipped = merged
        if clipped.is_empty:
            continue
        religion = "protestant"
        shares = normalize_shares(
            {"protestant": 0.78, "orthodox": 0.12, "catholic": 0.05, "other": 0.05}
        )
        slug = slugify(label)
        km2 = max(1.0, area_km2(clipped))
        dens = base_density(religion, "LVA", label)
        area = {
            "code": slug,
            "slug": slug,
            "name": label,
            "plurality": religion,
            "religion": religion,
            "nationality": None,
            "adm0": "LVA",
            "areaKm2": round(km2, 1),
            "density": dens,
            "population": 0,
            "shares": shares,
            "religionShares": shares,
        }
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "name": label,
                    "slug": slug,
                    "code": slug,
                    "plurality": religion,
                    "religion": religion,
                    "adm0": "LVA",
                },
                "geometry": mapping(clipped),
            }
        )
        areas.append(area)
        counts[religion] = counts.get(religion, 0) + 1

    raw = sum(a["density"] * a["areaKm2"] for a in areas)
    scale = TARGET_POP / raw if raw > 0 else 1.0
    for a in areas:
        a["density"] = round(a["density"] * scale, 1)
        a["population"] = int(round(a["density"] * a["areaKm2"]))

    OUT_GEO.parent.mkdir(parents=True, exist_ok=True)
    OUT_GEO.write_text(
        json.dumps(
            {"type": "FeatureCollection", "features": features},
            separators=(",", ":"),
        )
    )
    OUT_DATA.write_text(
        json.dumps(
            {
                "id": "rus-empire-religion-1897",
                "slug": "russian-empire-1897",
                "title": "Religions in the Russian Empire, 1897",
                "year": 1897,
                "mapMode": "plurality",
                "primaryMetric": "religion",
                "note": "Empire-scoped map on modern provinces inside the 1914 Russian outline, painted by approximate 1897 religion majority. Finland (Grand Duchy) included though not in the 1897 census. Unit mixes are illustrative — not official uyezd tables.",
                "source": "Russian Empire Census 1897 (religion) for empire totals and regional majorities. Unit borders: Natural Earth admin-1 clipped to historical-basemaps Russian Empire 1914.",
                "sourceUrl": "https://en.wikipedia.org/wiki/Russian_Empire_Census",
                "geoUrl": "/geo/historic/russian-empire-1897.json",
                "groups": GROUPS,
                "nationalShares": {
                    "orthodox": 0.694,
                    "muslim": 0.111,
                    "catholic": 0.091,
                    "jewish": 0.042,
                    "protestant": 0.029,
                    "armenian": 0.009,
                    "buddhist": 0.004,
                    "other": 0.020,
                },
                "totalPopulation": sum(a["population"] for a in areas),
                "areas": areas,
            },
            indent=2,
        )
        + "\n"
    )
    print(f"wrote {OUT_GEO} ({len(features)} units)")
    print("population", sum(a["population"] for a in areas))
    print("counts", dict(sorted(counts.items(), key=lambda x: -x[1])))


if __name__ == "__main__":
    main()
