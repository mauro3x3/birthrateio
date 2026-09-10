#!/usr/bin/env python3
"""Update the Africa country TFR map with recent DHS/NSO figures.

Does not rewrite other maps. Congo-Brazzaville EDSC-III 2025 is not yet in
STATcompiler, so that national 3.5 is taken from the Key Indicators Report.
South Africa uses Stats SA 2026 (2.12), not SADHS 2016.
"""

from __future__ import annotations

import json
import ssl
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "src" / "lib" / "data" / "subnational-maps.json"
BG = ROOT / "src" / "lib" / "data" / "birthgauge-2026.json"
GEO = ROOT / "public" / "geo" / "maps" / "africa-tfr.json"
CACHE = ROOT / ".tmp-map-build"
CACHE.mkdir(exist_ok=True)

CTX = ssl.create_default_context()
UA = {"User-Agent": "birthrate.io/maps-builder"}
DHS = "https://api.dhsprogram.com/rest/dhs"

DHS_TO_ISO3 = {
    "AO": "AGO",
    "BF": "BFA",
    "BJ": "BEN",
    "BI": "BDI",
    "BW": "BWA",
    "CD": "COD",
    "CF": "CAF",
    "CG": "COG",
    "CI": "CIV",
    "CM": "CMR",
    "CV": "CPV",
    "ET": "ETH",
    "GA": "GAB",
    "GH": "GHA",
    "GM": "GMB",
    "GN": "GIN",
    "GQ": "GNQ",
    "GW": "GNB",
    "KE": "KEN",
    "KM": "COM",
    "LB": "LBR",
    "LS": "LSO",
    "MD": "MDG",
    "ML": "MLI",
    "MR": "MRT",
    "MW": "MWI",
    "MZ": "MOZ",
    "NA": "NAM",
    "NG": "NGA",
    "NI": "NER",
    "RW": "RWA",
    "SL": "SLE",
    "SN": "SEN",
    "SO": "SOM",
    "ST": "STP",
    "SZ": "SWZ",
    "TD": "TCD",
    "TG": "TGO",
    "TZ": "TZA",
    "UG": "UGA",
    "ZA": "ZAF",
    "ZM": "ZMB",
    "ZW": "ZWE",
}

# Official figures not (yet) in STATcompiler / newer than BirthGauge.
MANUAL = {
    "COG": {
        "value": 3.5,
        "year": 2025,
        "label": "EDSC-III 2025",
        "source": "INS/ICF, Congo DHS 2025 Key Indicators Report (PR167) — ISF 3.5 (urban 3.0, rural 5.3).",
    },
    "ZAF": {
        "value": 2.12,
        "year": 2026,
        "label": "Stats SA 2026",
        "source": "Statistics South Africa, TFR 2.12 in 2026 (via BirthGauge). Replacement cited as 2.16.",
    },
}


def fetch_json(url: str, dest: Path | None = None):
    if dest and dest.exists() and dest.stat().st_size > 200:
        return json.loads(dest.read_text())
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=180, context=CTX) as r:
        data = json.loads(r.read())
    if dest:
        dest.write_text(json.dumps(data), encoding="utf-8")
    return data


def dhs_latest() -> dict[str, dict]:
    surveys = fetch_json(
        f"{DHS}/surveys?surveyYearStart=2020&f=json&perpage=1000",
        CACHE / "dhs-surveys-2020.json",
    )["Data"]
    out: dict[str, dict] = {}
    for r in surveys:
        if r.get("RegionName") != "Sub-Saharan Africa":
            continue
        if r.get("SurveyType") not in ("DHS", "MIS"):
            continue
        iso = DHS_TO_ISO3.get(r["DHS_CountryCode"])
        if not iso:
            continue
        sid = r["SurveyId"]
        data = fetch_json(
            f"{DHS}/data?indicatorIds=FE_FRTR_W_TFR&surveyIds={sid}&breakdown=national&f=json",
            CACHE / f"dhs-nat-{sid}.json",
        ).get("Data") or []
        val = None
        for row in data:
            if row.get("Value") is not None:
                val = round(float(row["Value"]), 2)
                break
        if val is None:
            continue
        year = int(str(r["SurveyYear"])[:4])
        prev = out.get(iso)
        if prev is None or year > prev["year"] or (
            year == prev["year"] and r["SurveyType"] == "DHS" and prev.get("type") == "MIS"
        ):
            out[iso] = {
                "value": val,
                "year": year,
                "survey": sid,
                "label": r["SurveyYearLabel"],
                "type": r["SurveyType"],
            }
    return out


def iso_by_slug() -> dict[str, str]:
    gj = json.loads(GEO.read_text())
    out = {}
    for feat in gj["features"]:
        p = feat.get("properties") or {}
        if p.get("slug") and p.get("iso3"):
            out[p["slug"]] = p["iso3"]
    return out


def latest_bg(row: dict) -> tuple[float, int] | None:
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
    y, v = max(years)
    return round(v, 2), y


def main() -> None:
    dhs = dhs_latest()
    print("DHS/MIS national", len(dhs))

    bg_by = {}
    for row in json.loads(BG.read_text())["rows"]:
        iso = row.get("iso3")
        hit = latest_bg(row)
        if iso and hit:
            bg_by[iso] = hit

    # Prefer: manual NSO/KIR, then latest DHS, then BirthGauge.
    chosen: dict[str, dict] = {}
    for iso, d in dhs.items():
        chosen[iso] = {**d, "via": "dhs"}
    for iso, (val, year) in bg_by.items():
        if iso not in chosen:
            chosen[iso] = {"value": val, "year": year, "via": "birthgauge"}
    for iso, d in MANUAL.items():
        chosen[iso] = {**d, "via": "manual"}

    iso_of = iso_by_slug()
    catalog = json.loads(CATALOG.read_text())
    africa = next(m for m in catalog["maps"] if m["id"] == "africa-tfr")
    n_dhs = n_bg = n_man = n_wb = 0
    years = []
    for r in africa["regions"]:
        iso = iso_of.get(r["slug"])
        hit = chosen.get(iso) if iso else None
        if not hit:
            n_wb += 1
            continue
        r["value"] = hit["value"]
        years.append(hit["year"])
        via = hit.get("via")
        if via == "manual":
            n_man += 1
        elif via == "dhs":
            n_dhs += 1
        else:
            n_bg += 1
        print(f"  {iso:3} {r['name']:28} {hit['value']} ({hit.get('label') or hit.get('year')} {via})")

    vals = [r["value"] for r in africa["regions"] if r.get("value") is not None]
    africa["min"] = round(min(vals), 2)
    africa["max"] = round(max(vals), 2)
    africa["year"] = max(years) if years else africa.get("year")
    africa["title"] = "Total fertility rate, Africa 2026"
    africa["credit"] = (
        "Recent DHS national TFR via STATcompiler; Congo 2025 KIR; "
        "South Africa Stats SA 2026 via BirthGauge."
    )
    africa["source"] = (
        "DHS STATcompiler FE_FRTR_W_TFR (latest survey since 2020), Congo DHS 2025 "
        "Key Indicators Report (PR167, ISF 3.5), Statistics South Africa TFR 2026 "
        "(2.12), BirthGauge for Egypt, Tunisia, Algeria and Mauritius, otherwise World Bank WDI."
    )
    africa["sourceUrl"] = "https://www.statcompiler.com/en/"
    africa["note"] = (
        f"Mixed vintage. {n_dhs} countries use a 2020–25 DHS/MIS national TFR, "
        f"Congo-Brazzaville is EDSC-III 2025 (3.5), South Africa is Stats SA 2026 (2.12), "
        f"{n_bg} countries use BirthGauge (Egypt, Tunisia, Algeria, Mauritius), "
        f"{n_wb} remain World Bank WDI. "
        "DHS TFR is for the three years before interview, not a single calendar year."
    )

    CATALOG.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")

    bg = json.loads(BG.read_text())
    for row in bg["rows"]:
        if row.get("iso3") == "ZAF":
            row.setdefault("tfr", {})["2026"] = 2.12
    BG.write_text(json.dumps(bg, indent=2) + "\n", encoding="utf-8")
    print(f"updated africa-tfr DHS {n_dhs} manual {n_man} BirthGauge {n_bg} WDI {n_wb}")


if __name__ == "__main__":
    main()
