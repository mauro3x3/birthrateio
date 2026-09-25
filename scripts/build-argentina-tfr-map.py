#!/usr/bin/env python3
"""Build Argentina provincial TGF maps (RENAPER / DNP).

2024: scraped from the official RENAPER Sistema Estadístico de Población
dashboard (Nivel Provincial · Tasa Global de Fecundidad · Año 2024),
published to one decimal.
https://estadisticas.renaper.gob.ar/app_myn/

2025: provisional two-decimal provincial TGF transcribed from a Datawrapper
map attributed to RENAPER — Dirección Nacional de Población (Sistema
Estadístico de Población). As of 2026-09-25 the public dashboard year
selector still only lists 2012–2024; treat 2025 as provisional until the
board publishes it. National TGF on that map is 1.04.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "more_tfr", ROOT / "scripts" / "build-more-tfr-maps.py"
)
more = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(more)

# Official RENAPER dashboard, TGF by province of residence, 2024 (one decimal).
ARG_2024 = {
    "Buenos Aires": 1.2,
    "Ciudad de Buenos Aires": 0.9,
    "Catamarca": 1.1,
    "Córdoba": 1.1,
    "Corrientes": 1.2,
    "Chaco": 1.3,
    "Chubut": 1.1,
    "Entre Ríos": 1.1,
    "Formosa": 1.2,
    "Jujuy": 0.9,
    "La Pampa": 1.1,
    "La Rioja": 1.0,
    "Mendoza": 1.2,
    "Misiones": 1.4,
    "Neuquén": 1.2,
    "Río Negro": 1.1,
    "Salta": 1.1,
    "San Juan": 1.3,
    "San Luis": 1.0,
    "Santa Cruz": 1.1,
    "Santa Fe": 1.2,
    "Santiago del Estero": 1.4,
    "Tucumán": 1.1,
    "Tierra del Fuego": 0.8,
}

# Provisional 2025 (two decimal) — secondary cartography citing RENAPER/DNP.
ARG_2025 = {
    "Buenos Aires": 1.04,
    "Ciudad de Buenos Aires": 0.79,
    "Catamarca": 0.94,
    "Córdoba": 1.04,
    "Corrientes": 1.16,
    "Chaco": 0.85,
    "Chubut": 0.92,
    "Entre Ríos": 1.04,
    "Formosa": 1.09,
    "Jujuy": 0.74,
    "La Pampa": 0.99,
    "La Rioja": 0.97,
    "Mendoza": 1.09,
    "Misiones": 1.42,
    "Neuquén": 1.1,
    "Río Negro": 0.89,
    "Salta": 1.09,
    "San Juan": 1.21,
    "San Luis": 0.95,
    "Santa Cruz": 1.02,
    "Santa Fe": 1.05,
    "Santiago del Estero": 1.35,
    "Tucumán": 1.02,
    "Tierra del Fuego": 0.85,
}

DISPLAY = {
    "Ciudad Autónoma de Buenos Aires": "Ciudad de Buenos Aires",
    "Buenos Aires F.D.": "Ciudad de Buenos Aires",
    "Distrito Federal": "Ciudad de Buenos Aires",
    "Tierra del Fuego, Antártida e Islas del Atlántico Sur": "Tierra del Fuego",
}


def relabel(feats: list[dict], regions: list[dict]) -> tuple[list[dict], list[dict]]:
    out_feats = []
    for feat in feats:
        props = dict(feat.get("properties") or {})
        name = DISPLAY.get(props.get("name"), props.get("name"))
        props["name"] = name
        out_feats.append({**feat, "properties": props})
    out_regions = []
    for r in regions:
        out_regions.append({**r, "name": DISPLAY.get(r["name"], r["name"])})
    return out_feats, out_regions


def main() -> None:
    more.ALIASES_BY_ISO["ARG"] = {
        "ciudad de buenos aires": "ciudad autonoma de buenos aires",
        "caba": "ciudad autonoma de buenos aires",
        "capital federal": "ciudad autonoma de buenos aires",
        "tierra del fuego": "tierra del fuego",
    }

    # Patched ARG ADM1 (geoBoundaries + Entre Ríos from Nominatim; La Rioja
    # spelling fixed). See scripts/data/arg-adm1-patched.json.
    fixed = ROOT / "scripts" / "data" / "arg-adm1-patched.json"
    if not fixed.exists():
        sys.exit(f"missing {fixed}")
    raw = json.loads(fixed.read_text(encoding="utf-8"))
    feats = raw.get("features") or []
    names = sorted({more.admin1_name(f) for f in feats})
    print("patched ARG ADM1…", flush=True)
    print("  provinces", len(names), names)

    out_2025, regions_2025, n25, tot25, unmatched_25 = more.match_admin1(
        "ARG", ARG_2025, feats, "argentina"
    )
    out_2024, regions_2024, n24, tot24, unmatched_24 = more.match_admin1(
        "ARG", ARG_2024, feats, "argentina"
    )
    print(f"  2025 matched {n25}/{tot25}")
    print(f"  2024 matched {n24}/{tot24}")
    if unmatched_24 or unmatched_25:
        print("  unmatched 2024", unmatched_24)
        print("  unmatched 2025", unmatched_25)
        print("  geo names", names)
        sys.exit(1)
    if n24 != 24 or n25 != 24:
        sys.exit(f"expected 24 jurisdictions, got {n24}/{n25}")

    out_2025, regions_2025 = relabel(out_2025, regions_2025)
    _, regions_2024 = relabel(out_2024, regions_2024)

    geo_url = more.write_geo("arg-tfr", out_2025, max_pts=80)
    source_url = "https://estadisticas.renaper.gob.ar/app_myn/"
    note = (
        "RENAPER Dirección Nacional de Población — Sistema Estadístico de "
        "Población, tasa global de fecundidad by province of mother's "
        "residence. 2024 values are the one-decimal figures on the public "
        "dashboard (years 2012–2024). 2025 is provisional two-decimal TGF "
        "from a secondary cartography attributed to the same RENAPER/DNP "
        "source; the public year selector did not yet list 2025 when this "
        "layer was built. Antarctic claim polygons are dropped from the frame."
    )
    common = dict(
        iso3="ARG",
        country="Argentina",
        kind="province",
        sourceUrl=source_url,
        credit="RENAPER, Dirección Nacional de Población.",
        geoUrl=geo_url,
        scale="plasma",
        labelValues=True,
        note=note,
    )
    entry_2025 = more.catalog_entry(
        **common,
        id="arg-tfr-2025",
        title="Total fertility rate, Argentina 2025 (provisional)",
        year=2025,
        national=1.04,
        source=(
            "Provisional provincial TGF 2025 attributed to RENAPER — "
            "Dirección Nacional de Población, Sistema Estadístico de "
            "Población (two-decimal secondary cartography). National TGF "
            "1.04. Public dashboard coverage was still 2012–2024 at build."
        ),
        highlights=[
            {"name": "Jujuy", "value": 0.74},
            {"name": "Misiones", "value": 1.42},
        ],
        regions=regions_2025,
    )
    entry_2024 = more.catalog_entry(
        **common,
        id="arg-tfr-2024",
        title="Total fertility rate, Argentina 2024",
        year=2024,
        national=1.18,
        source=(
            "RENAPER, Dirección Nacional de Población — Sistema Estadístico "
            "de Población dashboard (Nivel Provincial · TGF · 2024), "
            "published to one decimal. National TGF 1.18 (BirthGauge compiled)."
        ),
        highlights=[
            {"name": "Tierra del Fuego", "value": 0.8},
            {"name": "Misiones", "value": 1.4},
        ],
        regions=regions_2024,
    )

    catalog = json.loads(more.CATALOG.read_text())
    maps = [m for m in catalog["maps"] if not str(m["id"]).startswith("arg-tfr")]
    maps.extend([entry_2025, entry_2024])
    more.CATALOG.write_text(
        json.dumps({"maps": maps}, indent=2) + "\n", encoding="utf-8"
    )
    print(f"wrote arg-tfr (24 provinces, 2024–2025) catalog now {len(maps)} maps")


if __name__ == "__main__":
    main()
