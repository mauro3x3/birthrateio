#!/usr/bin/env python3
"""Build Japan regional TFR series (Kyushu, Hokkaido/Tohoku, Tokyo).

Reads MHLW Vital Statistics table 4-5 (prefecture TFR trends) from
.tmp/jpn-45.txt (UTF-8 CSV extract of the e-Stat / IPSS file) and writes
src/lib/data/japan-tfr-by-region.json.

Regional lines are unweighted (simple) averages of prefecture TFRs — the same
construction used by the Japan Research Institute / nippon.com chart.
Okinawa is excluded from Kyushu.

Years missing from table 4-5 between 2000 and 2024 (2001–2004, 2006) are
linearly interpolated between adjacent published years.

Refresh .tmp/jpn-45.txt from e-Stat table 4-5 before re-running when new
vital-statistics years are released.
"""

from __future__ import annotations

import csv
import io
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / ".tmp" / "jpn-45.txt"
OUT = ROOT / "src" / "lib" / "data" / "japan-tfr-by-region.json"

TOHOKU = ["北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"]
KYUSHU = ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県"]
TOKYO = "東京都"
NEED = list(range(2000, 2025))


def load_prefs(text: str) -> dict[str, dict[int, float]]:
    rows = list(csv.reader(io.StringIO(text)))
    years: list[int] | None = None
    start = 0
    for i, row in enumerate(rows):
        if row and row[0].strip() == "" and "1960" in ",".join(row):
            years = []
            for x in row[1:]:
                x = x.strip()
                if not x:
                    continue
                try:
                    years.append(int(float(x)))
                except ValueError:
                    pass
            start = i + 1
            break
    if not years:
        raise SystemExit("year header not found in jpn-45.txt")

    prefs: dict[str, dict[int, float]] = {}
    for row in rows[start:]:
        if not row or not row[0].strip():
            continue
        raw = row[0].strip().replace("　", "")
        if raw.startswith("注") or raw.startswith("資料"):
            continue
        parts = row[0].strip().split(" ", 1)
        if len(parts) == 2 and parts[0][:1].isdigit():
            key = parts[1].replace("　", "")
        elif "全国" in raw:
            key = "National"
        else:
            key = raw
        vals: dict[int, float] = {}
        for y, v in zip(years, row[1:]):
            try:
                vals[int(y)] = float(v)
            except ValueError:
                pass
        prefs[key] = vals
    return prefs


def value_at(series: dict[int, float], year: int) -> tuple[float | None, bool]:
    if year in series:
        return series[year], False
    lo = max((a for a in series if a < year), default=None)
    hi = min((a for a in series if a > year), default=None)
    if lo is None or hi is None:
        return None, False
    t = (year - lo) / (hi - lo)
    return series[lo] + (series[hi] - series[lo]) * t, True


def region_avg(
    prefs: dict[str, dict[int, float]], keys: list[str], year: int
) -> tuple[float, bool]:
    vals: list[float] = []
    interp = False
    for key in keys:
        v, was = value_at(prefs[key], year)
        if v is None:
            continue
        vals.append(v)
        interp = interp or was
    if not vals:
        raise SystemExit(f"no values for {keys} in {year}")
    return round(sum(vals) / len(vals), 2), interp


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"missing {SRC} — extract MHLW table 4-5 CSV first")
    prefs = load_prefs(SRC.read_text(encoding="utf-8"))
    for key in TOHOKU + KYUSHU + [TOKYO]:
        if key not in prefs:
            raise SystemExit(f"missing prefecture {key}")

    series_rows = []
    interp_years: list[int] = []
    for year in NEED:
        kyushu, i1 = region_avg(prefs, KYUSHU, year)
        tohoku, i2 = region_avg(prefs, TOHOKU, year)
        tokyo_v, i3 = value_at(prefs[TOKYO], year)
        assert tokyo_v is not None
        tokyo = round(tokyo_v, 2)
        if i1 or i2 or i3:
            interp_years.append(year)
        series_rows.append(
            {
                "year": year,
                "Kyushu": kyushu,
                "Hokkaido / Tohoku": tohoku,
                "Tokyo": tokyo,
            }
        )

    pack = {
        "id": "japan-tfr-by-region",
        "title": "Japan’s total fertility rate by region",
        "headline": "Kyushu, Hokkaido/Tohoku, and Tokyo",
        "slug": "japan",
        "iso3": "JPN",
        "unit": "children per woman",
        "decimals": 2,
        "regions": [
            {
                "id": "kyushu",
                "name": "Kyushu",
                "prefectures": [
                    "Fukuoka",
                    "Saga",
                    "Nagasaki",
                    "Kumamoto",
                    "Oita",
                    "Miyazaki",
                    "Kagoshima",
                ],
                "note": "Simple average of seven Kyushu prefectures (excludes Okinawa).",
            },
            {
                "id": "hokkaido-tohoku",
                "name": "Hokkaido / Tohoku",
                "prefectures": [
                    "Hokkaido",
                    "Aomori",
                    "Iwate",
                    "Miyagi",
                    "Akita",
                    "Yamagata",
                    "Fukushima",
                ],
                "note": "Simple average of Hokkaido and the six Tohoku prefectures.",
            },
            {
                "id": "tokyo",
                "name": "Tokyo",
                "prefectures": ["Tokyo"],
                "note": "Tokyo Metropolis prefecture TFR.",
            },
        ],
        "seriesKeys": ["Kyushu", "Hokkaido / Tohoku", "Tokyo"],
        "colors": {
            "Kyushu": "#c9a227",
            "Hokkaido / Tohoku": "#2a9d8f",
            "Tokyo": "#c45c26",
        },
        "series": series_rows,
        "interpolatedYears": interp_years,
        "source": (
            "Ministry of Health, Labour and Welfare, Vital Statistics "
            "(table 4-5: trends in total fertility rates by prefecture), "
            "via e-Stat / IPSS Population Statistics of Japan."
        ),
        "sourceUrl": "https://www.e-stat.go.jp/en/stat-search/files?stat_infid=000040320380",
        "note": (
            "Regional lines are unweighted (simple) averages of prefecture TFRs, "
            "matching the Japan Research Institute / nippon.com presentation. "
            "Okinawa is excluded from Kyushu. Years without a published prefecture "
            "figure in table 4-5 (2001–2004, 2006) are linearly interpolated between "
            "adjacent published years."
        ),
        "yearFrom": 2000,
        "yearTo": 2024,
    }
    OUT.write_text(json.dumps(pack, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {OUT} ({len(series_rows)} years, interp={interp_years})")
    print("2024", series_rows[-1])


if __name__ == "__main__":
    main()
