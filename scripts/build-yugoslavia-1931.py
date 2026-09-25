#!/usr/bin/env python3
"""Build Kingdom of Yugoslavia 1931 ethnicity plurality map.

Modern admin units inside the historical-basemaps 1930 Yugoslavia outline,
painted by approximate 1931 nationality / mother-tongue majorities
(banovina-era patterns). Banovina GIS is not openly available; this matches
the Austria-Hungary / Russian Empire approach.
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
OUTLINE = CACHE / "yugo-1930-outline.geojson"
WORLD_1930 = CACHE / "world_1930.geojson"
OUT_GEO = ROOT / "public" / "geo" / "historic" / "yugoslavia-1931.json"
OUT_DATA = ROOT / "src" / "lib" / "data" / "historic-yugoslavia-1931.json"

GROUPS = [
    {"id": "serb", "shortLabel": "Serb", "color": "#1a5276"},
    {"id": "croat", "shortLabel": "Croat", "color": "#2874a6"},
    {"id": "slovene", "shortLabel": "Slovene", "color": "#5dade2"},
    {"id": "muslim", "shortLabel": "Muslim (Bosniak)", "color": "#1e8449"},
    {"id": "macedonian", "shortLabel": "Macedonian", "color": "#27ae60"},
    {"id": "albanian", "shortLabel": "Albanian", "color": "#922b21"},
    {"id": "hungarian", "shortLabel": "Hungarian", "color": "#c0392b"},
    {"id": "german", "shortLabel": "German", "color": "#f4d03f"},
    {"id": "other", "shortLabel": "Other", "color": "#95a5a6"},
]

RELIGION_GROUPS = [
    {"id": "orthodox", "shortLabel": "Orthodox", "color": "#4a2c6a"},
    {"id": "catholic", "shortLabel": "Catholic", "color": "#f4d03f"},
    {"id": "muslim", "shortLabel": "Muslim", "color": "#27ae60"},
    {"id": "protestant", "shortLabel": "Protestant", "color": "#5dade2"},
    {"id": "jewish", "shortLabel": "Jewish", "color": "#a569bd"},
    {"id": "other", "shortLabel": "Other", "color": "#95a5a6"},
]

# 1931 Definitivni rezultati — kingdom totals (nationality / mother tongue).
# Muslims here follow the census “Muslim” nationality bucket used in Bosnia.
NATIONAL_SHARES = {
    "serb": 0.388,
    "croat": 0.237,
    "slovene": 0.083,
    "muslim": 0.069,
    "macedonian": 0.055,  # Vardar South Slavs; census folded most into Serbs
    "albanian": 0.032,
    "german": 0.036,
    "hungarian": 0.034,
    "other": 0.066,
}

NATIONAL_RELIGION = {
    "orthodox": 0.484,
    "catholic": 0.373,
    "muslim": 0.111,
    "protestant": 0.016,
    "jewish": 0.005,
    "other": 0.011,
}

TARGET_POP = 13_934_038

KEEP = {"SVN", "HRV", "BIH", "SRB", "MNE", "MKD", "KOS"}

# Bosnia — 1931-era majorities mapped onto today’s cantons / RS regions.
BIH_MUSLIM = {
    "una-sana",
    "sarajevo",
    "tuzla",
    "zenica-doboj",
    "central bosnia",
    "bosnian podrinje",
    "west bosnia",
}
BIH_CROAT = {
    "west herzegovina",
    "posavina",
}
# Remaining BIH (RS regions + Herzegovina-Neretva mixed) → Serb plurality
# Herzegovina-Neretva was mixed; paint Croat for western Herzegovina feel via
# West Herzegovina; Mostar canton stays Serb/Muslim contested → muslim with note

# Vojvodina Hungarian belt (1931 North Bačka / North Banat).
SRB_HUNGARIAN = {"severno-backi", "severno-banatski"}
# Banat German pockets (Middle Banat had large Danube Swabian share).
SRB_GERMAN = {"srednje-banatski"}

# Montenegro — Albanian / Muslim east.
MNE_ALBANIAN = {"ulcinj", "plav", "rožaje", "rozaje"}

# North Macedonia — Albanian west (Polog / Debar belt). Do not fold Debar
# into the whole Southwestern statistical region (that would paint Ohrid).
MKD_ALBANIAN_REGIONS = {"polog"}
MKD_ALBANIAN_NAMES = {
    "tetovo",
    "gostivar",
    "debar",
    "tearce",
    "bogovinje",
    "vrapcište",
    "vrapciste",
    "želino",
    "zelino",
    "brvenica",
    "lipkovo",
    "aracinovo",
    "aračinovo",
    "saraj",
    "studeničani",
    "studenicani",
    "centar župa",
    "centar zupa",
    "mavrovo and rostusa",
    "žajas",
    "zajas",
}

# Kosovo — Serb north / Štrpce pocket; rest Albanian.
KOS_SERB = {
    "leposavić",
    "leposavic",
    "zubin potok",
    "zvečan",
    "zvecan",
    "štrpce",
    "strpce",
    "novo brdo",
}


def slugify(prefix: str, name: str) -> str:
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return f"{prefix}-{s}"


def simplify(geom, tol=0.01):
    try:
        g = make_valid(geom)
        return g.simplify(tol, preserve_topology=True)
    except Exception:
        return geom


def ensure_outline() -> None:
    if OUTLINE.exists():
        return
    if not WORLD_1930.exists():
        raise SystemExit(f"Missing {WORLD_1930}; download historical-basemaps world_1930.geojson")
    g = json.loads(WORLD_1930.read_text())
    feats = [f for f in g["features"] if f["properties"].get("NAME") == "Yugoslavia"]
    if not feats:
        raise SystemExit("Yugoslavia not found in world_1930")
    OUTLINE.write_text(json.dumps({"type": "FeatureCollection", "features": feats}))


def load_outline():
    ensure_outline()
    g = json.loads(OUTLINE.read_text())
    geoms = [make_valid(shape(f["geometry"])) for f in g["features"]]
    return make_valid(unary_union(geoms)).buffer(0.08)


def normalize_shares(raw: dict[str, float]) -> dict[str, float]:
    s = sum(max(0.0, v) for v in raw.values())
    if s <= 0:
        return {"other": 1.0}
    return {k: round(v / s, 4) for k, v in raw.items() if v > 0}


def area_km2(geom) -> float:
    minx, miny, maxx, maxy = geom.bounds
    lat = (miny + maxy) / 2
    return geom.area * (111.32 * 111.32 * math.cos(math.radians(lat)))


def fold_key(name: str) -> str:
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower().strip()


def classify(a3: str, name: str, region: str) -> tuple[str, str, str]:
    """Return (plurality, religion, display_name)."""
    nl = fold_key(name)
    rl = fold_key(region or "")

    if a3 == "SVN":
        return "slovene", "catholic", name

    if a3 == "HRV":
        # Eastern Slavonia had a large Serb minority but Croat plurality in Sava banovina.
        return "croat", "catholic", name

    if a3 == "BIH":
        if any(k in nl for k in BIH_MUSLIM):
            return "muslim", "muslim", name
        if any(k in nl for k in BIH_CROAT):
            return "croat", "catholic", name
        if "herzegovina-neretva" in nl:
            # Mostar — mixed Muslim / Croat / Serb; Muslim plurality in city basin.
            return "muslim", "muslim", f"{name} (mixed)"
        return "serb", "orthodox", name

    if a3 == "SRB":
        if any(k in nl for k in SRB_HUNGARIAN):
            return "hungarian", "catholic", f"{name} (Bačka / Banat)"
        if any(k in nl for k in SRB_GERMAN):
            return "german", "catholic", f"{name} (Banat Swabian)"
        return "serb", "orthodox", name

    if a3 == "MNE":
        if any(k in nl for k in MNE_ALBANIAN):
            return "albanian", "muslim", name
        return "serb", "orthodox", name

    if a3 == "MKD":
        if "albanian" in nl or rl in MKD_ALBANIAN_REGIONS or any(
            k in nl for k in MKD_ALBANIAN_NAMES
        ):
            if any(x in nl for x in ("ohrid", "bitola", "prilep", "resen", "demir hisar")):
                return "macedonian", "orthodox", name
            return "albanian", "muslim", name
        return "macedonian", "orthodox", name

    if a3 == "KOS":
        if any(k in nl for k in KOS_SERB):
            return "serb", "orthodox", name
        return "albanian", "muslim", name

    return "other", "other", name


def estimate_shares(plural: str, a3: str, name: str) -> dict[str, float]:
    nl = fold_key(name)
    if plural == "slovene":
        return normalize_shares({"slovene": 0.92, "german": 0.04, "other": 0.04})
    if plural == "croat" and a3 == "HRV":
        if any(x in nl for x in ("vukovar", "srijem", "osjecko", "osječko")):
            return normalize_shares({"croat": 0.58, "serb": 0.32, "other": 0.10})
        if any(x in nl for x in ("istarska", "primorsko")):
            return normalize_shares({"croat": 0.72, "other": 0.28})
        return normalize_shares({"croat": 0.82, "serb": 0.10, "other": 0.08})
    if plural == "croat" and a3 == "BIH":
        return normalize_shares({"croat": 0.70, "muslim": 0.16, "serb": 0.10, "other": 0.04})
    if plural == "muslim":
        return normalize_shares({"muslim": 0.52, "serb": 0.28, "croat": 0.14, "other": 0.06})
    if plural == "hungarian":
        return normalize_shares({"hungarian": 0.48, "serb": 0.28, "german": 0.14, "other": 0.10})
    if plural == "german":
        return normalize_shares({"german": 0.42, "serb": 0.28, "hungarian": 0.16, "other": 0.14})
    if plural == "albanian":
        if a3 == "KOS":
            return normalize_shares({"albanian": 0.68, "serb": 0.22, "other": 0.10})
        if a3 == "MKD":
            return normalize_shares({"albanian": 0.62, "macedonian": 0.28, "other": 0.10})
        return normalize_shares({"albanian": 0.70, "serb": 0.18, "other": 0.12})
    if plural == "macedonian":
        return normalize_shares({"macedonian": 0.72, "albanian": 0.12, "serb": 0.08, "other": 0.08})
    if plural == "serb" and a3 == "BIH":
        return normalize_shares({"serb": 0.55, "muslim": 0.28, "croat": 0.12, "other": 0.05})
    if plural == "serb" and a3 == "MNE":
        return normalize_shares({"serb": 0.80, "albanian": 0.10, "other": 0.10})
    if plural == "serb":
        return normalize_shares({"serb": 0.86, "other": 0.14})
    return normalize_shares({plural: 0.78, "other": 0.22})


def estimate_religion_shares(religion: str, plural: str) -> dict[str, float]:
    if religion == "catholic":
        if plural == "hungarian":
            return normalize_shares({"catholic": 0.55, "protestant": 0.28, "orthodox": 0.12, "other": 0.05})
        if plural == "german":
            return normalize_shares({"catholic": 0.62, "protestant": 0.22, "orthodox": 0.12, "other": 0.04})
        return normalize_shares({"catholic": 0.88, "orthodox": 0.06, "other": 0.06})
    if religion == "muslim":
        return normalize_shares({"muslim": 0.78, "orthodox": 0.14, "catholic": 0.04, "other": 0.04})
    if religion == "orthodox":
        return normalize_shares({"orthodox": 0.86, "muslim": 0.06, "catholic": 0.04, "other": 0.04})
    return normalize_shares({religion: 0.8, "other": 0.2})


def density_for(a3: str, plural: str, name: str) -> float:
    nl = fold_key(name)
    if a3 == "SVN":
        return 78
    if "zagreb" in nl or "beograd" in nl or "belgrade" in nl:
        return 420
    if a3 == "HRV":
        return 72
    if a3 == "BIH":
        return 55
    if a3 == "SRB":
        return 65 if plural == "serb" else 58
    if a3 == "MNE":
        return 32
    if a3 == "MKD":
        return 48
    if a3 == "KOS":
        return 70
    return 50


def dissolve_key(a3: str, name: str, region: str, type_en: str) -> str | None:
    """Group fine units so the map stays readable (~banovina-scale patches)."""
    if a3 == "SVN":
        # Natural Earth lists Slovene communes; fold to statistical region.
        return f"SVN::{region or 'Slovenia'}"
    if a3 == "MKD":
        nl = fold_key(name)
        rl = fold_key(region or "")
        if any(k in nl for k in MKD_ALBANIAN_NAMES) or rl in MKD_ALBANIAN_REGIONS:
            return "MKD::Albanian west"
        if rl:
            return f"MKD::{region}"
        return f"MKD::{name}"
    if a3 == "KOS":
        return f"KOS::{region or name}"
    if a3 == "MNE":
        return f"MNE::{name}"  # already municipality-sized (~20)
    return None  # keep HRV / BIH / SRB units as-is


def main() -> None:
    outline = load_outline()
    r = shapefile.Reader(str(SHP_DIR / "ne_10m_admin_1_states_provinces"))
    fields = [f[0] for f in r.fields[1:]]

    buckets: dict[str, dict] = {}

    for sr, rec in zip(r.iterShapes(), r.iterRecords()):
        d = dict(zip(fields, rec))
        a3 = d.get("adm0_a3") or ""
        if a3 not in KEEP:
            continue
        name = d.get("name") or "Unknown"
        region = d.get("region") or ""
        type_en = d.get("type_en") or ""
        try:
            geom = make_valid(shape(sr.__geo_interface__))
        except Exception:
            continue
        if geom.is_empty:
            continue
        try:
            clipped = make_valid(geom.intersection(outline))
        except Exception:
            continue
        if clipped.is_empty or clipped.area < 0.002:
            continue

        plural, religion, display = classify(a3, name, region)
        key = dissolve_key(a3, name, region, type_en)
        if key is None:
            key = f"{a3}::{name}"

        bucket = buckets.get(key)
        if bucket is None:
            buckets[key] = {
                "geoms": [clipped],
                "a3": a3,
                "name": display if key.startswith(a3) and "::" in key else (region or display),
                "plural": plural,
                "religion": religion,
                "seed_name": name,
            }
            # Prefer human labels for dissolved groups.
            if a3 == "SVN":
                buckets[key]["name"] = region or "Slovenia"
            elif a3 == "MKD" and key.endswith("Albanian west"):
                buckets[key]["name"] = "Western Macedonia (Albanian)"
            elif a3 == "MKD" and region:
                buckets[key]["name"] = region
            elif a3 == "KOS" and region:
                buckets[key]["name"] = region
        else:
            bucket["geoms"].append(clipped)
            # If any part is Albanian / Hungarian etc., keep the minority signal
            # when dissolving (first write wins for plural — reclassify from key).
            pass

    # Re-classify dissolved buckets from their label.
    features = []
    areas = []
    counts: dict[str, int] = {}

    for key, bucket in sorted(buckets.items(), key=lambda kv: kv[0]):
        a3 = bucket["a3"]
        try:
            geom = simplify(make_valid(unary_union(bucket["geoms"])))
        except Exception:
            continue
        if geom.is_empty or geom.area < 0.003:
            continue

        label = bucket["name"]
        plural, religion, display = classify(a3, label, label)
        # Override with seed for single-unit buckets that had a richer display name.
        if len(bucket["geoms"]) == 1 and bucket.get("seed_name"):
            plural, religion, display = classify(a3, bucket["seed_name"], label)
            label = display

        shares = estimate_shares(plural, a3, label)
        religion_shares = estimate_religion_shares(religion, plural)
        km2 = max(area_km2(geom), 1.0)
        dens = density_for(a3, plural, label)
        slug = slugify(f"yu-{a3.lower()}", label)

        area = {
            "code": slug,
            "slug": slug,
            "name": label,
            "plurality": plural,
            "nationality": plural,
            "religion": religion,
            "adm0": a3,
            "areaKm2": round(km2, 1),
            "density": dens,
            "population": 0,
            "shares": shares,
            "religionShares": religion_shares,
        }
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "name": label,
                    "slug": slug,
                    "code": slug,
                    "plurality": plural,
                    "nationality": plural,
                    "religion": religion,
                    "adm0": a3,
                },
                "geometry": mapping(geom),
            }
        )
        areas.append(area)
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
                "id": "yugoslavia-ethnicity-1931",
                "slug": "yugoslavia-1931",
                "title": "Ethnicity in the Kingdom of Yugoslavia, 1931",
                "year": 1931,
                "mapMode": "plurality",
                "primaryMetric": "nationality",
                "note": "Kingdom-scoped map on modern counties / cantons / districts inside the 1930 Yugoslavia outline, painted by approximate 1931 nationality majorities (banovina-era patterns). Banovina polygons are not openly available. Macedonian is shown for Vardar South Slavs — the 1931 census usually folded them into Serbs. Unit mixes are illustrative, not official banovina tables.",
                "source": "Kingdom of Yugoslavia census 1931 (nationality / mother tongue / religion) for kingdom totals and regional majorities. Unit borders: Natural Earth admin-1 clipped to historical-basemaps Yugoslavia 1930.",
                "sourceUrl": "https://en.wikipedia.org/wiki/Subdivisions_of_the_Kingdom_of_Yugoslavia",
                "geoUrl": "/geo/historic/yugoslavia-1931.json",
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
    print("counts", dict(sorted(counts.items(), key=lambda x: -x[1])))


if __name__ == "__main__":
    main()
