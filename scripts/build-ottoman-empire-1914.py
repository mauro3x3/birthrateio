#!/usr/bin/env python3
"""Build Ottoman Empire c. 1914 millet plurality map.

Modern admin-1 units inside the historical-basemaps 1914 Ottoman outline,
painted by approximate late-Ottoman millet majorities. Vilayet GIS is not
openly available — same approach as Austria-Hungary / Yugoslavia.
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
OUTLINE = CACHE / "ottoman-1914-outline.geojson"
WORLD_1914 = CACHE / "world_1914.geojson"
OUT_GEO = ROOT / "public" / "geo" / "historic" / "ottoman-empire-1914.json"
OUT_DATA = ROOT / "src" / "lib" / "data" / "historic-ottoman-empire-1914.json"

GROUPS = [
    {"id": "muslim", "shortLabel": "Muslim", "color": "#1e8449"},
    {"id": "greek-orthodox", "shortLabel": "Greek Orthodox", "color": "#2874a6"},
    {"id": "armenian", "shortLabel": "Armenian", "color": "#922b21"},
    {"id": "jewish", "shortLabel": "Jewish", "color": "#8e44ad"},
    {"id": "assyrian", "shortLabel": "Assyrian / Syriac", "color": "#b9770e"},
    {"id": "other-christian", "shortLabel": "Other Christian", "color": "#5dade2"},
    {"id": "other", "shortLabel": "Other / mixed", "color": "#95a5a6"},
]

# Karpat / McCarthy-style late-Ottoman empire totals (illustrative).
NATIONAL_SHARES = {
    "muslim": 0.74,
    "greek-orthodox": 0.10,
    "armenian": 0.07,
    "other-christian": 0.03,
    "assyrian": 0.015,
    "jewish": 0.015,
    "other": 0.03,
}

TARGET_POP = 21_000_000

KEEP = {
    "TUR",
    "SYR",
    "LBN",
    "ISR",
    "PSE",
    "JOR",
    "IRQ",
    "KWT",
    "SAU",
    "YEM",
    "CYP",
    "GRC",
    "BGR",
    "MKD",
    "ALB",
}

# Smyrna / Aegean Greek Orthodox belt (vilayet of Aidin coastal core).
GREEK = {
    "izmir",
    "aydın",
    "aydin",
    "manisa",
    "çanakkale",
    "canakkale",
    "balıkesir",
    "balikesir",
    "muğla",
    "mugla",
}

# Six vilayets / eastern Anatolia Armenian highland (pre-1915 kazas).
ARMENIAN = {
    "van",
    "bitlis",
    "muş",
    "mus",
    "erzurum",
    "elaziğ",
    "elazig",
    "tunceli",
    "bingöl",
    "bingol",
    "ağrı",
    "agri",
    # Kars / Ardahan were Russian after 1878 — omit even if outline overlaps.
}

# Tur Abdin / Hakkari Assyrian–Syriac belt.
ASSYRIAN = {
    "hakkari",
    "hakkâri",
    "mardin",
    "şırnak",
    "sirnak",
    "nineveh",
    "dohuk",
    "dahuk",
}

# Mount Lebanon Maronite / other Christian.
OTHER_CHRISTIAN = {
    "mount lebanon",
    "mont-liban",
    "keserwan",
    "kesrouane",
    "north lebanon",  # mixed
    "beirut",  # city mixed Christian/Muslim — mark other-christian coastal
}


def slugify(a3: str, name: str) -> str:
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return f"ot-{a3.lower()}-{s}"


def fold(name: str) -> str:
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower().strip()


def simplify(geom, tol=0.012):
    try:
        return make_valid(geom).simplify(tol, preserve_topology=True)
    except Exception:
        return geom


def ensure_outline() -> None:
    if OUTLINE.exists():
        return
    g = json.loads(WORLD_1914.read_text())
    feats = [
        f
        for f in g["features"]
        if (f["properties"].get("NAME") or "") == "Ottoman Empire"
        or (f["properties"].get("SUBJECTO") or "") == "Ottoman Empire"
    ]
    # Prefer the main empire polygon (exclude Egypt if separate under Ottoman subject).
    main = [
        f
        for f in feats
        if (f["properties"].get("NAME") or "") == "Ottoman Empire"
    ]
    use = main or feats
    if not use:
        raise SystemExit("Ottoman Empire not found in world_1914")
    OUTLINE.write_text(json.dumps({"type": "FeatureCollection", "features": use}))


def load_outline():
    ensure_outline()
    g = json.loads(OUTLINE.read_text())
    geoms = [make_valid(shape(f["geometry"])) for f in g["features"]]
    return make_valid(unary_union(geoms)).buffer(0.1)


def normalize_shares(raw: dict[str, float]) -> dict[str, float]:
    s = sum(max(0.0, v) for v in raw.values())
    if s <= 0:
        return {"other": 1.0}
    return {k: round(v / s, 4) for k, v in raw.items() if v > 0}


def area_km2(geom) -> float:
    minx, miny, maxx, maxy = geom.bounds
    lat = (miny + maxy) / 2
    return geom.area * (111.32 * 111.32 * math.cos(math.radians(lat)))


def name_matches(nl: str, keys: set[str]) -> bool:
    """Exact token match — avoids 'mus' hitting 'gumushane'."""
    if nl in keys:
        return True
    tokens = set(re.split(r"[^a-z0-9]+", nl))
    return any(k in tokens for k in keys)


def classify(a3: str, name: str) -> tuple[str, str]:
    nl = fold(name)

    if a3 == "LBN":
        if name_matches(nl, {"south", "nabatiye", "nabatiyah", "beqaa", "bekaa", "baalbek", "baalbeck"}):
            return "muslim", name
        if name_matches(nl, {"mount lebanon", "beyrouth", "beirut"}) or "lebanon" in nl and "north" in nl:
            return "other-christian", f"{name} (Mount Lebanon)"
        if "mount" in nl and "lebanon" in nl:
            return "other-christian", f"{name} (Mount Lebanon)"
        # Default Lebanese coastal / northern Christian belt for remaining.
        if "north" in nl:
            return "other-christian", f"{name} (Mount Lebanon)"
        return "muslim", name

    if a3 == "CYP":
        return "greek-orthodox", name

    if a3 == "GRC":
        return "muslim", f"{name} (Thrace)"

    if name_matches(nl, ASSYRIAN) or (
        a3 == "IRQ" and name_matches(nl, {"nineveh", "dohuk", "dahuk"})
    ):
        return "assyrian", f"{name} (Tur Abdin / Hakkari)"

    if a3 == "TUR" and name_matches(nl, ARMENIAN):
        return "armenian", f"{name} (eastern vilayets)"

    if a3 == "TUR" and name_matches(nl, GREEK):
        return "greek-orthodox", f"{name} (Aegean)"

    if a3 in {"ISR", "PSE"} and any(
        k in nl for k in ("jerusalem", "yerushalayim", "al quds", "quds")
    ):
        return "muslim", f"{name} (Jerusalem sanjak)"

    return "muslim", name


def estimate_shares(plural: str, a3: str, name: str) -> dict[str, float]:
    nl = fold(name)
    if plural == "greek-orthodox":
        return normalize_shares(
            {"greek-orthodox": 0.48, "muslim": 0.42, "armenian": 0.05, "jewish": 0.03, "other": 0.02}
        )
    if plural == "armenian":
        return normalize_shares(
            {"armenian": 0.46, "muslim": 0.42, "assyrian": 0.05, "other-christian": 0.04, "other": 0.03}
        )
    if plural == "assyrian":
        return normalize_shares(
            {"assyrian": 0.42, "muslim": 0.40, "armenian": 0.10, "other": 0.08}
        )
    if plural == "other-christian":
        return normalize_shares(
            {"other-christian": 0.52, "muslim": 0.36, "greek-orthodox": 0.06, "jewish": 0.03, "other": 0.03}
        )
    if "istanbul" in nl or "constantinople" in nl:
        return normalize_shares(
            {"muslim": 0.55, "greek-orthodox": 0.22, "armenian": 0.12, "jewish": 0.06, "other": 0.05}
        )
    if "jerusalem" in nl or "quds" in nl:
        return normalize_shares(
            {"muslim": 0.55, "jewish": 0.18, "other-christian": 0.18, "other": 0.09}
        )
    if a3 in {"ISR", "PSE"}:
        return normalize_shares(
            {"muslim": 0.72, "other-christian": 0.12, "jewish": 0.10, "other": 0.06}
        )
    if a3 == "IRQ":
        return normalize_shares({"muslim": 0.88, "assyrian": 0.04, "jewish": 0.03, "other": 0.05})
    if a3 == "SYR":
        return normalize_shares(
            {"muslim": 0.82, "other-christian": 0.10, "greek-orthodox": 0.04, "other": 0.04}
        )
    if a3 in {"SAU", "YEM", "KWT", "JOR"}:
        return normalize_shares({"muslim": 0.96, "other": 0.04})
    return normalize_shares(
        {"muslim": 0.86, "greek-orthodox": 0.05, "armenian": 0.04, "other": 0.05}
    )


def density_for(a3: str, plural: str, name: str) -> float:
    nl = fold(name)
    if any(x in nl for x in ("istanbul", "izmir", "beirut", "damascus", "baghdad", "aleppo")):
        return 180
    if a3 in {"SAU", "YEM", "KWT"}:
        return 4
    if plural in {"armenian", "assyrian"}:
        return 28
    if a3 in {"TUR", "SYR", "LBN", "ISR", "PSE", "JOR", "IRQ"}:
        return 45
    return 25


def main() -> None:
    outline = load_outline()
    r = shapefile.Reader(str(SHP_DIR / "ne_10m_admin_1_states_provinces"))
    fields = [f[0] for f in r.fields[1:]]

    features = []
    areas = []
    counts: dict[str, int] = {}

    for sr, rec in zip(r.iterShapes(), r.iterRecords()):
        d = dict(zip(fields, rec))
        a3 = d.get("adm0_a3") or ""
        if a3 not in KEEP:
            continue
        name = d.get("name") or "Unknown"
        nl0 = fold(name)
        # Kars / Ardahan were Russian after 1878.
        if a3 == "TUR" and name_matches(nl0, {"kars", "ardahan"}):
            continue
        try:
            geom = make_valid(shape(sr.__geo_interface__))
            clipped = make_valid(geom.intersection(outline))
        except Exception:
            continue
        if clipped.is_empty or clipped.area < 0.004:
            continue
        geom = simplify(clipped)
        if geom.is_empty:
            continue

        plural, label = classify(a3, name)
        shares = estimate_shares(plural, a3, name)
        km2 = max(area_km2(geom), 1.0)
        dens = density_for(a3, plural, name)
        slug = slugify(a3, name)

        areas.append(
            {
                "code": slug,
                "slug": slug,
                "name": label,
                "plurality": plural,
                "nationality": plural,
                "adm0": a3,
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
                    "adm0": a3,
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
                "id": "ottoman-millet-1914",
                "slug": "ottoman-empire-1914",
                "title": "Ethnoreligious communities in the Ottoman Empire, c. 1914",
                "year": 1914,
                "mapMode": "plurality",
                "primaryMetric": "nationality",
                "note": "Empire-scoped map on modern provinces inside the 1914 Ottoman outline, painted by approximate late-Ottoman millet majorities (Aegean Greek Orthodox, eastern Armenian highland, Tur Abdin Assyrian, Mount Lebanon Christian). Vilayet polygons are not openly available. Egypt is omitted (de facto British). Unit mixes are illustrative — not official salname tables. Armenia/Greek figures reflect the eve-of-war demography before wartime destruction and population transfers.",
                "source": "Ottoman official statistics and millet estimates, c. 1881–1914 (vilayet yearbooks / demographic compilations). Unit borders: Natural Earth admin-1 clipped to historical-basemaps Ottoman Empire 1914.",
                "sourceUrl": "https://en.wikipedia.org/wiki/Ottoman_Empire",
                "geoUrl": "/geo/historic/ottoman-empire-1914.json",
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
