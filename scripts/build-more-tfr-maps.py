#!/usr/bin/env python3
"""Append official TFR choropleths without rewriting the existing catalog.

Country maps: DHS STATcompiler (subnational) and IBGE projections (Brazil).
Continental maps: World Bank WDI SP.DYN.TFRT.IN (national, latest year).
Geometry: Natural Earth 50m admin-0 / admin-1.
"""

from __future__ import annotations

import importlib.util
import sys
import json
import re
import ssl
import urllib.request
from collections import defaultdict
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "src" / "lib" / "data" / "subnational-maps.json"
GEO_OUT = ROOT / "public" / "geo" / "maps"
CACHE = ROOT / ".tmp-map-build"
CACHE.mkdir(exist_ok=True)

CTX = ssl.create_default_context()
UA = {"User-Agent": "birthrate.io/maps-builder"}

NE_ADMIN0 = (
    "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master"
    "/geojson/ne_50m_admin_0_countries.geojson"
)
NE_ADMIN1 = (
    "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master"
    "/geojson/ne_50m_admin_1_states_provinces.geojson"
)
WB_TFR = (
    "https://api.worldbank.org/v2/country/all/indicator/SP.DYN.TFRT.IN"
    "?format=json&mrnev=1&per_page=400"
)
DHS = "https://api.dhsprogram.com/rest/dhs/data"
IBGE_XLSX = (
    "https://ftp.ibge.gov.br/Projecao_da_Populacao/"
    "Projecao_da_Populacao_2024/projecoes_2024_tab4_indicadores.xlsx"
)

spec = importlib.util.spec_from_file_location(
    "subnational_build", ROOT / "scripts" / "build-subnational-maps.py"
)
bsm = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(bsm)

EU27 = [
    "AUT", "BEL", "BGR", "HRV", "CYP", "CZE", "DNK", "EST", "FIN", "FRA",
    "DEU", "GRC", "HUN", "IRL", "ITA", "LVA", "LTU", "LUX", "MLT", "NLD",
    "POL", "PRT", "ROU", "SVK", "SVN", "ESP", "SWE",
]
MENA = [
    "DZA", "BHR", "DJI", "EGY", "IRN", "IRQ", "ISR", "JOR", "KWT", "LBN",
    "LBY", "MRT", "MAR", "OMN", "PSE", "QAT", "SAU", "SOM", "SDN", "SYR",
    "TUN", "TUR", "ARE", "YEM",
]
CARIBBEAN = [
    "ATG", "BHS", "BRB", "CUB", "DMA", "DOM", "GRD", "HTI", "JAM", "KNA",
    "LCA", "VCT", "TTO", "PRI",
]
SOUTH_AMERICA = [
    "ARG", "BOL", "BRA", "CHL", "COL", "ECU", "GUY", "PRY", "PER", "SUR",
    "URY", "VEN",
]
SE_ASIA = [
    "BRN", "KHM", "IDN", "LAO", "MYS", "MMR", "PHL", "SGP", "THA", "TLS", "VNM",
]
CENTRAL_AMERICA = ["BLZ", "CRI", "SLV", "GTM", "HND", "NIC", "PAN"]
CENTRAL_ASIA = ["KAZ", "KGZ", "TJK", "TKM", "UZB"]
NORTH_AMERICA = ["CAN", "MEX", "USA"]
OCEANIA = [
    "AUS", "FJI", "KIR", "MHL", "FSM", "NRU", "NZL", "PLW", "PNG", "WSM",
    "SLB", "TON", "TUV", "VUT",
]
AFRICA = [
    "DZA", "AGO", "BEN", "BWA", "BFA", "BDI", "CMR", "CPV", "CAF", "TCD",
    "COM", "COD", "COG", "CIV", "DJI", "EGY", "GNQ", "ERI", "SWZ", "ETH",
    "GAB", "GMB", "GHA", "GIN", "GNB", "KEN", "LSO", "LBR", "LBY", "MDG",
    "MWI", "MLI", "MRT", "MUS", "MAR", "MOZ", "NAM", "NER", "NGA", "RWA",
    "STP", "SEN", "SYC", "SLE", "SOM", "ZAF", "SSD", "SDN", "TZA", "TGO",
    "TUN", "UGA", "ZMB", "ZWE",
]

DHS_MAPS = [
    {
        "survey": "NG2024DHS",
        "iso3": "NGA",
        "country": "Nigeria",
        "kind": "state",
        "prefix": "nigeria",
        "year": 2024,
        "source": "NPC/ICF, Nigeria Demographic and Health Survey 2023–24 — total fertility rate by state (STATcompiler FE_FRTR_W_TFR).",
        "sourceUrl": "https://www.statcompiler.com/en/",
        "note": "NDHS 2023–24 TFR for the three years before interview. Zone totals are omitted; states and FCT are drawn.",
    },
    {
        "survey": "KE2022DHS",
        "iso3": "KEN",
        "country": "Kenya",
        "kind": "county",
        "prefix": "kenya",
        "year": 2022,
        "source": "KNBS/ICF, Kenya Demographic and Health Survey 2022 — total fertility rate by county (STATcompiler FE_FRTR_W_TFR).",
        "sourceUrl": "https://www.statcompiler.com/en/",
        "note": "KDHS 2022 TFR for the three years before interview. Former provinces are omitted; the 47 counties are drawn.",
    },
    {
        "survey": "PH2022DHS",
        "iso3": "PHL",
        "country": "Philippines",
        "kind": "region",
        "prefix": "philippines",
        "year": 2022,
        "source": "PSA/ICF, Philippines National Demographic and Health Survey 2022 — total fertility rate by region (STATcompiler FE_FRTR_W_TFR).",
        "sourceUrl": "https://www.statcompiler.com/en/",
        "note": "NDHS 2022 TFR for the three years before interview. Island-group totals are omitted.",
    },
    {
        "survey": "ZA2016DHS",
        "iso3": "ZAF",
        "country": "South Africa",
        "kind": "province",
        "prefix": "south-africa",
        "year": 2016,
        "source": "Stats SA/NDOH/SAMRC/ICF, South Africa Demographic and Health Survey 2016 — total fertility rate by province (STATcompiler FE_FRTR_W_TFR).",
        "sourceUrl": "https://www.statcompiler.com/en/",
        "note": "SADHS 2016 TFR for the three years before interview. Northern Province is Limpopo.",
    },
    {
        "survey": "JO2023DHS",
        "iso3": "JOR",
        "country": "Jordan",
        "kind": "governorate",
        "prefix": "jordan",
        "year": 2023,
        "source": "DOS/ICF, Jordan Population and Family Health Survey 2023 — total fertility rate by governorate (STATcompiler FE_FRTR_W_TFR).",
        "sourceUrl": "https://www.statcompiler.com/en/",
        "note": "JPFHS 2023 TFR for the three years before interview. Region totals are omitted.",
    },
    {
        "survey": "AO2023DHS",
        "iso3": "AGO",
        "country": "Angola",
        "kind": "province",
        "prefix": "angola",
        "year": 2023,
        "source": "INE/ICF, Angola Demographic and Health Survey 2023–24 — total fertility rate by province (STATcompiler FE_FRTR_W_TFR).",
        "sourceUrl": "https://www.statcompiler.com/en/",
        "note": "ANDHS 2023–24 TFR for the three years before interview.",
    },
    {
        "survey": "NP2022DHS",
        "iso3": "NPL",
        "country": "Nepal",
        "kind": "province",
        "prefix": "nepal",
        "year": 2022,
        "source": "MOHP/ICF, Nepal Demographic and Health Survey 2022 — total fertility rate by province (STATcompiler FE_FRTR_W_TFR).",
        "sourceUrl": "https://www.statcompiler.com/en/",
        "note": "NDHS 2022 TFR for the three years before interview. Koshi and Madhesh are the official names of former Provinces 1 and 2.",
    },
    {
        "survey": "GH2022DHS",
        "iso3": "GHA",
        "country": "Ghana",
        "kind": "region",
        "prefix": "ghana",
        "year": 2022,
        "source": "GSS/ICF, Ghana Demographic and Health Survey 2022 — total fertility rate by region (STATcompiler FE_FRTR_W_TFR).",
        "sourceUrl": "https://www.statcompiler.com/en/",
        "note": "GDHS 2022 TFR for the three years before interview.",
    },
    {
        "survey": "TZ2022DHS",
        "iso3": "TZA",
        "country": "Tanzania",
        "kind": "region",
        "prefix": "tanzania",
        "year": 2022,
        "source": "NBS/OCGS/ICF, Tanzania Demographic and Health Survey 2022 — total fertility rate by region (STATcompiler FE_FRTR_W_TFR).",
        "sourceUrl": "https://www.statcompiler.com/en/",
        "note": "TDHS 2022 TFR for the three years before interview. Zone totals are omitted. Songwe (split from Mbeya in 2016) is omitted if the vintage geography has no Songwe polygon.",
    },
    {
        "survey": "BD2022DHS",
        "iso3": "BGD",
        "country": "Bangladesh",
        "kind": "division",
        "prefix": "bangladesh",
        "year": 2022,
        "source": "NIPORT/ICF, Bangladesh Demographic and Health Survey 2022 — total fertility rate by division (STATcompiler FE_FRTR_W_TFR).",
        "sourceUrl": "https://www.statcompiler.com/en/",
        "note": "BDHS 2022 TFR for the three years before interview.",
    },
    {
        "survey": "ZM2024DHS",
        "iso3": "ZMB",
        "country": "Zambia",
        "kind": "province",
        "prefix": "zambia",
        "year": 2024,
        "source": "Zambia Statistics Agency/ICF, Zambia Demographic and Health Survey 2024 — total fertility rate by province (STATcompiler FE_FRTR_W_TFR).",
        "sourceUrl": "https://www.statcompiler.com/en/",
        "note": "ZDHS 2024 TFR for the three years before interview.",
    },
    {
        "survey": "MW2024DHS",
        "iso3": "MWI",
        "country": "Malawi",
        "kind": "district",
        "prefix": "malawi",
        "year": 2024,
        "adm": "ADM2",
        "source": "NSO/ICF, Malawi Demographic and Health Survey 2024 — total fertility rate by region (STATcompiler FE_FRTR_W_TFR).",
        "sourceUrl": "https://www.statcompiler.com/en/",
        "note": "MDHS 2024 TFR for the three years before interview. Districts; city splits that are not on this vintage geography are omitted.",
    },
    {
        "survey": "ML2023DHS",
        "iso3": "MLI",
        "country": "Mali",
        "kind": "region",
        "prefix": "mali",
        "year": 2023,
        "source": "INSTAT/ICF, Mali Demographic and Health Survey 2023–24 — total fertility rate by region (STATcompiler FE_FRTR_W_TFR).",
        "sourceUrl": "https://www.statcompiler.com/en/",
        "note": "MDHS 2023–24 TFR for the three years before interview.",
    },
    {
        "survey": "SN2023DHS",
        "iso3": "SEN",
        "country": "Senegal",
        "kind": "region",
        "prefix": "senegal",
        "year": 2023,
        "source": "ANSD/ICF, Senegal Continuous Demographic and Health Survey 2023 — total fertility rate by region (STATcompiler FE_FRTR_W_TFR).",
        "sourceUrl": "https://www.statcompiler.com/en/",
        "note": "Senegal DHS 2023 TFR for the three years before interview.",
    },
    {
        "survey": "MZ2022DHS",
        "iso3": "MOZ",
        "country": "Mozambique",
        "kind": "province",
        "prefix": "mozambique",
        "year": 2022,
        "source": "INE/ICF, Mozambique Demographic and Health Survey 2022–23 — total fertility rate by province (STATcompiler FE_FRTR_W_TFR).",
        "sourceUrl": "https://www.statcompiler.com/en/",
        "note": "IMASIDA/DHS 2022–23 TFR for the three years before interview.",
    },
    {
        "survey": "KH2021DHS",
        "iso3": "KHM",
        "country": "Cambodia",
        "kind": "province",
        "prefix": "cambodia",
        "year": 2021,
        "source": "NIS/ICF, Cambodia Demographic and Health Survey 2021–22 — total fertility rate by province (STATcompiler FE_FRTR_W_TFR).",
        "sourceUrl": "https://www.statcompiler.com/en/",
        "note": "CDHS 2021–22 TFR for the three years before interview. Domain totals are omitted.",
    },
    {
        "survey": "BF2021DHS",
        "iso3": "BFA",
        "country": "Burkina Faso",
        "kind": "region",
        "prefix": "burkina-faso",
        "year": 2021,
        "source": "INSD/ICF, Burkina Faso Demographic and Health Survey 2021 — total fertility rate by region (STATcompiler FE_FRTR_W_TFR).",
        "sourceUrl": "https://www.statcompiler.com/en/",
        "note": "EMDS 2021 TFR for the three years before interview. Ouagadougou is published separately from Centre and is not a distinct polygon on this vintage geography.",
    },
    {
        "survey": "TJ2023DHS",
        "iso3": "TJK",
        "country": "Tajikistan",
        "kind": "region",
        "prefix": "tajikistan",
        "year": 2023,
        "source": "SA/ICF, Tajikistan Demographic and Health Survey 2023 — total fertility rate by region (STATcompiler FE_FRTR_W_TFR).",
        "sourceUrl": "https://www.statcompiler.com/en/",
        "note": "TjDHS 2023 TFR for the three years before interview.",
    },
]


def fetch(url: str, dest: Path | None = None) -> bytes:
    if dest and dest.exists() and dest.stat().st_size > 1000:
        return dest.read_bytes()
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=180, context=CTX) as r:
        data = r.read()
    if dest:
        dest.write_bytes(data)
    return data


def fetch_json(url: str, dest: Path | None = None):
    return json.loads(fetch(url, dest))


def iso_of(feat: dict) -> str | None:
    p = feat.get("properties") or {}
    for key in ("ISO_A3_EH", "ISO_A3", "ADM0_A3", "iso_a3", "adm0_a3"):
        v = p.get(key)
        if isinstance(v, str) and len(v) == 3 and v != "-99":
            return v.upper()
    return None


def admin1_name(feat: dict) -> str:
    p = feat.get("properties") or {}
    for key in ("shapeName", "PROVINSI", "name_en", "name", "NAME_1", "NAME", "woe_name"):
        v = p.get(key)
        if isinstance(v, str) and v.strip():
            return v.strip()
    return "Unknown"


def write_geo(map_id: str, features: list[dict], max_pts: int = 90) -> str:
    rel = f"/geo/maps/{map_id}.json"
    path = ROOT / "public" / rel.lstrip("/")
    path.parent.mkdir(parents=True, exist_ok=True)
    out = []
    for feat in features:
        props = dict(feat.get("properties") or {})
        pts = int(props.pop("_max_pts", max_pts))
        geom = feat.get("geometry") or {}
        geom = bsm.keep_mainlands(geom, max_polys=14 if pts >= 80 else 6)
        coords = geom.get("coordinates")
        out.append(
            {
                "type": "Feature",
                "id": feat.get("id"),
                "properties": props,
                "geometry": {
                    "type": geom.get("type"),
                    "coordinates": bsm.simplify_coords(coords, pts),
                },
            }
        )
    path.write_text(
        json.dumps({"type": "FeatureCollection", "features": out}, separators=(",", ":")),
        encoding="utf-8",
    )
    return rel


def catalog_entry(**kwargs):
    vals = [r["value"] for r in kwargs["regions"] if r.get("value") is not None]
    kwargs.setdefault("metric", "tfr")
    kwargs.setdefault("unit", "children per woman")
    kwargs.setdefault("credit", None)
    kwargs.setdefault("scale", "plasma")
    kwargs.setdefault("labelValues", len(kwargs["regions"]) <= 40)
    kwargs["min"] = round(min(vals), 2) if vals else None
    kwargs["max"] = round(max(vals), 2) if vals else None
    return kwargs


def dhs_leaves(recs: list[dict]) -> list[tuple[str, float]]:
    """Prefer STATcompiler child rows (`..State`); keep parents with no children."""
    skip = {"mountain", "hill", "terai"}
    rows = [
        (r.get("CharacteristicLabel") or "", r.get("Value"))
        for r in recs
        if r.get("Value") is not None
    ]
    by = {}
    for i, (lab, val) in enumerate(rows):
        nxt = rows[i + 1][0] if i + 1 < len(rows) else ""
        if lab.startswith(".."):
            name = re.sub(r"^\.+", "", lab).strip()
        elif nxt.startswith(".."):
            continue
        else:
            name = lab.strip()
        if bsm.norm_name(name) in skip:
            continue
        by[bsm.norm_name(name)] = (name, float(val))
    return list(by.values())


def geoboundaries_adm(iso3: str, level: str = "ADM1") -> list[dict]:
    meta = fetch_json(
        f"https://www.geoboundaries.org/api/current/gbOpen/{iso3}/{level}/",
        CACHE / f"gb-{iso3}-{level.lower()}-meta.json",
    )
    if isinstance(meta, list):
        meta = meta[0]
    url = (
        meta.get("simplifiedGeometryGeoJSON")
        or meta.get("gjDownloadURL")
    )
    gj = fetch_json(url, CACHE / f"gb-{iso3}-{level.lower()}.json")
    return gj.get("features") or []


def geoboundaries_adm1(iso3: str) -> list[dict]:
    return geoboundaries_adm(iso3, "ADM1")


ALIASES_COMMON = {
    "jarash": "jerash",
    "tafiela": "tafilah",
}
ALIASES_BY_ISO = {
    "BRA": {
        "distrito federal": "federal",
    },
    "ZAF": {
        "northern cape": "nothern cape",
        "northern": "limpopo",
        "kwazulu natal": "kwazulu natal",
        "western  cape": "western cape",
    },
    "PHL": {
        "national capital": "ncr",
        "cordillera administ": "car",
        "calabarazon": "calabarzon",
        "ilocos": "ilocos region",
        "bicol": "bicol region",
        "davao": "davao region",
        "barmm": "armm",
    },
    "NPL": {
        "koshi": "1",
        "madhesh": "2",
        "sudurpashchim": "sudurpaschim",
    },
    "NGA": {
        "fct abuja": "abuja federal capital territory",
        "federal capital territory": "abuja federal capital territory",
    },
    "IDN": {
        "di yogyakarta": "daerah istimewa yogyakarta",
        "dki jakarta": "dki jakarta",
        "kepulauan bangka belitung": "kepulauan bangka belitung",
    },
    "KEN": {
        "murang'a": "murang a",
        "elgeyo marakwet": "elgeyo marakwet",
        "tharaka-nithi": "tharaka",
        "trans-nzoia": "trans nzoia",
    },
    "GHA": {"northeast": "north east"},
    "BGD": {
        "barishal": "barisal",
        "chattogram": "chittagong",
        "rajshahi": "rajshani",
    },
    "MLI": {"koulikoro": "koulikouro"},
    "TZA": {
        "kaskazini unguja": "zanzibar north",
        "kusini unguja": "zanzibar south central",
        "mjini magharibi": "zanzibar urban west",
        "kaskazini pemba": "north pemba",
        "kusini pemba": "south pemba",
    },
    "KHM": {
        "banteay meanchey": "bantey meanchey",
        "tboung khmum": "tbong khmum",
        "stueng treng": "stung treng",
        "otdar mean chey": "oddar meanchey",
        "kaoh kong": "koh kong",
        "mondul kiri": "mondulkiri",
        "ratanak kiri": "ratanakiri",
    },
    "BFA": {"boucle de mouhoun": "boucle du mouhoun"},
    "TJK": {
        "gbao": "gorno badakhshan autonomous",
        "drs": "districts of republican subordination",
    },
}


def match_admin1(iso3: str, table: dict[str, float], feats: list[dict], prefix: str):
    aliases = {**ALIASES_COMMON, **ALIASES_BY_ISO.get(iso3, {})}
    by_norm: dict[str, dict] = {}
    keyed = False
    for feat in feats:
        p = feat.get("properties") or {}
        code = iso_of(feat) or str(p.get("adm0_a3") or p.get("ADM0_A3") or "").upper()
        if code and len(code) == 3 and code != iso3:
            continue
        keyed = True
        name = admin1_name(feat)
        by_norm[bsm.norm_name(name)] = feat
    if not keyed:
        for feat in feats:
            name = admin1_name(feat)
            by_norm[bsm.norm_name(name)] = feat

    out_feats = []
    regions = []
    matched = 0
    unmatched: list[str] = []
    for raw_name, value in table.items():
        key = bsm.norm_name(raw_name)
        if key in aliases:
            key = aliases[key]
        feat = by_norm.get(key)
        if feat is None and len(key) >= 5:
            for kn, f in by_norm.items():
                if key in kn or kn in key:
                    feat = f
                    break
        if feat is None:
            unmatched.append(raw_name)
            continue
        matched += 1
        name = admin1_name(feat)
        slug = f"{prefix}-{bsm.slugify(name)}"
        out_feats.append(
            {
                **feat,
                "id": slug,
                "properties": {"name": name, "slug": slug, "iso3": iso3},
            }
        )
        regions.append({"id": slug, "slug": slug, "name": name, "value": round(value, 2)})
    return out_feats, regions, matched, len(table), unmatched


def world_bank_tfr() -> dict[str, tuple[float, int, str]]:
    payload = fetch_json(WB_TFR, CACHE / "wb-tfr.json")
    out = {}
    for r in payload[1]:
        iso = (r.get("countryiso3code") or "").upper()
        if len(iso) != 3 or r.get("value") is None:
            continue
        out[iso] = (float(r["value"]), int(r["date"]), r["country"]["value"])
    return out


def dhs_national(survey: str) -> float | None:
    url = f"{DHS}?indicatorIds=FE_FRTR_W_TFR&surveyIds={survey}&breakdown=national&f=json"
    data = fetch_json(url)
    for r in data.get("Data", []):
        if r.get("Value") is not None:
            return float(r["Value"])
    return None


def dhs_subnational(survey: str) -> list[dict]:
    url = (
        f"{DHS}?indicatorIds=FE_FRTR_W_TFR&surveyIds={survey}"
        "&breakdown=subnational&f=json&perpage=1000"
    )
    return fetch_json(url, CACHE / f"dhs-{survey}.json").get("Data", [])


def brazil_ibge() -> tuple[float, dict[str, float]]:
    dest = CACHE / "ibge-tab4.xlsx"
    fetch(IBGE_XLSX, dest)
    df = pd.read_excel(dest, sheet_name=0, header=None)
    sub = df[(df[0] == 2023) & (df[1].astype(str).str.isdigit())]
    national = None
    table: dict[str, float] = {}
    for _, row in sub.iterrows():
        code = int(row[1])
        name = str(row[3]).strip()
        tft = float(row[38])
        if code == 0:
            national = round(tft, 2)
        elif code >= 11:
            table[name] = round(tft, 2)
    if national is None:
        raise SystemExit("IBGE 2023 Brazil TFT missing")
    return national, table


# BirthGauge 2024 state TFR (live births vs IBGE childbearing-age women).
# National 1.48. The IBGE 2024 revision table above is a 2023 projection (1.57).
BRAZIL_BIRTHGAUGE_2024 = {
    "Rondônia": 1.58,
    "Acre": 1.68,
    "Amazonas": 1.83,
    "Roraima": 2.00,
    "Pará": 1.63,
    "Amapá": 1.80,
    "Tocantins": 1.77,
    "Maranhão": 1.59,
    "Piauí": 1.52,
    "Ceará": 1.43,
    "Rio Grande do Norte": 1.38,
    "Paraíba": 1.55,
    "Pernambuco": 1.50,
    "Alagoas": 1.77,
    "Sergipe": 1.50,
    "Bahia": 1.40,
    "Minas Gerais": 1.40,
    "Espírito Santo": 1.65,
    "Rio de Janeiro": 1.30,
    "São Paulo": 1.40,
    "Paraná": 1.50,
    "Santa Catarina": 1.53,
    "Rio Grande do Sul": 1.41,
    "Mato Grosso do Sul": 1.62,
    "Mato Grosso": 1.85,
    "Goiás": 1.56,
    "Distrito Federal": 1.39,
    "Federal": 1.39,
}


# BPS BRS No. 51/05/Th. XXIX, 5 May 2026 — Lampiran 2 (TFR by province, SUPAS 2025).
BPS_IDN_TFR_2025 = {
    "Aceh": 2.36,
    "Sumatera Utara": 2.41,
    "Sumatera Barat": 2.39,
    "Riau": 2.21,
    "Jambi": 2.23,
    "Sumatera Selatan": 2.18,
    "Bengkulu": 2.27,
    "Lampung": 2.23,
    "Kepulauan Bangka Belitung": 2.20,
    "Kepulauan Riau": 2.17,
    "DKI Jakarta": 1.79,
    "Jawa Barat": 2.05,
    "Jawa Tengah": 2.05,
    "DI Yogyakarta": 1.84,
    "Jawa Timur": 1.95,
    "Banten": 1.96,
    "Bali": 2.02,
    "Nusa Tenggara Barat": 2.38,
    "Nusa Tenggara Timur": 2.72,
    "Kalimantan Barat": 2.25,
    "Kalimantan Tengah": 2.25,
    "Kalimantan Selatan": 2.26,
    "Kalimantan Timur": 2.09,
    "Kalimantan Utara": 2.28,
    "Sulawesi Utara": 2.07,
    "Sulawesi Tengah": 2.25,
    "Sulawesi Selatan": 2.17,
    "Sulawesi Tenggara": 2.48,
    "Gorontalo": 2.24,
    "Sulawesi Barat": 2.50,
    "Maluku": 2.44,
    "Maluku Utara": 2.38,
    "Papua Barat": 2.62,
    "Papua Barat Daya": 2.58,
    "Papua": 2.57,
    "Papua Selatan": 2.74,
    "Papua Tengah": 2.64,
    "Papua Pegunungan": 2.78,
}
IDN_38_GEO = (
    "https://raw.githubusercontent.com/denyherianto/"
    "indonesia-geojson-topojson-maps-with-38-provinces/main/"
    "GeoJSON/indonesia-38-provinces.geojson"
)


def indonesia_supas_geo() -> list[dict]:
    gj = fetch_json(IDN_38_GEO, CACHE / "idn-38-provinces.geojson")
    return gj.get("features") or []


def build_country_map(admin0: dict, iso_list: list[str], wb: dict, title: str, iso3: str, country: str, kind: str, note: str):
    feats = []
    regions = []
    years = []
    for feat in admin0["features"]:
        code = iso_of(feat)
        if code not in iso_list or code not in wb:
            continue
        val, year, name = wb[code]
        years.append(year)
        slug = f"{iso3.lower()}-{bsm.slugify(name)}"
        feats.append(
            {
                **feat,
                "id": slug,
                "properties": {"name": name, "slug": slug, "iso3": code},
            }
        )
        regions.append({"id": slug, "slug": slug, "name": name, "value": round(val, 2)})
    year = max(years) if years else 2024
    vals = [r["value"] for r in regions]
    geo_url = write_geo(f"{iso3.lower()}-tfr", feats, max_pts=70)
    aggregates = {"EU": "EUU"}
    national = None
    if iso3 in aggregates and aggregates[iso3] in wb:
        national = round(wb[aggregates[iso3]][0], 2)
    return catalog_entry(
        id=f"{iso3.lower()}-tfr",
        iso3=iso3,
        country=country,
        title=title.format(year=year),
        kind=kind,
        year=year,
        national=national,
        source="World Bank World Development Indicators, SP.DYN.TFRT.IN — total fertility rate (births per woman), latest year.",
        sourceUrl="https://data.worldbank.org/indicator/SP.DYN.TFRT.IN",
        geoUrl=geo_url,
        note=note,
        regions=regions,
        labelValues=len(regions) <= 30,
    )


def main():
    print("downloading Natural Earth…", flush=True)
    admin0 = fetch_json(NE_ADMIN0, CACHE / "ne50-admin0.json")
    admin1 = fetch_json(NE_ADMIN1, CACHE / "ne50-admin1.json")
    print("admin0", len(admin0["features"]), "admin1", len(admin1["features"]))
    wb = world_bank_tfr()
    print("world bank tfr", len(wb))

    new_maps = []

    print("Brazil BirthGauge 2024…")
    nat, bra_table = 1.48, BRAZIL_BIRTHGAUGE_2024
    feats, regions, n, tot, unmatched = match_admin1("BRA", bra_table, admin1["features"], "brazil")
    print(f"  BRA matched {n}/{tot}")
    if unmatched:
        print("    unmatched", unmatched)
    if n >= 20:
        new_maps.append(
            catalog_entry(
                id="bra-tfr",
                iso3="BRA",
                country="Brazil",
                title="Total fertility rate, Brazil 2024",
                kind="state",
                year=2024,
                national=nat,
                source="BirthGauge, Total Fertility Rate (Children per Woman), Brazil 2024 — state TFR from registered live births and IBGE women of childbearing age. National TFR 1.48.",
                sourceUrl="https://x.com/BirthGauge",
                geoUrl=write_geo("bra-tfr", feats, max_pts=80),
                note="2024 state TFR compiled by BirthGauge from births and the IBGE childbearing-age population. The IBGE 2024 population-projection TFT (1.57) is a 2023 estimate and is not used here.",
                regions=regions,
            )
        )

    print("Indonesia SUPAS 2025…")
    idn_feats, idn_regions, n, tot, unmatched = match_admin1(
        "IDN", BPS_IDN_TFR_2025, indonesia_supas_geo(), "indonesia"
    )
    print(f"  IDN SUPAS 2025 matched {n}/{tot}")
    if unmatched:
        print("    unmatched", unmatched)
    if n >= tot:
        new_maps.append(
            catalog_entry(
                id="idn-tfr",
                iso3="IDN",
                country="Indonesia",
                title="Total fertility rate, Indonesia 2025",
                kind="province",
                year=2025,
                national=2.13,
                source="BPS-Statistics Indonesia, Berita Resmi Statistik No. 51/05/Th. XXIX, 5 May 2026 — Lampiran 2, Angka Kelahiran Total (TFR) menurut provinsi, Hasil SUPAS 2025.",
                sourceUrl="https://www.bps.go.id/id/pressrelease/2026/05/05/2645/supas-2025--angka-kelahiran-total--tfr--sebesar-2-13---angka-kematian-bayi--imr--sebesar-14-12--dan-persentase-lansia-mencapai-11-97-persen-.html",
                geoUrl=write_geo("idn-tfr", idn_feats, max_pts=80),
                note="SUPAS 2025 TFR for 38 provinces, including the 2022 Papua splits. National TFR 2.13.",
                regions=idn_regions,
            )
        )

    for spec_map in DHS_MAPS:
        recs = dhs_subnational(spec_map["survey"])
        leaves = dhs_leaves(recs)
        table = {name: val for name, val in leaves}
        try:
            gb_feats = geoboundaries_adm(spec_map["iso3"], spec_map.get("adm", "ADM1"))
        except Exception as exc:
            print(f"  {spec_map['iso3']} geoBoundaries failed: {exc}")
            gb_feats = []
        source_feats = gb_feats or admin1["features"]
        feats, regions, n, tot, unmatched = match_admin1(
            spec_map["iso3"], table, source_feats, spec_map["prefix"]
        )
        print(f"  {spec_map['iso3']} {spec_map['survey']} matched {n}/{tot}")
        if unmatched:
            print("    unmatched", unmatched)
        min_ok = tot if tot <= 8 else max(int(round(tot * 0.85)), tot - 2)
        if n < min_ok:
            print("    skip (low match)")
            continue
        national = dhs_national(spec_map["survey"])
        new_maps.append(
            catalog_entry(
                id=f"{spec_map['iso3'].lower()}-tfr",
                iso3=spec_map["iso3"],
                country=spec_map["country"],
                title=f"Total fertility rate, {spec_map['country']} {spec_map['year']}",
                kind=spec_map["kind"],
                year=spec_map["year"],
                national=national,
                source=spec_map["source"],
                sourceUrl=spec_map["sourceUrl"],
                geoUrl=write_geo(f"{spec_map['iso3'].lower()}-tfr", feats, max_pts=80),
                note=spec_map.get("note"),
                regions=regions,
            )
        )

    regional = [
        (
            "EU",
            "European Union",
            "country",
            EU27,
            "Total fertility rate, European Union {year}",
            "National TFR from World Bank WDI (latest year). Not a NUTS map — each polygon is a member state. Overseas fragments of France can pull the frame; zoom in if needed.",
        ),
        (
            "MENA",
            "Middle East & North Africa",
            "country",
            MENA,
            "Total fertility rate, Middle East & North Africa {year}",
            "National TFR from World Bank WDI (latest year). Coverage follows common MENA membership, including Turkey.",
        ),
        (
            "CARIBBEAN",
            "Caribbean",
            "country",
            CARIBBEAN,
            "Total fertility rate, Caribbean {year}",
            "National TFR from World Bank WDI (latest year). Territories without a WDI series are omitted.",
        ),
        (
            "SOUTHAMERICA",
            "South America",
            "country",
            SOUTH_AMERICA,
            "Total fertility rate, South America {year}",
            "National TFR from World Bank WDI (latest year).",
        ),
        (
            "AFRICA",
            "Africa",
            "country",
            AFRICA,
            "Total fertility rate, Africa {year}",
            "National TFR from World Bank WDI (latest year). Colours are comparable within this map.",
        ),
        (
            "SEASIA",
            "Southeast Asia",
            "country",
            SE_ASIA,
            "Total fertility rate, Southeast Asia {year}",
            "National TFR from World Bank WDI (latest year).",
        ),
        (
            "CENTRALAMERICA",
            "Central America",
            "country",
            CENTRAL_AMERICA,
            "Total fertility rate, Central America {year}",
            "National TFR from World Bank WDI (latest year). Mexico is on the North America map.",
        ),
        (
            "CENTRALASIA",
            "Central Asia",
            "country",
            CENTRAL_ASIA,
            "Total fertility rate, Central Asia {year}",
            "National TFR from World Bank WDI (latest year).",
        ),
        (
            "NORTHAMERICA",
            "North America",
            "country",
            NORTH_AMERICA,
            "Total fertility rate, North America {year}",
            "National TFR from World Bank WDI (latest year) for Canada, Mexico and the United States.",
        ),
        (
            "OCEANIA",
            "Oceania",
            "country",
            OCEANIA,
            "Total fertility rate, Oceania {year}",
            "National TFR from World Bank WDI (latest year). Small island states without a WDI series are omitted.",
        ),
    ]
    for iso3, country, kind, members, title, note in regional:
        m = build_country_map(admin0, members, wb, title, iso3, country, kind, note)
        print(f"  {iso3} countries {len(m['regions'])}")
        new_maps.append(m)

    catalog = json.loads(CATALOG.read_text())
    managed = {m["id"] for m in new_maps}
    managed.update(f"{s['iso3'].lower()}-tfr" for s in DHS_MAPS)
    managed.update(
        {
            "bra-tfr",
            "idn-tfr",
            "eth-tfr",
            "eu-tfr",
            "mena-tfr",
            "caribbean-tfr",
            "southamerica-tfr",
            "africa-tfr",
            "seasia-tfr",
            "centralamerica-tfr",
            "centralasia-tfr",
            "northamerica-tfr",
            "oceania-tfr",
        }
    )
    maps = [m for m in catalog["maps"] if m["id"] not in managed]
    maps.extend(new_maps)
    CATALOG.write_text(json.dumps({"maps": maps}, indent=2) + "\n", encoding="utf-8")
    print(f"catalog now {len(maps)} maps (+{len(new_maps)})")
    for m in new_maps:
        n = sum(1 for r in m["regions"] if r["value"] is not None)
        print(f"  {m['id']:18} {n:3}/{len(m['regions'])}  {m['title']}")


if __name__ == "__main__":
    main()
