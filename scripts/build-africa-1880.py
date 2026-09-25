#!/usr/bin/env python3
"""Build Africa on the eve of the Berlin Conference (c. 1880).

State-level choropleth from historical-basemaps world_1880 — African kingdoms,
Muslim caliphates, Ethiopia/Liberia, Boer republics, and the thin European
coastal footholds that existed before the Scramble.
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".cache" / "historic"
WORLD = CACHE / "world_1880.geojson"
OUT_GEO = ROOT / "public" / "geo" / "historic" / "africa-1880.json"
OUT_DATA = ROOT / "src" / "lib" / "data" / "historic-africa-1880.json"

GROUPS = [
    {"id": "muslim-polity", "shortLabel": "Muslim polity", "color": "#1e8449"},
    {"id": "christian-polity", "shortLabel": "Christian polity", "color": "#5dade2"},
    {"id": "african-kingdom", "shortLabel": "African kingdom", "color": "#d4a017"},
    {"id": "boer-republic", "shortLabel": "Boer republic", "color": "#c0392b"},
    {"id": "european-foothold", "shortLabel": "European foothold", "color": "#2874a6"},
    {"id": "other", "shortLabel": "Other / unnamed", "color": "#95a5a6"},
]

NATIONAL_SHARES = {
    "african-kingdom": 0.34,
    "muslim-polity": 0.30,
    "european-foothold": 0.18,
    "boer-republic": 0.06,
    "christian-polity": 0.05,
    "other": 0.07,
}

# Approx. continental population c. 1880 (very rough).
TARGET_POP = 100_000_000

MUSLIM = {
    "sokoto caliphate",
    "kanem-bornu",
    "wadai empire",
    "futa jalon",
    "futa toro",
    "tukular caliphate",
    "wassoulou empire",
    "sultanate of damagaram",
    "sultanate of zanzibar",
    "sultanate of utetera",
    "morocco",
    "egypt",
    "harer (egypt)",
    "dendi kingdom",
    "rabih az-zubayr",
    "arabia",  # if clipped into NE Africa fringe — skip via bbox later
}

CHRISTIAN = {
    "ethiopia",
    "liberia",
}

BOER = {
    "transvaal",
    "orange free state",
}

EUROPEAN = {
    "algeria (fr)",
    "senegal (fr)",
    "gold coast (gb)",
    "cape colony",
    "natal",
    "angola (portugal)",
    "mozambique",
    "portuguese guinea",
    "spanish guinea",
    "gabon",
    "congo",
    "gambia",
    "sierra leone",
    "lagos",
    "basutoland",
    "griqualand west",
    "ivory coast",
    "cotonou",
    "malta",  # exclude via bbox
}


def slugify(name: str) -> str:
    s = unicodedata.normalize("NFKD", name or "unnamed")
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-") or "unnamed"
    return f"af1880-{s}"


def fold(name: str) -> str:
    s = unicodedata.normalize("NFKD", name or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower().strip()


def rough_bounds(geom):
    cs = []

    def walk(x):
        if isinstance(x, (list, tuple)):
            if x and isinstance(x[0], (int, float)) and len(x) >= 2 and isinstance(x[1], (int, float)):
                cs.append((float(x[0]), float(x[1])))
                return
            for y in x:
                walk(y)

    walk(geom.get("coordinates"))
    if not cs:
        return None
    xs = [c[0] for c in cs]
    ys = [c[1] for c in cs]
    return min(xs), min(ys), max(xs), max(ys)


def simplify_coords(geom, step=2):
    """Light coordinate decimation without shapely (avoids segfaults on some polys)."""

    def decimate(ring):
        if not ring or len(ring) < 8:
            return ring
        out = ring[::step]
        if out[-1] != ring[-1]:
            out.append(ring[-1])
        return out

    g = json.loads(json.dumps(geom))
    t = g.get("type")
    coords = g.get("coordinates")
    if t == "Polygon":
        g["coordinates"] = [decimate(r) for r in coords]
    elif t == "MultiPolygon":
        g["coordinates"] = [[decimate(r) for r in poly] for poly in coords]
    return g


def classify(name: str, subject: str) -> str:
    nl = fold(name)
    sl = fold(subject)
    blob = f"{nl} {sl}"

    if nl in BOER or "orange free" in nl or nl == "transvaal":
        return "boer-republic"
    if nl in CHRISTIAN:
        return "christian-polity"
    if nl in MUSLIM or "ottoman" in sl or any(k in blob for k in ("caliphate", "sultanate", "bornu", "wadai", "sokoto", "futa", "zanzibar")):
        if nl in {"arabia", "oman", "qatar", "trucial oman"}:
            return "other"  # Asia — should be filtered by bbox
        return "muslim-polity"
    if nl in EUROPEAN or any(
        x in blob
        for x in (
            "france",
            "portugal",
            "great britain",
            "spain",
            "britain",
            "(fr)",
            "(gb)",
            "(portugal)",
        )
    ):
        if nl == "malta":
            return "other"
        return "european-foothold"
    if not nl:
        return "other"
    return "african-kingdom"


def in_africa(b) -> bool:
    minx, miny, maxx, maxy = b
    if maxx < -20 or minx > 52:
        return False
    if maxy < -36 or miny > 38:
        return False
    # Drop pure Mediterranean Europe / Arabia east of Suez fringe
    if minx > 43 and miny > 12 and "madag" not in "":
        # keep Horn / Madagascar handled separately
        if miny > 12 and maxx > 52:
            return False
    if minx > 48 and miny > 12:  # Arabia / Gulf
        return False
    if miny > 35.5 and maxx < 20:  # southern Europe
        return False
    if miny > 34 and minx > 10 and maxx < 30 and maxy > 36:  # Aegean scraps
        return False
    return True


def area_proxy(b) -> float:
    minx, miny, maxx, maxy = b
    lat = (miny + maxy) / 2
    w = (maxx - minx) * 111.32 * max(0.2, abs(__import__("math").cos(__import__("math").radians(lat))))
    h = (maxy - miny) * 111.32
    return max(w * h * 0.55, 50.0)


def density_for(kind: str, name: str) -> float:
    nl = fold(name)
    if kind == "european-foothold":
        if any(x in nl for x in ("cape", "algeria", "natal")):
            return 12
        return 8
    if kind == "boer-republic":
        return 6
    if kind == "christian-polity":
        return 18 if "ethiopia" in nl else 10
    if kind == "muslim-polity":
        if "egypt" in nl or "morocco" in nl:
            return 22
        return 14
    if kind == "african-kingdom":
        return 12
    return 3


def main() -> None:
    g = json.loads(WORLD.read_text())
    features = []
    areas = []
    counts: dict[str, int] = {}
    seen_slugs: dict[str, int] = {}

    for f in g["features"]:
        p = f["properties"]
        name = (p.get("NAME") or "").strip()
        subject = (p.get("SUBJECTO") or "").strip()
        b = rough_bounds(f["geometry"])
        if not b or not in_africa(b):
            continue
        # Drop giant unnamed continent-sized leftovers and anonymous scraps
        if not name:
            continue
        if not name and (b[2] - b[0]) > 40:
            continue

        kind = classify(name, subject)
        if kind == "other" and fold(name) in {"arabia", "oman", "qatar", "trucial oman", "malta"}:
            continue

        label = name or "Unnamed polity"
        base = slugify(label)
        n = seen_slugs.get(base, 0)
        seen_slugs[base] = n + 1
        slug = base if n == 0 else f"{base}-{n+1}"

        km2 = area_proxy(b)
        dens = density_for(kind, label)
        shares = {kind: 0.92, "other": 0.08}
        if kind != "other":
            shares = {kind: 1.0}

        geom = simplify_coords(f["geometry"], step=3)

        areas.append(
            {
                "code": slug,
                "slug": slug,
                "name": label,
                "plurality": kind,
                "nationality": kind,
                "adm0": subject or label,
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
                    "plurality": kind,
                    "nationality": kind,
                },
                "geometry": geom,
            }
        )
        counts[kind] = counts.get(kind, 0) + 1

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
                "id": "africa-pre-berlin-1880",
                "slug": "africa-1880",
                "title": "Africa before the Berlin Conference, c. 1880",
                "year": 1880,
                "mapMode": "plurality",
                "primaryMetric": "nationality",
                "note": "State-level overview on 1880 borders — African kingdoms, Muslim caliphates and sultanates, Ethiopia and Liberia, Boer republics, and the thin European coastal footholds that existed before the 1884–85 Berlin Conference scrambled the interior. Not a census map: colours mark polity type, not ethnolinguistic majorities inside each state.",
                "source": "Borders: historical-basemaps world_1880. Polity coding by birthrate.io from period political geography.",
                "sourceUrl": "https://en.wikipedia.org/wiki/Berlin_Conference",
                "geoUrl": "/geo/historic/africa-1880.json",
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
