#!/usr/bin/env python3
"""Replace World Bank TFR on continental country maps with BirthGauge latest.

Does not rewrite provincial maps (Iran, Colombia, Brazil, DHS, NUTS, …).
Haiti has no BirthGauge series, so it stays on World Bank.
Africa country fills can still be BirthGauge-updated, but source/note/credit
are owned by scripts/overlay-africa-recent-tfr.py (DHS + Congo KIR + Stats SA).
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "src" / "lib" / "data" / "subnational-maps.json"
BG = ROOT / "src" / "lib" / "data" / "birthgauge-2026.json"
GEO = ROOT / "public" / "geo" / "maps"

CONTINENTAL_IDS = {
    "eu-tfr",
    "mena-tfr",
    "caribbean-tfr",
    "southamerica-tfr",
    "africa-tfr",
    "seasia-tfr",
    "centralamerica-tfr",
    "northamerica-tfr",
    "oceania-tfr",
    "centralasia-tfr",
}

SOURCE = (
    "BirthGauge, Data on Births and the Total Fertility Rate (TFR) 2026 — "
    "latest compiled year from national statistical offices. Countries without a "
    "BirthGauge series stay on World Bank WDI SP.DYN.TFRT.IN."
)
SOURCE_URL = "https://x.com/BirthGauge"
CREDIT = "Latest TFR compiled by BirthGauge (@BirthGauge) from national statistical offices."


def latest_tfr(row: dict) -> tuple[float, int] | None:
    tfr = row.get("tfr") or {}
    years = []
    for k, v in tfr.items():
        try:
            y = int(k)
        except (TypeError, ValueError):
            continue
        if v is None:
            continue
        years.append((y, float(v)))
    if not years:
        return None
    y, v = max(years, key=lambda p: p[0])
    return round(v, 2), y


def slug_iso3(geo_url: str) -> dict[str, str]:
    rel = geo_url.lstrip("/")
    path = ROOT / "public" / rel
    if not path.exists():
        return {}
    gj = json.loads(path.read_text())
    out = {}
    for feat in gj.get("features") or []:
        p = feat.get("properties") or {}
        slug = p.get("slug")
        iso = p.get("iso3")
        if isinstance(slug, str) and isinstance(iso, str) and len(iso) == 3:
            out[slug] = iso
    return out


def main() -> None:
    bg = json.loads(BG.read_text())
    by_iso = {}
    for row in bg["rows"]:
        iso = row.get("iso3")
        latest = latest_tfr(row)
        if iso and latest:
            by_iso[iso] = latest

    catalog = json.loads(CATALOG.read_text())
    report = []
    for m in catalog["maps"]:
        mid = m["id"]
        national_fill_only = mid == "mena-prov-tfr"
        if mid not in CONTINENTAL_IDS and not national_fill_only:
            continue
        iso_of = slug_iso3(m.get("geoUrl") or "")
        n_bg = 0
        n_wb = 0
        years = []
        for r in m.get("regions") or []:
            if national_fill_only and " · " in (r.get("name") or ""):
                continue
            iso = iso_of.get(r.get("slug") or "")
            hit = by_iso.get(iso) if iso else None
            if not hit:
                n_wb += 1
                continue
            val, year = hit
            r["value"] = val
            n_bg += 1
            years.append(year)
        if mid == "southamerica-tfr":
            for r in m.get("regions") or []:
                slug = r.get("slug") or ""
                if slug.endswith("guyana"):
                    r["value"] = 1.75
                    n_wb = max(0, n_wb - 1)
                elif "venezuela" in slug:
                    r["value"] = 2.01
                    n_bg = max(0, n_bg - 1)
        if mid == "centralamerica-tfr":
            for r in m.get("regions") or []:
                slug = r.get("slug") or ""
                if "nicaragua" in slug:
                    r["value"] = 2.2
                    n_bg = max(0, n_bg - 1)
                elif "el-salvador" in slug:
                    r["value"] = 1.4
                    n_wb = max(0, n_wb - 1)
        vals = [r["value"] for r in m["regions"] if r.get("value") is not None]
        if vals:
            m["min"] = round(min(vals), 2)
            m["max"] = round(max(vals), 2)
        if years and not national_fill_only:
            m["year"] = max(years)
            titles = {
                "eu-tfr": "Total fertility rate, European Union",
                "mena-tfr": "Total fertility rate, Middle East & North Africa",
                "caribbean-tfr": "Total fertility rate, Caribbean",
                "southamerica-tfr": "Total fertility rate, South America",
                "africa-tfr": "Total fertility rate, Africa",
                "seasia-tfr": "Total fertility rate, Southeast Asia",
                "centralamerica-tfr": "Total fertility rate, Central America",
                "northamerica-tfr": "Total fertility rate, North America",
                "oceania-tfr": "Total fertility rate, Oceania",
                "centralasia-tfr": "Total fertility rate, Central Asia",
            }
            if mid in titles:
                m["title"] = f"{titles[mid]} {max(years)}"
            if mid != "africa-tfr":
                m["source"] = SOURCE
                m["sourceUrl"] = SOURCE_URL
                m["credit"] = CREDIT
                leftover = (
                    f"{n_wb} countries remain World Bank WDI (no BirthGauge series)."
                    if n_wb
                    else "Every country on this map has a BirthGauge figure."
                )
                extra = ""
                if mid == "caribbean-tfr":
                    extra = (
                        " Cuba 1.12 and Puerto Rico 0.85 are BirthGauge 2025; "
                        "Jamaica 1.51 is 2025 (corrected for uncounted emigration); "
                        "Dominican Republic 1.95 is 2024. Haiti is still World Bank (2.62) — "
                        "BirthGauge has not published a Haiti TFR."
                    )
                if mid == "southamerica-tfr":
                    leftover = (
                        "Venezuela 2.01 is UCAB ENCOVI 2023 (household survey): INE has not "
                        "published complete vital statistics since about 2019, so the old "
                        "BirthGauge 2.23 (2020) is not a current official TFR. Guyana 1.75 is "
                        "an unofficial 2025 TFR estimate from Bureau of Statistics GRO "
                        "registered live births (13,132), not a published age-specific TFR."
                    )
                    m["source"] = (
                        "BirthGauge, Data on Births and the Total Fertility Rate (TFR) 2026 — "
                        "latest compiled year from national statistical offices. Venezuela 2.01 "
                        "is UCAB ENCOVI 2023, not INE vital statistics. Guyana 1.75 is an "
                        "unofficial 2025 TFR estimate from Bureau of Statistics GRO registered "
                        "live births (13,132), not a published age-specific TFR."
                    )
                    m["credit"] = (
                        "BirthGauge for 10 countries; Venezuela is ENCOVI 2023 (UCAB); "
                        "Guyana TFR is an unofficial estimate from GRO registered births."
                    )
                if mid == "centralamerica-tfr":
                    leftover = (
                        "Nicaragua 2.2 is INIDE’s 2020–2025 TGF (Banco Central, Nicaragua en "
                        "Cifras 2025), not BirthGauge’s 2020 figure (2.13). El Salvador 1.4 is "
                        "the 2024 census TGF (BCR/ONEC), not World Bank WDI 1.77."
                    )
                    m["source"] = (
                        "BirthGauge, Data on Births and the Total Fertility Rate (TFR) 2026 — "
                        "latest compiled year from national statistical offices. Nicaragua 2.2 "
                        "is INIDE 2020–2025 (BCN Nicaragua en Cifras 2025). El Salvador 1.4 is "
                        "the 2024 population census TGF (BCR/ONEC)."
                    )
                    m["credit"] = (
                        "BirthGauge for 5 countries; Nicaragua is INIDE 2020–2025 "
                        "(BCN Nicaragua en Cifras 2025); El Salvador is the 2024 census "
                        "(BCR/ONEC)."
                    )
                m["note"] = (
                    f"National TFR, mixed vintage. {n_bg} countries use BirthGauge’s latest "
                    f"compiled year (up to {max(years)}). {leftover}{extra}"
                )
        report.append((mid, n_bg, n_wb, m.get("year"), [r for r in m["regions"] if r.get("slug", "").endswith("haiti") or r.get("slug", "").endswith("dominican-republic") or r.get("slug", "").endswith("egypt-arab-rep")]))

    CATALOG.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    for row in report:
        mid, n_bg, n_wb, year, spotlight = row
        print(f"{mid}: BirthGauge {n_bg}, WDI {n_wb}, year {year}")
        for r in spotlight:
            print(f"    {r['name']} {r['value']}")


if __name__ == "__main__":
    main()
