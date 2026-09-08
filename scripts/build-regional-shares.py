#!/usr/bin/env python3
"""Country shares of population and estimated births for regional maps.

Births = population × crude birth rate / 1,000 (World Bank). Does not invent TFR.
Does not run build-subnational-maps.py.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "lib" / "data" / "regional-shares.json"
CACHE = ROOT / ".tmp-map-build"
CACHE.mkdir(exist_ok=True)

spec = importlib.util.spec_from_file_location(
    "more_tfr", ROOT / "scripts" / "build-more-tfr-maps.py"
)
more = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(more)

WB_POP = (
    "https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL"
    "?format=json&mrnev=1&per_page=400"
)
WB_CBR = (
    "https://api.worldbank.org/v2/country/all/indicator/SP.DYN.CBRT.IN"
    "?format=json&mrnev=1&per_page=400"
)

# Same membership as the regional TFR maps, plus geographic Europe (not EU-27 only).
EUROPE = more.EU27 + [
    "GBR", "NOR", "ISL", "CHE", "LIE",
    "ALB", "BIH", "MNE", "MKD", "SRB", "XKX",
    "UKR", "BLR", "MDA",
    "TUR", "RUS",
]

REGIONS = [
    ("EU", "Europe", EUROPE),
    ("MENA", "Middle East & North Africa", more.MENA),
    ("AFRICA", "Africa", more.AFRICA),
    ("SOUTHAMERICA", "South America", more.SOUTH_AMERICA),
    ("CARIBBEAN", "Caribbean", more.CARIBBEAN),
    ("SEASIA", "Southeast Asia", more.SE_ASIA),
    ("CENTRALAMERICA", "Central America", more.CENTRAL_AMERICA),
    ("CENTRALASIA", "Central Asia", more.CENTRAL_ASIA),
    ("NORTHAMERICA", "North America", more.NORTH_AMERICA),
    ("OCEANIA", "Oceania", more.OCEANIA),
]


def wb_latest(url: str, cache_name: str) -> dict[str, tuple[float, int, str]]:
    payload = more.fetch_json(url, CACHE / cache_name)
    out: dict[str, tuple[float, int, str]] = {}
    for r in payload[1]:
        iso = (r.get("countryiso3code") or "").upper()
        if len(iso) != 3 or r.get("value") is None:
            continue
        out[iso] = (float(r["value"]), int(r["date"]), r["country"]["value"])
    return out


def main():
    print("World Bank population…")
    pop = wb_latest(WB_POP, "wb-pop.json")
    print(f"  {len(pop)}")
    print("World Bank crude birth rate…")
    cbr = wb_latest(WB_CBR, "wb-cbr.json")
    print(f"  {len(cbr)}")

    regions = {}
    for iso3, name, members in REGIONS:
        countries = []
        years: list[int] = []
        for code in members:
            if code not in pop:
                print(f"  skip {iso3} {code} (no population)")
                continue
            pval, pyear, pname = pop[code]
            rec: dict = {
                "iso3": code,
                "name": pname,
                "population": round(pval),
                "popYear": pyear,
            }
            years.append(pyear)
            if code in cbr:
                cval, cyear, _ = cbr[code]
                rec["cbr"] = round(cval, 2)
                rec["cbrYear"] = cyear
                rec["births"] = round(pval * cval / 1000.0)
                years.append(cyear)
            countries.append(rec)
        countries.sort(key=lambda r: r["population"], reverse=True)
        regions[iso3] = {
            "id": iso3,
            "name": name,
            "year": max(years) if years else None,
            "countries": countries,
        }
        n_b = sum(1 for c in countries if c.get("births") is not None)
        print(f"  {iso3:16} {len(countries):3} countries  {n_b:3} with births")

    payload = {
        "source": (
            "World Bank World Development Indicators, SP.POP.TOTL (population) "
            "and SP.DYN.CBRT.IN (crude birth rate), latest year per country. "
            "Births are estimated as population × CBR / 1,000 — not a vital-statistics "
            "birth count. Oceania is UN-style sovereign states (not Hawaii or Western New Guinea)."
        ),
        "sourceUrl": "https://data.worldbank.org/indicator/SP.POP.TOTL",
        "regions": regions,
    }
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
