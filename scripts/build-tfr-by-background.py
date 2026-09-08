#!/usr/bin/env python3
"""Latest DHS STATcompiler TFR by education and wealth quintile."""

from __future__ import annotations

import json
import ssl
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "lib" / "data" / "tfr-by-background-dhs.json"
DHS = "https://api.dhsprogram.com/rest/dhs"
CTX = ssl.create_default_context()
UA = {"User-Agent": "birthrate.io/dhs-background"}

EDU_ORDER = ["No education", "Primary", "Secondary", "Higher"]
WEALTH_ORDER = ["Lowest", "Second", "Middle", "Fourth", "Highest"]


def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=180, context=CTX) as r:
        return json.loads(r.read())


def dhs_iso3(countries: list[dict]) -> dict[str, str]:
    out = {}
    for c in countries:
        code2 = (c.get("DHS_CountryCode") or "").upper()
        iso = (c.get("ISONum") or "")
        # ISO3 is not always present; CountryName + ISO2 mapping below.
        iso3 = (c.get("ISO3") or c.get("iso3") or "").upper()
        if code2 and iso3 and len(iso3) == 3:
            out[code2] = iso3
    return out


# DHS country code → ISO3 for surveys that omit ISO3 on the survey record.
ISO3_FALLBACK = {
    "AO": "AGO", "BD": "BGD", "BF": "BFA", "BJ": "BEN", "BO": "BOL",
    "BU": "BDI", "CD": "COD", "CI": "CIV", "CM": "CMR", "CO": "COL",
    "DR": "DOM", "EG": "EGY", "ET": "ETH", "GA": "GAB", "GH": "GHA",
    "GN": "GIN", "GT": "GTM", "GU": "GTM", "GY": "GUY", "HN": "HND", "HT": "HTI",
    "IA": "IND", "ID": "IDN", "JO": "JOR", "KE": "KEN", "KH": "KHM",
    "KM": "COM", "LB": "LBR", "LS": "LSO", "MD": "MDG", "ML": "MLI",
    "MM": "MMR", "MW": "MWI", "MZ": "MOZ", "NG": "NGA", "NI": "NIC",
    "NP": "NPL", "PE": "PER", "PH": "PHL", "PK": "PAK", "RW": "RWA",
    "SL": "SLE", "SN": "SEN", "SZ": "SWZ", "TD": "TCD", "TG": "TGO",
    "TJ": "TJK", "TL": "TLS", "TZ": "TZA", "UG": "UGA", "UZ": "UZB",
    "VN": "VNM", "YE": "YEM", "ZA": "ZAF", "ZM": "ZMB", "ZW": "ZWE",
    "AF": "AFG", "AM": "ARM", "AZ": "AZE", "AL": "ALB", "BA": "BIH",
    "BT": "BTN", "CV": "CPV", "ER": "ERI", "GM": "GMB", "KZ": "KAZ",
    "KG": "KGZ", "LA": "LAO", "MV": "MDV", "MR": "MRT", "MA": "MAR",
    "NM": "NAM", "PG": "PNG", "ST": "STP", "TR": "TUR", "UA": "UKR",
}


def pick_latest_surveys(surveys: list[dict]) -> list[dict]:
    by_country: dict[str, dict] = {}
    for s in surveys:
        if (s.get("SurveyType") or "") != "DHS":
            continue
        if (s.get("SurveyStatus") or "") not in ("Completed", "Ongoing"):
            continue
        year = int(s.get("SurveyYear") or 0)
        if year < 2015:
            continue
        code = (s.get("SurveyId") or "")
        cc = (s.get("DHS_CountryCode") or "").upper()
        if not code or not cc:
            continue
        prev = by_country.get(cc)
        if prev is None or year > int(prev["SurveyYear"]):
            by_country[cc] = s
    return sorted(by_country.values(), key=lambda s: s.get("CountryName") or "")


def ordered(rows: dict[str, float], order: list[str]) -> list[dict]:
    out = []
    for lab in order:
        if lab in rows and rows[lab] is not None:
            out.append({"group": lab, "value": round(float(rows[lab]), 2)})
    return out


def main():
    countries = fetch_json(f"{DHS}/countries?f=json").get("Data") or []
    iso_from_api = dhs_iso3(countries)
    surveys = fetch_json(f"{DHS}/surveys?f=json").get("Data") or []
    latest = pick_latest_surveys(surveys)
    print(f"latest DHS since 2015: {len(latest)}")

    out_countries = []
    for s in latest:
        sid = s["SurveyId"]
        year = int(s["SurveyYear"])
        name = s.get("CountryName") or sid
        cc = (s.get("DHS_CountryCode") or "").upper()
        iso3 = iso_from_api.get(cc) or ISO3_FALLBACK.get(cc)
        if not iso3:
            print(f"  skip {sid} (no iso3 for {cc})")
            continue
        url = (
            f"{DHS}/data?indicatorIds=FE_FRTR_W_TFR&surveyIds={sid}"
            "&breakdown=background&f=json&perpage=500"
        )
        payload = fetch_json(url)
        recs = payload.get("Data") or []
        nat_payload = fetch_json(
            f"{DHS}/data?indicatorIds=FE_FRTR_W_TFR&surveyIds={sid}"
            "&breakdown=national&f=json"
        )
        national = None
        for r in nat_payload.get("Data") or []:
            if r.get("Value") is not None:
                national = float(r["Value"])
                break
        edu: dict[str, float] = {}
        wealth: dict[str, float] = {}
        for r in recs:
            cat = r.get("CharacteristicCategory") or ""
            lab = (r.get("CharacteristicLabel") or "").strip()
            val = r.get("Value")
            if val is None:
                continue
            if cat == "Education" and lab in EDU_ORDER:
                edu[lab] = float(val)
            elif cat == "Wealth quintile" and lab in WEALTH_ORDER:
                wealth[lab] = float(val)
        edu_rows = ordered(edu, EDU_ORDER)
        wealth_rows = ordered(wealth, WEALTH_ORDER)
        if len(edu_rows) < 3 and len(wealth_rows) < 3:
            print(f"  skip {sid} (no education/wealth TFR)")
            continue
        out_countries.append(
            {
                "iso3": iso3,
                "country": name,
                "survey": sid,
                "year": year,
                "national": round(national, 2) if national is not None else None,
                "education": edu_rows,
                "wealth": wealth_rows,
            }
        )
        print(
            f"  {iso3} {year} edu={len(edu_rows)} wealth={len(wealth_rows)} nat={national}"
        )

    payload = {
        "updated": "2026-09-08",
        "indicator": "FE_FRTR_W_TFR",
        "unit": "children per woman",
        "source": "DHS STATcompiler, total fertility rate (FE_FRTR_W_TFR) by education and wealth quintile, latest Demographic and Health Survey from 2015 onward.",
        "sourceUrl": "https://www.statcompiler.com/en/",
        "note": "Each country is one survey. TFR is for the three years before interview. Education groups are No education / Primary / Secondary / Higher. Wealth is the DHS household wealth quintile, not income. Surveys are not comparable as a time series across countries.",
        "countries": out_countries,
    }
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(out_countries)} countries)")


if __name__ == "__main__":
    main()
