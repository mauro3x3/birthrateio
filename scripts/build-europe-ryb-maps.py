#!/usr/bin/env python3
"""
Europe Regional Yearbook-style NUTS maps from Eurostat.

Adds NUTS 3 demography (median age, working-age total/%, natural change,
net migration) as a Districts tab on /maps/eu, plus NUTS 2 labour-market
layers (employment rate, gender employment gap, NEET) on the Provinces tab.

Sources (Eurostat dissemination API):
  demo_r_pjanind3   — median age (MEDAGEPOP)
  demo_r_pjanaggr3  — working-age headcount Y15-64 / TOTAL → %
  demo_r_gind3      — NATGROWRT, CNMIGRATRT (migration = 2014–2024 mean)
  lfst_r_lfe2emprt  — employment rate 15–64 (total / M / F → gap)
  edat_lfse_22      — NEET rate 15–29

Example:
  python3 scripts/build-europe-ryb-maps.py
"""

from __future__ import annotations

import importlib.util
import json
import ssl
import sys
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "src" / "lib" / "data" / "subnational-maps.json"
CACHE = ROOT / ".tmp-map-build"
GEO_OUT = ROOT / "public" / "geo" / "maps"
CACHE.mkdir(exist_ok=True)

spec = importlib.util.spec_from_file_location(
    "bsm", ROOT / "scripts" / "build-subnational-maps.py"
)
bsm = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(bsm)

API = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/"
UA = {"User-Agent": "birthrate.io/ryb-maps"}
CTX = ssl.create_default_context()

NUTS3_URL = {
    2024: (
        "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/"
        "NUTS_RG_10M_2024_4326_LEVL_3.geojson"
    ),
    2021: (
        "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/"
        "NUTS_RG_10M_2021_4326_LEVL_3.geojson"
    ),
}
NUTS2_URL = {
    2024: (
        "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/"
        "NUTS_RG_10M_2024_4326_LEVL_2.geojson"
    ),
    2021: (
        "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/"
        "NUTS_RG_10M_2021_4326_LEVL_2.geojson"
    ),
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
OVERSEAS_PREFIXES = ("FRY", "FRA", "FR9")


def fetch_bytes(url: str, dest: Path | None = None) -> bytes:
    if dest and dest.exists() and dest.stat().st_size > 1000:
        return dest.read_bytes()
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, context=CTX, timeout=180) as resp:
        data = resp.read()
    if dest:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
    return data


def fetch_json(url: str, dest: Path | None = None) -> dict:
    return json.loads(fetch_bytes(url, dest))


def write_geo(map_id: str, features: list[dict], max_pts: int = 48) -> str:
    rel = f"/geo/maps/{map_id}.json"
    path = ROOT / "public" / rel.lstrip("/")
    path.parent.mkdir(parents=True, exist_ok=True)
    out = []
    for feat in features:
        props = dict(feat.get("properties") or {})
        pts = int(props.pop("_max_pts", max_pts))
        geom = feat.get("geometry") or {}
        geom = bsm.keep_mainlands(geom, max_polys=14 if pts >= 80 else 6)
        coords = geom.get("coordinates")
        out.append(
            {
                "type": "Feature",
                "id": feat.get("id"),
                "properties": props,
                "geometry": {
                    "type": geom.get("type"),
                    "coordinates": bsm.simplify_coords(coords, pts),
                },
            }
        )
    path.write_text(
        json.dumps({"type": "FeatureCollection", "features": out}, separators=(",", ":")),
        encoding="utf-8",
    )
    return rel


def nuts_id_of(feat: dict) -> str:
    p = feat.get("properties") or {}
    return str(p.get("NUTS_ID") or p.get("nuts_id") or "")


def nuts_name_of(feat: dict) -> str:
    p = feat.get("properties") or {}
    return str(p.get("NUTS_NAME") or p.get("NAME_LATN") or p.get("name") or "")


def cntr_of(feat: dict) -> str:
    p = feat.get("properties") or {}
    return str(p.get("CNTR_CODE") or p.get("cntr_code") or nuts_id_of(feat)[:2])


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
    return -32.0 <= lng <= 48.0 and 27.0 <= lat <= 73.0


def fetch_eurostat(dataset: str, params: str, cache_name: str) -> dict:
    url = f"{API}{dataset}?format=JSON&lang=EN"
    if params:
        url += f"&{params}"
    print(f"  GET {dataset}…")
    return fetch_json(url, CACHE / cache_name)


def decode_jsonstat(payload: dict) -> list[dict]:
    dims = payload["id"]
    size = payload["size"]
    dim = payload["dimension"]
    indexes = [dim[d]["category"]["index"] for d in dims]
    pos_to_code = []
    for idx in indexes:
        inv = [None] * len(idx)
        for code, pos in idx.items():
            inv[pos] = code
        pos_to_code.append(inv)

    rows = []
    for key, val in payload.get("value", {}).items():
        if val is None:
            continue
        rem = int(key)
        coords = []
        for s in reversed(size):
            coords.append(rem % s)
            rem //= s
        coords = list(reversed(coords))
        row = {dims[i]: pos_to_code[i][coords[i]] for i in range(len(dims))}
        row["value"] = float(val)
        rows.append(row)
    return rows


def latest_by_geo(
    rows: list[dict],
    *,
    geo_len: int | None = None,
    filters: dict[str, str] | None = None,
) -> dict[str, tuple[float, str]]:
    filters = filters or {}
    by: dict[str, list[tuple[str, float]]] = defaultdict(list)
    for r in rows:
        if any(r.get(k) != v for k, v in filters.items()):
            continue
        geo = r.get("geo")
        year = r.get("time")
        if not geo or not year:
            continue
        if geo_len is not None and len(geo) != geo_len:
            continue
        by[geo].append((year, r["value"]))
    out: dict[str, tuple[float, str]] = {}
    for geo, pts in by.items():
        pts.sort(key=lambda x: x[0])
        y, v = pts[-1]
        out[geo] = (v, y)
    return out


def mean_by_geo(
    rows: list[dict],
    *,
    year_from: str,
    year_to: str,
    geo_len: int | None = None,
    filters: dict[str, str] | None = None,
) -> dict[str, tuple[float, str, str]]:
    filters = filters or {}
    by: dict[str, list[float]] = defaultdict(list)
    for r in rows:
        if any(r.get(k) != v for k, v in filters.items()):
            continue
        geo = r.get("geo")
        year = r.get("time")
        if not geo or not year:
            continue
        if geo_len is not None and len(geo) != geo_len:
            continue
        if year_from <= year <= year_to:
            by[geo].append(r["value"])
    return {
        geo: (sum(vals) / len(vals), year_from, year_to)
        for geo, vals in by.items()
        if vals
    }


def match_nuts(
    values: dict[str, object],
    nuts_years: dict[int, dict],
) -> dict[str, dict]:
    by_id: dict[int, dict[str, dict]] = {}
    for year, fc in nuts_years.items():
        index: dict[str, dict] = {}
        for feat in fc.get("features") or []:
            nid = nuts_id_of(feat)
            if nid:
                index[nid] = feat
        by_id[year] = index
    years_sorted = sorted(nuts_years.keys(), reverse=True)
    matched: dict[str, dict] = {}
    for nid in values:
        for year in years_sorted:
            feat = by_id[year].get(nid)
            if feat is not None:
                matched[nid] = feat
                break
    return matched


def build_layer_features(
    value_map: dict,
    feat_by_nid: dict[str, dict],
    *,
    value_fn,
    year_fn,
) -> tuple[list[dict], list[dict]]:
    feats = []
    regions = []
    dropped = 0
    for nid, payload in value_map.items():
        feat = feat_by_nid.get(nid)
        if feat is None:
            continue
        if not in_europe_frame(feat, nid):
            dropped += 1
            continue
        val = value_fn(payload)
        if val is None:
            continue
        cc = cntr_of(feat) or nid[:2]
        country = ISO2_NAME.get(cc, cc)
        name = nuts_name_of(feat) or nid
        display = f"{country} · {name}"
        slug = f"eu-{bsm.slugify(nid)}"
        year = year_fn(payload)
        feats.append(
            {
                **feat,
                "id": slug,
                "properties": {
                    "name": display,
                    "slug": slug,
                    "iso3": cc,
                    "code": nid,
                    "year": year,
                },
            }
        )
        regions.append(
            {"id": slug, "slug": slug, "name": display, "value": val}
        )
    print(f"    kept {len(regions)} (dropped overseas {dropped})")
    return feats, regions


def upsert(catalog: dict, entry: dict) -> None:
    maps = catalog["maps"]
    for i, m in enumerate(maps):
        if m["id"] == entry["id"]:
            maps[i] = entry
            return
    maps.append(entry)


def catalog_metric(
    *,
    id: str,
    title: str,
    metric: str,
    unit: str,
    kind: str,
    year: int,
    yearFrom: int | None,
    source: str,
    sourceUrl: str,
    geoUrl: str,
    tab: str,
    note: str,
    regions: list[dict],
    scale: str,
    mid: float | None = None,
    decimals_round: int = 2,
) -> dict:
    rounded = []
    for r in regions:
        v = r["value"]
        rounded.append(
            {**r, "value": None if v is None else round(float(v), decimals_round)}
        )
    vals = [r["value"] for r in rounded if r.get("value") is not None]
    entry = {
        "id": id,
        "iso3": "EU",
        "country": "Europe",
        "title": title,
        "metric": metric,
        "unit": unit,
        "kind": kind,
        "year": year,
        "national": None,
        "source": source,
        "sourceUrl": sourceUrl,
        "credit": None,
        "geoUrl": geoUrl,
        "scale": scale,
        "labelValues": False,
        "tab": tab,
        "note": note,
        "regions": rounded,
        "min": round(min(vals), decimals_round) if vals else None,
        "max": round(max(vals), decimals_round) if vals else None,
    }
    if mid is not None:
        entry["mid"] = mid
    if yearFrom is not None:
        entry["yearFrom"] = yearFrom
    return entry


def main() -> int:
    print("Loading GISCO NUTS 3…")
    nuts3 = {
        y: fetch_json(url, CACHE / f"gisco-nuts3-{y}.json")
        for y, url in NUTS3_URL.items()
    }
    print("Loading GISCO NUTS 2…")
    nuts2 = {
        y: fetch_json(url, CACHE / f"gisco-nuts2-{y}.json")
        for y, url in NUTS2_URL.items()
    }

    print("Median age (demo_r_pjanind3)…")
    med_rows = decode_jsonstat(
        fetch_eurostat("demo_r_pjanind3", "indic_de=MEDAGEPOP&unit=YR", "ryb-medage.json")
    )
    med_latest = latest_by_geo(med_rows, geo_len=5)
    print(f"  {len(med_latest)} NUTS 3")

    print("Working-age population (demo_r_pjanaggr3)…")
    wa_rows = decode_jsonstat(fetch_eurostat("demo_r_pjanaggr3", "sex=T", "ryb-pjanaggr3.json"))
    wa_total = latest_by_geo(wa_rows, geo_len=5, filters={"age": "Y15-64"})
    pop_total = latest_by_geo(wa_rows, geo_len=5, filters={"age": "TOTAL"})
    wa_pct: dict[str, tuple[float, str]] = {}
    for geo, (wa, y) in wa_total.items():
        tot = None
        same = [
            r
            for r in wa_rows
            if r.get("geo") == geo and r.get("age") == "TOTAL" and r.get("time") == y
        ]
        if same:
            tot = same[0]["value"]
        elif geo in pop_total:
            tot = pop_total[geo][0]
        if not tot or tot <= 0:
            continue
        wa_pct[geo] = (100.0 * wa / tot, y)
    print(f"  total {len(wa_total)} · pct {len(wa_pct)}")

    print("Natural change / net migration (demo_r_gind3)…")
    gind_rows = decode_jsonstat(fetch_eurostat("demo_r_gind3", "", "ryb-gind3.json"))
    nat_all = latest_by_geo(gind_rows, geo_len=5, filters={"indic_de": "NATGROWRT"})
    nat_by_year: dict[str, int] = defaultdict(int)
    for _, y in nat_all.values():
        if y <= "2024":
            nat_by_year[y] += 1
    prefer_nat = (
        max(nat_by_year, key=lambda y: (nat_by_year[y], y)) if nat_by_year else "2023"
    )
    nat_latest = {g: (v, y) for g, (v, y) in nat_all.items() if y == prefer_nat}
    print(f"  natural change {len(nat_latest)} ({prefer_nat})")
    mig_mean = mean_by_geo(
        gind_rows,
        year_from="2014",
        year_to="2024",
        geo_len=5,
        filters={"indic_de": "CNMIGRATRT"},
    )
    print(f"  net migration 2014–24 mean {len(mig_mean)}")

    seed3 = {**med_latest, **wa_pct, **nat_latest, **mig_mean, **wa_total}
    feat3 = match_nuts(seed3, nuts3)
    print(f"Matched NUTS 3 polygons {len(feat3)} / {len(seed3)}")

    med_feats, med_regions = build_layer_features(
        med_latest, feat3, value_fn=lambda p: round(p[0], 1), year_fn=lambda p: int(p[1])
    )
    wa_feats, wa_regions = build_layer_features(
        wa_total, feat3, value_fn=lambda p: round(p[0], 0), year_fn=lambda p: int(p[1])
    )
    wap_feats, wap_regions = build_layer_features(
        wa_pct, feat3, value_fn=lambda p: round(p[0], 1), year_fn=lambda p: int(p[1])
    )
    nat_feats, nat_regions = build_layer_features(
        nat_latest, feat3, value_fn=lambda p: round(p[0], 1), year_fn=lambda p: int(p[1])
    )
    mig_feats, mig_regions = build_layer_features(
        mig_mean, feat3, value_fn=lambda p: round(p[0], 1), year_fn=lambda p: int(p[2])
    )

    geo_ids: dict[str, dict] = {}
    for feats in (med_feats, wa_feats, wap_feats, nat_feats, mig_feats):
        for f in feats:
            geo_ids[f["id"]] = f
    geo_url_n3 = write_geo("eu-nuts3", list(geo_ids.values()), max_pts=48)
    print(f"Wrote {geo_url_n3} ({len(geo_ids)} features)")

    districts_note = (
        "Eurostat NUTS 3 regions — same geography as the Regional Yearbook population "
        "chapter. Overseas territories are dropped so the default frame stays continental "
        "Europe. Grey gaps are places with no published figure for that indicator."
    )

    entries = [
        catalog_metric(
            id="eu-nuts3-median-age",
            title="Median age, Europe by NUTS 3 region",
            metric="median-age",
            unit="years",
            kind="district",
            year=max(int(y) for _, y in med_latest.values()),
            yearFrom=None,
            source="Eurostat demo_r_pjanind3 — median age of population (MEDAGEPOP), latest year per NUTS 3 region.",
            sourceUrl="https://ec.europa.eu/eurostat/databrowser/view/demo_r_pjanind3",
            geoUrl=geo_url_n3,
            tab="Districts",
            note=districts_note,
            regions=med_regions,
            scale="plasma",
            decimals_round=1,
        ),
        catalog_metric(
            id="eu-nuts3-working-age-pct",
            title="Working-age share, Europe by NUTS 3 region",
            metric="working-age-pct",
            unit="% of population",
            kind="district",
            year=max(int(y) for _, y in wa_pct.values()),
            yearFrom=None,
            source="Eurostat demo_r_pjanaggr3 — population aged 15–64 as a share of total population on 1 January, NUTS 3.",
            sourceUrl="https://ec.europa.eu/eurostat/databrowser/view/demo_r_pjanaggr3",
            geoUrl=geo_url_n3,
            tab="Districts",
            note=districts_note,
            regions=wap_regions,
            scale="sequential",
            decimals_round=1,
        ),
        catalog_metric(
            id="eu-nuts3-working-age",
            title="Working-age population, Europe by NUTS 3 region",
            metric="working-age",
            unit="people aged 15–64",
            kind="district",
            year=max(int(y) for _, y in wa_total.values()),
            yearFrom=None,
            source="Eurostat demo_r_pjanaggr3 — population aged 15–64 on 1 January, NUTS 3.",
            sourceUrl="https://ec.europa.eu/eurostat/databrowser/view/demo_r_pjanaggr3",
            geoUrl=geo_url_n3,
            tab="Districts",
            note=districts_note,
            regions=wa_regions,
            scale="sequential",
            decimals_round=0,
        ),
        catalog_metric(
            id="eu-nuts3-natural-change",
            title="Crude rate of natural population change, Europe by NUTS 3",
            metric="natural-change",
            unit="‰",
            kind="district",
            year=int(prefer_nat),
            yearFrom=None,
            source="Eurostat demo_r_gind3 — crude rate of natural change of population (NATGROWRT), NUTS 3.",
            sourceUrl="https://ec.europa.eu/eurostat/databrowser/view/demo_r_gind3",
            geoUrl=geo_url_n3,
            tab="Districts",
            note=districts_note,
            regions=nat_regions,
            scale="diverging-growth",
            mid=0,
            decimals_round=1,
        ),
        catalog_metric(
            id="eu-nuts3-net-migration",
            title="Crude rate of net migration, Europe by NUTS 3 (2014–2024)",
            metric="net-migration",
            unit="‰",
            kind="district",
            year=2024,
            yearFrom=2014,
            source="Eurostat demo_r_gind3 — crude rate of net migration plus statistical adjustment (CNMIGRATRT), mean of available years 2014–2024, NUTS 3.",
            sourceUrl="https://ec.europa.eu/eurostat/databrowser/view/demo_r_gind3",
            geoUrl=geo_url_n3,
            tab="Districts",
            note=districts_note
            + " Net migration is the 2014–2024 average, matching the Regional Yearbook period map.",
            regions=mig_regions,
            scale="diverging-growth",
            mid=0,
            decimals_round=1,
        ),
    ]

    print("Employment rate (lfst_r_lfe2emprt)…")
    emp_rows = decode_jsonstat(
        fetch_eurostat("lfst_r_lfe2emprt", "age=Y15-64&unit=PC", "ryb-emprt.json")
    )
    emp_t = latest_by_geo(emp_rows, geo_len=4, filters={"sex": "T"})
    emp_m = latest_by_geo(emp_rows, geo_len=4, filters={"sex": "M"})
    emp_f = latest_by_geo(emp_rows, geo_len=4, filters={"sex": "F"})
    emp_gap = {
        geo: (mv - emp_f[geo][0], y)
        for geo, (mv, y) in emp_m.items()
        if geo in emp_f
    }
    print(f"  employment {len(emp_t)} · gap {len(emp_gap)}")

    print("NEET rate (edat_lfse_22)…")
    neet_rows = decode_jsonstat(
        fetch_eurostat(
            "edat_lfse_22",
            "sex=T&age=Y15-29&training=NO_FE_NO_NFE&wstatus=NEMP&unit=PC",
            "ryb-neet.json",
        )
    )
    neet_latest = latest_by_geo(neet_rows, geo_len=4)
    print(f"  NEET {len(neet_latest)}")

    labour_seed = {**emp_t, **emp_gap, **neet_latest}
    feat2 = match_nuts(labour_seed, nuts2)
    print(f"Matched NUTS 2 polygons {len(feat2)} / {len(labour_seed)}")

    _, emp_regions = build_layer_features(
        emp_t, feat2, value_fn=lambda p: round(p[0], 1), year_fn=lambda p: int(p[1])
    )
    _, gap_regions = build_layer_features(
        emp_gap, feat2, value_fn=lambda p: round(p[0], 1), year_fn=lambda p: int(p[1])
    )
    _, neet_regions = build_layer_features(
        neet_latest, feat2, value_fn=lambda p: round(p[0], 1), year_fn=lambda p: int(p[1])
    )

    prov_geo = "/geo/maps/eu-prov-tfr.json"
    provinces_note = (
        "Labour Force Survey indicators at NUTS 2 — same Provinces geography as the "
        "fertility map. Gender employment gap is male minus female employment rate "
        "(15–64). NEET is ages 15–29 neither employed nor in education or training."
    )
    entries += [
        catalog_metric(
            id="eu-prov-employment",
            title="Employment rate, Europe by NUTS 2 region",
            metric="employment",
            unit="% of population 15–64",
            kind="province",
            year=max(int(y) for _, y in emp_t.values()),
            yearFrom=None,
            source="Eurostat lfst_r_lfe2emprt — employment rate, age 15–64, total, NUTS 2.",
            sourceUrl="https://ec.europa.eu/eurostat/databrowser/view/lfst_r_lfe2emprt",
            geoUrl=prov_geo,
            tab="Provinces",
            note=provinces_note,
            regions=emp_regions,
            scale="sequential",
            decimals_round=1,
        ),
        catalog_metric(
            id="eu-prov-employment-gap",
            title="Gender employment gap, Europe by NUTS 2 region",
            metric="employment-gap",
            unit="pp (male − female)",
            kind="province",
            year=max(int(y) for _, y in emp_gap.values()),
            yearFrom=None,
            source="Eurostat lfst_r_lfe2emprt — male minus female employment rate, age 15–64, NUTS 2.",
            sourceUrl="https://ec.europa.eu/eurostat/databrowser/view/lfst_r_lfe2emprt",
            geoUrl=prov_geo,
            tab="Provinces",
            note=provinces_note,
            regions=gap_regions,
            scale="diverging-growth",
            mid=0,
            decimals_round=1,
        ),
        catalog_metric(
            id="eu-prov-neet",
            title="NEET rate, Europe by NUTS 2 region",
            metric="neet",
            unit="% of population 15–29",
            kind="province",
            year=max(int(y) for _, y in neet_latest.values()),
            yearFrom=None,
            source="Eurostat edat_lfse_22 — young people neither in employment nor in education and training (NEET), age 15–29, NUTS 2.",
            sourceUrl="https://ec.europa.eu/eurostat/databrowser/view/edat_lfse_22",
            geoUrl=prov_geo,
            tab="Provinces",
            note=provinces_note,
            regions=neet_regions,
            scale="sequential",
            decimals_round=1,
        ),
    ]

    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    for entry in entries:
        upsert(catalog, entry)
        n = sum(1 for r in entry["regions"] if r["value"] is not None)
        print(f"  {entry['id']:28} {n:4}/{len(entry['regions'])}  {entry['title']}")

    CATALOG.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    print(f"catalog now {len(catalog['maps'])} maps")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(130)
