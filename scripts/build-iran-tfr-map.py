#!/usr/bin/env python3
"""Build only the Iran 2025 provincial TFR map (BirthGauge). Does not rewrite other maps."""

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

# BirthGauge, 20 Aug 2026 — TFR by ostān, 2025. National 1.47.
# Labels read from https://x.com/BirthGauge/status/2090510597460795531
# (three sub-1.0 provinces; Tehran+Alborz metro 1.02).
IRAN_BIRTHGAUGE_2025 = {
    "West Azerbaijan": 1.65,
    "East Azerbaijan": 1.36,
    "Ardabil": 1.42,
    "Gilan": 0.91,
    "Mazandaran": 0.92,
    "Golestan": 1.83,
    "North Khorasan": 1.80,
    "Razavi Khorasan": 1.76,
    "South Khorasan": 2.23,
    "Sistan and Baluchestan": 3.34,
    "Hormozgan": 1.82,
    "Kerman": 1.58,
    "Yazd": 1.72,
    "Isfahan": 1.17,
    "Fars": 1.27,
    "Bushehr": 1.21,
    "Kohgiluyeh and Boyer-Ahmad": 1.49,
    "Chaharmahal and Bakhtiari": 1.69,
    "Khuzestan": 2.14,
    "Ilam": 1.34,
    "Lorestan": 1.62,
    "Kermanshah": 1.39,
    "Kurdistan": 1.43,
    "Hamadan": 1.54,
    "Markazi": 1.07,
    "Qom": 1.53,
    "Tehran": 1.05,
    "Alborz": 0.88,
    "Qazvin": 1.25,
    "Zanjan": 1.56,
    "Semnan": 1.00,
}


def main() -> None:
    more.ALIASES_BY_ISO["IRN"] = {}

    print("geoBoundaries Iran ADM1…", flush=True)
    feats = more.geoboundaries_adm1("IRN")
    names = sorted({more.admin1_name(f) for f in feats})
    print("  provinces", len(names), names[:8], "…")

    out_feats, regions, n, tot, unmatched = more.match_admin1(
        "IRN", IRAN_BIRTHGAUGE_2025, feats, "iran"
    )
    print(f"  matched {n}/{tot}")
    if unmatched:
        print("  unmatched", unmatched)
        print("  geo names", names)
        sys.exit(1)
    if n != 31:
        sys.exit(f"expected 31 provinces, got {n}")

    entry = more.catalog_entry(
        id="irn-tfr",
        iso3="IRN",
        country="Iran",
        title="Total fertility rate, Iran 2025",
        kind="province",
        year=2025,
        national=1.47,
        source="BirthGauge, Total Fertility Rate (Children per Woman), Iran 2025 — provincial TFR estimated from registered births by province and the age structure on citypopulation.de. National TFR 1.47.",
        sourceUrl="https://x.com/BirthGauge/status/2090510597460795531",
        credit="Provincial estimates compiled by BirthGauge (@BirthGauge).",
        geoUrl=more.write_geo("irn-tfr", out_feats, max_pts=80),
        scale="plasma",
        labelValues=True,
        highlights=[
            {"name": "Alborz", "value": 0.88},
            {"name": "Sistan and Baluchestan", "value": 3.34},
        ],
        note="Statistical Centre of Iran has not published a provincial TFR table for 2025. These are BirthGauge estimates from provincial birth counts and citypopulation.de age structure. The Tehran metropolitan area (Tehran + Alborz) is 1.02. Not official SCI TFR.",
        regions=regions,
    )

    catalog = json.loads(more.CATALOG.read_text())
    maps = [m for m in catalog["maps"] if m["id"] != "irn-tfr"]
    maps.append(entry)
    more.CATALOG.write_text(
        json.dumps({"maps": maps}, indent=2) + "\n", encoding="utf-8"
    )
    print(f"wrote irn-tfr ({n} provinces) catalog now {len(maps)} maps")


if __name__ == "__main__":
    main()
