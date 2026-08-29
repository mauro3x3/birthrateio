#!/usr/bin/env python3
"""Build compact labeled-map GeoJSON + catalog from official TFR sources."""

from __future__ import annotations

import json
import math
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEO_IN = ROOT / "public" / "geo"
GEO_OUT = ROOT / "public" / "geo" / "maps"
CATALOG = ROOT / "src" / "lib" / "data" / "subnational-maps.json"
ADMIN1 = ROOT / "src" / "lib" / "data" / "admin1-demographics.json"
EUROSTAT = ROOT / ".tmp-eurostat-find3.json"

# MHLW Vital Statistics 2024 (final) — TFR by prefecture.
# Source: 令和６年人口動態統計月報年計 / 令和７年概況 comparison table.
JAPAN_TFR_2024 = {
    "Hokkaido": 1.01,
    "Aomori": 1.14,
    "Iwate": 1.09,
    "Miyagi": 1.00,
    "Akita": 1.04,
    "Yamagata": 1.17,
    "Fukushima": 1.15,
    "Ibaraki": 1.16,
    "Tochigi": 1.15,
    "Gunma": 1.20,
    "Saitama": 1.09,
    "Chiba": 1.09,
    "Tokyo": 0.96,
    "Kanagawa": 1.08,
    "Niigata": 1.14,
    "Toyama": 1.29,
    "Ishikawa": 1.23,
    "Fukui": 1.46,
    "Yamanashi": 1.26,
    "Nagano": 1.30,
    "Gifu": 1.27,
    "Shizuoka": 1.19,
    "Aichi": 1.22,
    "Mie": 1.24,
    "Shiga": 1.32,
    "Kyoto": 1.05,
    "Osaka": 1.14,
    "Hyogo": 1.23,
    "Nara": 1.19,
    "Wakayama": 1.24,
    "Tottori": 1.43,
    "Shimane": 1.43,
    "Okayama": 1.27,
    "Hiroshima": 1.29,
    "Yamaguchi": 1.36,
    "Tokushima": 1.32,
    "Kagawa": 1.36,
    "Ehime": 1.28,
    "Kochi": 1.25,
    "Fukuoka": 1.22,
    "Saga": 1.41,
    "Nagasaki": 1.39,
    "Kumamoto": 1.39,
    "Oita": 1.37,
    "Miyazaki": 1.43,
    "Kagoshima": 1.38,
    "Okinawa": 1.54,
}

# KOSTAT / KOSIS population trends survey DT_1B81A21, 2024.
KOREA_TFR_2024 = {
    "Seoul": 0.581,
    "Busan": 0.683,
    "Gwangju": 0.699,
    "Daegu": 0.754,
    "Incheon": 0.762,
    "Gyeonggi": 0.789,
    "Daejeon": 0.792,
    "North Jeolla": 0.808,
    "South Gyeongsang": 0.820,
    "Jeju": 0.826,
    "Ulsan": 0.859,
    "North Chungcheong": 0.882,
    "South Chungcheong": 0.883,
    "Gangwon": 0.889,
    "North Gyeongsang": 0.897,
    "South Jeolla": 1.028,
    "Sejong": 1.028,
}

# ABS Births, Australia, 2023 — TFR by state/territory.
AUSTRALIA_TFR_2023 = {
    "New South Wales": 1.55,
    "Victoria": 1.39,
    "Queensland": 1.54,
    "South Australia": 1.50,
    "Western Australia": 1.57,
    "Tasmania": 1.51,
    "Northern Territory": 1.55,
    "Australian Capital Territory": 1.31,
}

# ABS ERP June 2001 vs June 2024 (National, state and territory population).
AUSTRALIA_POP = {
    "New South Wales": (6_575_217, 8_545_206),
    "Victoria": (4_804_726, 6_980_632),
    "Queensland": (3_628_708, 5_560_532),
    "South Australia": (1_511_728, 1_891_722),
    "Western Australia": (1_901_159, 2_965_574),
    "Tasmania": (471_795, 573_329),
    "Northern Territory": (197_768, 252_473),
    "Australian Capital Territory": (319_317, 469_200),
}

# Statistics Canada, The Daily 24 Sep 2025 — TFR 2024.
# NB / NL / Yukon were not itemised in the Daily; 2023 values from table 13-10-0418
# are used for those three (marked in sourceNote).
CANADA_TFR_2024 = {
    "British Columbia": 1.02,
    "Nova Scotia": 1.08,
    "Prince Edward Island": 1.10,
    "Newfoundland and Labrador": 1.18,  # 2023
    "Ontario": 1.21,
    "New Brunswick": 1.26,  # 2023
    "Yukon": 1.28,  # 2023
    "Quebec": 1.34,
    "Northwest Territories": 1.39,
    "Alberta": 1.41,
    "Manitoba": 1.50,
    "Saskatchewan": 1.58,
    "Nunavut": 2.34,
}

# BirthGauge 2023 provincial TFR estimates (NBS does not publish annual
# provincial TFR). Table as mapped by GeoCurrents from BirthGauge's regional
# figures; Taiwan / Hong Kong / Macao are headline comparators, not fills.
# https://www.geocurrents.info/blog/2025/01/13/mapping-chinas-debated-fertility-figures/
CHINA_TFR_2023 = {
    "Beijing": 0.72,
    "Tianjin": 0.73,
    "Hebei": 0.92,
    "Shanxi": 0.95,
    "Inner Mongolia": 0.74,
    "Liaoning": 0.75,
    "Jilin": 0.71,
    "Heilongjiang": 0.62,
    "Shanghai": 0.61,
    "Jiangsu": 0.78,
    "Zhejiang": 0.99,
    "Anhui": 0.98,
    "Fujian": 0.89,
    "Jiangxi": 1.06,
    "Shandong": 1.05,
    "Henan": 1.12,
    "Hubei": 0.87,
    "Hunan": 1.01,
    "Guangdong": 1.12,
    "Guangxi": 1.43,
    "Hainan": 1.45,
    "Chongqing": 0.93,
    "Sichuan": 1.07,
    "Guizhou": 1.72,
    "Yunnan": 1.31,
    "Tibet": 1.97,
    "Shaanxi": 0.95,
    "Gansu": 1.28,
    "Qinghai": 1.34,
    "Ningxia": 1.51,
    "Xinjiang": 1.13,
}

NUTS_COUNTRIES = {
    "IT": {"iso3": "ITA", "name": "Italy", "kind": "region"},
    "ES": {"iso3": "ESP", "name": "Spain", "kind": "autonomous community"},
    "FR": {"iso3": "FRA", "name": "France", "kind": "region"},
    "TR": {"iso3": "TUR", "name": "Türkiye", "kind": "region"},
    "PL": {"iso3": "POL", "name": "Poland", "kind": "voivodeship"},
    "NL": {"iso3": "NLD", "name": "Netherlands", "kind": "province"},
    "AT": {"iso3": "AUT", "name": "Austria", "kind": "Land"},
    "PT": {"iso3": "PRT", "name": "Portugal", "kind": "region"},
    "SE": {"iso3": "SWE", "name": "Sweden", "kind": "region"},
    "CZ": {"iso3": "CZE", "name": "Czechia", "kind": "region"},
    "BE": {"iso3": "BEL", "name": "Belgium", "kind": "province"},
    "EL": {"iso3": "GRC", "name": "Greece", "kind": "region"},
    "HU": {"iso3": "HUN", "name": "Hungary", "kind": "region"},
    "RO": {"iso3": "ROU", "name": "Romania", "kind": "region"},
    "BG": {"iso3": "BGR", "name": "Bulgaria", "kind": "region"},
    "DK": {"iso3": "DNK", "name": "Denmark", "kind": "region"},
    "FI": {"iso3": "FIN", "name": "Finland", "kind": "region"},
    "SK": {"iso3": "SVK", "name": "Slovakia", "kind": "region"},
    "HR": {"iso3": "HRV", "name": "Croatia", "kind": "region"},
    "IE": {"iso3": "IRL", "name": "Ireland", "kind": "region"},
}


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "region"


def norm_name(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower()
    text = re.sub(r"\b(prefecture|province|region|oblast|krai|republic)\b", "", text)
    text = re.sub(r"[^a-z0-9]+", " ", text).strip()
    return text


def simplify_coords(coords, max_pts: int = 80):
    if not coords:
        return coords
    if isinstance(coords[0], (int, float)):
        return coords
    if isinstance(coords[0][0], (int, float)):
        n = len(coords)
        if n <= max_pts:
            return coords
        step = max(1, math.floor(n / max_pts))
        out = coords[::step]
        if out[-1] != coords[-1]:
            out.append(coords[-1])
        return out
    return [simplify_coords(c, max_pts) for c in coords]


def polygon_area(rings) -> float:
    if not rings or not rings[0]:
        return 0.0
    ring = rings[0]
    if not ring or not isinstance(ring[0][0], (int, float)):
        return 0.0
    a = 0.0
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        a += x1 * y2 - x2 * y1
    return abs(a) / 2.0


def keep_mainlands(geom: dict, max_polys: int = 4) -> dict:
    """Drop tiny islands/holes so poster maps stay small."""
    gtype = geom.get("type")
    coords = geom.get("coordinates")
    if gtype == "Polygon" and coords:
        return {"type": "Polygon", "coordinates": [coords[0]]}
    if gtype == "MultiPolygon" and coords:
        ranked = sorted(coords, key=polygon_area, reverse=True)[:max_polys]
        cleaned = [[poly[0]] for poly in ranked if poly]
        if len(cleaned) == 1:
            return {"type": "Polygon", "coordinates": cleaned[0]}
        return {"type": "MultiPolygon", "coordinates": cleaned}
    return geom


def simplify_feature(feat: dict, max_pts: int = 60) -> dict:
    geom = feat.get("geometry") or {}
    geom = keep_mainlands(geom)
    coords = geom.get("coordinates")
    if coords is None:
        return feat
    return {
        "type": "Feature",
        "id": feat.get("id"),
        "properties": feat.get("properties") or {},
        "geometry": {
            "type": geom.get("type"),
            "coordinates": simplify_coords(coords, max_pts),
        },
    }


def write_geo(map_id: str, features: list[dict]) -> str:
    rel = f"/geo/maps/{map_id}.json"
    path = ROOT / "public" / rel.lstrip("/")
    path.parent.mkdir(parents=True, exist_ok=True)
    fc = {"type": "FeatureCollection", "features": [simplify_feature(f) for f in features]}
    path.write_text(json.dumps(fc, separators=(",", ":")), encoding="utf-8")
    return rel


def match_value(name: str, table: dict[str, float]) -> float | None:
    n = norm_name(name)
    for k, v in table.items():
        if norm_name(k) == n:
            return v
    for k, v in table.items():
        kn = norm_name(k)
        if kn in n or n in kn:
            return v
    return None


def features_from_gb(iso3: str, table: dict[str, float], slug_prefix: str):
    raw = json.loads((GEO_OUT / f"admin1-{iso3}.geojson").read_text())
    seen = set()
    out = []
    regions = []
    for feat in raw["features"]:
        name = feat["properties"]["shapeName"]
        if name in seen and iso3 == "IRN":
            continue
        seen.add(name)
        if name == "Other Territories":
            continue
        value = match_value(name, table)
        slug = f"{slug_prefix}-{slugify(name)}"
        feat = {
            **feat,
            "id": slug,
            "properties": {"name": name, "slug": slug, "iso3": iso3},
        }
        out.append(feat)
        regions.append({"id": slug, "slug": slug, "name": name, "value": value})
    return out, regions


def eurostat_nuts2():
    d = json.loads(EUROSTAT.read_text())
    sizes = d["size"]
    dim = d["dimension"]
    geo_idx = dim["geo"]["category"]["index"]
    geo_lab = dim["geo"]["category"]["label"]
    time_idx = dim["time"]["category"]["index"]
    indic_idx = dim["indic_de"]["category"]["index"]
    unit_idx = dim["unit"]["category"]["index"]
    values = d["value"]
    times = list(time_idx.keys())

    def pos(geo, year):
        i = indic_idx["TOTFERRT"]
        u = unit_idx["NR"]
        g = geo_idx[geo]
        t = time_idx[year]
        n_time, n_geo, n_unit = sizes[4], sizes[3], sizes[2]
        return ((i * n_unit + u) * n_geo + g) * n_time + t

    latest = {}
    nuts0 = {}
    for geo in geo_idx:
        rec = None
        for y in reversed(times):
            p = pos(geo, y)
            v = values.get(str(p), values.get(p))
            if v is not None:
                rec = (float(v), y, geo_lab.get(geo, geo))
                break
        if rec is None:
            continue
        if len(geo) == 2:
            nuts0[geo] = rec
        elif len(geo) == 4:
            latest[geo] = rec
    return latest, nuts0


def existing_admin1(iso3: str):
    data = json.loads(ADMIN1.read_text())
    geo = json.loads((GEO_IN / f"admin1-{iso3.lower()}.json").read_text())
    fert = data["fertility"]
    regions = []
    by_slug = {}
    year = None
    for div in data["divisions"]:
        if div["iso3"] != iso3:
            continue
        series = fert.get(div["slug"]) or []
        if not series:
            continue
        last = series[-1]
        year = last["year"]
        rec = {
            "id": div["slug"],
            "slug": div["slug"],
            "name": div["name"],
            "value": last["value"],
        }
        regions.append(rec)
        by_slug[div["slug"]] = rec
    features = []
    for feat in geo["features"]:
        slug = (feat.get("properties") or {}).get("slug") or feat.get("id")
        if slug not in by_slug:
            continue
        features.append(feat)
    return features, regions, year


def main():
    maps = []

    # Existing seeded countries
    existing_meta = {
        "USA": {
            "name": "United States",
            "kind": "state",
            "year": 2023,
            "national": 1.62,
            "source": "NCHS National Vital Statistics Reports — Births: Final Data for 2023, Table 8 (TFR).",
            "sourceUrl": "https://www.cdc.gov/nchs/data/nvsr/nvsr74/nvsr74-1.pdf",
            "credit": None,
        },
        "DEU": {
            "name": "Germany",
            "kind": "Land",
            "year": 2024,
            "national": 1.35,
            "source": "Eurostat demo_r_find3 — total fertility rate by NUTS 1 region (Länder).",
            "sourceUrl": "https://ec.europa.eu/eurostat/databrowser/view/demo_r_find3",
            "credit": None,
        },
        "IND": {
            "name": "India",
            "kind": "state",
            "year": 2021,
            "national": 2.0,
            "source": "NFHS-5 (2019–21) total fertility rate by State/Union Territory, Ministry of Health and Family Welfare.",
            "sourceUrl": "https://www.mohfw.gov.in",
            "credit": None,
        },
        "CHN": {
            "name": "China",
            "kind": "province",
            "year": 2020,
            "national": 1.3,
            "source": "China 7th National Population Census (2020) — provincial total fertility rates, National Bureau of Statistics.",
            "sourceUrl": "https://www.stats.gov.cn",
            "credit": None,
        },
        "RUS": {
            "name": "Russia",
            "kind": "region",
            "year": 2025,
            "national": 1.4,
            "source": "Rosstat total fertility rate by federal subject.",
            "sourceUrl": "https://rosstat.gov.ru",
            "credit": None,
        },
    }
    for iso3, meta in existing_meta.items():
        features, regions, year = existing_admin1(iso3)
        map_id = f"{iso3.lower()}-tfr"
        geo_url = write_geo(map_id, features)
        vals = [r["value"] for r in regions if r["value"] is not None]
        maps.append(
            {
                "id": map_id,
                "iso3": iso3,
                "country": meta["name"],
                "title": f"Total fertility rate, {meta['name']} {year}",
                "metric": "tfr",
                "unit": "children per woman",
                "kind": meta["kind"],
                "year": year,
                "national": meta["national"],
                "source": meta["source"],
                "sourceUrl": meta["sourceUrl"],
                "credit": meta["credit"],
                "geoUrl": geo_url,
                "scale": "plasma",
                "labelValues": iso3 != "RUS",
                "regions": regions,
                "min": min(vals) if vals else None,
                "max": max(vals) if vals else None,
            }
        )

    chn_census = next(m for m in maps if m["id"] == "chn-tfr")
    chn_census["tab"] = "2020 census"
    missing = [r["name"] for r in chn_census["regions"] if r["name"] not in CHINA_TFR_2023]
    if missing:
        raise SystemExit(f"China 2023 TFR missing: {missing}")
    chn_2023_regions = [
        {**r, "value": CHINA_TFR_2023[r["name"]]} for r in chn_census["regions"]
    ]
    maps.append(
        {
            "id": "chn-tfr-2023",
            "iso3": "CHN",
            "country": "China",
            "title": "China TFR in 2023",
            "metric": "tfr",
            "unit": "children per woman",
            "kind": "province",
            "year": 2023,
            "national": 1.02,
            "source": "BirthGauge 2023 provincial TFR estimates. NBS does not publish annual provincial TFR; the 2020 census layer is the official NBS series.",
            "sourceUrl": "https://www.geocurrents.info/blog/2025/01/13/mapping-chinas-debated-fertility-figures/",
            "credit": "Provincial estimates compiled by BirthGauge (@BirthGauge).",
            "geoUrl": chn_census["geoUrl"],
            "scale": "diverging-tfr",
            "mid": 1.2,
            "labelValues": True,
            "tab": "2023",
            "highlights": [
                {"name": "Taiwan", "value": 0.86},
                {"name": "Hong Kong", "value": 0.75},
                {"name": "Macao", "value": 0.59},
            ],
            "regions": chn_2023_regions,
            "min": 0.6,
            "max": 2.0,
        }
    )

    curated = [
        (
            "JPN",
            "Japan",
            "prefecture",
            2024,
            1.15,
            JAPAN_TFR_2024,
            "japan",
            "Ministry of Health, Labour and Welfare, Vital Statistics of Japan 2024 (final) — total fertility rate by prefecture.",
            "https://www.mhlw.go.jp/toukei/saikin/hw/jinkou/kakutei24/index.html",
            None,
        ),
        (
            "KOR",
            "South Korea",
            "province",
            2024,
            0.75,
            KOREA_TFR_2024,
            "korea",
            "Statistics Korea (KOSTAT) / KOSIS population trends survey — 2024 total fertility rate by province and metropolitan city.",
            "https://kosis.kr",
            None,
        ),
        (
            "AUS",
            "Australia",
            "state",
            2023,
            1.50,
            AUSTRALIA_TFR_2023,
            "australia",
            "Australian Bureau of Statistics, Births, Australia, 2023 — total fertility rate by state and territory.",
            "https://www.abs.gov.au/statistics/people/population/births-australia/2023",
            None,
        ),
        (
            "CAN",
            "Canada",
            "province",
            2024,
            1.25,
            CANADA_TFR_2024,
            "canada",
            "Statistics Canada, The Daily, 24 September 2025 — total fertility rate 2024 by province and territory. Newfoundland and Labrador, New Brunswick and Yukon use 2023 (table 13-10-0418) where 2024 was not itemised in the Daily.",
            "https://www150.statcan.gc.ca/n1/daily-quotidien/250924/dq250924d-eng.htm",
            None,
        ),
    ]
    for iso3, country, kind, year, national, table, prefix, source, url, credit in curated:
        features, regions = features_from_gb(iso3, table, prefix)
        map_id = f"{iso3.lower()}-tfr"
        geo_url = write_geo(map_id, features)
        vals = [r["value"] for r in regions if r["value"] is not None]
        maps.append(
            {
                "id": map_id,
                "iso3": iso3,
                "country": country,
                "title": f"Total fertility rate, {country} {year}",
                "metric": "tfr",
                "unit": "children per woman",
                "kind": kind,
                "year": year,
                "national": national,
                "source": source,
                "sourceUrl": url,
                "credit": credit,
                "geoUrl": geo_url,
                "scale": "plasma",
                "labelValues": True,
                "regions": regions,
                "min": min(vals) if vals else None,
                "max": max(vals) if vals else None,
            }
        )

    # Australia population change
    features, _ = features_from_gb("AUS", AUSTRALIA_TFR_2023, "australia")
    regions = []
    for feat in features:
        name = feat["properties"]["name"]
        pair = AUSTRALIA_POP.get(name)
        if not pair:
            continue
        a, b = pair
        pct = (b - a) / a * 100
        regions.append(
            {
                "id": feat["properties"]["slug"],
                "slug": feat["properties"]["slug"],
                "name": name,
                "value": round(pct, 1),
            }
        )
    geo_url = write_geo("aus-popchange", features)
    vals = [r["value"] for r in regions]
    maps.append(
        {
            "id": "aus-popchange",
            "iso3": "AUS",
            "country": "Australia",
            "title": "Australia's population change since 2001",
            "metric": "pop-change",
            "unit": "% change",
            "kind": "state",
            "year": 2024,
            "yearFrom": 2001,
            "national": 40.0,
            "source": "Australian Bureau of Statistics, estimated resident population by state and territory, June 2001 and June 2024.",
            "sourceUrl": "https://www.abs.gov.au/statistics/people/population/national-state-and-territory-population",
            "credit": None,
            "geoUrl": geo_url,
            "scale": "diverging-growth",
            "mid": 0,
            "labelValues": True,
            "regions": regions,
            "min": min(vals),
            "max": max(vals),
        }
    )

    # Eurostat NUTS 2
    latest, nuts0 = eurostat_nuts2()
    nuts_geo = json.loads((GEO_OUT / "nuts2-eu.geojson").read_text())
    by_cc = defaultdict(list)
    for feat in nuts_geo["features"]:
        p = feat["properties"]
        cc = p.get("CNTR_CODE")
        nid = p.get("NUTS_ID")
        if cc in NUTS_COUNTRIES and nid in latest:
            by_cc[cc].append(feat)

    for cc, meta in NUTS_COUNTRIES.items():
        feats = by_cc.get(cc, [])
        if len(feats) < 3:
            continue
        # Drop overseas outliers that blow up the bounding box.
        def centroid_lnglat(feat):
            coords = feat["geometry"]["coordinates"]
            pts = []

            def walk(c):
                if isinstance(c, (int, float)):
                    return
                if c and isinstance(c[0], (int, float)):
                    pts.append((c[0], c[1]))
                    return
                for x in c:
                    walk(x)

            walk(coords)
            if not pts:
                return 0, 0
            return sum(x for x, _ in pts) / len(pts), sum(y for _, y in pts) / len(pts)

        lngs = [centroid_lnglat(f)[0] for f in feats]
        lats = [centroid_lnglat(f)[1] for f in feats]
        med_lng = sorted(lngs)[len(lngs) // 2]
        med_lat = sorted(lats)[len(lats) // 2]
        kept = []
        for f, lng, lat in zip(feats, lngs, lats):
            if abs(lng - med_lng) > 25 or abs(lat - med_lat) > 18:
                continue
            kept.append(f)
        feats = kept or feats
        regions = []
        years = []
        out_feats = []
        for feat in feats:
            nid = feat["properties"]["NUTS_ID"]
            val, year, label = latest[nid]
            years.append(int(year))
            name = feat["properties"].get("NUTS_NAME") or label
            slug = f"{meta['iso3'].lower()}-{slugify(nid)}"
            out_feats.append(
                {
                    **feat,
                    "id": slug,
                    "properties": {
                        "name": name,
                        "slug": slug,
                        "iso3": meta["iso3"],
                        "code": nid,
                    },
                }
            )
            regions.append({"id": slug, "slug": slug, "name": name, "value": val})
        year = max(years) if years else 2024
        vals = [r["value"] for r in regions]
        nat = nuts0.get(cc)
        national = round(nat[0], 2) if nat else (round(sum(vals) / len(vals), 2) if vals else None)
        map_id = f"{meta['iso3'].lower()}-tfr"
        geo_url = write_geo(map_id, out_feats)
        maps.append(
            {
                "id": map_id,
                "iso3": meta["iso3"],
                "country": meta["name"],
                "title": f"Total fertility rate, {meta['name']} {year}",
                "metric": "tfr",
                "unit": "children per woman",
                "kind": meta["kind"],
                "year": year,
                "national": national,
                "source": "Eurostat demo_r_find3 — total fertility rate by NUTS 2 region.",
                "sourceUrl": "https://ec.europa.eu/eurostat/databrowser/view/demo_r_find3",
                "credit": None,
                "geoUrl": geo_url,
                "scale": "plasma",
                "labelValues": len(regions) <= 36,
                "regions": regions,
                "min": min(vals),
                "max": max(vals),
            }
        )

    # Australia TFR and population change share one simplified geometry.
    aus_tfr_url = next(m["geoUrl"] for m in maps if m["id"] == "aus-tfr")
    for m in maps:
        if m["id"] == "aus-popchange":
            m["geoUrl"] = aus_tfr_url

    FEATURED = [
        "chn-tfr-2023",
        "jpn-tfr",
        "kor-tfr",
        "usa-tfr",
        "aus-tfr",
        "aus-popchange",
        "can-tfr",
        "ita-tfr",
        "esp-tfr",
        "fra-tfr",
        "tur-tfr",
    ]
    maps.sort(
        key=lambda m: (
            FEATURED.index(m["id"]) if m["id"] in FEATURED else 80,
            m["country"],
        )
    )
    CATALOG.parent.mkdir(parents=True, exist_ok=True)
    CATALOG.write_text(json.dumps({"maps": maps}, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(maps)} maps → {CATALOG}")
    for m in maps:
        n = sum(1 for r in m["regions"] if r["value"] is not None)
        print(f"  {m['id']:16} {n:3}/{len(m['regions'])}  {m['title']}")


if __name__ == "__main__":
    main()
