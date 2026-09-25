#!/usr/bin/env python3
"""Build Austria-Hungary 1910 ethnic map with minority enclaves.

Empire-scoped. Modern admin-1 units inside the 1914 Dual Monarchy outline are
kept as separate polygons (not dissolved into huge crownlands) and painted by
1910 language / nationality majority — including Sudeten German borderlands,
Szekler Hungarian counties, southern Slovak Hungarian belt, etc.
"""

from __future__ import annotations

import json
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
OUTLINE = CACHE / "ah-1914-outline.geojson"
OUT_GEO = ROOT / "public" / "geo" / "historic" / "austria-hungary-1910.json"
OUT_DATA = ROOT / "src" / "lib" / "data" / "historic-austria-hungary-1910.json"

GROUPS = [
    {"id": "german", "shortLabel": "German", "color": "#c0392b"},
    {"id": "hungarian", "shortLabel": "Hungarian", "color": "#e67e22"},
    {"id": "czech", "shortLabel": "Czech", "color": "#5dade2"},
    {"id": "slovak", "shortLabel": "Slovak", "color": "#1e8449"},
    {"id": "polish", "shortLabel": "Polish", "color": "#6c3483"},
    {"id": "ruthenian", "shortLabel": "Ruthenian / Ukrainian", "color": "#f4d03f"},
    {"id": "romanian", "shortLabel": "Romanian", "color": "#196f3d"},
    {"id": "serbo-croat", "shortLabel": "Serbo-Croatian", "color": "#d4ac0d"},
    {"id": "slovene", "shortLabel": "Slovene", "color": "#7d3c98"},
    {"id": "italian", "shortLabel": "Italian", "color": "#48c9b0"},
    {"id": "other", "shortLabel": "Other", "color": "#95a5a6"},
]

RELIGION_GROUPS = [
    {"id": "catholic", "shortLabel": "Catholic", "color": "#f4d03f"},
    {"id": "orthodox", "shortLabel": "Orthodox", "color": "#4a2c6a"},
    {"id": "protestant", "shortLabel": "Protestant", "color": "#5dade2"},
    {"id": "muslim", "shortLabel": "Muslim", "color": "#27ae60"},
    {"id": "jewish", "shortLabel": "Jewish", "color": "#a569bd"},
    {"id": "other", "shortLabel": "Other", "color": "#95a5a6"},
]

# Czech lands — Sudeten German rim vs Czech interior (1910 language majority).
CZE_GERMAN = {
    "ústecký",
    "ustecky",
    "liberecký",
    "liberecky",
    "karlovarský",
    "karlovarsky",
    "moravskoslezský",
    "moravskoslezsky",  # Austrian Silesia / Opava — German plurality historically
}
CZE_CZECH = {
    "plzeňský",
    "plzensky",
    "jihočeský",
    "jihocesky",
    "královéhradecký",
    "kralovehradecky",
    "pardubický",
    "pardubicky",
    "olomoucký",
    "olomoucky",
    "jihomoravský",
    "jihomoravsky",
    "zlínský",
    "zlinsky",
    "vysočina",
    "vysocina",
    "středočeský",
    "stredocesky",
    "prague",
    "praha",
}

# Szeklerland / Hungarian-majority Transylvanian counties (1910).
ROU_HUNGARIAN = {"harghita", "covasna", "mures", "mureş", "mureș"}
# Saxon / German pockets in southern Transylvania (Sibiu / Brașov area).
ROU_GERMAN = {"sibiu", "brasov", "braşov", "brașov"}


def _name_matches(nl: str, keys: set[str]) -> bool:
    """Exact token match — avoids 'mures' hitting 'maramures'."""
    return nl in keys or any(
        nl == k or nl.startswith(k + " ") or nl.endswith(" " + k) for k in keys
    )

# Southern Slovakia — Hungarian-majority counties / regions in 1910.
SVK_HUNGARIAN = {"nitriansky", "trnavský", "trnavsky"}  # south belt approx

# Galicia: west Polish, east Ruthenian
POL_WEST = {"lesser poland", "małopolskie", "malopolskie", "silesian"}
POL_EAST = {"subcarpathian", "podkarpackie"}

# Italian littoral / South Tyrol
ITA_KEEP = {"bozen", "trieste", "gorizia"}


def slugify(name: str) -> str:
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return f"ah-{s}"


def simplify(geom, tol=0.01):
    try:
        g = make_valid(geom)
        return g.simplify(tol, preserve_topology=True)
    except Exception:
        return geom


def close_seams(geom, pad=0.003):
    """Slight positive buffer so clip+simplify micro-gaps don't show as ocean holes."""
    try:
        g = make_valid(geom.buffer(pad))
        return g if not g.is_empty else geom
    except Exception:
        return geom


def load_outline():
    g = json.loads(OUTLINE.read_text())
    from shapely.ops import unary_union

    geoms = [make_valid(shape(f["geometry"])) for f in g["features"]]
    return make_valid(unary_union(geoms)).buffer(0.12)


def half_of(a3: str, name: str) -> str:
    nl = name.lower()
    if a3 == "BIH":
        return "bosnia"
    if a3 in {"HUN", "SVK", "ROU", "SRB"}:
        return "transleithania"
    if a3 == "AUT" and "burgenland" in nl:
        return "transleithania"
    if a3 == "HRV":
        # Dalmatia + Istria = Cisleithania; Croatia-Slavonia = Hungarian crown
        if any(
            x in nl
            for x in [
                "istarska",
                "primorsko",
                "dubrovacko",
                "splitsko",
                "sibensko",
                "zadarska",
                "licko",
            ]
        ):
            return "cisleithania"
        return "transleithania"
    return "cisleithania"


def normalize_shares(raw: dict[str, float]) -> dict[str, float]:
    s = sum(max(0.0, v) for v in raw.values())
    if s <= 0:
        return {"other": 1.0}
    return {k: round(v / s, 4) for k, v in raw.items() if v > 0}


def estimate_shares(plural: str, display: str, a3: str) -> dict[str, float]:
    """Illustrative 1910 mother-tongue mix for dig-in (not official unit tables)."""
    dl = display.lower()
    if "sudeten" in dl or "silesia" in dl:
        return normalize_shares({"german": 0.70, "czech": 0.24, "polish": 0.04, "other": 0.02})
    if "szekler" in dl:
        return normalize_shares({"hungarian": 0.84, "romanian": 0.11, "german": 0.03, "other": 0.02})
    if "saxon" in dl:
        return normalize_shares({"german": 0.46, "romanian": 0.34, "hungarian": 0.16, "other": 0.04})
    if "hungarian belt" in dl:
        return normalize_shares({"hungarian": 0.56, "slovak": 0.34, "german": 0.06, "other": 0.04})
    if "bratislav" in dl:
        # Pozsony / Pressburg mixed city-region
        return normalize_shares({"slovak": 0.36, "hungarian": 0.34, "german": 0.24, "other": 0.06})
    if "bačka" in dl or "backa" in dl:
        return normalize_shares({"hungarian": 0.48, "serbo-croat": 0.28, "german": 0.18, "other": 0.06})
    if "burgenland" in dl:
        return normalize_shares({"german": 0.55, "hungarian": 0.25, "serbo-croat": 0.12, "other": 0.08})
    if a3 == "AUT" and ("wien" in dl or "vienna" in dl):
        return normalize_shares({"german": 0.88, "czech": 0.07, "other": 0.05})
    if plural == "czech":
        return normalize_shares({"czech": 0.76, "german": 0.20, "other": 0.04})
    if plural == "german" and a3 == "AUT":
        return normalize_shares({"german": 0.92, "czech": 0.03, "slovene": 0.02, "other": 0.03})
    if plural == "german" and a3 == "ITA":
        return normalize_shares({"german": 0.82, "italian": 0.12, "other": 0.06})
    if plural == "slovak":
        return normalize_shares({"slovak": 0.68, "hungarian": 0.18, "german": 0.08, "other": 0.06})
    if plural == "hungarian":
        return normalize_shares({"hungarian": 0.82, "german": 0.08, "slovak": 0.04, "other": 0.06})
    if plural == "romanian":
        return normalize_shares({"romanian": 0.62, "hungarian": 0.22, "german": 0.10, "other": 0.06})
    if plural == "polish":
        return normalize_shares({"polish": 0.72, "ruthenian": 0.18, "german": 0.05, "other": 0.05})
    if plural == "ruthenian":
        return normalize_shares({"ruthenian": 0.66, "polish": 0.18, "romanian": 0.08, "other": 0.08})
    if plural == "serbo-croat":
        return normalize_shares({"serbo-croat": 0.82, "german": 0.06, "hungarian": 0.06, "other": 0.06})
    if plural == "slovene":
        return normalize_shares({"slovene": 0.86, "german": 0.08, "italian": 0.03, "other": 0.03})
    if plural == "italian":
        return normalize_shares({"italian": 0.62, "serbo-croat": 0.22, "slovene": 0.10, "other": 0.06})
    return normalize_shares({plural: 0.78, "other": 0.22})


def area_km2(geom) -> float:
    import math

    c = geom.centroid
    # equirectangular approx
    return float(geom.area * (111.32**2) * abs(math.cos(math.radians(c.y))))


def base_density(plural: str, display: str, a3: str, half: str) -> float:
    """People per km² prior — geographic spread, then scaled to ~51.4M empire total."""
    dl = display.lower()
    # Capitals / industrial cores
    if any(x in dl for x in ("wien", "vienna", "budapest", "prague", "praha")):
        return 2200
    if any(x in dl for x in ("trieste", "tries", "fiume", "rijeka", "lwow", "lviv", "lemberg")):
        return 450
    if any(x in dl for x in ("brno", "brünn", "ostrava", "krakow", "kraków", "krakau")):
        return 320
    # Mountain / steppe / karst — sparse
    if half == "bosnia":
        return 38
    if any(x in dl for x in ("karnten", "kärnten", "tirol", "tyrol", "salzburg", "vorarlberg")):
        return 42
    if any(x in dl for x in ("dalmac", "dalmat", "istarska", "istria", "primorsko")):
        return 48
    if plural == "ruthenian":
        return 58
    if plural == "romanian":
        return 52
    if plural == "slovak":
        return 68
    if plural == "serbo-croat":
        return 62
    if plural == "slovene":
        return 70
    if plural == "italian":
        return 115
    if "sudeten" in dl:
        return 125
    if plural == "czech":
        return 145
    if plural == "polish":
        return 95
    if a3 == "AUT" and plural == "german":
        return 105
    if half == "transleithania" and plural == "hungarian":
        # Interior plain denser than the periphery
        if any(x in dl for x in ("pest", "buda", "csongrad", "bekes", "hajdu")):
            return 110
        return 72
    if plural == "german":
        return 88
    return 65


TARGET_POP = 51_390_000  # ~1910 Dual Monarchy (ex-Bosnia ~48.5M + Bosnia ~1.9M)


def estimate_religion(plural: str, display: str, a3: str, half: str) -> tuple[str, dict[str, float]]:
    """Approximate 1910 religious majority + dig-in mix."""
    dl = display.lower()
    if half == "bosnia" or a3 == "BIH":
        # 1910: Orthodox ~43%, Muslim ~32%, Catholic ~23%
        return (
            "orthodox",
            normalize_shares({"orthodox": 0.43, "muslim": 0.32, "catholic": 0.23, "other": 0.02}),
        )
    if "szekler" in dl:
        return (
            "protestant",
            normalize_shares({"protestant": 0.72, "catholic": 0.18, "orthodox": 0.06, "other": 0.04}),
        )
    if "saxon" in dl:
        return (
            "protestant",
            normalize_shares({"protestant": 0.55, "orthodox": 0.28, "catholic": 0.12, "other": 0.05}),
        )
    if plural == "romanian":
        return (
            "orthodox",
            normalize_shares({"orthodox": 0.78, "catholic": 0.08, "protestant": 0.08, "other": 0.06}),
        )
    if plural == "ruthenian":
        # Greek Catholic / Uniate majority in east Galicia
        return (
            "catholic",
            normalize_shares({"catholic": 0.62, "orthodox": 0.22, "jewish": 0.10, "other": 0.06}),
        )
    if plural == "serbo-croat":
        if a3 == "HRV" and any(x in dl for x in ["istarska", "primorsko"]):
            return (
                "catholic",
                normalize_shares({"catholic": 0.82, "orthodox": 0.10, "other": 0.08}),
            )
        if a3 == "SRB" or "bačka" in dl or "backa" in dl:
            return (
                "orthodox",
                normalize_shares({"orthodox": 0.55, "catholic": 0.28, "protestant": 0.10, "other": 0.07}),
            )
        # Croatia-Slavonia Croats = Catholic plurality
        return (
            "catholic",
            normalize_shares({"catholic": 0.70, "orthodox": 0.22, "other": 0.08}),
        )
    if plural in {"german", "czech", "slovak", "polish", "slovene", "italian"}:
        return (
            "catholic",
            normalize_shares({"catholic": 0.88, "protestant": 0.06, "jewish": 0.03, "other": 0.03}),
        )
    if plural == "hungarian":
        # Calvinist east + Catholic west; Catholic plurality empire-wide Magyars
        if any(x in dl for x in ["hajdú", "hajdu", "debrecen", "szabolcs", "békés", "bekes"]):
            return (
                "protestant",
                normalize_shares({"protestant": 0.58, "catholic": 0.32, "jewish": 0.06, "other": 0.04}),
            )
        return (
            "catholic",
            normalize_shares({"catholic": 0.62, "protestant": 0.28, "jewish": 0.06, "other": 0.04}),
        )
    return ("other", normalize_shares({"other": 1.0}))


def enrich_area(
    *,
    code: str,
    slug: str,
    name: str,
    plural: str,
    a3: str,
    geom,
) -> dict:
    half = half_of(a3, name)
    shares = estimate_shares(plural, name, a3)
    religion, religion_shares = estimate_religion(plural, name, a3, half)
    km2 = max(1.0, area_km2(geom))
    dens = base_density(plural, name, a3, half)
    return {
        "code": code,
        "slug": slug,
        "name": name,
        "plurality": plural,
        "nationality": plural,
        "religion": religion,
        "half": half,
        "adm0": a3,
        "areaKm2": round(km2, 1),
        "density": dens,
        "population": 0,
        "shares": shares,
        "religionShares": religion_shares,
    }


def classify(a3: str, name: str) -> tuple[str, str] | None:
    """Return (display_name, plurality) or None if outside AH focus."""
    n = name or ""
    nl = n.lower()

    if a3 == "AUT":
        if "burgenland" in nl:
            return (n, "hungarian")  # 1910: mostly in Hungary (German/Croat/Hungarian mix; Magyar polity)
        return (n, "german")

    if a3 == "CZE":
        if any(x in nl for x in CZE_GERMAN):
            label = f"{n} (Sudeten / Silesia)"
            return (label, "german")
        return (n, "czech")

    if a3 == "SVK":
        if any(x in nl for x in SVK_HUNGARIAN):
            return (f"{n} (Hungarian belt)", "hungarian")
        if "bratislav" in nl:
            return (n, "slovak")
        return (n, "slovak")

    if a3 == "SVN":
        return (n, "slovene")

    if a3 == "HRV":
        if "istarska" in nl or "primorsko" in nl:
            return (n, "italian" if "istarska" in nl else "serbo-croat")
        if any(
            x in nl
            for x in [
                "dubrovacko",
                "splitsko",
                "sibensko",
                "zadarska",
                "licko",
            ]
        ):
            return (n, "serbo-croat")
        return (n, "serbo-croat")

    if a3 == "BIH":
        return (n, "serbo-croat")

    if a3 == "HUN":
        return (n, "hungarian")

    if a3 == "ROU":
        outside = {
            "bucharest",
            "ilfov",
            "giurgiu",
            "calarasi",
            "ialomita",
            "braila",
            "galati",
            "tulcea",
            "constanta",
            "dolj",
            "olt",
            "teleorman",
            "arges",
            "dambovita",
            "prahova",
            "buzau",
            "vrancea",
            "bacau",
            "vaslui",
            "iasi",
            "botosani",
            "neamt",
            "gorj",
            "mehedinti",
            "valcea",
        }
        if any(o in nl for o in outside):
            return None
        if _name_matches(nl, ROU_HUNGARIAN):
            return (f"{n} (Szeklerland)", "hungarian")
        if _name_matches(nl, ROU_GERMAN):
            return (f"{n} (Saxon)", "german")
        return (n, "romanian")

    if a3 == "SRB":
        voj = {
            "severno-backi",
            "zapadno-backi",
            "juzno-backi",
            "sremski",
            "srednje-banatski",
            "juzno-banatski",
            "severno-banatski",
        }
        if any(v in nl for v in voj):
            if "severno-backi" in nl or "zapadno-backi" in nl:
                return (f"{n} (Bačka)", "hungarian")
            return (n, "serbo-croat")
        return None

    if a3 == "POL":
        if any(x in nl for x in POL_EAST):
            return (n, "ruthenian")
        if any(x in nl for x in POL_WEST):
            return (n, "polish")
        return None

    if a3 == "UKR":
        if "chernivtsi" in nl:
            return (n, "ruthenian")
        if any(
            x in nl
            for x in ["l'viv", "lviv", "ivano-frankivs", "ternopil"]
        ):
            if "lviv" in nl or "l'viv" in nl:
                return (n, "polish")
            return (n, "ruthenian")
        if "transcarpathia" in nl or "zakarpattia" in nl:
            return (n, "ruthenian")
        return None

    if a3 == "ITA":
        if any(x in nl for x in ITA_KEEP) or "bolzano" in nl:
            if "bozen" in nl or "bolzano" in nl:
                return (n, "german")
            return (n, "italian")
        return None

    return None


def main() -> None:
    outline = load_outline()
    shp = next(SHP_DIR.glob("*.shp"))
    reader = shapefile.Reader(str(shp))
    fields = [f[0] for f in reader.fields[1:]]
    keep = {
        "AUT",
        "HUN",
        "CZE",
        "SVK",
        "SVN",
        "HRV",
        "BIH",
        "ROU",
        "POL",
        "UKR",
        "ITA",
        "SRB",
    }

    features = []
    areas = []
    counts: dict[str, int] = {}
    # Dissolve ultra-fine admin (municipalities) into readable historic units.
    dissolve_buckets: dict[str, list] = {
        "Carniola": [],
        "Bosnia and Herzegovina": [],
    }

    for sr in reader.iterShapeRecords():
        rec = dict(zip(fields, sr.record))
        a3 = rec.get("adm0_a3")
        if a3 not in keep:
            continue
        name = rec.get("name") or ""
        type_en = (rec.get("type_en") or "").lower()
        # Keep Budapest / free cities — skipping them left holes in the crown lands.
        classified = classify(a3, name)
        if not classified:
            continue
        display, plural = classified
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
            if a3 not in {"AUT", "CZE", "SVK", "SVN", "HRV", "BIH", "HUN"}:
                continue
        try:
            clipped = make_valid(geom.intersection(outline))
        except Exception:
            continue
        # Drop poor clips (same rule as Russian Empire) — never keep the full
        # modern province when it barely overlaps the Dual Monarchy.
        if clipped.is_empty or clipped.area < max(1e-4, geom.area * 0.12):
            continue

        if a3 == "SVN":
            dissolve_buckets["Carniola"].append(clipped)
            continue
        if a3 == "BIH":
            dissolve_buckets["Bosnia and Herzegovina"].append(clipped)
            continue

        clipped = close_seams(simplify(clipped))
        slug = slugify(f"{a3}-{name}")
        area = enrich_area(
            code=slug,
            slug=slug,
            name=display,
            plural=plural,
            a3=a3,
            geom=clipped,
        )
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "name": display,
                    "slug": slug,
                    "code": slug,
                    "plurality": plural,
                    "nationality": plural,
                    "religion": area["religion"],
                    "half": area["half"],
                    "adm0": a3,
                },
                "geometry": mapping(clipped),
            }
        )
        areas.append(area)
        counts[plural] = counts.get(plural, 0) + 1

    dissolve_meta = {
        "Carniola": ("slovene", "SVN"),
        "Bosnia and Herzegovina": ("serbo-croat", "BIH"),
    }
    for label, geoms in dissolve_buckets.items():
        if not geoms:
            continue
        plural, a3 = dissolve_meta[label]
        merged = close_seams(simplify(unary_union(geoms), 0.02))
        if merged.is_empty:
            continue
        slug = slugify(label)
        area = enrich_area(
            code=slug,
            slug=slug,
            name=label,
            plural=plural,
            a3=a3,
            geom=merged,
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
                    "religion": area["religion"],
                    "half": area["half"],
                    "adm0": a3,
                },
                "geometry": mapping(merged),
            }
        )
        areas.append(area)
        counts[plural] = counts.get(plural, 0) + 1

    # Scale provisional densities so empire total ≈ 1910 population.
    raw = sum(a["density"] * a["areaKm2"] for a in areas)
    scale = TARGET_POP / raw if raw > 0 else 1.0
    for a in areas:
        a["density"] = round(a["density"] * scale, 1)
        a["population"] = int(round(a["density"] * a["areaKm2"]))

    half_totals = {"cisleithania": 0, "transleithania": 0, "bosnia": 0}
    for a in areas:
        half_totals[a["half"]] = half_totals.get(a["half"], 0) + a["population"]

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
                "id": "austria-hungary-nationalities-1910",
                "slug": "austria-hungary-1910",
                "title": "Nationalities in Austria-Hungary, 1910",
                "year": 1910,
                "mapMode": "plurality",
                "note": "Empire-scoped Dual Monarchy map. Toggle Austria vs Hungary, ethnicity vs religion vs population/density. Unit ethnic and religious shares are illustrative profiles, not official county tables.",
                "source": "1910 Austrian & Hungarian censuses (mother tongue / nationality / religion) for empire totals and majorities. Unit borders: Natural Earth admin-1 clipped to historical-basemaps Austro-Hungarian Empire 1914. Population density scaled to period empire total.",
                "sourceUrl": "https://en.wikipedia.org/wiki/Austria-Hungary",
                "geoUrl": "/geo/historic/austria-hungary-1910.json",
                "groups": GROUPS,
                "religionGroups": RELIGION_GROUPS,
                "primaryMetric": "nationality",
                "nationalShares": {
                    "german": 0.2336,
                    "hungarian": 0.1957,
                    "czech": 0.1254,
                    "serbo-croat": 0.1094,
                    "polish": 0.0968,
                    "ruthenian": 0.0778,
                    "romanian": 0.0627,
                    "slovak": 0.0383,
                    "slovene": 0.0244,
                    "italian": 0.0150,
                    "other": 0.0209,
                },
                "nationalReligionShares": {
                    "catholic": 0.66,
                    "protestant": 0.09,
                    "orthodox": 0.14,
                    "muslim": 0.025,
                    "jewish": 0.045,
                    "other": 0.04,
                },
                "halfTotals": half_totals,
                "totalPopulation": sum(a["population"] for a in areas),
                "areas": areas,
            },
            indent=2,
        )
        + "\n"
    )
    print(f"wrote {OUT_GEO} ({len(features)} units, {OUT_GEO.stat().st_size} bytes)")
    print("population", sum(a["population"] for a in areas), "halves", half_totals)
    print("plurality counts:", dict(sorted(counts.items(), key=lambda x: -x[1])))
    for plural in ("german", "hungarian", "czech", "slovak", "romanian"):
        sample = [a["name"] for a in areas if a["plurality"] == plural][:8]
        print(f"  {plural}: {sample}")


if __name__ == "__main__":
    main()
