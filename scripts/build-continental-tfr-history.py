#!/usr/bin/env python3
"""Add World Bank decade TFR frames (1960–2020) to every continental country map.

Keeps the existing latest frame (BirthGauge / mixed vintage overlays) and shares
the same geoUrl so the map explorer year scrubber works like Pan-Asia.

Usage: PYTHONPATH=.tmp-pylib:$PYTHONPATH python3 scripts/build-continental-tfr-history.py
"""

from __future__ import annotations

import json
import ssl
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "src" / "lib" / "data" / "subnational-maps.json"
CACHE = ROOT / ".tmp-map-build"
CACHE.mkdir(exist_ok=True)

CTX = ssl.create_default_context()
UA = {"User-Agent": "birthrate.io/maps-builder"}

YEARS = [1960, 1970, 1980, 1990, 2000, 2010, 2020]

# Latest overlay ids — history frames use the same geo, do not replace these.
CONTINENTAL = [
    {
        "id": "eu-tfr",
        "iso3": "EU",
        "country": "European Union",
        "kind": "country",
        "title": "Total fertility rate, European Union {year}",
        "domain": (1.0, 4.0),
    },
    {
        "id": "mena-tfr",
        "iso3": "MENA",
        "country": "Middle East & North Africa",
        "kind": "country",
        "title": "Total fertility rate, Middle East & North Africa {year}",
        "domain": (1.0, 9.0),
    },
    {
        "id": "caribbean-tfr",
        "iso3": "CARIBBEAN",
        "country": "Caribbean",
        "kind": "country",
        "title": "Total fertility rate, Caribbean {year}",
        "domain": (1.0, 7.0),
    },
    {
        "id": "southamerica-tfr",
        "iso3": "SOUTHAMERICA",
        "country": "South America",
        "kind": "country",
        "title": "Total fertility rate, South America {year}",
        "domain": (1.0, 7.5),
    },
    {
        "id": "africa-tfr",
        "iso3": "AFRICA",
        "country": "Africa",
        "kind": "country",
        "title": "Total fertility rate, Africa {year}",
        "domain": (1.0, 8.5),
    },
    {
        "id": "seasia-tfr",
        "iso3": "SEASIA",
        "country": "Southeast Asia",
        "kind": "country",
        "title": "Total fertility rate, Southeast Asia {year}",
        "domain": (1.0, 7.5),
    },
    {
        "id": "centralamerica-tfr",
        "iso3": "CENTRALAMERICA",
        "country": "Central America",
        "kind": "country",
        "title": "Total fertility rate, Central America {year}",
        "domain": (1.0, 8.0),
    },
    {
        "id": "centralasia-tfr",
        "iso3": "CENTRALASIA",
        "country": "Central Asia",
        "kind": "country",
        "title": "Total fertility rate, Central Asia {year}",
        "domain": (1.0, 7.5),
    },
    {
        "id": "northamerica-tfr",
        "iso3": "NORTHAMERICA",
        "country": "North America",
        "kind": "country",
        "title": "Total fertility rate, North America {year}",
        "domain": (1.0, 4.5),
    },
    {
        "id": "oceania-tfr",
        "iso3": "OCEANIA",
        "country": "Oceania",
        "kind": "country",
        "title": "Total fertility rate, Oceania {year}",
        "domain": (1.0, 7.5),
    },
]

SOURCE = (
    "World Bank World Development Indicators, SP.DYN.TFRT.IN — "
    "total fertility rate (births per woman), {year} "
    "(±2 years when the calendar year is missing)."
)
SOURCE_URL = "https://data.worldbank.org/indicator/SP.DYN.TFRT.IN"


def fetch_wb_history() -> dict[str, dict[int, tuple[float, str]]]:
    out: dict[str, dict[int, tuple[float, str]]] = {}
    page = 1
    while True:
        dest = CACHE / f"wb-tfr-hist-p{page}.json"
        if dest.exists():
            payload = json.loads(dest.read_text())
        else:
            url = (
                "https://api.worldbank.org/v2/country/all/indicator/SP.DYN.TFRT.IN"
                f"?format=json&date=1960:2025&per_page=20000&page={page}"
            )
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, context=CTX, timeout=120) as r:
                payload = json.loads(r.read().decode())
            dest.write_text(json.dumps(payload))
        meta, rows = payload[0], payload[1]
        for row in rows:
            iso = (row.get("countryiso3code") or "").upper()
            if len(iso) != 3 or row.get("value") is None:
                continue
            year = int(row["date"])
            name = row["country"]["value"]
            out.setdefault(iso, {})[year] = (float(row["value"]), name)
        pages = int(meta.get("pages") or 1)
        if page >= pages:
            break
        page += 1
    return out


def nearest_year(series: dict[int, tuple[float, str]], target: int, window: int = 2):
    if target in series:
        return target, series[target]
    for d in range(1, window + 1):
        if target - d in series:
            return target - d, series[target - d]
        if target + d in series:
            return target + d, series[target + d]
    return None, None


def slug_iso_map(geo_url: str) -> dict[str, tuple[str, str]]:
    """slug → (iso3, name) from the shared geo pack."""
    path = ROOT / "public" / geo_url.lstrip("/")
    gj = json.loads(path.read_text())
    out = {}
    for feat in gj.get("features") or []:
        p = feat.get("properties") or {}
        slug = p.get("slug")
        iso = p.get("iso3")
        name = p.get("name")
        if isinstance(slug, str) and isinstance(iso, str) and len(iso) == 3:
            out[slug] = (iso, name if isinstance(name, str) else iso)
    return out


def catalog_entry(**kwargs):
    vals = [r["value"] for r in kwargs["regions"] if r.get("value") is not None]
    kwargs.setdefault("metric", "tfr")
    kwargs.setdefault("unit", "children per woman")
    kwargs.setdefault("credit", None)
    kwargs.setdefault("scale", "plasma")
    kwargs.setdefault("mid", 2.1)
    kwargs.setdefault("labelValues", True)
    kwargs["min"] = round(min(vals), 2) if vals else None
    kwargs["max"] = round(max(vals), 2) if vals else None
    return kwargs


def main() -> None:
    print("World Bank TFR history…", flush=True)
    hist = fetch_wb_history()
    print(f"  {len(hist)} countries", flush=True)

    catalog = json.loads(CATALOG.read_text())
    by_id = {m["id"]: m for m in catalog["maps"]}

    new_frames: list[dict] = []
    drop_ids: set[str] = set()

    for spec in CONTINENTAL:
        latest = by_id.get(spec["id"])
        if not latest:
            print(f"  skip {spec['id']}: missing latest frame")
            continue
        geo_url = latest["geoUrl"]
        members = slug_iso_map(geo_url)
        if len(members) < 3:
            print(f"  skip {spec['id']}: geo has {len(members)} members")
            continue

        lo, hi = spec["domain"]
        note = (
            f"National TFR from World Bank WDI. Decade frames 1960–2020; the "
            f"latest year stays on the BirthGauge / mixed-vintage overlay. "
            f"Colour domain is fixed ({lo:g}–{hi:g}) so years are comparable "
            f"when you scrub."
        )

        for year in YEARS:
            regions = []
            for slug, (iso, name) in members.items():
                series = hist.get(iso)
                if not series:
                    continue
                hit_year, hit = nearest_year(series, year, window=2)
                if hit is None:
                    continue
                val, wb_name = hit
                regions.append(
                    {
                        "id": slug,
                        "slug": slug,
                        "name": name or wb_name,
                        "value": round(val, 2),
                    }
                )
            if len(regions) < max(3, len(members) // 3):
                print(f"  {spec['iso3']} {year}: only {len(regions)} — skip")
                continue
            frame_id = f"{spec['id'].removesuffix('-tfr')}-tfr-{year}"
            # eu-tfr → eu-tfr-1960; africa-tfr → africa-tfr-1960
            if not frame_id.startswith(spec["id"].split("-")[0]):
                frame_id = f"{spec['id']}-{year}"
            # Prefer stable pattern: {base}-{year}
            base = spec["id"]  # e.g. africa-tfr
            frame_id = f"{base}-{year}"
            drop_ids.add(frame_id)
            new_frames.append(
                catalog_entry(
                    id=frame_id,
                    iso3=spec["iso3"],
                    country=spec["country"],
                    title=spec["title"].format(year=year),
                    kind=spec["kind"],
                    year=year,
                    national=None,
                    source=SOURCE.format(year=year),
                    sourceUrl=SOURCE_URL,
                    geoUrl=geo_url,
                    note=note,
                    regions=regions,
                    labelValues=len(regions) <= 40,
                    tab=latest.get("tab"),
                )
            )
            print(
                f"  {spec['iso3']} {year}: {len(regions)}/{len(members)} "
                f"[{min(r['value'] for r in regions):.2f}–"
                f"{max(r['value'] for r in regions):.2f}]"
            )

        # Refresh note on latest so users know decades exist.
        if latest.get("note") and "Decade frames" not in (latest.get("note") or ""):
            latest["note"] = (
                (latest["note"].rstrip(".") + ". ")
                + f"Decade frames 1960–2020 use World Bank WDI; colour domain "
                f"fixed ({lo:g}–{hi:g}) across years."
            )

    maps = [m for m in catalog["maps"] if m["id"] not in drop_ids]
    # Keep latest overlays; append history.
    maps.extend(new_frames)
    CATALOG.write_text(json.dumps({"maps": maps}, indent=2) + "\n", encoding="utf-8")
    print(f"catalog {len(maps)} maps (+{len(new_frames)} decade frames)")


if __name__ == "__main__":
    main()
