#!/usr/bin/env python3
"""Build only the Colombia 2023–2024 departmental TFR maps (DANE). Does not rewrite other maps."""

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

# DANE Estadísticas Vitales — Tasa global de fecundidad by mother's department
# of residence, published to one decimal. 32 departments + Bogotá.
#
# 2023: 19 Dec 2024 births bulletin, Tabla 2 (2014 / 2019 / 2023).
# https://www.dane.gov.co/files/operaciones/EEVV/2024/19-dic-2024/bol-EEVV-Nacimientos-2024pr.pdf
# 2024: Feb 2026 vital-statistics bulletin, Tabla 1 (2015 / 2020 / 2024).
# https://www.dane.gov.co/files/operaciones/EEVV/2026/6-feb-2026/bol-EEVV-Isem2025pr.pdf
COL_2023 = {
    "Amazonas": 1.3,
    "Antioquia": 1.1,
    "Arauca": 1.3,
    "Atlántico": 1.4,
    "Bogotá": 0.9,
    "Bolívar": 1.6,
    "Boyacá": 1.2,
    "Caldas": 0.9,
    "Caquetá": 1.5,
    "Casanare": 1.4,
    "Cauca": 1.1,
    "Cesar": 1.6,
    "Chocó": 1.3,
    "Córdoba": 1.4,
    "Cundinamarca": 1.0,
    "Guainía": 1.6,
    "Guaviare": 1.4,
    "Huila": 1.6,
    "La Guajira": 2.2,
    "Magdalena": 1.6,
    "Meta": 1.4,
    "Nariño": 0.9,
    "Norte de Santander": 1.4,
    "Putumayo": 1.2,
    "Quindío": 1.0,
    "Risaralda": 1.1,
    "San Andrés y Providencia": 1.3,
    "Santander": 1.2,
    "Sucre": 1.5,
    "Tolima": 1.3,
    "Valle del Cauca": 1.0,
    "Vaupés": 2.1,
    "Vichada": 1.6,
}
COL_2024 = {
    "Amazonas": 1.1,
    "Antioquia": 0.9,
    "Arauca": 1.2,
    "Atlántico": 1.1,
    "Bogotá": 0.8,
    "Bolívar": 1.4,
    "Boyacá": 1.1,
    "Caldas": 0.7,
    "Caquetá": 1.3,
    "Casanare": 1.1,
    "Cauca": 1.0,
    "Cesar": 1.2,
    "Chocó": 1.2,
    "Córdoba": 1.1,
    "Cundinamarca": 1.0,
    "Guainía": 1.6,
    "Guaviare": 1.5,
    "Huila": 1.4,
    "La Guajira": 1.9,
    "Magdalena": 1.2,
    "Meta": 1.2,
    "Nariño": 0.8,
    "Norte de Santander": 1.1,
    "Putumayo": 1.0,
    "Quindío": 0.9,
    "Risaralda": 1.0,
    "San Andrés y Providencia": 1.3,
    "Santander": 1.0,
    "Sucre": 1.2,
    "Tolima": 1.1,
    "Valle del Cauca": 0.9,
    "Vaupés": 2.0,
    "Vichada": 1.2,
}

DISPLAY = {
    "Bogota Capital District": "Bogotá",
    "Archipiélago de San Andrés, Providencia y Santa Catalina": "San Andrés y Providencia",
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
    more.ALIASES_BY_ISO["COL"] = {
        "bogota": "bogota capital district",
        "san andres y providencia": (
            "archipielago de san andres providencia y santa catalina"
        ),
    }

    print("geoBoundaries Colombia ADM1…", flush=True)
    feats = more.geoboundaries_adm1("COL")
    names = sorted({more.admin1_name(f) for f in feats})
    print("  departments", len(names), names[:6], "…")

    out_2024, regions_2024, n24, tot24, unmatched_24 = more.match_admin1(
        "COL", COL_2024, feats, "colombia"
    )
    out_2023, regions_2023, n23, tot23, unmatched_23 = more.match_admin1(
        "COL", COL_2023, feats, "colombia"
    )
    print(f"  2024 matched {n24}/{tot24}")
    print(f"  2023 matched {n23}/{tot23}")
    if unmatched_24 or unmatched_23:
        print("  unmatched 2024", unmatched_24)
        print("  unmatched 2023", unmatched_23)
        print("  geo names", names)
        sys.exit(1)
    if n24 != 33 or n23 != 33:
        sys.exit(f"expected 33 departments, got {n24}/{n23}")

    out_2024, regions_2024 = relabel(out_2024, regions_2024)
    _, regions_2023 = relabel(out_2023, regions_2023)

    geo_url = more.write_geo("col-tfr", out_2024, max_pts=80)
    source_url = (
        "https://www.dane.gov.co/index.php/estadisticas-por-tema/"
        "salud/nacimientos-y-defunciones/nacimientos/nacimientos-2024"
    )
    note = (
        "DANE Estadísticas Vitales, tasa global de fecundidad by the mother's "
        "department of residence, published to one decimal. 2023 national TGF "
        "is 1.2; 2024 is 1.1. San Andrés is drawn; the map frames the mainland. "
        "Two-decimal maps circulating on social media are not the published TGF table."
    )
    common = dict(
        iso3="COL",
        country="Colombia",
        kind="department",
        sourceUrl=source_url,
        credit="DANE, Estadísticas Vitales.",
        geoUrl=geo_url,
        scale="plasma",
        labelValues=True,
        note=note,
    )
    entry_2024 = more.catalog_entry(
        **common,
        id="col-tfr-2024",
        title="Total fertility rate, Colombia 2024",
        year=2024,
        national=1.1,
        source=(
            "DANE, Estadísticas Vitales — tasa global de fecundidad by department "
            "of mother's residence, 2024 (Tabla 1 in the Feb 2026 vital-statistics "
            "bulletin). National TGF 1.1."
        ),
        highlights=[
            {"name": "Caldas", "value": 0.7},
            {"name": "Vaupés", "value": 2.0},
        ],
        regions=regions_2024,
    )
    entry_2023 = more.catalog_entry(
        **common,
        id="col-tfr-2023",
        title="Total fertility rate, Colombia 2023",
        year=2023,
        national=1.2,
        source=(
            "DANE, Estadísticas Vitales — tasa global de fecundidad by department "
            "of mother's residence, 2023 (Tabla 2 in the 19 Dec 2024 births bulletin). "
            "National TGF 1.2."
        ),
        highlights=[
            {"name": "Bogotá", "value": 0.9},
            {"name": "La Guajira", "value": 2.2},
        ],
        regions=regions_2023,
    )

    catalog = json.loads(more.CATALOG.read_text())
    maps = [m for m in catalog["maps"] if not str(m["id"]).startswith("col-tfr")]
    maps.extend([entry_2024, entry_2023])
    more.CATALOG.write_text(
        json.dumps({"maps": maps}, indent=2) + "\n", encoding="utf-8"
    )
    print(f"wrote col-tfr (33 departments, 2023–2024) catalog now {len(maps)} maps")


if __name__ == "__main__":
    main()
