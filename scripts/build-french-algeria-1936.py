#!/usr/bin/env python3
"""Build French Algeria c. 1936 community plurality map.

Modern wilayas inside the historical-basemaps 1930 Algeria outline, painted by
approximate mid-1930s colonial census community majorities (Muslim Algerian /
European settler / Jewish). Commune-level pied-noir GIS is not openly available.
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
OUTLINE = CACHE / "algeria-1930-outline.geojson"
WORLD_1930 = CACHE / "world_1930.geojson"
OUT_GEO = ROOT / "public" / "geo" / "historic" / "french-algeria-1936.json"
OUT_DATA = ROOT / "src" / "lib" / "data" / "historic-french-algeria-1936.json"

GROUPS = [
    {"id": "muslim", "shortLabel": "Muslim Algerian", "color": "#1e8449"},
    {"id": "european", "shortLabel": "European", "color": "#2874a6"},
    {"id": "jewish", "shortLabel": "Jewish", "color": "#8e44ad"},
    {"id": "other", "shortLabel": "Other", "color": "#95a5a6"},
]

# ~1936 census: ~7.23M; Muslims ~86%, Europeans ~13%, Jews ~1.5%.
NATIONAL_SHARES = {
    "muslim": 0.860,
    "european": 0.125,
    "jewish": 0.015,
}

TARGET_POP = 7_234_684

# Coastal / urban wilayas where Europeans were a local plurality or near-plurality
# in the mid-1930s (Oran city foremost; Algiers and Bône heavily settler).
EUROPEAN = {
    "oran",
    "alger",
    "annaba",  # Bône
    "mostaganem",
    "aïn témouchent",
    "ain temouchent",
    "sidi bel abbès",
    "sidi bel abbes",
    "tipaza",
    "skikda",  # Philippeville
}

# Constantine city had a large Jewish community; wilaya still Muslim-majority —
# keep Jewish visible in dig-in shares, not as wilaya plurality.


def slugify(name: str) -> str:
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return f"dz-{s}"


def fold(name: str) -> str:
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower().strip()


def simplify(geom, tol=0.01):
    try:
        return make_valid(geom).simplify(tol, preserve_topology=True)
    except Exception:
        return geom


def close_seams(geom, pad=0.0035):
    try:
        g = make_valid(geom.buffer(pad))
        return g if not g.is_empty else geom
    except Exception:
        return geom


def ensure_outline() -> None:
    if OUTLINE.exists():
        return
    if not WORLD_1930.exists():
        raise SystemExit(f"Missing {WORLD_1930}")
    g = json.loads(WORLD_1930.read_text())
    feats = [f for f in g["features"] if f["properties"].get("NAME") == "Algeria"]
    if not feats:
        raise SystemExit("Algeria not found in world_1930")
    OUTLINE.write_text(json.dumps({"type": "FeatureCollection", "features": feats}))


def load_outline():
    ensure_outline()
    g = json.loads(OUTLINE.read_text())
    geoms = [make_valid(shape(f["geometry"])) for f in g["features"]]
    return make_valid(unary_union(geoms)).buffer(0.15)


def normalize_shares(raw: dict[str, float]) -> dict[str, float]:
    s = sum(max(0.0, v) for v in raw.values())
    if s <= 0:
        return {"other": 1.0}
    return {k: round(v / s, 4) for k, v in raw.items() if v > 0}


def area_km2(geom) -> float:
    minx, miny, maxx, maxy = geom.bounds
    lat = (miny + maxy) / 2
    return geom.area * (111.32 * 111.32 * math.cos(math.radians(lat)))


def classify(name: str) -> tuple[str, str]:
    nl = fold(name)
    if any(k in nl for k in EUROPEAN):
        label = name
        if "oran" in nl:
            label = f"{name} (Oranie)"
        elif "alger" in nl:
            label = f"{name} (Algiers)"
        elif "annaba" in nl:
            label = f"{name} (Bône)"
        elif "skikda" in nl:
            label = f"{name} (Philippeville)"
        return "european", label
    return "muslim", name


def estimate_shares(plural: str, name: str) -> dict[str, float]:
    nl = fold(name)
    if plural == "european":
        if "oran" in nl:
            return normalize_shares({"european": 0.52, "muslim": 0.40, "jewish": 0.06, "other": 0.02})
        if "alger" in nl:
            return normalize_shares({"european": 0.48, "muslim": 0.42, "jewish": 0.08, "other": 0.02})
        if "annaba" in nl or "skikda" in nl:
            return normalize_shares({"european": 0.48, "muslim": 0.46, "jewish": 0.04, "other": 0.02})
        return normalize_shares({"european": 0.46, "muslim": 0.48, "jewish": 0.04, "other": 0.02})
    if "constantine" in nl:
        return normalize_shares({"muslim": 0.72, "european": 0.16, "jewish": 0.10, "other": 0.02})
    if any(x in nl for x in ("adrar", "tamanghasset", "tindouf", "illizi", "tamanrasset")):
        return normalize_shares({"muslim": 0.97, "other": 0.03})
    if any(x in nl for x in ("tizi ouzou", "béjaïa", "bejaia", "bouira")):
        # Kabylie — dense Muslim Algerian, few settlers
        return normalize_shares({"muslim": 0.94, "european": 0.04, "other": 0.02})
    return normalize_shares({"muslim": 0.88, "european": 0.09, "jewish": 0.02, "other": 0.01})


def density_for(plural: str, name: str) -> float:
    nl = fold(name)
    if any(x in nl for x in ("adrar", "tamanghasset", "tindouf", "illizi", "tamanrasset", "ouargla", "béchar", "bechar")):
        return 1.2
    if plural == "european":
        return 95
    if any(x in nl for x in ("alger", "oran", "constantine", "annaba")):
        return 110
    if any(x in nl for x in ("tizi ouzou", "béjaïa", "bejaia", "blida", "sétif", "setif")):
        return 85
    return 28


def main() -> None:
    outline = load_outline()
    r = shapefile.Reader(str(SHP_DIR / "ne_10m_admin_1_states_provinces"))
    fields = [f[0] for f in r.fields[1:]]

    features = []
    areas = []
    counts: dict[str, int] = {}

    for sr, rec in zip(r.iterShapes(), r.iterRecords()):
        d = dict(zip(fields, rec))
        if d.get("adm0_a3") != "DZA":
            continue
        name = d.get("name") or "Unknown"
        try:
            geom = make_valid(shape(sr.__geo_interface__))
            clipped = make_valid(geom.intersection(outline))
        except Exception:
            continue
        if clipped.is_empty or clipped.area < 0.0015:
            continue
        geom = close_seams(simplify(clipped))
        if geom.is_empty:
            continue

        plural, label = classify(name)
        shares = estimate_shares(plural, name)
        # If European share is claimed but muslim still higher in dig-in for
        # some coastal wilayas, keep plurality as classified for map signal.
        km2 = max(area_km2(geom), 1.0)
        dens = density_for(plural, name)
        slug = slugify(name)

        areas.append(
            {
                "code": slug,
                "slug": slug,
                "name": label,
                "plurality": plural,
                "nationality": plural,
                "adm0": "DZA",
                "areaKm2": round(km2, 1),
                "density": dens,
                "population": 0,
                "shares": shares,
            }
        )
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "name": label,
                    "slug": slug,
                    "code": slug,
                    "plurality": plural,
                    "nationality": plural,
                    "adm0": "DZA",
                },
                "geometry": mapping(geom),
            }
        )
        counts[plural] = counts.get(plural, 0) + 1

    raw = sum(a["density"] * a["areaKm2"] for a in areas)
    scale = TARGET_POP / raw if raw > 0 else 1.0
    for a in areas:
        a["density"] = round(a["density"] * scale, 1)
        a["population"] = int(round(a["density"] * a["areaKm2"]))

    OUT_GEO.parent.mkdir(parents=True, exist_ok=True)
    OUT_GEO.write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":"))
    )
    OUT_DATA.write_text(
        json.dumps(
            {
                "id": "french-algeria-1936",
                "slug": "french-algeria-1936",
                "title": "Communities in French Algeria, c. 1936",
                "year": 1936,
                "mapMode": "plurality",
                "primaryMetric": "nationality",
                "note": "Colony-scoped map on modern wilayas inside the 1930 Algeria outline, painted by approximate mid-1930s community majorities. European plurality marks the Oranie / Algiers / Bône settler belt — commune-level pied-noir GIS is not openly available. No wilaya had a Jewish plurality; Jewish shares appear in dig-in for Constantine, Algiers and Oran. Unit mixes are illustrative, not official commune tables.",
                "source": "French Algeria censuses / colonial statistics, mid-1930s (colony totals and regional settler patterns). Unit borders: Natural Earth admin-1 clipped to historical-basemaps Algeria 1930.",
                "sourceUrl": "https://en.wikipedia.org/wiki/French_Algeria",
                "geoUrl": "/geo/historic/french-algeria-1936.json",
                "groups": GROUPS,
                "nationalShares": NATIONAL_SHARES,
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
