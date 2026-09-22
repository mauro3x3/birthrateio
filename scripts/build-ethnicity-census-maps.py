#!/usr/bin/env python3
"""Build ethnicity / race census maps for Brazil, Canada, and South Africa.

Brazil — IBGE Census 2022 cor ou raça by UF (state).
Canada — Statistics Canada 2021 Census visible minority by province/territory.
South Africa — Stats SA Census 2022 population group by province
              (figures via Wikipedia compilation of the official release).

Writes public/data/census/{bra,can,zaf}.json, copies geo from *-tfr.json,
and upserts census-maps-catalog.json. mapMode = share (official %).
"""

from __future__ import annotations

import csv
import html
import json
import re
import shutil
import urllib.request
import zipfile
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".cache" / "census"
CACHE.mkdir(parents=True, exist_ok=True)
CATALOG = ROOT / "src" / "lib" / "data" / "census-maps-catalog.json"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

# ---------------------------------------------------------------------------
# Brazil
# ---------------------------------------------------------------------------

BRA_GEO = ROOT / "public" / "geo" / "maps" / "bra-tfr.json"
BRA_GEO_OUT = ROOT / "public" / "geo" / "census" / "bra-uf.json"
BRA_DATA = ROOT / "public" / "data" / "census" / "bra.json"
BRA_XLSX_URL = (
    "https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/"
    "Populacao_por_cor_ou_raca_Resultados_do_universo/Tabelas_selecionadas/xlsx/"
    "Tabela_03_Pop_resid_por_cor_ou_raca_e_pessoas_indigenas_2022_BR_UF.xlsx"
)
BRA_NAME_TO_SLUG = {
    "Rondônia": "brazil-rondonia",
    "Acre": "brazil-acre",
    "Amazonas": "brazil-amazonas",
    "Roraima": "brazil-roraima",
    "Pará": "brazil-para",
    "Amapá": "brazil-amapa",
    "Tocantins": "brazil-tocantins",
    "Maranhão": "brazil-maranhao",
    "Piauí": "brazil-piaui",
    "Ceará": "brazil-ceara",
    "Rio Grande do Norte": "brazil-rio-grande-do-norte",
    "Paraíba": "brazil-paraiba",
    "Paraiba": "brazil-paraiba",
    "Pernambuco": "brazil-pernambuco",
    "Alagoas": "brazil-alagoas",
    "Sergipe": "brazil-sergipe",
    "Bahia": "brazil-bahia",
    "Minas Gerais": "brazil-minas-gerais",
    "Espírito Santo": "brazil-espirito-santo",
    "Rio de Janeiro": "brazil-rio-de-janeiro",
    "São Paulo": "brazil-sao-paulo",
    "Paraná": "brazil-parana",
    "Santa Catarina": "brazil-santa-catarina",
    "Rio Grande do Sul": "brazil-rio-grande-do-sul",
    "Mato Grosso do Sul": "brazil-mato-grosso-do-sul",
    "Mato Grosso": "brazil-mato-grosso",
    "Goiás": "brazil-goias",
    "Distrito Federal": "brazil-federal",
}
BRA_GROUPS = [
    {"id": "pardo", "shortLabel": "Pardo", "label": "Pardo (mixed / brown)", "color": "#c9955a"},
    {"id": "white", "shortLabel": "White", "label": "White (Branca)", "color": "#e8dcc8"},
    {"id": "black", "shortLabel": "Black", "label": "Black (Preta)", "color": "#3d2b1f"},
    {"id": "asian", "shortLabel": "Asian", "label": "Asian (Amarela)", "color": "#d4a017"},
    {"id": "indigenous", "shortLabel": "Indigenous", "label": "Indigenous (Indígena)", "color": "#2f6fed"},
]

# ---------------------------------------------------------------------------
# Canada
# ---------------------------------------------------------------------------

CAN_GEO = ROOT / "public" / "geo" / "maps" / "can-tfr.json"
CAN_GEO_OUT = ROOT / "public" / "geo" / "census" / "can-province.json"
CAN_DATA = ROOT / "public" / "data" / "census" / "can.json"
CAN_ZIP_URL = "https://www150.statcan.gc.ca/n1/tbl/csv/98100308-eng.zip"
CAN_GEO_SLUG = {
    "Newfoundland and Labrador": "canada-newfoundland-and-labrador",
    "Prince Edward Island": "canada-prince-edward-island",
    "Nova Scotia": "canada-nova-scotia",
    "New Brunswick": "canada-new-brunswick",
    "Quebec": "canada-quebec",
    "Ontario": "canada-ontario",
    "Manitoba": "canada-manitoba",
    "Saskatchewan": "canada-saskatchewan",
    "Alberta": "canada-alberta",
    "British Columbia": "canada-british-columbia",
    "Yukon": "canada-yukon",
    "Northwest Territories": "canada-northwest-territories",
    "Nunavut": "canada-nunavut",
}
CAN_VM_MAP = {
    "Not a visible minority": "not_vm",
    "South Asian": "south_asian",
    "Chinese": "chinese",
    "Black": "black",
    "Filipino": "filipino",
    "Arab": "arab",
    "Latin American": "latin_american",
    "Southeast Asian": "southeast_asian",
    "West Asian": "west_asian",
    "Korean": "korean",
    "Japanese": "japanese",
    "Visible minority, n.i.e.": "vm_other",
    "Multiple visible minorities": "multiple",
}
CAN_GROUPS = [
    {"id": "not_vm", "shortLabel": "Not visible minority", "label": "Not a visible minority (mostly White + Indigenous)", "color": "#c4b5a0"},
    {"id": "south_asian", "shortLabel": "South Asian", "label": "South Asian", "color": "#c23b2e"},
    {"id": "chinese", "shortLabel": "Chinese", "label": "Chinese", "color": "#d4a017"},
    {"id": "black", "shortLabel": "Black", "label": "Black", "color": "#1e3a5f"},
    {"id": "filipino", "shortLabel": "Filipino", "label": "Filipino", "color": "#2f6fed"},
    {"id": "arab", "shortLabel": "Arab", "label": "Arab", "color": "#0f766e"},
    {"id": "latin_american", "shortLabel": "Latin American", "label": "Latin American", "color": "#ea580c"},
    {"id": "southeast_asian", "shortLabel": "Southeast Asian", "label": "Southeast Asian", "color": "#65a30d"},
    {"id": "west_asian", "shortLabel": "West Asian", "label": "West Asian", "color": "#7c3aed"},
    {"id": "korean", "shortLabel": "Korean", "label": "Korean", "color": "#0891b2"},
    {"id": "japanese", "shortLabel": "Japanese", "label": "Japanese", "color": "#db2777"},
    {"id": "multiple", "shortLabel": "Multiple", "label": "Multiple visible minorities", "color": "#64748b"},
    {"id": "vm_other", "shortLabel": "Other VM", "label": "Visible minority, n.i.e.", "color": "#94a3b8"},
]

# ---------------------------------------------------------------------------
# South Africa
# ---------------------------------------------------------------------------

ZAF_GEO = ROOT / "public" / "geo" / "maps" / "zaf-tfr.json"
ZAF_GEO_OUT = ROOT / "public" / "geo" / "census" / "zaf-province.json"
ZAF_DATA = ROOT / "public" / "data" / "census" / "zaf.json"
ZAF_WIKI = "https://en.wikipedia.org/wiki/Demographics_of_South_Africa"
ZAF_NAME_TO_SLUG = {
    "Eastern Cape": "south-africa-eastern-cape",
    "Free State": "south-africa-free-state",
    "Gauteng": "south-africa-gauteng",
    "KwaZulu-Natal": "south-africa-kwazulu-natal",
    "Limpopo": "south-africa-limpopo",
    "Mpumalanga": "south-africa-mpumalanga",
    "Northern Cape": "south-africa-nothern-cape",  # matches existing geo typo
    "North West": "south-africa-north-west",
    "Western Cape": "south-africa-western-cape",
}
ZAF_GROUPS = [
    {"id": "black", "shortLabel": "Black African", "label": "Black African", "color": "#1e3a5f"},
    {"id": "coloured", "shortLabel": "Coloured", "label": "Coloured", "color": "#c9955a"},
    {"id": "white", "shortLabel": "White", "label": "White", "color": "#e8dcc8"},
    {"id": "indian", "shortLabel": "Indian/Asian", "label": "Indian / Asian", "color": "#d4a017"},
    {"id": "other", "shortLabel": "Other", "label": "Other", "color": "#94a3b8"},
]


def fetch(url: str, dest: Path) -> Path:
    if dest.exists() and dest.stat().st_size > 1000:
        return dest
    print(f"  download {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "birthrate.io/census-build"})
    with urllib.request.urlopen(req, timeout=180) as resp:
        dest.write_bytes(resp.read())
    return dest


def parse_int(s: str | None) -> int:
    if not s:
        return 0
    s = re.sub(r"[^\d]", "", str(s))
    return int(s) if s else 0


def shares_from_counts(counts: dict[str, int]) -> dict[str, float]:
    total = sum(counts.values()) or 1
    return {k: round(100.0 * v / total, 2) for k, v in counts.items()}


def xlsx_rows(path: Path) -> list[dict[str, str]]:
    z = zipfile.ZipFile(path)
    ss: list[str] = []
    root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    for si in root.findall("m:si", NS):
        texts = [t.text or "" for t in si.findall(".//m:t", NS)]
        ss.append("".join(texts))
    sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
    rows: list[dict[str, str]] = []
    for row in sheet.findall("m:sheetData/m:row", NS):
        cells: dict[str, str] = {}
        for c in row.findall("m:c", NS):
            ref = c.get("r") or ""
            col = re.match(r"[A-Z]+", ref)
            if not col:
                continue
            v = c.find("m:v", NS)
            if v is None or v.text is None:
                continue
            val = v.text
            if c.get("t") == "s":
                val = ss[int(val)]
            cells[col.group(0)] = val
        if cells:
            rows.append(cells)
    return rows


def upsert_catalog(entry: dict) -> None:
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    countries = [c for c in catalog.get("countries", []) if c.get("slug") != entry["slug"]]
    countries.append(entry)
    countries.sort(key=lambda c: c.get("name", ""))
    catalog["countries"] = countries
    CATALOG.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def copy_geo(src: Path, dest: Path) -> dict[str, str]:
    geo = json.loads(src.read_text(encoding="utf-8"))
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dest)
    return {
        (f.get("properties") or {}).get("slug"): (f.get("properties") or {}).get("name")
        for f in geo.get("features") or []
        if (f.get("properties") or {}).get("slug")
    }


def build_brazil() -> None:
    print("Brazil IBGE 2022…")
    xlsx = fetch(BRA_XLSX_URL, CACHE / "bra-cor-raca-uf-2022.xlsx")
    rows = xlsx_rows(xlsx)
    slug_names = copy_geo(BRA_GEO, BRA_GEO_OUT)
    areas: dict[str, dict] = {}
    national_counts: dict[str, int] | None = None
    national_pop = 0

    for r in rows:
        name = (r.get("A") or "").strip()
        if name == "Brasil":
            national_pop = parse_int(r.get("C"))
            national_counts = {
                "white": parse_int(r.get("D")),
                "black": parse_int(r.get("E")),
                "asian": parse_int(r.get("F")),
                "pardo": parse_int(r.get("G")),
                "indigenous": parse_int(r.get("H")),
            }
            continue
        slug = BRA_NAME_TO_SLUG.get(name)
        if not slug or slug not in slug_names:
            continue
        counts = {
            "white": parse_int(r.get("D")),
            "black": parse_int(r.get("E")),
            "asian": parse_int(r.get("F")),
            "pardo": parse_int(r.get("G")),
            "indigenous": parse_int(r.get("H")),
        }
        pop = parse_int(r.get("C")) or sum(counts.values())
        areas[slug] = {
            "code": slug,
            "name": slug_names[slug],
            "slug": slug,
            "population": pop,
            "shares": shares_from_counts(counts),
        }

    if not national_counts or len(areas) != 27:
        raise SystemExit(f"Brazil expected 27 UFs, got {len(areas)}")

    payload = {
        "source": (
            "IBGE — Censo Demográfico 2022, Tabela 3: população residente por "
            "cor ou raça e total de pessoas indígenas, Unidades da Federação."
        ),
        "sourceUrl": (
            "https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/"
            "Populacao_por_cor_ou_raca_Resultados_do_universo/Tabelas_selecionadas/"
        ),
        "year": 2022,
        "unit": "%",
        "mapMode": "share",
        "national": {
            "population": national_pop,
            "shares": shares_from_counts(national_counts),
        },
        "areas": {"uf": areas},
    }
    BRA_DATA.parent.mkdir(parents=True, exist_ok=True)
    BRA_DATA.write_text(json.dumps(payload, ensure_ascii=False) + "\n", encoding="utf-8")
    upsert_catalog(
        {
            "slug": "brazil",
            "iso3": "BRA",
            "iso2": "BR",
            "name": "Brazil",
            "kicker": "Census 2022",
            "title": "Colour / race",
            "year": 2022,
            "source": payload["source"],
            "sourceUrl": payload["sourceUrl"],
            "nationalLabel": "Brazil",
            "topicLabel": "Colour or race",
            "mapMode": "share",
            "groups": BRA_GROUPS,
            "levels": [
                {
                    "id": "uf",
                    "label": "State",
                    "kind": "Unidades da Federação",
                    "geoUrl": "/geo/census/bra-uf.json",
                }
            ],
            "dataUrl": "/data/census/bra.json",
            "fitMaxZoom": 4.8,
        }
    )
    print(f"  {len(areas)} states · national pardo {payload['national']['shares']['pardo']}%")


def build_canada() -> None:
    print("Canada StatCan 2021…")
    zpath = fetch(CAN_ZIP_URL, CACHE / "98100308-eng.zip")
    with zipfile.ZipFile(zpath) as z:
        z.extract("98100308.csv", CACHE)
    csv_path = CACHE / "98100308.csv"
    by_geo: dict[str, dict[str, int]] = defaultdict(dict)
    with csv_path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        tot_col = next(
            c
            for c in reader.fieldnames or []
            if c.startswith("Immigrant status") and "Total - Immigrant" in c
        )
        for row in reader:
            geo = row["GEO"]
            if geo not in CAN_GEO_SLUG and geo != "Canada":
                continue
            if row["Age (15C)"] != "Total - Age":
                continue
            if row["Gender (3)"] != "Total - Gender":
                continue
            if row["Statistics (3)"] != "Count":
                continue
            vm = row["Visible minority (15)"]
            if vm not in CAN_VM_MAP and vm != "Total - Visible minority":
                continue
            raw = (row.get(tot_col) or "").replace(",", "")
            if not raw:
                continue
            key = "total" if vm == "Total - Visible minority" else CAN_VM_MAP[vm]
            by_geo[geo][key] = int(float(raw))

    slug_names = copy_geo(CAN_GEO, CAN_GEO_OUT)
    areas: dict[str, dict] = {}
    for geo, slug in CAN_GEO_SLUG.items():
        counts = {g["id"]: by_geo[geo].get(g["id"], 0) for g in CAN_GROUPS}
        pop = by_geo[geo].get("total") or sum(counts.values())
        areas[slug] = {
            "code": slug,
            "name": slug_names[slug],
            "slug": slug,
            "population": pop,
            "shares": shares_from_counts(counts),
        }

    nat_counts = {g["id"]: by_geo["Canada"].get(g["id"], 0) for g in CAN_GROUPS}
    nat_pop = by_geo["Canada"].get("total") or sum(nat_counts.values())
    if len(areas) != 13:
        raise SystemExit(f"Canada expected 13 provinces, got {len(areas)}")

    payload = {
        "source": (
            "Statistics Canada — 2021 Census, table 98-10-0308-01: Visible minority "
            "by immigrant status (Total), provinces and territories. Persons in "
            "private households."
        ),
        "sourceUrl": "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810030801",
        "year": 2021,
        "unit": "%",
        "mapMode": "share",
        "national": {
            "population": nat_pop,
            "shares": shares_from_counts(nat_counts),
        },
        "areas": {"province": areas},
    }
    CAN_DATA.parent.mkdir(parents=True, exist_ok=True)
    CAN_DATA.write_text(json.dumps(payload, ensure_ascii=False) + "\n", encoding="utf-8")
    upsert_catalog(
        {
            "slug": "canada",
            "iso3": "CAN",
            "iso2": "CA",
            "name": "Canada",
            "kicker": "Census 2021",
            "title": "Visible minority",
            "year": 2021,
            "source": payload["source"],
            "sourceUrl": payload["sourceUrl"],
            "nationalLabel": "Canada",
            "topicLabel": "Visible minority",
            "mapMode": "share",
            "groups": CAN_GROUPS,
            "levels": [
                {
                    "id": "province",
                    "label": "Province",
                    "kind": "Provinces and territories",
                    "geoUrl": "/geo/census/can-province.json",
                }
            ],
            "dataUrl": "/data/census/can.json",
            "fitMaxZoom": 3.8,
        }
    )
    print(
        f"  {len(areas)} provinces · national not-VM "
        f"{payload['national']['shares']['not_vm']}%"
    )


def build_south_africa() -> None:
    print("South Africa Census 2022 (Wikipedia compilation)…")
    html_path = CACHE / "demographics-south-africa.html"
    fetch(ZAF_WIKI, html_path)
    raw = html_path.read_text(encoding="utf-8", errors="replace")
    tables = re.findall(
        r'<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>(.*?)</table>',
        raw,
        re.S | re.I,
    )

    def clean(c: str) -> str:
        c = re.sub(r"<sup[^>]*>.*?</sup>", "", c, flags=re.S)
        c = re.sub(r"<[^>]+>", "", c)
        c = html.unescape(c)
        return re.sub(r"\s+", " ", c).strip()

    # Prefer the 2022 crosstab (Black 81.4% national).
    chosen = None
    for body in tables:
        if "Gauteng" not in body or "Black" not in body:
            continue
        rows = re.findall(r"<tr[^>]*>(.*?)</tr>", body, re.S | re.I)
        header = [
            clean(c)
            for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", rows[0], re.S | re.I)
        ]
        if "Eastern Cape" not in header:
            continue
        # Check last percent row for 81.4
        last = [
            clean(c)
            for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", rows[-1], re.S | re.I)
        ]
        blob = " ".join(last + header)
        if "81.4" in blob or ("Black" in rows[1] and "12,763,312" in body):
            chosen = (header, rows)
            break
    if not chosen:
        # fallback: any province crosstab with Black row
        for body in tables:
            rows = re.findall(r"<tr[^>]*>(.*?)</tr>", body, re.S | re.I)
            if not rows:
                continue
            header = [
                clean(c)
                for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", rows[0], re.S | re.I)
            ]
            if "Eastern Cape" in header and "Western Cape" in header:
                chosen = (header, rows)
                break
    if not chosen:
        raise SystemExit("ZA province×race table not found")

    header, rows = chosen
    # header: ProvincePop. Group, Eastern Cape, ..., Total, Percent
    prov_cols = {
        name: i for i, name in enumerate(header) if name in ZAF_NAME_TO_SLUG
    }
    group_row_ids = {
        "Black": "black",
        "Black African": "black",
        "Coloured": "coloured",
        "White": "white",
        "Indian": "indian",
        "Indian/Asian": "indian",
        "Other": "other",
    }
    counts_by_prov: dict[str, dict[str, int]] = {
        s: {g["id"]: 0 for g in ZAF_GROUPS} for s in ZAF_NAME_TO_SLUG.values()
    }
    national_counts = {g["id"]: 0 for g in ZAF_GROUPS}
    national_pop = 0

    for row in rows[1:]:
        cells = [
            clean(c)
            for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.S | re.I)
        ]
        if not cells:
            continue
        label = cells[0]
        gid = group_row_ids.get(label)
        if not gid:
            if label.startswith("Total"):
                # province totals in this row
                for name, idx in prov_cols.items():
                    if idx < len(cells):
                        pass
                if len(cells) > 1 and "Total" in header:
                    # national total often second-to-last before Percent
                    pass
            continue
        for name, idx in prov_cols.items():
            if idx >= len(cells):
                continue
            n = parse_int(cells[idx])
            counts_by_prov[ZAF_NAME_TO_SLUG[name]][gid] = n
        # national from Total column if present
        if "Total" in header:
            tidx = header.index("Total")
            if tidx < len(cells):
                national_counts[gid] = parse_int(cells[tidx])

    if national_counts["black"] == 0:
        for c in counts_by_prov.values():
            for k, v in c.items():
                national_counts[k] += v
    national_pop = sum(national_counts.values())

    slug_names = copy_geo(ZAF_GEO, ZAF_GEO_OUT)
    areas: dict[str, dict] = {}
    for slug, counts in counts_by_prov.items():
        if slug not in slug_names:
            raise SystemExit(f"missing geo for {slug}")
        pop = sum(counts.values())
        areas[slug] = {
            "code": slug,
            "name": slug_names[slug],
            "slug": slug,
            "population": pop,
            "shares": shares_from_counts(counts),
        }
    if len(areas) != 9:
        raise SystemExit(f"ZA expected 9 provinces, got {len(areas)}")

    payload = {
        "source": (
            "Statistics South Africa — Census 2022 population group by province "
            "(compiled via Wikipedia Demographics of South Africa; national "
            "Black African 81.4% matches Stats SA release)."
        ),
        "sourceUrl": "https://www.statssa.gov.za/?page_id=4286&id=11321",
        "year": 2022,
        "unit": "%",
        "mapMode": "share",
        "national": {
            "population": national_pop,
            "shares": shares_from_counts(national_counts),
        },
        "areas": {"province": areas},
    }
    ZAF_DATA.parent.mkdir(parents=True, exist_ok=True)
    ZAF_DATA.write_text(json.dumps(payload, ensure_ascii=False) + "\n", encoding="utf-8")
    upsert_catalog(
        {
            "slug": "south-africa",
            "iso3": "ZAF",
            "iso2": "ZA",
            "name": "South Africa",
            "kicker": "Census 2022",
            "title": "Population group",
            "year": 2022,
            "source": payload["source"],
            "sourceUrl": payload["sourceUrl"],
            "nationalLabel": "South Africa",
            "topicLabel": "Population group",
            "mapMode": "share",
            "groups": ZAF_GROUPS,
            "levels": [
                {
                    "id": "province",
                    "label": "Province",
                    "kind": "Provinces",
                    "geoUrl": "/geo/census/zaf-province.json",
                }
            ],
            "dataUrl": "/data/census/zaf.json",
            "fitMaxZoom": 5.5,
        }
    )
    print(
        f"  {len(areas)} provinces · national Black African "
        f"{payload['national']['shares']['black']}%"
    )


def main() -> None:
    build_brazil()
    build_canada()
    build_south_africa()
    print("done")


if __name__ == "__main__":
    main()
