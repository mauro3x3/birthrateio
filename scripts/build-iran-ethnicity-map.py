#!/usr/bin/env python3
"""Build Iran ethnic plurality map for /demographics/iran.

Iran does not publish an official ethnicity census by province. This pack
combines:
  - National shares: CIA World Factbook (same figures used on the classic
    ethno-religious wall maps).
  - Province colours: plurality / dominant-group classification from Karami
    (2025), Journal of Geography and Urban Research — an academic assignment
    of Iran’s 31 ostāns to 8 ethnic regions for spatial analysis. These are
    NOT census percentages.

Religion is national-only (Factbook), shown as a pie beside the map.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEO_SRC = ROOT / "public" / "geo" / "maps" / "irn-tfr.json"
GEO_OUT = ROOT / "public" / "geo" / "census" / "irn-ostan.json"
DATA_OUT = ROOT / "public" / "data" / "census" / "irn.json"
CATALOG = ROOT / "src" / "lib" / "data" / "census-maps-catalog.json"

# CIA World Factbook — Ethnic groups (classic Factbook estimate).
NATIONAL_ETHNIC = {
    "persian": 61.0,
    "azeris": 16.0,
    "kurds": 10.0,
    "lurs": 6.0,
    "baluchs": 2.0,
    "arabs": 2.0,
    "turkmens": 2.0,
    "other": 1.0,
}

# CIA World Factbook — Religions (rounded; non-Muslim split is approximate).
NATIONAL_RELIGION = {
    "shia": 90.0,
    "sunni": 8.0,
    "other_muslim": 1.0,
    "non_muslim": 1.0,
}

# Plurality province → group. Source: Karami (2025) province–ethnicity mapping.
PLURALITY: dict[str, str] = {
    # Persian-speaking / Fars core
    "iran-isfahan": "persian",
    "iran-razavi-khorasan": "persian",
    "iran-tehran": "persian",
    "iran-kerman": "persian",
    "iran-fars": "persian",
    "iran-qazvin": "persian",
    "iran-qom": "persian",
    "iran-markazi": "persian",
    "iran-semnan": "persian",
    "iran-yazd": "persian",
    "iran-south-khorasan": "persian",
    "iran-hamadan": "persian",
    "iran-bushehr": "persian",
    "iran-hormozgan": "persian",
    "iran-alborz": "persian",
    # Azeri
    "iran-west-azerbaijan": "azeris",
    "iran-east-azerbaijan": "azeris",
    "iran-zanjan": "azeris",
    "iran-ardabil": "azeris",
    # Arab
    "iran-khuzestan": "arabs",
    # Gilaki–Mazani (Caspian)
    "iran-mazandaran": "gilaki_mazani",
    "iran-gilan": "gilaki_mazani",
    # Kurdish
    "iran-kurdistan": "kurds",
    "iran-kermanshah": "kurds",
    "iran-ilam": "kurds",
    "iran-north-khorasan": "kurds",
    # Lur
    "iran-lorestan": "lurs",
    "iran-chaharmahal-and-bakhtiari": "lurs",
    "iran-kohgiluyeh-and-boyer-ahmad": "lurs",
    # Turkmen
    "iran-golestan": "turkmens",
    # Baluch
    "iran-sistan-and-baluchestan": "baluchs",
}

GROUPS = [
    {
        "id": "persian",
        "shortLabel": "Persians",
        "label": "Persians (incl. many Gilaki/Mazani speakers in national Factbook share)",
        "color": "#c995b8",
    },
    {
        "id": "azeris",
        "shortLabel": "Azeris",
        "label": "Azerbaijanis (Azeris)",
        "color": "#7eb8d4",
    },
    {
        "id": "kurds",
        "shortLabel": "Kurds",
        "label": "Kurds",
        "color": "#8b6914",
    },
    {
        "id": "lurs",
        "shortLabel": "Lurs",
        "label": "Lurs",
        "color": "#5b8fa8",
    },
    {
        "id": "gilaki_mazani",
        "shortLabel": "Gilaki–Mazani",
        "label": "Gilaki and Mazandarani (Caspian) — province map only; folded into Persians in Factbook %",
        "color": "#b85c7a",
    },
    {
        "id": "arabs",
        "shortLabel": "Arabs",
        "label": "Arabs",
        "color": "#3d8b6e",
    },
    {
        "id": "baluchs",
        "shortLabel": "Baluchs",
        "label": "Baluchs",
        "color": "#c4a574",
    },
    {
        "id": "turkmens",
        "shortLabel": "Turkmens",
        "label": "Turkmens and other Turkic tribes",
        "color": "#5aae8b",
    },
    {
        "id": "other",
        "shortLabel": "Other",
        "label": "Other (Armenians, Georgians, Assyrians, Jews, …)",
        "color": "#94a3b8",
    },
]

RELIGION_GROUPS = [
    {"id": "shia", "shortLabel": "Shia", "label": "Shia Muslim", "color": "#2f6fed"},
    {"id": "sunni", "shortLabel": "Sunni", "label": "Sunni Muslim", "color": "#7eb8d4"},
    {
        "id": "other_muslim",
        "shortLabel": "Other Muslim",
        "label": "Other Islamic groups",
        "color": "#e8c547",
    },
    {
        "id": "non_muslim",
        "shortLabel": "Non-Muslim",
        "label": "Christian, Baha'i, Jewish, Zoroastrian, and other",
        "color": "#a78bfa",
    },
]


def main() -> None:
    if not GEO_SRC.exists():
        raise SystemExit(f"missing {GEO_SRC}")

    geo = json.loads(GEO_SRC.read_text(encoding="utf-8"))
    features = geo.get("features") or []
    areas: dict[str, dict] = {}
    missing = []
    for f in features:
        props = f.get("properties") or {}
        slug = props.get("slug")
        name = props.get("name")
        if not slug:
            continue
        group = PLURALITY.get(slug)
        if not group:
            missing.append(slug)
            continue
        shares = {g["id"]: 0.0 for g in GROUPS}
        shares[group] = 100.0
        areas[slug] = {
            "code": slug,
            "name": name,
            "slug": slug,
            "population": 0,
            "shares": shares,
            "plurality": group,
        }

    if missing:
        raise SystemExit(f"no plurality for: {missing}")
    if len(areas) != 31:
        raise SystemExit(f"expected 31 provinces, got {len(areas)}")

    GEO_OUT.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(GEO_SRC, GEO_OUT)

    payload = {
        "source": (
            "National ethnic shares: CIA World Factbook (Iran — Ethnic groups). "
            "Province colours: plurality classification from Karami, S. (2025), "
            "“Spatial Analysis of Economic Indicators among Iranian-Islamic "
            "Provinces and Ethnicities,” Journal of Geography and Urban Research "
            "1(1) — not an official SCI ethnicity census. Iran does not publish "
            "provincial ethnicity percentages. Religion pie: CIA World Factbook."
        ),
        "sourceUrl": "https://www.cia.gov/the-world-factbook/countries/iran/",
        "year": 2016,
        "unit": "%",
        "mapMode": "plurality",
        "national": {
            "population": 79926270,
            "shares": NATIONAL_ETHNIC,
        },
        "religion": {
            "label": "Religion",
            "shares": NATIONAL_RELIGION,
            "groups": RELIGION_GROUPS,
        },
        "areas": {"ostan": areas},
    }
    DATA_OUT.parent.mkdir(parents=True, exist_ok=True)
    DATA_OUT.write_text(json.dumps(payload, ensure_ascii=False) + "\n", encoding="utf-8")

    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    countries = catalog.get("countries") or []
    countries = [c for c in countries if c.get("slug") != "iran"]
    countries.append(
        {
            "slug": "iran",
            "iso3": "IRN",
            "iso2": "IR",
            "name": "Iran",
            "kicker": "Ethnic map",
            "title": "Ethnic groups",
            "year": 2016,
            "source": payload["source"],
            "sourceUrl": payload["sourceUrl"],
            "nationalLabel": "Iran",
            "topicLabel": "Ethnic group",
            "mapMode": "plurality",
            "groups": [
                {
                    "id": g["id"],
                    "shortLabel": g["shortLabel"],
                    "label": g["label"],
                    "color": g["color"],
                }
                for g in GROUPS
                if g["id"] != "other"
            ]
            + [
                {
                    "id": "other",
                    "shortLabel": "Other",
                    "label": "Other",
                    "color": "#94a3b8",
                }
            ],
            "levels": [
                {
                    "id": "ostan",
                    "label": "Province",
                    "kind": "Ostāns",
                    "geoUrl": "/geo/census/irn-ostan.json",
                }
            ],
            "dataUrl": "/data/census/irn.json",
            "fitMaxZoom": 5.8,
        }
    )
    countries.sort(key=lambda c: c.get("name", ""))
    catalog["countries"] = countries
    CATALOG.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"wrote {GEO_OUT.relative_to(ROOT)}")
    print(f"wrote {DATA_OUT.relative_to(ROOT)}")
    print(f"updated catalog ({len(countries)} countries)")


if __name__ == "__main__":
    main()
