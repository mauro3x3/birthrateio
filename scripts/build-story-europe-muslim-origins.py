#!/usr/bin/env python3
"""Build the Europe “born in Muslim-majority countries” bar-chart race pack.

Uses UN DESA International Migrant Stock corridors already in
src/lib/data/migration-flows.json. This is NOT a religion census — it counts
residents born in destinations of Muslim-majority origin countries.
"""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FLOWS = ROOT / "src" / "lib" / "data" / "migration-flows.json"
OUT = ROOT / "src" / "lib" / "data" / "stories" / "europe-muslim-majority-origins.json"

# Geographic Europe destinations (exclude Muslim-majority destinations so the
# race is about receiving countries, not Turkey/Albania as hosts).
EUROPE_DEST = {
    "AUT",
    "BEL",
    "BGR",
    "BIH",
    "CHE",
    "CYP",
    "CZE",
    "DEU",
    "DNK",
    "ESP",
    "EST",
    "FIN",
    "FRA",
    "GBR",
    "GRC",
    "HRV",
    "HUN",
    "IRL",
    "ISL",
    "ITA",
    "LTU",
    "LUX",
    "LVA",
    "MDA",
    "MKD",
    "MLT",
    "MNE",
    "NLD",
    "NOR",
    "POL",
    "PRT",
    "ROU",
    "SRB",
    "SVK",
    "SVN",
    "SWE",
    "UKR",
}

# Origins where Muslims are a clear majority of the population (Pew / census).
# Excludes evenly split cases (e.g. Nigeria ~50/50).
MUSLIM_MAJORITY_ORIGIN = set(
    """
    AFG ALB DZA AZE BHR BGD BRN BFA TCD COM DJI EGY GMB GIN IDN IRN IRQ JOR
    KAZ XKX KWT KGZ LBN LBY MYS MDV MLI MRT MAR NER OMN PAK PSE QAT SAU SEN
    SLE SOM SDN SYR TJK TUN TUR TKM ARE UZB YEM ESH GNB
    """.split()
)

NAMES = {
    "AUT": ("Austria", "🇦🇹"),
    "BEL": ("Belgium", "🇧🇪"),
    "BGR": ("Bulgaria", "🇧🇬"),
    "BIH": ("Bosnia and Herzegovina", "🇧🇦"),
    "CHE": ("Switzerland", "🇨🇭"),
    "CYP": ("Cyprus", "🇨🇾"),
    "CZE": ("Czechia", "🇨🇿"),
    "DEU": ("Germany", "🇩🇪"),
    "DNK": ("Denmark", "🇩🇰"),
    "ESP": ("Spain", "🇪🇸"),
    "EST": ("Estonia", "🇪🇪"),
    "FIN": ("Finland", "🇫🇮"),
    "FRA": ("France", "🇫🇷"),
    "GBR": ("United Kingdom", "🇬🇧"),
    "GRC": ("Greece", "🇬🇷"),
    "HRV": ("Croatia", "🇭🇷"),
    "HUN": ("Hungary", "🇭🇺"),
    "IRL": ("Ireland", "🇮🇪"),
    "ISL": ("Iceland", "🇮🇸"),
    "ITA": ("Italy", "🇮🇹"),
    "LTU": ("Lithuania", "🇱🇹"),
    "LUX": ("Luxembourg", "🇱🇺"),
    "LVA": ("Latvia", "🇱🇻"),
    "MDA": ("Moldova", "🇲🇩"),
    "MKD": ("North Macedonia", "🇲🇰"),
    "MLT": ("Malta", "🇲🇹"),
    "MNE": ("Montenegro", "🇲🇪"),
    "NLD": ("Netherlands", "🇳🇱"),
    "NOR": ("Norway", "🇳🇴"),
    "POL": ("Poland", "🇵🇱"),
    "PRT": ("Portugal", "🇵🇹"),
    "ROU": ("Romania", "🇷🇴"),
    "SRB": ("Serbia", "🇷🇸"),
    "SVK": ("Slovakia", "🇸🇰"),
    "SVN": ("Slovenia", "🇸🇮"),
    "SWE": ("Sweden", "🇸🇪"),
    "UKR": ("Ukraine", "🇺🇦"),
}

# Soft continent-ish colours for bars (Europe palette).
COLORS = {
    "DEU": "#1a5276",
    "FRA": "#2874a6",
    "GBR": "#5dade2",
    "ITA": "#922b21",
    "ESP": "#c0392b",
    "NLD": "#e67e22",
    "SWE": "#1e8449",
    "BEL": "#7d3c98",
    "AUT": "#b9770e",
    "CHE": "#1abc9c",
    "DNK": "#d35400",
    "NOR": "#16a085",
    "FIN": "#2980b9",
    "GRC": "#8e44ad",
    "PRT": "#27ae60",
    "IRL": "#229954",
    "POL": "#c0392b",
    "ROU": "#f39c12",
    "CZE": "#5499c7",
    "HUN": "#a93226",
}


def main() -> None:
    data = json.loads(FLOWS.read_text())
    years: list[int] = data["years"]
    totals: dict[str, dict[int, float]] = defaultdict(lambda: defaultdict(float))

    for dest, origin, values in data["flows"]:
        if dest not in EUROPE_DEST:
            continue
        if origin not in MUSLIM_MAJORITY_ORIGIN:
            continue
        for i, v in enumerate(values):
            if v is None:
                continue
            totals[dest][years[i]] += float(v)

    series = []
    for iso3, by_year in sorted(totals.items()):
        name, flag = NAMES.get(iso3, (iso3, ""))
        series.append(
            {
                "id": iso3.lower(),
                "iso3": iso3,
                "name": name,
                "flag": flag,
                "color": COLORS.get(iso3, "#5d6d7e"),
                "values": {str(y): round(by_year[y]) for y in years if y in by_year},
            }
        )

    # Keep countries that appear in at least half the years.
    series = [s for s in series if len(s["values"]) >= max(1, len(years) // 2)]
    series.sort(key=lambda s: -max(s["values"].values()))

    pack = {
        "id": "europe-muslim-majority-origins",
        "slug": "europe-muslim-majority-origins",
        "title": "Born in Muslim-majority countries — Europe",
        "subtitle": "Foreign-born stock from Muslim-majority origins, 1990–2024",
        "metricLabel": "Residents",
        "metricKind": "count",
        "unit": "",
        "decimals": 0,
        "topN": 15,
        "years": years,
        "note": "UN DESA International Migrant Stock: people living in each European country who were born in a Muslim-majority country. This is not a religion census — European-born children of those communities are not counted, and some origin countries are religiously mixed. Turkey, Albania and Kosovo are treated as origins, not as destinations in this race.",
        "source": "UN DESA International Migrant Stock 2024 (bilateral corridors compiled from national statistical offices).",
        "sourceUrl": "https://www.un.org/development/desa/pd/content/international-migrant-stock",
        "sidebarTitle": "Europe total (selected destinations)",
        "series": series,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(pack, indent=2) + "\n")
    print(f"wrote {OUT} ({len(series)} countries, years {years})")
    # Preview latest ranking
    latest = str(years[-1])
    ranked = sorted(
        ((s["name"], s["values"].get(latest, 0)) for s in series),
        key=lambda x: -x[1],
    )[:10]
    for i, (n, v) in enumerate(ranked, 1):
        print(f"  {i:2}. {n}: {v:,.0f}")


if __name__ == "__main__":
    main()
