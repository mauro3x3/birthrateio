#!/usr/bin/env python3
"""Build Ottoman Empire c. 1914 ethnoreligious map.

Modern admin-1 units inside the historical-basemaps 1914 Ottoman outline.
Ethnicity (Turk / Arab / Kurd / Greek / Armenian / …) and religion
(Sunni / Shia / Alevi / Orthodox / …) are separate layers. Vilayet GIS is not
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
    {"id": "turkish", "shortLabel": "Turkish", "color": "#1e8449"},
    {"id": "arab", "shortLabel": "Arab", "color": "#27ae60"},
    {"id": "kurdish", "shortLabel": "Kurdish", "color": "#196f3d"},
    {"id": "greek", "shortLabel": "Greek", "color": "#2874a6"},
    {"id": "armenian", "shortLabel": "Armenian", "color": "#922b21"},
    {"id": "assyrian", "shortLabel": "Assyrian / Syriac", "color": "#b9770e"},
    {"id": "jewish", "shortLabel": "Jewish", "color": "#8e44ad"},
    {"id": "other-christian", "shortLabel": "Other Christian", "color": "#5dade2"},
    {"id": "other", "shortLabel": "Other / mixed", "color": "#95a5a6"},
]

RELIGION_GROUPS = [
    {"id": "sunni", "shortLabel": "Sunni", "color": "#1e8449"},
    {"id": "shia", "shortLabel": "Shia", "color": "#148f77"},
    {"id": "alevi", "shortLabel": "Alevi", "color": "#52be80"},
    {"id": "orthodox", "shortLabel": "Greek Orthodox", "color": "#2874a6"},
    {"id": "armenian-apostolic", "shortLabel": "Armenian Apostolic", "color": "#922b21"},
    {"id": "jewish", "shortLabel": "Jewish", "color": "#8e44ad"},
    {"id": "other-christian", "shortLabel": "Other Christian", "color": "#5dade2"},
    {"id": "other", "shortLabel": "Other", "color": "#95a5a6"},
]

# Approximate eve-of-war shares (illustrative empire totals).
NATIONAL_SHARES = {
    "turkish": 0.36,
    "arab": 0.28,
    "kurdish": 0.10,
    "greek": 0.09,
    "armenian": 0.07,
    "assyrian": 0.015,
    "other-christian": 0.025,
    "jewish": 0.015,
    "other": 0.025,
}

NATIONAL_RELIGION = {
    "sunni": 0.62,
    "shia": 0.08,
    "alevi": 0.04,
    "orthodox": 0.09,
    "armenian-apostolic": 0.07,
    "other-christian": 0.03,
    "jewish": 0.015,
    "other": 0.055,
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

ARMENIAN = {
    "van",
    "bitlis",
    "muş",
    "mus",
    "erzurum",
    "elaziğ",
    "elazig",
    "bingöl",
    "bingol",
    "ağrı",
    "agri",
}

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

KURDISH = {
    # Anatolia
    "diyarbakır",
    "diyarbakir",
    "şanlıurfa",
    "sanliurfa",
    "batman",
    "siirt",
    "şırnak",
    "sirnak",
    "hakkari",
    "hakkâri",
    "mardin",
    "van",
    "bitlis",
    "muş",
    "mus",
    "ağrı",
    "agri",
    "bingöl",
    "bingol",
    "tunceli",
    "elaziğ",
    "elazig",
    "malatya",
    "kahramanmaraş",
    "kahramanmaras",
    "gaziantep",
    # Iraq
    "erbil",
    "arbil",
    "sulaymaniyah",
    "as-sulaymaniyah",
    "as sulaymaniyah",
    "kirkuk",
    "at-ta'mim",
    "dohuk",
    "dahuk",
    # Syria
    "al-hasakah",
    "al hasakah",
    "hasakah",
    "al-hasakeh",
}

SHIA = {
    # Southern Iraq Shia heartland
    "basra",
    "al-basrah",
    "maysan",
    "missan",
    "dhi qar",
    "dhi-qar",
    "thi-qar",
    "najaf",
    "an-najaf",
    "karbala",
    "karbala'",
    "babil",
    "babylon",
    "wasit",
    "qadisiyyah",
    "al-qadisiyah",
    "muthanna",
    "al-muthanna",
    # Lebanon
    "nabatiye",
    "nabatiyah",
    "nabatieh",
    "south",
    "beqaa",
    "bekaa",
    "baalbek",
    "baalbeck",
}

ALEVI = {
    "tunceli",
    "erzincan",
    "sivas",
    "tokat",
    "amalya",  # unlikely
    "çorum",
    "corum",
    "yozgat",
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


def simplify(geom, tol=0.01):
    try:
        return make_valid(geom).simplify(tol, preserve_topology=True)
    except Exception:
        return geom


def close_seams(geom, pad=0.003):
    try:
        g = make_valid(geom.buffer(pad))
        return g if not g.is_empty else geom
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
    if nl in keys:
        return True
    tokens = set(re.split(r"[^a-z0-9]+", nl))
    return any(k in tokens for k in keys)


def classify(a3: str, name: str) -> tuple[str, str, str]:
    """Return (ethnicity, religion, display_label)."""
    nl = fold(name)

    # --- Ethnicity first -------------------------------------------------
    if a3 == "CYP":
        return "greek", "orthodox", name
    if a3 == "GRC":
        return "turkish", "sunni", f"{name} (Thrace)"
    if a3 in {"BGR", "MKD", "ALB"}:
        return "other", "sunni", f"{name} (Balkans)"

    if a3 == "LBN":
        if name_matches(nl, {"south", "nabatiye", "nabatiyah", "nabatieh", "beqaa", "bekaa", "baalbek", "baalbeck"}):
            return "arab", "shia", name
        if name_matches(nl, {"mount lebanon", "beyrouth", "beirut"}) or "north" in nl:
            return "other-christian", "other-christian", f"{name} (Mount Lebanon)"
        if "mount" in nl and "lebanon" in nl:
            return "other-christian", "other-christian", f"{name} (Mount Lebanon)"
        return "arab", "sunni", name

    if a3 == "TUR" and name_matches(nl, ARMENIAN):
        # Eastern highland — Armenian plurality on the eve of war.
        return "armenian", "armenian-apostolic", f"{name} (eastern vilayets)"

    if a3 == "TUR" and name_matches(nl, GREEK):
        return "greek", "orthodox", f"{name} (Aegean)"

    if name_matches(nl, ASSYRIAN) or (
        a3 == "IRQ" and name_matches(nl, {"nineveh", "dohuk", "dahuk"})
    ):
        # Tur Abdin / Hakkari / Nineveh — Assyrian–Syriac belt (ethnicity).
        # Northern Iraq Kurdish majority in Dohuk; keep Assyrian for Tur Abdin core.
        if a3 == "IRQ" and name_matches(nl, {"dohuk", "dahuk"}):
            return "kurdish", "sunni", f"{name} (Kurdistan)"
        return "assyrian", "other-christian", f"{name} (Tur Abdin / Hakkari)"

    if name_matches(nl, KURDISH) or (
        a3 == "IRQ"
        and name_matches(nl, {"erbil", "arbil", "sulaymaniyah", "kirkuk", "dohuk", "dahuk"})
    ):
        religion = "alevi" if name_matches(nl, ALEVI) else "sunni"
        return "kurdish", religion, f"{name} (Kurdish belt)"

    if a3 == "TUR" and name_matches(nl, ALEVI):
        return "turkish", "alevi", f"{name} (Alevi)"

    if a3 in {"ISR", "PSE"} and any(
        k in nl for k in ("jerusalem", "yerushalayim", "al quds", "quds")
    ):
        return "arab", "sunni", f"{name} (Jerusalem sanjak)"

    if a3 in {"SYR", "LBN", "ISR", "PSE", "JOR", "IRQ", "SAU", "YEM", "KWT"}:
        religion = "shia" if name_matches(nl, SHIA) else "sunni"
        return "arab", religion, name

    # Anatolian Turkish default
    if a3 == "TUR":
        religion = "alevi" if name_matches(nl, ALEVI) else "sunni"
        if "istanbul" in nl:
            return "turkish", "sunni", name
        return "turkish", religion, name

    return "other", "sunni", name


def estimate_ethnic_shares(eth: str, a3: str, name: str) -> dict[str, float]:
    nl = fold(name)
    if eth == "greek":
        return normalize_shares(
            {"greek": 0.48, "turkish": 0.38, "armenian": 0.05, "jewish": 0.04, "other": 0.05}
        )
    if eth == "armenian":
        return normalize_shares(
            {"armenian": 0.46, "kurdish": 0.22, "turkish": 0.20, "assyrian": 0.06, "other": 0.06}
        )
    if eth == "assyrian":
        return normalize_shares(
            {"assyrian": 0.40, "kurdish": 0.28, "arab": 0.18, "armenian": 0.08, "other": 0.06}
        )
    if eth == "kurdish":
        return normalize_shares(
            {"kurdish": 0.62, "turkish": 0.18, "arab": 0.10, "armenian": 0.05, "other": 0.05}
        )
    if eth == "other-christian":
        return normalize_shares(
            {"other-christian": 0.52, "arab": 0.36, "greek": 0.05, "jewish": 0.03, "other": 0.04}
        )
    if eth == "arab":
        if name_matches(nl, SHIA):
            return normalize_shares({"arab": 0.90, "kurdish": 0.04, "other": 0.06})
        if a3 == "IRQ":
            return normalize_shares({"arab": 0.72, "kurdish": 0.18, "assyrian": 0.04, "other": 0.06})
        if a3 == "SYR":
            return normalize_shares({"arab": 0.82, "kurdish": 0.08, "other-christian": 0.06, "other": 0.04})
        if a3 in {"ISR", "PSE"}:
            return normalize_shares({"arab": 0.72, "other-christian": 0.12, "jewish": 0.10, "other": 0.06})
        return normalize_shares({"arab": 0.92, "other": 0.08})
    if "istanbul" in nl:
        return normalize_shares(
            {"turkish": 0.52, "greek": 0.22, "armenian": 0.12, "jewish": 0.06, "other": 0.08}
        )
    if eth == "turkish":
        return normalize_shares(
            {"turkish": 0.82, "kurdish": 0.06, "greek": 0.04, "armenian": 0.04, "other": 0.04}
        )
    return normalize_shares({"other": 0.6, "turkish": 0.25, "arab": 0.15})


def estimate_religion_shares(religion: str, eth: str, a3: str, name: str) -> dict[str, float]:
    nl = fold(name)
    if religion == "orthodox":
        return normalize_shares(
            {"orthodox": 0.48, "sunni": 0.40, "armenian-apostolic": 0.05, "jewish": 0.03, "other": 0.04}
        )
    if religion == "armenian-apostolic":
        return normalize_shares(
            {"armenian-apostolic": 0.46, "sunni": 0.40, "other-christian": 0.08, "other": 0.06}
        )
    if religion == "alevi":
        return normalize_shares({"alevi": 0.55, "sunni": 0.35, "other": 0.10})
    if religion == "shia":
        return normalize_shares({"shia": 0.72, "sunni": 0.22, "other": 0.06})
    if religion == "other-christian":
        return normalize_shares(
            {"other-christian": 0.52, "sunni": 0.32, "orthodox": 0.06, "jewish": 0.04, "other": 0.06}
        )
    if religion == "jewish" or "jerusalem" in nl:
        if "jerusalem" in nl or "quds" in nl:
            return normalize_shares(
                {"sunni": 0.55, "jewish": 0.18, "other-christian": 0.18, "other": 0.09}
            )
    if "istanbul" in nl:
        return normalize_shares(
            {"sunni": 0.55, "orthodox": 0.22, "armenian-apostolic": 0.12, "jewish": 0.06, "other": 0.05}
        )
    if eth == "kurdish":
        return normalize_shares({"sunni": 0.78, "alevi": 0.10, "other": 0.12})
    if a3 in {"SAU", "YEM", "KWT", "JOR"}:
        return normalize_shares({"sunni": 0.94, "other": 0.06})
    return normalize_shares({"sunni": 0.86, "other": 0.14})


def density_for(a3: str, eth: str, name: str) -> float:
    nl = fold(name)
    if any(
        x in nl
        for x in ("istanbul", "izmir", "beirut", "damascus", "baghdad", "aleppo", "salon")
    ):
        return 220
    if a3 in {"SAU", "YEM", "KWT"}:
        return 3.5
    if eth in {"armenian", "assyrian", "kurdish"}:
        return 32
    if a3 in {"TUR", "SYR", "LBN", "ISR", "PSE", "JOR", "IRQ"}:
        return 48
    return 22


def main() -> None:
    outline = load_outline()
    r = shapefile.Reader(str(SHP_DIR / "ne_10m_admin_1_states_provinces"))
    fields = [f[0] for f in r.fields[1:]]

    features = []
    areas = []
    counts: dict[str, int] = {}
    religion_counts: dict[str, int] = {}

    for sr, rec in zip(r.iterShapes(), r.iterRecords()):
        d = dict(zip(fields, rec))
        a3 = d.get("adm0_a3") or ""
        if a3 not in KEEP:
            continue
        name = d.get("name") or "Unknown"
        nl0 = fold(name)
        if a3 == "TUR" and name_matches(nl0, {"kars", "ardahan"}):
            continue
        try:
            geom = make_valid(shape(sr.__geo_interface__))
            clipped = make_valid(geom.intersection(outline))
        except Exception:
            continue
        if clipped.is_empty or clipped.area < max(0.004, geom.area * 0.12):
            continue
        geom = close_seams(simplify(clipped))
        if geom.is_empty:
            continue

        eth, religion, label = classify(a3, name)
        shares = estimate_ethnic_shares(eth, a3, name)
        religion_shares = estimate_religion_shares(religion, eth, a3, name)
        km2 = max(area_km2(geom), 1.0)
        dens = density_for(a3, eth, name)
        slug = slugify(a3, name)

        areas.append(
            {
                "code": slug,
                "slug": slug,
                "name": label,
                "plurality": eth,
                "nationality": eth,
                "religion": religion,
                "adm0": a3,
                "areaKm2": round(km2, 1),
                "density": dens,
                "population": 0,
                "shares": shares,
                "religionShares": religion_shares,
            }
        )
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "name": label,
                    "slug": slug,
                    "code": slug,
                    "plurality": eth,
                    "nationality": eth,
                    "religion": religion,
                    "adm0": a3,
                },
                "geometry": mapping(geom),
            }
        )
        counts[eth] = counts.get(eth, 0) + 1
        religion_counts[religion] = religion_counts.get(religion, 0) + 1

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
                "note": "Empire-scoped map on modern provinces inside the 1914 Ottoman outline. Ethnicity (Turkish / Arab / Kurdish / Greek / Armenian / …) and religion (Sunni / Shia / Alevi / Orthodox / …) are separate layers — illustrative regional majorities, not official salname tables. Vilayet polygons are not openly available. Egypt is omitted (de facto British). Armenian and Greek figures reflect eve-of-war demography before wartime destruction and population transfers.",
                "source": "Ottoman official statistics and demographic compilations, c. 1881–1914. Unit borders: Natural Earth admin-1 clipped to historical-basemaps Ottoman Empire 1914.",
                "sourceUrl": "https://en.wikipedia.org/wiki/Ottoman_Empire",
                "geoUrl": "/geo/historic/ottoman-empire-1914.json",
                "groups": GROUPS,
                "religionGroups": RELIGION_GROUPS,
                "nationalShares": NATIONAL_SHARES,
                "nationalReligionShares": NATIONAL_RELIGION,
                "totalPopulation": sum(a["population"] for a in areas),
                "areas": areas,
            },
            indent=2,
        )
        + "\n"
    )
    print(f"wrote {OUT_GEO} ({len(features)} units)")
    print("population", sum(a["population"] for a in areas))
    print("ethnicity", dict(sorted(counts.items(), key=lambda x: -x[1])))
    print("religion", dict(sorted(religion_counts.items(), key=lambda x: -x[1])))


if __name__ == "__main__":
    main()
