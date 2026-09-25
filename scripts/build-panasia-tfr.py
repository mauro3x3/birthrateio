#!/usr/bin/env python3
"""Build Pan-Asia national TFR map for decades 1960–2020 (+ latest).

Asia + Middle East (excludes Maghreb / sub-Saharan Africa). Russia included
so the frame matches common “Asia 1960” continental maps. Geometry: Natural
Earth 50m admin-0. Values: World Bank WDI SP.DYN.TFRT.IN.
"""

from __future__ import annotations

import importlib.util
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
# Also emit the latest WDI year so the map stays current after 2020.
INCLUDE_LATEST = True

# Asia + West Asia / Middle East. Maghreb kept on the MENA / Africa maps.
PAN_ASIA = sorted(
    {
        # East / South / Southeast / Central
        "AFG",
        "ARM",
        "AZE",
        "BGD",
        "BTN",
        "BRN",
        "KHM",
        "CHN",
        "GEO",
        "HKG",
        "IND",
        "IDN",
        "JPN",
        "KAZ",
        "PRK",
        "KOR",
        "KGZ",
        "LAO",
        "MAC",
        "MYS",
        "MDV",
        "MNG",
        "MMR",
        "NPL",
        "PAK",
        "PHL",
        "RUS",
        "SGP",
        "LKA",
        "TWN",
        "TJK",
        "THA",
        "TLS",
        "TKM",
        "UZB",
        "VNM",
        # Middle East / West Asia
        "BHR",
        "CYP",
        "IRN",
        "IRQ",
        "ISR",
        "JOR",
        "KWT",
        "LBN",
        "OMN",
        "PSE",
        "QAT",
        "SAU",
        "SYR",
        "TUR",
        "ARE",
        "YEM",
    }
)


def load_bsm():
    path = ROOT / "scripts" / "build-more-tfr-maps.py"
    spec = importlib.util.spec_from_file_location("more_tfr", path)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(mod)
    return mod


def fetch_wb_history() -> dict[str, dict[int, tuple[float, str]]]:
    """iso3 → {year: (tfr, name)} for 1960–latest."""
    out: dict[str, dict[int, tuple[float, str]]] = {}
    page = 1
    while True:
        url = (
            "https://api.worldbank.org/v2/country/all/indicator/SP.DYN.TFRT.IN"
            f"?format=json&date=1960:2025&per_page=20000&page={page}"
        )
        dest = CACHE / f"wb-tfr-hist-p{page}.json"
        if dest.exists():
            payload = json.loads(dest.read_text())
        else:
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


def crosses_antimeridian(geom: dict) -> bool:
    xs: list[float] = []

    def walk(c):
        if isinstance(c, (list, tuple)) and c and isinstance(c[0], (int, float)):
            xs.append(float(c[0]))
            return
        if isinstance(c, (list, tuple)):
            for x in c:
                walk(x)

    walk(geom.get("coordinates"))
    if not xs:
        return False
    return (max(xs) - min(xs)) > 180


def write_panasia_geo(bsm, features: list[dict]) -> str:
    """Higher-detail admin-0 + outline-clipped seam seal (skip antimeridian)."""
    from shapely.geometry import mapping, shape
    from shapely.ops import unary_union
    from shapely.validation import make_valid

    sub = bsm.bsm  # build-subnational-maps helpers
    out = []
    for feat in features:
        props = dict(feat.get("properties") or {})
        iso = props.get("iso3") or ""
        geom = feat.get("geometry") or {}
        # Keep Russia intact — mainland is split across many NE rings; dropping
        # all but 6 leaves rectangular voids across Siberia.
        max_polys = 80 if iso == "RUS" else 12
        max_pts = 220 if iso == "RUS" else 140
        geom = sub.keep_mainlands(geom, max_polys=max_polys)
        coords = geom.get("coordinates")
        geom = {
            "type": geom.get("type"),
            "coordinates": sub.simplify_coords(coords, max_pts),
        }
        out.append(
            {
                "type": "Feature",
                "id": feat.get("id"),
                "properties": props,
                "geometry": geom,
            }
        )

    # Outline-clipped buffer so neighbours overlap without eating the coast,
    # and without destroying Russia across the date line.
    geoms = []
    for f in out:
        try:
            geoms.append(make_valid(shape(f["geometry"])))
        except Exception:
            geoms.append(None)

    valid = [g for g in geoms if g is not None and not g.is_empty]
    outline = make_valid(unary_union(valid))
    # Fill lakes/holes in the continental outline so buffers don't leak inward.
    try:
        from shapely.geometry import Polygon

        def fill_holes(g):
            if g.geom_type == "Polygon":
                return Polygon(g.exterior)
            if g.geom_type == "MultiPolygon":
                return unary_union([Polygon(p.exterior) for p in g.geoms])
            return g

        outline = fill_holes(outline)
    except Exception:
        pass

    pad = 0.012
    for feat, geom in zip(out, geoms):
        if geom is None or geom.is_empty:
            continue
        if crosses_antimeridian(feat["geometry"]):
            # Leave date-line countries alone — buffering them creates voids.
            continue
        try:
            expanded = geom.buffer(pad, join_style=1, mitre_limit=2.5, quad_segs=8)
            clipped = make_valid(expanded.intersection(outline))
            if clipped.is_empty or clipped.area < geom.area * 0.5:
                continue
            simplified = clipped.simplify(0.0015, preserve_topology=True)
            if simplified.is_empty or simplified.area < geom.area * 0.5:
                simplified = clipped
            feat["geometry"] = mapping(make_valid(simplified))
        except Exception:
            continue

    rel = "/geo/maps/panasia-tfr.json"
    path = ROOT / "public" / rel.lstrip("/")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps({"type": "FeatureCollection", "features": out}, separators=(",", ":")),
        encoding="utf-8",
    )
    return rel


def main() -> None:
    bsm = load_bsm()
    print("Natural Earth admin-0…", flush=True)
    admin0 = bsm.fetch_json(bsm.NE_ADMIN0, CACHE / "ne50-admin0.json")
    print("World Bank TFR history…", flush=True)
    hist = fetch_wb_history()

    # Stable geometry: any country that has ≥1 year of TFR in the decade set.
    members = [iso for iso in PAN_ASIA if iso in hist]
    print(f"Pan Asia members with data: {len(members)}")

    feats = []
    for feat in admin0["features"]:
        code = bsm.iso_of(feat)
        if code not in members:
            continue
        # Prefer a stable display name from the latest observation.
        years = sorted(hist[code])
        name = hist[code][years[-1]][1]
        slug = f"panasia-{bsm.bsm.slugify(name)}"
        feats.append(
            {
                **feat,
                "id": slug,
                "properties": {"name": name, "slug": slug, "iso3": code},
            }
        )
    geo_url = write_panasia_geo(bsm, feats)
    print(f"geo {geo_url} ({len(feats)} polygons)")

    slug_by_iso = {
        f["properties"]["iso3"]: f["properties"]["slug"] for f in feats
    }
    name_by_iso = {
        f["properties"]["iso3"]: f["properties"]["name"] for f in feats
    }

    emit_years = list(YEARS)
    if INCLUDE_LATEST:
        latest = max(max(s) for s in hist.values() if s)
        if latest not in emit_years and latest > YEARS[-1]:
            emit_years.append(latest)

    new_maps = []
    for year in emit_years:
        regions = []
        for iso in members:
            hit_year, hit = nearest_year(hist[iso], year, window=2)
            if hit is None:
                continue
            val, _ = hit
            slug = slug_by_iso[iso]
            regions.append(
                {
                    "id": slug,
                    "slug": slug,
                    "name": name_by_iso[iso],
                    "value": round(val, 2),
                }
            )
        if len(regions) < 20:
            print(f"  skip {year}: only {len(regions)} countries")
            continue
        vals = [r["value"] for r in regions]
        entry = bsm.catalog_entry(
            id=f"panasia-tfr-{year}",
            iso3="PANASIA",
            country="Asia",
            title=f"Total fertility rate, Asia {year}",
            kind="country",
            year=year,
            national=None,
            source=(
                "World Bank World Development Indicators, SP.DYN.TFRT.IN — "
                f"total fertility rate (births per woman), {year} "
                "(±2 years when the calendar year is missing)."
            ),
            sourceUrl="https://data.worldbank.org/indicator/SP.DYN.TFRT.IN",
            geoUrl=geo_url,
            note=(
                "National TFR for Asia and the Middle East (Maghreb is on the "
                "MENA / Africa maps). Russia is included for continental framing. "
                "Decade frames 1960–2020 plus the latest WDI year. Colour domain "
                "is fixed (1–8) so years are comparable when you scrub."
            ),
            regions=regions,
            scale="plasma",
            mid=2.1,
            labelValues=False,
            min=round(min(vals), 2),
            max=round(max(vals), 2),
        )
        new_maps.append(entry)
        print(f"  {year}: {len(regions)} countries  "
              f"[{min(vals):.2f}–{max(vals):.2f}]")

    catalog = json.loads(CATALOG.read_text())
    managed = {m["id"] for m in new_maps} | {"panasia-tfr"}
    kept = [m for m in catalog["maps"] if m["id"] not in managed and not str(m["id"]).startswith("panasia-tfr")]
    catalog["maps"] = kept + new_maps
    CATALOG.write_text(json.dumps(catalog, indent=2) + "\n")
    print(f"catalog now {len(catalog['maps'])} maps")


if __name__ == "__main__":
    main()
