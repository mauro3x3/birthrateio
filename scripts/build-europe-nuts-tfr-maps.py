#!/usr/bin/env python3
"""Europe NUTS-2 TFR choropleth from Eurostat demo_r_find3.

Appends eu-prov-tfr and tags the existing EU country map. Does not run
build-subnational-maps.py.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "src" / "lib" / "data" / "subnational-maps.json"
CACHE = ROOT / ".tmp-map-build"
CACHE.mkdir(exist_ok=True)

spec = importlib.util.spec_from_file_location(
    "more_tfr", ROOT / "scripts" / "build-more-tfr-maps.py"
)
more = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(more)

EUROSTAT_URL = (
    "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/"
    "demo_r_find3?format=JSON&lang=EN&indic_de=TOTFERRT&unit=NR"
)
NUTS_URL = {
    2024: (
        "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/"
        "NUTS_RG_10M_2024_4326_LEVL_2.geojson"
    ),
    2021: (
        "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/"
        "NUTS_RG_10M_2021_4326_LEVL_2.geojson"
    ),
}
NUTS1_2021_URL = (
    "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/"
    "NUTS_RG_10M_2021_4326_LEVL_1.geojson"
)
# Same 1:10m coastline family as NUTS. Natural Earth 50m leaves a visible gap
# along the Polish / Slovak / Hungarian / Romanian border.
GISCO_CNTR_URL = (
    "https://gisco-services.ec.europa.eu/distribution/v2/countries/geojson/"
    "CNTR_RG_10M_2024_4326.geojson"
)
ONS_BIRTHS_XLSX = (
    "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/"
    "birthsdeathsandmarriages/livebirths/datasets/"
    "birthsinenglandandwalesbirthregistrations/2024/2024birthregistrations.xlsx"
)
NRS_BIRTHS_XLSX = "https://www.nrscotland.gov.uk/media/qsjpqkkr/data.xlsx"
NISRA_BIRTHS_XLSX = (
    "https://www.nisra.gov.uk/system/files/statistics/2026-02/"
    "Section%203%20-%20Births_Tables_2024-Final.xlsx"
)

# ONS 2024 TFR is published at ITL 1 / country, not ITL 2. Eurostat demo_r_find3
# last has UK NUTS 2 for 2018.
ONS_ITL1 = {
    "E12000001": ("UKC", "North East"),
    "E12000002": ("UKD", "North West"),
    "E12000003": ("UKE", "Yorkshire and the Humber"),
    "E12000004": ("UKF", "East Midlands"),
    "E12000005": ("UKG", "West Midlands"),
    "E12000006": ("UKH", "East of England"),
    "E12000007": ("UKI", "London"),
    "E12000008": ("UKJ", "South East"),
    "E12000009": ("UKK", "South West"),
    "W92000004": ("UKL", "Wales"),
}

ISO2_NAME = {
    "AL": "Albania",
    "AT": "Austria",
    "BE": "Belgium",
    "BG": "Bulgaria",
    "CH": "Switzerland",
    "CY": "Cyprus",
    "CZ": "Czechia",
    "DE": "Germany",
    "DK": "Denmark",
    "EE": "Estonia",
    "EL": "Greece",
    "ES": "Spain",
    "FI": "Finland",
    "FR": "France",
    "HR": "Croatia",
    "HU": "Hungary",
    "IE": "Ireland",
    "IS": "Iceland",
    "IT": "Italy",
    "LI": "Liechtenstein",
    "LT": "Lithuania",
    "LU": "Luxembourg",
    "LV": "Latvia",
    "ME": "Montenegro",
    "MK": "North Macedonia",
    "MT": "Malta",
    "NL": "Netherlands",
    "NO": "Norway",
    "PL": "Poland",
    "PT": "Portugal",
    "RO": "Romania",
    "RS": "Serbia",
    "SE": "Sweden",
    "SI": "Slovenia",
    "SK": "Slovakia",
    "TR": "Türkiye",
    "UK": "United Kingdom",
}

# National fill where Eurostat has no NUTS-2 TFR. Keys are GISCO CNTR_ID.
# Russia is clipped west of the Urals so Siberia does not pull the frame.
FILL_CNTR = {
    "BA": "BIH",
    "UA": "UKR",
    "BY": "BLR",
    "MD": "MDA",
    "RU": "RUS",
}

# GISCO NUTS 2 2024 includes XK00; demo_r_find3 does not publish TFR for it.
# ASK vital statistics 2024 (Wikipedia demographics table) 1.95; BirthGauge 1.92.
KOSOVO_TFR = (1.95, 2024, "Kosovo")
# Keep European Russia + Kaliningrad; drop Siberia / Far East (incl. antimeridian).
RUSSIA_MIN_LNG = 19.0
RUSSIA_MAX_LNG = 60.0

OVERSEAS_PREFIXES = ("FRY", "FRA", "FR9")


def eurostat_nuts2(payload: dict) -> tuple[dict[str, tuple[float, str, str]], dict[str, tuple[float, str, str]]]:
    sizes = payload["size"]
    dim = payload["dimension"]
    geo_idx = dim["geo"]["category"]["index"]
    geo_lab = dim["geo"]["category"]["label"]
    time_idx = dim["time"]["category"]["index"]
    indic_idx = dim["indic_de"]["category"]["index"]
    unit_idx = dim["unit"]["category"]["index"]
    values = payload["value"]
    times = list(time_idx.keys())

    def pos(geo: str, year: str) -> int:
        i = indic_idx["TOTFERRT"]
        u = unit_idx["NR"]
        g = geo_idx[geo]
        t = time_idx[year]
        n_time, n_geo, n_unit = sizes[4], sizes[3], sizes[2]
        return ((i * n_unit + u) * n_geo + g) * n_time + t

    latest: dict[str, tuple[float, str, str]] = {}
    nuts0: dict[str, tuple[float, str, str]] = {}
    for geo in geo_idx:
        rec = None
        for y in reversed(times):
            p = pos(geo, y)
            v = values.get(str(p), values.get(p))
            if v is not None:
                rec = (float(v), y, geo_lab.get(geo, geo))
                break
        if rec is None:
            continue
        if len(geo) == 2:
            nuts0[geo] = rec
        elif len(geo) == 4:
            latest[geo] = rec
    return latest, nuts0


def centroid(feat: dict) -> tuple[float, float]:
    coords = (feat.get("geometry") or {}).get("coordinates")
    pts: list[tuple[float, float]] = []

    def walk(c):
        if not c:
            return
        if isinstance(c, (int, float)):
            return
        if c and isinstance(c[0], (int, float)):
            pts.append((float(c[0]), float(c[1])))
            return
        for x in c:
            walk(x)

    walk(coords)
    if not pts:
        return 0.0, 0.0
    return sum(x for x, _ in pts) / len(pts), sum(y for _, y in pts) / len(pts)


def in_europe_frame(feat: dict, nuts_id: str) -> bool:
    if nuts_id.startswith(OVERSEAS_PREFIXES):
        return False
    lng, lat = centroid(feat)
    # Keep Azores / Canaries / Cyprus / Iceland; drop Caribbean and Indian Ocean.
    return -32.0 <= lng <= 48.0 and 27.0 <= lat <= 73.0


def nuts_id_of(feat: dict) -> str:
    p = feat.get("properties") or {}
    return str(p.get("NUTS_ID") or p.get("nuts_id") or "")


def cntr_of(feat: dict) -> str:
    p = feat.get("properties") or {}
    return str(p.get("CNTR_CODE") or p.get("cntr_code") or nuts_id_of(feat)[:2])


def gisco_cntr_id(feat: dict) -> str:
    p = feat.get("properties") or {}
    return str(p.get("CNTR_ID") or p.get("id") or "").upper()


def _interp_at_lng(a: list, b: list, lng: float) -> list[float]:
    ax, ay = float(a[0]), float(a[1])
    bx, by = float(b[0]), float(b[1])
    if bx == ax:
        return [lng, ay]
    t = (lng - ax) / (bx - ax)
    return [lng, ay + t * (by - ay)]


def clip_ring_max_lng(ring: list, max_lng: float) -> list | None:
    if not ring:
        return None
    pts = [list(p[:2]) for p in ring]
    if len(pts) > 1 and pts[0] == pts[-1]:
        pts = pts[:-1]
    out: list[list[float]] = []
    for i, cur in enumerate(pts):
        prev = pts[i - 1]
        prev_in = prev[0] <= max_lng
        cur_in = cur[0] <= max_lng
        if cur_in:
            if not prev_in:
                out.append(_interp_at_lng(prev, cur, max_lng))
            out.append(cur)
        elif prev_in:
            out.append(_interp_at_lng(prev, cur, max_lng))
    if len(out) < 3:
        return None
    if out[0] != out[-1]:
        out.append(out[0])
    return out


def clip_ring_min_lng(ring: list, min_lng: float) -> list | None:
    if not ring:
        return None
    pts = [list(p[:2]) for p in ring]
    if len(pts) > 1 and pts[0] == pts[-1]:
        pts = pts[:-1]
    out: list[list[float]] = []
    for i, cur in enumerate(pts):
        prev = pts[i - 1]
        prev_in = prev[0] >= min_lng
        cur_in = cur[0] >= min_lng
        if cur_in:
            if not prev_in:
                out.append(_interp_at_lng(prev, cur, min_lng))
            out.append(cur)
        elif prev_in:
            out.append(_interp_at_lng(prev, cur, min_lng))
    if len(out) < 3:
        return None
    if out[0] != out[-1]:
        out.append(out[0])
    return out


def clip_geom_min_lng(geom: dict, min_lng: float) -> dict | None:
    gtype = geom.get("type")
    coords = geom.get("coordinates")
    if gtype == "Polygon" and coords:
        outer = clip_ring_min_lng(coords[0], min_lng)
        if not outer:
            return None
        return {"type": "Polygon", "coordinates": [outer]}
    if gtype == "MultiPolygon" and coords:
        kept = []
        for poly in coords:
            if not poly:
                continue
            outer = clip_ring_min_lng(poly[0], min_lng)
            if outer:
                kept.append([outer])
        if not kept:
            return None
        if len(kept) == 1:
            return {"type": "Polygon", "coordinates": kept[0]}
        return {"type": "MultiPolygon", "coordinates": kept}
    return geom


def clip_geom_max_lng(geom: dict, max_lng: float) -> dict | None:
    gtype = geom.get("type")
    coords = geom.get("coordinates")
    if gtype == "Polygon" and coords:
        outer = clip_ring_max_lng(coords[0], max_lng)
        if not outer:
            return None
        return {"type": "Polygon", "coordinates": [outer]}
    if gtype == "MultiPolygon" and coords:
        kept = []
        for poly in coords:
            if not poly:
                continue
            outer = clip_ring_max_lng(poly[0], max_lng)
            if outer:
                kept.append([outer])
        if not kept:
            return None
        if len(kept) == 1:
            return {"type": "Polygon", "coordinates": kept[0]}
        return {"type": "MultiPolygon", "coordinates": kept}
    return geom


def nuts_name_of(feat: dict) -> str:
    p = feat.get("properties") or {}
    return str(p.get("NUTS_NAME") or p.get("NAME_LATN") or nuts_id_of(feat))


def upsert(catalog: dict, entry: dict):
    maps = catalog["maps"]
    maps[:] = [m for m in maps if m["id"] != entry["id"]]
    maps.append(entry)


def uk_tfr_2024() -> dict[str, tuple[float, str]]:
    """Official 2024 TFR for UK ITL 1 / countries. Not Eurostat 2018 NUTS 2."""
    more.fetch(ONS_BIRTHS_XLSX, CACHE / "2024birthregistrations.xlsx")
    more.fetch(NRS_BIRTHS_XLSX, CACHE / "nrs-births-2024.xlsx")
    more.fetch(NISRA_BIRTHS_XLSX, CACHE / "nisra-births-2024.xlsx")
    pd = more.pd
    out: dict[str, tuple[float, str]] = {}

    ons = pd.read_excel(CACHE / "2024birthregistrations.xlsx", sheet_name="Table_1", header=5)
    ons.columns = [str(c).replace("\n", " ").strip() for c in ons.columns]
    code_col = "Area of usual residence Code"
    name_col = "Area of usual residence Name"
    tfr_col = "Total Fertility Rate (TFR)"
    rows = ons[
        (ons["Sex"] == "All births")
        & (ons["Registration type"] == "All registration types")
    ]
    for _, row in rows.iterrows():
        code = str(row[code_col]).strip()
        if code not in ONS_ITL1:
            continue
        nuts_id, label = ONS_ITL1[code]
        out[nuts_id] = (round(float(row[tfr_col]), 2), label)

    nrs = pd.read_excel(CACHE / "nrs-births-2024.xlsx", sheet_name="Table_8", header=4)
    nrs.columns = [str(c).strip() for c in nrs.columns]
    tfr_name = [c for c in nrs.columns if c.lower().startswith("total fertility")][0]
    sco = nrs[(nrs["Year"] == 2024) & (nrs["Area name"] == "Scotland")]
    out["UKM"] = (round(float(sco.iloc[0][tfr_name]), 2), "Scotland")

    ni = pd.read_excel(
        CACHE / "nisra-births-2024.xlsx", sheet_name="Table 3.13", header=3
    )
    row = ni[ni["Year"] == 2024].iloc[0]
    asfr_cols = [c for c in ni.columns if str(c).startswith("Mothers aged")]
    ni_tfr = 5.0 * sum(float(row[c]) for c in asfr_cols) / 1000.0
    out["UKN"] = (round(ni_tfr, 2), "Northern Ireland")
    missing = [k for k in ("UKC", "UKD", "UKE", "UKF", "UKG", "UKH", "UKI", "UKJ", "UKK", "UKL", "UKM", "UKN") if k not in out]
    if missing:
        raise SystemExit(f"UK 2024 TFR missing {missing}")
    return out


def main():
    print("Eurostat demo_r_find3…")
    payload = more.fetch_json(EUROSTAT_URL, CACHE / "eurostat-demo_r_find3.json")
    latest, nuts0 = eurostat_nuts2(payload)
    print(f"  NUTS2 with TFR {len(latest)}  NUTS0 {len(nuts0)}")

    nuts_geo: dict[int, dict] = {}
    for year, url in NUTS_URL.items():
        print(f"GISCO NUTS 2 {year}…")
        nuts_geo[year] = more.fetch_json(url, CACHE / f"gisco-nuts2-{year}.json")
        print(f"  features {len(nuts_geo[year].get('features') or [])}")

    by_id_2024 = {nuts_id_of(f): f for f in nuts_geo[2024].get("features") or [] if nuts_id_of(f)}
    by_id_2021 = {nuts_id_of(f): f for f in nuts_geo[2021].get("features") or [] if nuts_id_of(f)}

    matched: dict[str, dict] = {}
    for nid in latest:
        if nid.startswith("UK"):
            continue
        feat = by_id_2024.get(nid)
        if feat is not None:
            matched[nid] = feat
    countries_2024 = {nid[:2] for nid in matched}
    fallback = 0
    for nid in latest:
        if nid.startswith("UK") or nid in matched:
            continue
        if nid[:2] in countries_2024:
            continue
        feat = by_id_2021.get(nid)
        if feat is None:
            continue
        matched[nid] = feat
        fallback += 1
    print(f"  matched {len(matched)}/{len(latest)} (2021 fallback {fallback})")
    unmatched = sorted(g for g in set(latest) - set(matched) if not str(g).startswith("UK"))
    if unmatched:
        print("    unmatched", unmatched[:20], ("…" if len(unmatched) > 20 else ""))

    years_used: dict[str, int] = defaultdict(int)
    out_feats = []
    regions = []
    dropped_overseas = 0
    for nid, feat in matched.items():
        if not in_europe_frame(feat, nid):
            dropped_overseas += 1
            continue
        val, year, label = latest[nid]
        years_used[year] += 1
        cc = cntr_of(feat) or nid[:2]
        country = ISO2_NAME.get(cc, cc)
        name = nuts_name_of(feat) or label
        display = f"{country} · {name}"
        slug = f"eu-{more.bsm.slugify(nid)}"
        out_feats.append(
            {
                **feat,
                "id": slug,
                "properties": {
                    "name": display,
                    "slug": slug,
                    "iso3": cc,
                    "code": nid,
                    "year": int(year),
                },
            }
        )
        regions.append(
            {
                "id": slug,
                "slug": slug,
                "name": display,
                "value": round(val, 2),
            }
        )
    print(f"  kept {len(regions)} dropped overseas {dropped_overseas}")
    print("  vintages", dict(sorted(years_used.items())))

    print("UK ITL 1 TFR 2024 (ONS / NRS / NISRA)…")
    uk_tfr = uk_tfr_2024()
    nuts1 = more.fetch_json(NUTS1_2021_URL, CACHE / "gisco-nuts1-2021.json")
    uk_added = 0
    for feat in nuts1.get("features") or []:
        nid = nuts_id_of(feat)
        if nid not in uk_tfr:
            continue
        val, label = uk_tfr[nid]
        years_used["2024"] += 1
        display = f"United Kingdom · {label}"
        slug = f"eu-{more.bsm.slugify(nid)}"
        out_feats.append(
            {
                **feat,
                "id": slug,
                "properties": {
                    "name": display,
                    "slug": slug,
                    "iso3": "UK",
                    "code": nid,
                    "year": 2024,
                },
            }
        )
        regions.append(
            {
                "id": slug,
                "slug": slug,
                "name": display,
                "value": val,
            }
        )
        uk_added += 1
        print(f"  {nid} {label} {val}")
    print(f"  UK ITL1 {uk_added}")

    print("World Bank national fill (GISCO 10M countries)…")
    wb = more.world_bank_tfr()
    cntr = more.fetch_json(GISCO_CNTR_URL, CACHE / "gisco-cntr-10m-2024.json")
    fill_feats = []
    fill_regions = []
    filled = 0
    have: set[str] = set()
    for feat in cntr.get("features") or []:
        cid = gisco_cntr_id(feat)
        iso3 = FILL_CNTR.get(cid)
        if not iso3:
            continue
        if iso3 not in wb:
            print(f"  skip fill {iso3} ({cid}, no WB TFR)")
            continue
        val, year, name = wb[iso3]
        years_used[str(year)] += 1
        geom = feat.get("geometry") or {}
        pts = 220
        if iso3 == "RUS":
            clipped = clip_geom_max_lng(geom, RUSSIA_MAX_LNG)
            if clipped is not None:
                clipped = clip_geom_min_lng(clipped, RUSSIA_MIN_LNG)
            if clipped is None:
                print("  skip fill RUS (clip empty)")
                continue
            geom = clipped
            name = "Russia"
            pts = 360
        slug = f"eu-{more.bsm.slugify(name)}"
        fill_feats.append(
            {
                **feat,
                "id": slug,
                "geometry": geom,
                "properties": {
                    "name": name,
                    "slug": slug,
                    "iso3": iso3,
                    "year": int(year),
                    "_max_pts": pts,
                },
            }
        )
        fill_regions.append(
            {
                "id": slug,
                "slug": slug,
                "name": name,
                "value": round(val, 2),
            }
        )
        have.add(iso3)
        filled += 1
        print(f"  fill {iso3} {name} {round(val, 2)} ({year})")
    xk = by_id_2024.get("XK00")
    if xk is not None:
        val, year, name = KOSOVO_TFR
        years_used[str(year)] += 1
        slug = "eu-kosovo"
        fill_feats.append(
            {
                **xk,
                "id": slug,
                "properties": {
                    "name": name,
                    "slug": slug,
                    "iso3": "XKX",
                    "code": "XK00",
                    "year": year,
                    "_max_pts": 120,
                },
            }
        )
        fill_regions.append(
            {
                "id": slug,
                "slug": slug,
                "name": name,
                "value": round(val, 2),
            }
        )
        have.add("XKX")
        filled += 1
        print(f"  fill XKX {name} {val} ({year}) NUTS XK00")
    for iso3 in list(FILL_CNTR.values()) + ["XKX"]:
        if iso3 not in have:
            print(f"  skip fill {iso3} (no GISCO polygon)")
    print(f"  national fill {filled}")
    # Paint fill under NUTS so any remaining coastline mismatch is covered by
    # the Eurostat provinces, not a white gap.
    out_feats = fill_feats + out_feats
    regions = fill_regions + regions

    geo_url = more.write_geo("eu-prov-tfr", out_feats, max_pts=72)
    note = (
        "Eurostat NUTS 2 total fertility rate, latest year per region (almost all "
        "2024). United Kingdom is ITL 1 / countries for 2024: ONS birth registrations "
        "for England and Wales, National Records of Scotland, and NISRA age-specific "
        "rates for Northern Ireland. Eurostat stopped UK NUTS-2 TFR after 2018. French "
        "outermost regions, the Azores, Madeira and the Canaries are on the layer but "
        "the default frame is continental Europe. Bosnia, Ukraine, Belarus, Moldova and "
        "European Russia (west of 60°E) have no NUTS-2 TFR — those polygons are national "
        "World Bank TFR on GISCO 10m outlines. Kosovo is GISCO NUTS XK00 with the 2024 "
        "ASK total fertility rate (1.95). Siberia is clipped so it does not pull the map. "
        "Use the Countries tab for EU member states as single polygons."
    )
    entry = more.catalog_entry(
        id="eu-prov-tfr",
        iso3="EU",
        country="Europe",
        title="Total fertility rate, Europe by NUTS 2 region",
        kind="province",
        year=2024,
        national=None,
        source=(
            "Eurostat demo_r_find3 — total fertility rate by NUTS 2 region, latest "
            "year. United Kingdom 2024: ONS Births in England and Wales birth "
            "registrations Table 1 (ITL 1 and Wales); National Records of Scotland "
            "Births Time Series Table 8; NISRA Registrar General Annual Report 2024 "
            "Table 3.13 (TFR from age-specific rates). National World Bank WDI "
            "SP.DYN.TFRT.IN for Bosnia and Herzegovina, Ukraine, Belarus, Moldova and "
            "European Russia. Kosovo 2024 TFR from the Kosovo Agency of Statistics "
            "vital statistics series (1.95)."
        ),
        sourceUrl="https://ec.europa.eu/eurostat/databrowser/view/demo_r_find3",
        geoUrl=geo_url,
        note=note,
        tab="Provinces",
        regions=regions,
        scale="diverging-tfr",
        mid=2.1,
        labelValues=False,
    )

    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    for m in catalog["maps"]:
        if m["id"] == "eu-tfr":
            m["tab"] = "Countries"
            m["country"] = "Europe"
            m["note"] = (
                "EU member states, national TFR from World Bank WDI (latest year). "
                "Not a NUTS map. Open the Provinces tab for Eurostat NUTS 2 regions "
                "across the EU, EFTA, the UK (ONS/NRS/NISRA 2024), Türkiye and the "
                "Western Balkans. Overseas fragments of France can pull this frame; "
                "zoom in if needed."
            )
    upsert(catalog, entry)
    CATALOG.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    n = sum(1 for r in regions if r["value"] is not None)
    print(f"catalog now {len(catalog['maps'])} maps")
    print(f"  {entry['id']:22} {n:3}/{len(regions)}  {entry['title']}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
