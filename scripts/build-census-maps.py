#!/usr/bin/env python3
"""Build country-of-birth / ancestry choropleth layers for the census map explorer.

Sources:
  - Eurostat Census 2021 cens_21cob_r3 (NUTS 1/2/3 country of birth)
  - GISCO NUTS 2021 10M polygons
  - Statistics Denmark FOLK1C (kommune + region ancestry)
  - Dataforsyningen DAGI kommuner (simplified)
  - Rosstat VPN-2020 Volume 5 Table 1 (ethnicity by federal subject)
"""

from __future__ import annotations

import json
import math
import os
import re
import sys
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_GEO = ROOT / "public" / "geo" / "census"
OUT_DATA = ROOT / "public" / "data" / "census"
OUT_CATALOG = ROOT / "src" / "lib" / "data" / "census-maps-catalog.json"

EUROSTAT_URL = (
    "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/"
    "cens_21cob_r3?format=JSON&lang=EN&age=TOTAL&sex=T"
    "&c_birth=NAT&c_birth=FOR&c_birth=TOTAL&c_birth=AFR&c_birth=ASI"
    "&c_birth=AME_N&c_birth=AME_X_N&c_birth=EUR_NEU&c_birth=NEU"
    "&c_birth=OCE&c_birth=UNK&c_birth=OTH"
)
NUTS_URL = {
    1: "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_10M_2021_4326_LEVL_1.geojson",
    2: "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_10M_2021_4326_LEVL_2.geojson",
    3: "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_10M_2021_4326_LEVL_3.geojson",
}
DK_KOM_URL = "https://api.dataforsyningen.dk/kommuner?format=geojson"
DST_URL = "https://api.statbank.dk/v1/data"

# GISCO CNTR_CODE -> (iso3, slug, name)
COUNTRIES = {
    "DE": ("DEU", "germany", "Germany"),
    "ES": ("ESP", "spain", "Spain"),
    "DK": ("DNK", "denmark", "Denmark"),
    "FR": ("FRA", "france", "France"),
    "IT": ("ITA", "italy", "Italy"),
    "NL": ("NLD", "netherlands", "Netherlands"),
    "SE": ("SWE", "sweden", "Sweden"),
    "AT": ("AUT", "austria", "Austria"),
    "BE": ("BEL", "belgium", "Belgium"),
    "PL": ("POL", "poland", "Poland"),
    "PT": ("PRT", "portugal", "Portugal"),
    "FI": ("FIN", "finland", "Finland"),
    "IE": ("IRL", "ireland", "Ireland"),
    "CZ": ("CZE", "czechia", "Czechia"),
    "HU": ("HUN", "hungary", "Hungary"),
    "RO": ("ROU", "romania", "Romania"),
    "EL": ("GRC", "greece", "Greece"),
    "BG": ("BGR", "bulgaria", "Bulgaria"),
    "HR": ("HRV", "croatia", "Croatia"),
    "SK": ("SVK", "slovakia", "Slovakia"),
    "SI": ("SVN", "slovenia", "Slovenia"),
    "LT": ("LTU", "lithuania", "Lithuania"),
    "LV": ("LVA", "latvia", "Latvia"),
    "EE": ("EST", "estonia", "Estonia"),
    "NO": ("NOR", "norway", "Norway"),
    "CH": ("CHE", "switzerland", "Switzerland"),
}

EU_GROUPS = [
    {
        "id": "native",
        "shortLabel": "Native-born",
        "label": "Born in this country",
    },
    {
        "id": "other_eu",
        "shortLabel": "Other EU",
        "label": "Born in another EU country",
    },
    {
        "id": "europe",
        "shortLabel": "Rest of Europe",
        "label": "Born in a European country outside the EU",
    },
    {
        "id": "africa",
        "shortLabel": "Africa",
        "label": "Born in Africa",
    },
    {
        "id": "asia",
        "shortLabel": "Asia",
        "label": "Born in Asia",
    },
    {
        "id": "americas",
        "shortLabel": "Americas & other",
        "label": "Born in the Americas, Oceania, or unknown",
    },
]

DK_GROUPS = [
    {
        "id": "danish",
        "shortLabel": "Danish origin",
        "label": "Persons of Danish origin",
    },
    {
        "id": "immigrant",
        "shortLabel": "Immigrants",
        "label": "Immigrants (born abroad, both parents born abroad)",
    },
    {
        "id": "descendant",
        "shortLabel": "Descendants",
        "label": "Descendants of immigrants (born in Denmark, both parents born abroad)",
    },
]

LEVEL_LABELS = {
    "DE": (
        ("nuts1", "Land", "Länder"),
        ("nuts3", "Kreis", "Districts"),
    ),
    "ES": (
        ("nuts2", "Community", "Autonomous communities"),
        ("nuts3", "Province", "Provinces"),
    ),
    "FR": (
        ("nuts2", "Region", "Regions"),
        ("nuts3", "Department", "Departments"),
    ),
    "IT": (
        ("nuts2", "Region", "Regions"),
        ("nuts3", "Province", "Provinces"),
    ),
    "NL": (
        ("nuts2", "Province", "Provinces"),
        ("nuts3", "COROP", "COROP regions"),
    ),
    "PL": (
        ("nuts2", "Voivodeship", "Voivodeships"),
        ("nuts3", "Subregion", "Subregions"),
    ),
    "SE": (
        ("nuts2", "National area", "National areas"),
        ("nuts3", "County", "Counties"),
    ),
    "AT": (
        ("nuts2", "State", "Bundesländer"),
        ("nuts3", "Group of districts", "Groups of districts"),
    ),
    "BE": (
        ("nuts2", "Province", "Provinces"),
        ("nuts3", "Arrondissement", "Arrondissements"),
    ),
    "PT": (
        ("nuts2", "Region", "Regions"),
        ("nuts3", "Subregion", "Subregions"),
    ),
    "FI": (("nuts3", "Region", "Regions"),),
    "IE": (("nuts3", "Region", "Regions"),),
    "CZ": (
        ("nuts2", "Cohesion region", "Cohesion regions"),
        ("nuts3", "Region", "Regions"),
    ),
    "HU": (
        ("nuts2", "Planning region", "Planning regions"),
        ("nuts3", "County", "Counties"),
    ),
    "RO": (
        ("nuts2", "Region", "Regions"),
        ("nuts3", "County", "Counties"),
    ),
    "EL": (
        ("nuts2", "Region", "Regions"),
        ("nuts3", "Regional unit", "Regional units"),
    ),
    "BG": (
        ("nuts2", "Region", "Regions"),
        ("nuts3", "District", "Districts"),
    ),
    "HR": (("nuts3", "County", "Counties"),),
    "SK": (
        ("nuts2", "Area", "Areas"),
        ("nuts3", "Region", "Regions"),
    ),
    "SI": (("nuts3", "Region", "Regions"),),
    "LT": (("nuts3", "County", "Counties"),),
    "LV": (("nuts3", "Statistical region", "Statistical regions"),),
    "EE": (("nuts3", "Group of counties", "Groups of counties"),),
    "NO": (("nuts3", "County", "Counties"),),
    "CH": (
        ("nuts2", "Region", "Regions"),
        ("nuts3", "Canton", "Cantons"),
    ),
    "DK": (
        ("region", "Region", "Regions"),
        ("kommune", "Kommune", "Municipalities"),
    ),
}


def slugify(text: str) -> str:
    s = (
        text.lower()
        .replace("æ", "ae")
        .replace("ø", "oe")
        .replace("å", "aa")
        .replace("ß", "ss")
    )
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def fetch_json(url: str, dest: Path | None = None) -> dict:
    if dest and dest.exists() and dest.stat().st_size > 1000:
        print(f"  cache {dest}")
        return json.loads(dest.read_text())
    print(f"  GET {url[:90]}...")
    req = urllib.request.Request(url, headers={"User-Agent": "birthrate.io census-maps/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        raw = r.read()
    if dest:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(raw)
    return json.loads(raw)


def post_json(url: str, body: dict) -> dict:
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "User-Agent": "birthrate.io census-maps/1.0"},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


def dim_order(stat: dict, dim: str) -> list[str]:
    idx = stat["dimension"][dim]["category"]["index"]
    arr = [""] * len(idx)
    for k, i in idx.items():
        arr[i] = k
    return arr


def eurostat_get(stat: dict, c_birth: str, geo: str) -> float | None:
    index = stat["id"]
    size = stat["size"]
    dims = stat["dimension"]
    coords = []
    for dim in index:
        cat = dims[dim]["category"]["index"]
        if dim == "c_birth":
            coords.append(cat[c_birth])
        elif dim == "geo":
            if geo not in cat:
                return None
            coords.append(cat[geo])
        else:
            coords.append(0)
    flat = 0
    for i, c in enumerate(coords):
        mul = 1
        for s in size[i + 1 :]:
            mul *= s
        flat += c * mul
    v = stat["value"].get(str(flat))
    return float(v) if v is not None else None


def shares_from_cob(vals: dict[str, float | None]) -> tuple[int, dict[str, float]] | None:
    total = vals.get("TOTAL") or 0
    if total <= 0:
        return None
    nat = vals.get("NAT") or 0
    neu = vals.get("NEU") or 0
    foreign = vals.get("FOR") or 0
    other_eu = max(0.0, foreign - neu)
    europe = vals.get("EUR_NEU") or 0
    africa = vals.get("AFR") or 0
    asia = vals.get("ASI") or 0
    americas = (vals.get("AME_N") or 0) + (vals.get("AME_X_N") or 0) + (vals.get("OCE") or 0) + (
        vals.get("UNK") or 0
    ) + (vals.get("OTH") or 0)
    pct = lambda n: round(100.0 * n / total, 2)
    return int(round(total)), {
        "native": pct(nat),
        "other_eu": pct(other_eu),
        "europe": pct(europe),
        "africa": pct(africa),
        "asia": pct(asia),
        "americas": pct(americas),
    }


def nuts_level(code: str) -> int | None:
    if not code or code.endswith("Z") or "ZZ" in code:
        return None
    if len(code) == 3:
        return 1
    if len(code) == 4:
        return 2
    if len(code) == 5:
        return 3
    return None


def parent_code(code: str, parent_len: int) -> str | None:
    if len(code) <= parent_len:
        return None
    return code[:parent_len]


def round_geom(geom: dict, ndigits: int = 3) -> dict:
    def round_coords(coords):
        if not coords:
            return coords
        if isinstance(coords[0], (int, float)):
            return [round(float(coords[0]), ndigits), round(float(coords[1]), ndigits)]
        out = []
        prev = None
        for c in coords:
            rc = round_coords(c)
            if rc != prev:
                out.append(rc)
                prev = rc
        return out

    return {"type": geom["type"], "coordinates": round_coords(geom["coordinates"])}


def write_geo(path: Path, features: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fc = {"type": "FeatureCollection", "features": features}
    path.write_text(json.dumps(fc, ensure_ascii=False, separators=(",", ":")))
    print(f"  wrote {path.relative_to(ROOT)} ({path.stat().st_size/1024:.0f} KB, {len(features)} feats)")


def clean_feature(feat: dict, code: str, name: str, slug: str) -> dict:
    return {
        "type": "Feature",
        "id": code,
        "properties": {"id": code, "code": code, "name": name, "slug": slug},
        "geometry": round_geom(feat["geometry"], 3),
    }


def build_eurostat(stat: dict, nuts_geo: dict[int, dict]) -> list[dict]:
    catalog = []
    geo_labels = stat["dimension"]["geo"]["category"]["label"]
    cob_ids = list(stat["dimension"]["c_birth"]["category"]["index"])

    for iso2, (iso3, slug, name) in COUNTRIES.items():
        if iso2 == "DK":
            continue  # Denmark uses DST kommuner
        levels = LEVEL_LABELS.get(iso2)
        if not levels:
            continue

        areas_by_level: dict[str, dict] = {}
        for level_id, _short, _kind in levels:
            n = int(level_id[-1])
            areas_by_level[level_id] = {}

            # parent field
            parent_level = None
            if len(levels) == 2 and level_id == levels[1][0]:
                parent_level = levels[0][0]
            parent_n = int(parent_level[-1]) if parent_level else None

            for code, label in geo_labels.items():
                if not code.startswith(iso2):
                    continue
                if nuts_level(code) != n:
                    continue
                vals = {cb: eurostat_get(stat, cb, code) for cb in cob_ids}
                parsed = shares_from_cob(vals)
                if not parsed:
                    continue
                pop, shares = parsed
                rec = {
                    "code": code,
                    "name": label,
                    "slug": slugify(label) or code.lower(),
                    "population": pop,
                    "shares": shares,
                }
                if parent_n:
                    rec["parent"] = parent_code(code, 2 + parent_n)  # DE + NUTS1 is 3 chars
                    # NUTS1 codes are 3 chars (DE1), NUTS2 4 (DE11), NUTS3 5
                    rec["parent"] = code[: 2 + parent_n]
                areas_by_level[level_id][code] = rec

        # Require a decent fine layer
        fine_id = levels[-1][0]
        if len(areas_by_level.get(fine_id, {})) < 5:
            print(f"  skip {iso2}: only {len(areas_by_level.get(fine_id, {}))} {fine_id}")
            continue

        nat_vals = {cb: eurostat_get(stat, cb, iso2) for cb in cob_ids}
        national = shares_from_cob(nat_vals)
        if not national:
            print(f"  skip {iso2}: no national total")
            continue
        nat_pop, nat_shares = national

        # Geo
        for level_id, _short, _kind in levels:
            n = int(level_id[-1])
            feats = []
            for feat in nuts_geo[n]["features"]:
                p = feat.get("properties") or {}
                if p.get("CNTR_CODE") != iso2:
                    continue
                code = p.get("NUTS_ID")
                if not code or code not in areas_by_level[level_id]:
                    continue
                rec = areas_by_level[level_id][code]
                feats.append(clean_feature(feat, code, rec["name"], rec["slug"]))
            write_geo(OUT_GEO / f"{iso3.lower()}-{level_id}.json", feats)

        payload = {
            "source": "Eurostat Census 2021 — population by country of birth (cens_21cob_r3)",
            "sourceUrl": "https://ec.europa.eu/eurostat/databrowser/view/cens_21cob_r3",
            "year": 2021,
            "unit": "%",
            "national": {"population": nat_pop, "shares": nat_shares},
            "areas": areas_by_level,
        }
        dest = OUT_DATA / f"{iso3.lower()}.json"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
        print(f"  wrote {dest.relative_to(ROOT)} national {nat_shares['native']}% native")

        catalog.append(
            {
                "slug": slug,
                "iso3": iso3,
                "iso2": iso2,
                "name": name,
                "kicker": "Census 2021",
                "title": "Country of birth",
                "year": 2021,
                "source": payload["source"],
                "sourceUrl": payload["sourceUrl"],
                "nationalLabel": name,
                "topicLabel": "Country of birth",
                "groups": EU_GROUPS,
                "levels": [
                    {
                        "id": lid,
                        "label": lab,
                        "kind": kind,
                        "geoUrl": f"/geo/census/{iso3.lower()}-{lid}.json",
                    }
                    for lid, lab, kind in levels
                ],
                "dataUrl": f"/data/census/{iso3.lower()}.json",
                "fitMaxZoom": 7.2 if iso2 in {"MT", "LU"} else 6.2 if iso2 in {"NL", "BE", "CH", "AT"} else 5.6,
            }
        )
    return catalog


def dst_jsonstat_get(ds: dict, omrade: str, herkomst: str) -> float:
    ids = ds["dimension"]["id"]
    size = ds["dimension"]["size"]
    coords = []
    for dim in ids:
        cat = ds["dimension"][dim]["category"]["index"]
        if dim == "OMRÅDE":
            coords.append(cat[omrade])
        elif dim == "HERKOMST":
            coords.append(cat[herkomst])
        else:
            coords.append(0)
    flat = 0
    for i, c in enumerate(coords):
        mul = 1
        for s in size[i + 1 :]:
            mul *= s
        flat += c * mul
    vals = ds["value"]
    v = vals[flat] if isinstance(vals, list) else vals.get(str(flat))
    return float(v or 0)


def build_denmark(folk: dict, kom_geo: dict) -> dict:
    ds = folk["dataset"]
    omr = ds["dimension"]["OMRÅDE"]["category"]
    labels = omr["label"]

    def row(code: str) -> tuple[int, dict[str, float]]:
        tot = dst_jsonstat_get(ds, code, "TOT")
        danish = dst_jsonstat_get(ds, code, "5")
        imm = dst_jsonstat_get(ds, code, "4")
        desc = dst_jsonstat_get(ds, code, "3")
        if tot <= 0:
            tot = danish + imm + desc
        pct = lambda n: round(100.0 * n / tot, 2) if tot else 0.0
        return int(round(tot)), {
            "danish": pct(danish),
            "immigrant": pct(imm),
            "descendant": pct(desc),
        }

    regions: dict[str, dict] = {}
    kommuner: dict[str, dict] = {}
    national = None

    REGION_DST = {"081", "082", "083", "084", "085"}
    for code, name in labels.items():
        if code == "000":
            pop, shares = row(code)
            national = {"population": pop, "shares": shares}
            continue
        pop, shares = row(code)
        rec = {
            "code": code,
            "name": name.replace("Region ", ""),
            "slug": slugify(name.replace("Region ", "")),
            "population": pop,
            "shares": shares,
        }
        if code in REGION_DST:
            regions[code] = rec
        else:
            kommuner[code] = rec

    # parent region from geojson
    kode_to_region = {}
    feats_kom = []
    feats_reg_names: dict[str, list] = defaultdict(list)
    for feat in kom_geo["features"]:
        p = feat["properties"]
        kode = str(p["kode"]).lstrip("0") or "0"
        # DST uses 101; geojson 0101
        dst_code = str(int(p["kode"]))
        rk = str(p.get("regionskode") or "")
        # 1084 -> 084
        dst_region = rk[-3:] if len(rk) >= 3 else rk
        if dst_code in kommuner:
            kommuner[dst_code]["parent"] = dst_region
            rec = kommuner[dst_code]
            feats_kom.append(
                clean_feature(feat, dst_code, rec["name"], rec["slug"])
            )
        kode_to_region[dst_code] = dst_region
        feats_reg_names[dst_region].append(feat)

    # Region polygons: dissolve by union of kommuner is heavy; use NUTS2 from GISCO instead
    # DST region codes 084=Hovedstaden=DK01, 085=Sjælland=DK02, 083=Syddanmark=DK03,
    # 082=Midtjylland=DK04, 081=Nordjylland=DK05
    dst_to_nuts2 = {
        "084": "DK01",
        "085": "DK02",
        "083": "DK03",
        "082": "DK04",
        "081": "DK05",
    }

    payload = {
        "source": "Statistics Denmark — FOLK1C population by ancestry, 1 July 2026 (2026K2)",
        "sourceUrl": "https://www.statistikbanken.dk/FOLK1C",
        "year": 2026,
        "unit": "%",
        "national": national,
        "areas": {"region": regions, "kommune": kommuner},
        "nuts2ByRegion": dst_to_nuts2,
    }
    dest = OUT_DATA / "dnk.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
    print(f"  wrote {dest.relative_to(ROOT)} kommuner={len(kommuner)} regions={len(regions)}")
    write_geo(OUT_GEO / "dnk-kommune.json", feats_kom)
    return {
        "slug": "denmark",
        "iso3": "DNK",
        "iso2": "DK",
        "name": "Denmark",
        "kicker": "Statistics Denmark 2026",
        "title": "Ancestry",
        "year": 2026,
        "source": payload["source"],
        "sourceUrl": payload["sourceUrl"],
        "nationalLabel": "Denmark",
        "topicLabel": "Ancestry",
        "groups": DK_GROUPS,
        "levels": [
            {
                "id": "region",
                "label": "Region",
                "kind": "Regions",
                "geoUrl": "/geo/census/dnk-region.json",
            },
            {
                "id": "kommune",
                "label": "Kommune",
                "kind": "Municipalities",
                "geoUrl": "/geo/census/dnk-kommune.json",
            },
        ],
        "dataUrl": "/data/census/dnk.json",
        "fitMaxZoom": 8.2,
    }


def attach_dk_regions(nuts2: dict, dk_entry: dict) -> None:
    """Write dnk-region.json from GISCO NUTS 2, remapped to DST region codes."""
    dst_to_nuts2 = {
        "084": "DK01",
        "085": "DK02",
        "083": "DK03",
        "082": "DK04",
        "081": "DK05",
    }
    nuts2_to_dst = {v: k for k, v in dst_to_nuts2.items()}
    dnk_data = json.loads((OUT_DATA / "dnk.json").read_text())
    feats = []
    for feat in nuts2["features"]:
        p = feat.get("properties") or {}
        if p.get("CNTR_CODE") != "DK":
            continue
        nuts = p.get("NUTS_ID")
        dst = nuts2_to_dst.get(nuts)
        if not dst or dst not in dnk_data["areas"]["region"]:
            continue
        rec = dnk_data["areas"]["region"][dst]
        feats.append(clean_feature(feat, dst, rec["name"], rec["slug"]))
    write_geo(OUT_GEO / "dnk-region.json", feats)


def main() -> None:
    cache = Path("/tmp/birthrate-census")
    cache.mkdir(exist_ok=True)
    OUT_GEO.mkdir(parents=True, exist_ok=True)
    OUT_DATA.mkdir(parents=True, exist_ok=True)

    print("Eurostat cob…")
    stat = fetch_json(EUROSTAT_URL, cache / "cob.json")
    print("GISCO NUTS…")
    nuts = {n: fetch_json(url, cache / f"nuts{n}.geojson") for n, url in NUTS_URL.items()}

    print("Eurostat countries…")
    catalog = build_eurostat(stat, nuts)

    print("Denmark FOLK1C…")
    folk = post_json(
        DST_URL,
        {
            "table": "FOLK1C",
            "format": "JSONSTAT",
            "variables": [
                {"code": "OMRÅDE", "values": ["*"]},
                {"code": "KØN", "values": ["TOT"]},
                {"code": "ALDER", "values": ["IALT"]},
                {"code": "HERKOMST", "values": ["TOT", "5", "4", "3"]},
                {"code": "IELAND", "values": ["0000"]},
                {"code": "Tid", "values": ["2026K2"]},
            ],
        },
    )
    print("Denmark kommuner geo…")
    kom_geo = fetch_json(DK_KOM_URL, cache / "dk-kom.json")
    dk = build_denmark(folk, kom_geo)
    attach_dk_regions(nuts[2], dk)
    catalog.insert(0, dk)

    print("Russia VPN-2020 ethnicity…")
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from build_russia_census_map import build_russia

    catalog.append(build_russia())

    # UK is wired in TypeScript from the existing ONS files.
    catalog.append(
        {
            "slug": "uk",
            "iso3": "GBR",
            "iso2": "UK",
            "name": "United Kingdom",
            "kicker": "UK Census 2021",
            "title": "Ethnic group",
            "year": 2021,
            "source": "ONS Census 2021 (TS021)",
            "sourceUrl": "https://www.ons.gov.uk/datasets/TS021/editions/2021/versions/3",
            "nationalLabel": "England & Wales",
            "topicLabel": "Ethnic group",
            "builtin": "uk",
            "groups": [],
            "levels": [],
            "dataUrl": "",
            "fitMaxZoom": 9.5,
        }
    )

    featured = ["denmark", "germany", "spain", "russia", "france", "italy", "uk"]
    catalog.sort(
        key=lambda c: (
            featured.index(c["slug"]) if c["slug"] in featured else 50,
            c["name"],
        )
    )
    OUT_CATALOG.parent.mkdir(parents=True, exist_ok=True)
    OUT_CATALOG.write_text(
        json.dumps({"countries": catalog}, ensure_ascii=False, indent=2) + "\n"
    )
    print(f"catalog {len(catalog)} countries -> {OUT_CATALOG.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
