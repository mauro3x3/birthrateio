#!/usr/bin/env python3
"""Country shares of population and births for regional maps.

Population: World Bank SP.POP.TOTL (latest).
Births: UN World Population Prospects annual birth counts via Our World in Data
(Number of births). Prefer the latest non-projected year so shares are coherent
demographic estimates — not population × crude birth rate.
Falls back to pop × World Bank CBR / 1,000 only when WPP births are missing.
Does not run build-subnational-maps.py.
"""

from __future__ import annotations

import csv
import importlib.util
import io
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
OWID_BIRTHS = (
    "https://ourworldindata.org/grapher/number-of-births-per-year.csv"
    "?v=1&csvType=full&useColumnShortNames=false"
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


def owid_births() -> dict[str, dict[int, tuple[int, bool]]]:
    """iso3 -> {year: (births, is_projected)}."""
    cache = CACHE / "owid-number-of-births.csv"
    text = more.fetch_text(OWID_BIRTHS, cache)
    out: dict[str, dict[int, tuple[int, bool]]] = {}
    reader = csv.DictReader(io.StringIO(text))
    for row in reader:
        code = (row.get("Code") or "").strip().upper()
        if len(code) != 3:
            continue
        year_s = (row.get("Year") or "").strip()
        if not year_s.isdigit():
            continue
        year = int(year_s)
        raw = (row.get("Number of births") or "").strip()
        projected = bool((row.get("Projected (Projected)") or "").strip())
        if not raw:
            # Projected column sometimes holds the value instead.
            raw = (row.get("Projected (Projected)") or "").strip()
            if not raw:
                continue
            projected = True
        try:
            births = int(round(float(raw)))
        except ValueError:
            continue
        out.setdefault(code, {})[year] = (births, projected)
    return out


def pick_births(
    series: dict[int, tuple[int, bool]] | None,
    prefer_year: int | None,
) -> tuple[int, int, str] | None:
    """Return (births, year, method) preferring non-projected estimates."""
    if not series:
        return None
    estimates = {y: v for y, (v, proj) in series.items() if not proj}
    pool = estimates or {y: v for y, (v, _) in series.items()}
    if prefer_year is not None and prefer_year in pool:
        return pool[prefer_year], prefer_year, "wpp"
    year = max(pool)
    return pool[year], year, "wpp"


def main():
    print("World Bank population…")
    pop = wb_latest(WB_POP, "wb-pop.json")
    print(f"  {len(pop)}")
    print("World Bank crude birth rate (fallback only)…")
    cbr = wb_latest(WB_CBR, "wb-cbr.json")
    print(f"  {len(cbr)}")
    print("UN WPP births via Our World in Data…")
    # fetch_text may not exist — fall back
    if not hasattr(more, "fetch_text"):
        def fetch_text(url: str, cache: Path) -> str:
            if cache.exists():
                return cache.read_text(encoding="utf-8")
            import urllib.request

            req = urllib.request.Request(url, headers={"User-Agent": "birthrate.io"})
            with urllib.request.urlopen(req, timeout=120) as resp:
                text = resp.read().decode("utf-8")
            cache.write_text(text, encoding="utf-8")
            return text

        more.fetch_text = fetch_text  # type: ignore[attr-defined]

    births_by_iso = owid_births()
    print(f"  {len(births_by_iso)} countries")

    # Prefer a shared recent estimate year (usually 2023 in WPP 2024).
    all_est_years: list[int] = []
    for series in births_by_iso.values():
        all_est_years.extend(y for y, (_, proj) in series.items() if not proj)
    prefer_year = max(all_est_years) if all_est_years else None
    print(f"  prefer birth year {prefer_year}")

    regions = {}
    for iso3, name, members in REGIONS:
        countries = []
        years: list[int] = []
        n_wpp = 0
        n_cbr = 0
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

            picked = pick_births(births_by_iso.get(code), prefer_year)
            if picked:
                bval, byear, _ = picked
                rec["births"] = bval
                rec["birthYear"] = byear
                rec["birthMethod"] = "wpp"
                years.append(byear)
                n_wpp += 1
            elif code in cbr:
                cval, cyear, _ = cbr[code]
                rec["cbr"] = round(cval, 2)
                rec["cbrYear"] = cyear
                rec["births"] = round(pval * cval / 1000.0)
                rec["birthYear"] = cyear
                rec["birthMethod"] = "cbr"
                years.append(cyear)
                n_cbr += 1

            countries.append(rec)
        countries.sort(key=lambda r: r["population"], reverse=True)
        birth_years = [c["birthYear"] for c in countries if "birthYear" in c]
        regions[iso3] = {
            "id": iso3,
            "name": name,
            "year": max(birth_years) if birth_years else (max(years) if years else None),
            "countries": countries,
        }
        print(
            f"  {iso3:16} {len(countries):3} countries  "
            f"{n_wpp:3} WPP births  {n_cbr:3} CBR fallback"
        )

    payload = {
        "source": (
            "Population: World Bank WDI SP.POP.TOTL (latest). "
            "Births: UN World Population Prospects annual birth counts "
            "(via Our World in Data “Number of births”), latest non-projected year. "
            "Where WPP births are missing, falls back to population × World Bank "
            "crude birth rate / 1,000. Oceania is UN-style sovereign states "
            "(not Hawaii or Western New Guinea)."
        ),
        "sourceUrl": "https://ourworldindata.org/grapher/number-of-births-per-year",
        "regions": regions,
    }
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
