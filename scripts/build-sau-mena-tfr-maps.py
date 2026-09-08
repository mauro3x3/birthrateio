#!/usr/bin/env python3
"""Saudi regional TFR (all vs Saudi women) plus extra MENA provincial layers.

Does not rewrite the rest of the catalog. Do not run build-subnational-maps.py.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "src" / "lib" / "data" / "subnational-maps.json"
GEO = ROOT / "public" / "geo" / "maps"

spec = importlib.util.spec_from_file_location(
    "more_tfr", ROOT / "scripts" / "build-more-tfr-maps.py"
)
more = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(more)

# GASTAT Census 2022 / Household Health Survey 2022 — TFR by region.
# All residents, Saudi women, non-Saudi women. National: 2.14 / 2.80 / 0.91.
SAU_TFR_ALL = {
    "Al Jawf": 3.62,
    "Northern Borders": 3.17,
    "Najran": 3.11,
    "Tabuk": 2.71,
    "Hail": 2.51,
    "Al Madinah": 2.48,
    "Aseer": 2.46,
    "Jazan": 2.37,
    "Al Bahah": 2.31,
    "Al Qaseem": 2.28,
    "Eastern Region": 2.27,
    "Riyadh": 1.88,
    "Makkah": 1.79,
}
SAU_TFR_SAUDI = {
    "Al Jawf": 4.44,
    "Northern Borders": 3.90,
    "Najran": 3.79,
    "Tabuk": 3.16,
    "Hail": 3.11,
    "Al Madinah": 3.08,
    "Aseer": 2.90,
    "Jazan": 2.67,
    "Al Bahah": 2.71,
    "Al Qaseem": 2.81,
    "Eastern Region": 2.85,
    "Riyadh": 2.65,
    "Makkah": 2.45,
}

SAU_SOURCE = (
    "GASTAT, Saudi Census 2022 / Household Health Survey 2022 — total fertility "
    "rate by administrative region for all women and for Saudi women. National "
    "2024 from GASTAT Population Estimates Statistics 2024: all residents 2.0, "
    "Saudi women 2.7, non-Saudi women 0.8. The 2022 regional table is the last "
    "published TFR by administrative region."
)
SAU_SOURCE_URL = (
    "https://www.stats.gov.sa/documents/20117/2435273/"
    "Population+Estimates+Statistics+2024+EN.pdf/"
    "9b71e303-5fd9-19cb-9913-850a9d521639"
)
SAU_NOTE = (
    "The map is Census 2022 TFR by the 13 administrative regions — GASTAT has not "
    "republished a regional table since. National totals from Population Estimates "
    "2024 are 2.0 (all residents), 2.7 (Saudi women) and 0.8 (non-Saudi). Toggle "
    "between all residents (2022 national 2.14) and Saudi women only (2.80). "
    "Non-Saudi TFR is much lower in every region; most non-Saudis are working-age "
    "migrants rather than a settled immigrant population."
)

# HCP RGPH 2024, Note sur les principaux résultats, Figure 4 (ISF by region).
# National ISF 1.97. Bars ordered as published; Souss-Massa is 1.86 on the figure
# (the accompanying sentence swapped it with Guelmim-Oued Noun 1.89).
MAR_TFR_2024 = {
    "Oriental": 1.73,
    "Souss-Massa": 1.86,
    "Guelmim-Oued Noun": 1.89,
    "Casablanca-Settat": 1.90,
    "Rabat-Salé-Kénitra": 1.91,
    "Béni Mellal-Khénifra": 1.95,
    "Tanger-Tétouan-Al Hoceima": 2.01,
    "Fès-Meknès": 2.02,
    "Marrakech-Safi": 2.13,
    "Laâyoune-Sakia El Hamra": 2.17,
    "Dakhla-Oued Ed-Dahab": 2.25,
    "Drâa-Tafilalet": 2.35,
}
MAR_SOURCE = (
    "Haut-Commissariat au Plan, Recensement Général de la Population et de "
    "l’Habitat 2024 — indice synthétique de fécondité by region (Figure 4 of "
    "the December 2024 results note). National ISF 1.97."
)
MAR_SOURCE_URL = "https://www.hcp.ma/file/242665/"
MAR_NOTE = (
    "RGPH 2024 synthetic fertility index (ISF) for Morocco’s 12 regions. "
    "National ISF is 1.97, below replacement. Urban 1.77, rural 2.37."
)

# INS Flash projection 2025–2054 (15 May 2026): 2024 ISF 1.54 from vital statistics.
TUN_TFR_2024 = 1.54
# GASTAT Population Estimates 2024.
SAU_TFR_2024_ALL = 2.0
SAU_TFR_2024_SAUDI = 2.7
SAU_TFR_2024_NONSAUDI = 0.8

more.ALIASES_BY_ISO["MAR"] = {
    "tanger tetouan al hoceima": "tangier tetouan al hoceima",
    "fes meknes": "fez meknes",
}
DHS_EXTRA = [
    {
        "survey": "YE2013DHS",
        "iso3": "YEM",
        "country": "Yemen",
        "kind": "governorate",
        "prefix": "yemen",
        "year": 2013,
        "source": (
            "MOPHP/ICF, Yemen National Health and Demographic Survey 2013 — total "
            "fertility rate by governorate (STATcompiler FE_FRTR_W_TFR)."
        ),
        "sourceUrl": "https://www.statcompiler.com/en/",
        "note": (
            "YNHDS 2013 TFR for the three years before interview. Later conflict-period "
            "estimates are not a governorate TFR table we can redistribute."
        ),
    },
]

more.ALIASES_BY_ISO["SAU"] = {
    "al jawf": "al jawf region",
    "northern borders": "northern borders region",
    "najran": "najran region",
    "tabuk": "tabuk region",
    "hail": "hayel region",
    "hayel": "hayel region",
    "al madinah": "al madinah region",
    "aseer": "asir region",
    "asir": "asir region",
    "jazan": "jazan region",
    "al bahah": "al bahah region",
    "al qaseem": "al qassim region",
    "al qassim": "al qassim region",
    "eastern region": "eastern region",
    "riyadh": "riyadh region",
    "makkah": "makkah region",
}
more.ALIASES_BY_ISO["YEM"] = {
    "ibb": "ibb governorate",
    "abyan": "abyan governorate",
    "sanaa city": "san a",
    "al baidha": "al bayda governorate",
    "taiz": "ta izz governorate",
    "al jawf": "al jawf governorate",
    "hajjah": "hajjah governorate",
    "al hodiedah": "al hudaydah governorate",
    "hadramout": "hadhramaut",
    "dhamar": "dhamar governorate",
    "shabwah": "shabwah governorate",
    "sadah": "sa dah governorate",
    "sanaa": "san a governorate",
    "aden": "adan governorate",
    "lahj": "lahij governorate",
    "mareb": "ma rib governorate",
    "al mhweit": "al mahwit governorate",
    "al mhrah": "al mahrah governorate",
    "amran": "amran governorate",
    "aldhalae": "ad dali governorate",
    "reimah": "raymah governorate",
}


def match_or_die(iso3: str, table: dict[str, float], feats: list[dict], prefix: str, min_ok: int | None = None):
    out_feats, regions, n, tot, unmatched = more.match_admin1(iso3, table, feats, prefix)
    print(f"  {iso3} matched {n}/{tot}")
    if unmatched:
        print("    unmatched", unmatched)
        avail = sorted({more.admin1_name(f) for f in feats})
        print("    available", avail[:40], ("…" if len(avail) > 40 else ""))
    need = min_ok if min_ok is not None else tot
    if n < need:
        raise SystemExit(f"{iso3} match rate too low ({n}/{tot})")
    return out_feats, regions


def load_geojson(rel: str) -> list[dict]:
    path = ROOT / "public" / rel.lstrip("/")
    if not path.exists():
        path = GEO / Path(rel).name
    data = json.loads(path.read_text(encoding="utf-8"))
    return data.get("features") or []


def prefix_features(feats: list[dict], country: str, iso3: str) -> list[dict]:
    out = []
    for feat in feats:
        props = dict(feat.get("properties") or {})
        name = props.get("name") or more.admin1_name(feat)
        props["name"] = f"{country} · {name}"
        props["iso3"] = iso3
        out.append({**feat, "properties": props})
    return out


def upsert(catalog: dict, entry: dict):
    maps = catalog["maps"]
    maps[:] = [m for m in maps if m["id"] != entry["id"]]
    maps.append(entry)


def main():
    print("Saudi geoBoundaries ADM1…")
    sau_gb = more.geoboundaries_adm1("SAU")
    sau_all_feats, sau_all_regions = match_or_die("SAU", SAU_TFR_ALL, sau_gb, "saudi")
    geo_url = more.write_geo("sau-tfr", sau_all_feats, max_pts=80)
    _, sau_nat_regions = match_or_die("SAU", SAU_TFR_SAUDI, sau_gb, "saudi")
    # Same geometry and ids; only values change.
    id_by_norm = {more.bsm.norm_name(r["name"]): r["id"] for r in sau_all_regions}
    aligned_nat = []
    for r in sau_nat_regions:
        rid = id_by_norm.get(more.bsm.norm_name(r["name"]))
        if not rid:
            raise SystemExit(f"Saudi-women region missing from all-residents layer: {r['name']}")
        aligned_nat.append({**r, "id": rid, "slug": rid})

    sau_all = more.catalog_entry(
        id="sau-tfr",
        iso3="SAU",
        country="Saudi Arabia",
        title="Total fertility rate, Saudi Arabia 2022",
        kind="region",
        year=2022,
        national=2.14,
        source=SAU_SOURCE,
        sourceUrl=SAU_SOURCE_URL,
        geoUrl=geo_url,
        note=SAU_NOTE,
        tab="All residents",
        regions=sau_all_regions,
        scale="diverging-tfr",
        mid=2.1,
    )
    sau_nat = more.catalog_entry(
        id="sau-tfr-nationals",
        iso3="SAU",
        country="Saudi Arabia",
        title="Total fertility rate, Saudi women, Saudi Arabia 2022",
        kind="region",
        year=2022,
        national=2.80,
        source=SAU_SOURCE,
        sourceUrl=SAU_SOURCE_URL,
        geoUrl=geo_url,
        note=SAU_NOTE,
        tab="Saudi women",
        regions=aligned_nat,
        scale="diverging-tfr",
        mid=2.1,
    )

    new_maps = [sau_all, sau_nat]
    provincial_layers = [
        ("Saudi Arabia", "SAU", sau_all_feats, sau_all_regions, 2022),
    ]

    print("Morocco RGPH 2024…")
    mar_gb = more.geoboundaries_adm1("MAR")
    mar_feats, mar_regions = match_or_die("MAR", MAR_TFR_2024, mar_gb, "morocco")
    mar_entry = more.catalog_entry(
        id="mar-tfr",
        iso3="MAR",
        country="Morocco",
        title="Total fertility rate, Morocco 2024",
        kind="region",
        year=2024,
        national=1.97,
        source=MAR_SOURCE,
        sourceUrl=MAR_SOURCE_URL,
        geoUrl=more.write_geo("mar-tfr", mar_feats, max_pts=80),
        note=MAR_NOTE,
        regions=mar_regions,
        scale="diverging-tfr",
        mid=2.1,
    )
    new_maps.append(mar_entry)
    provincial_layers.append(("Morocco", "MAR", mar_feats, mar_regions, 2024))

    for spec_map in DHS_EXTRA:
        recs = more.dhs_subnational(spec_map["survey"])
        leaves = more.dhs_leaves(recs)
        table = {name: val for name, val in leaves}
        try:
            gb_feats = more.geoboundaries_adm(spec_map["iso3"], spec_map.get("adm", "ADM1"))
        except Exception as exc:
            print(f"  {spec_map['iso3']} geoBoundaries failed: {exc}")
            gb_feats = []
        if not gb_feats:
            print("    skip (no geometry)")
            continue
        tot = len(table)
        min_ok = tot if tot <= 8 else max(int(round(tot * 0.85)), tot - 2)
        try:
            feats, regions = match_or_die(
                spec_map["iso3"], table, gb_feats, spec_map["prefix"], min_ok=min_ok
            )
        except SystemExit as exc:
            print("   ", exc)
            continue
        national = more.dhs_national(spec_map["survey"])
        entry = more.catalog_entry(
            id=f"{spec_map['iso3'].lower()}-tfr",
            iso3=spec_map["iso3"],
            country=spec_map["country"],
            title=f"Total fertility rate, {spec_map['country']} {spec_map['year']}",
            kind=spec_map["kind"],
            year=spec_map["year"],
            national=national,
            source=spec_map["source"],
            sourceUrl=spec_map["sourceUrl"],
            geoUrl=more.write_geo(f"{spec_map['iso3'].lower()}-tfr", feats, max_pts=80),
            note=spec_map.get("note"),
            regions=regions,
            scale="diverging-tfr",
            mid=2.1,
        )
        new_maps.append(entry)
        provincial_layers.append(
            (spec_map["country"], spec_map["iso3"], feats, regions, spec_map["year"])
        )

    # Jordan and Türkiye already in the catalog — reuse their geometry.
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    by_id = {m["id"]: m for m in catalog["maps"]}
    for map_id, country, iso3 in (
        ("jor-tfr", "Jordan", "JOR"),
        ("tur-tfr", "Türkiye", "TUR"),
    ):
        existing = by_id.get(map_id)
        if not existing:
            print(f"  missing {map_id}, skip in MENA composite")
            continue
        feats = load_geojson(existing["geoUrl"])
        provincial_layers.append(
            (country, iso3, feats, existing["regions"], existing["year"])
        )
        print(f"  reuse {map_id} ({len(existing['regions'])} regions)")

    mena_national = by_id.get("mena-tfr")
    official_national = {
        "saudi arabia": SAU_TFR_2024_ALL,
        "morocco": 1.97,
        "tunisia": TUN_TFR_2024,
    }

    def apply_official(entry: dict | None):
        if not entry:
            return
        for r in entry.get("regions") or []:
            key = more.bsm.norm_name(r["name"])
            if key in official_national:
                r["value"] = official_national[key]
        vals = [r["value"] for r in entry["regions"] if r.get("value") is not None]
        if vals:
            entry["min"] = round(min(vals), 2)
            entry["max"] = round(max(vals), 2)

    apply_official(mena_national)
    apply_official(by_id.get("africa-tfr"))

    composite_feats = []
    composite_regions = []
    covered = {iso3 for _, iso3, _, _, _ in provincial_layers}
    vintages = []
    for country, iso3, feats, regions, year in provincial_layers:
        vintages.append(f"{country} {year}")
        labeled = prefix_features(feats, country, iso3)
        feat_by_id = {str(f.get("id")): f for f in labeled}
        for region in regions:
            feat = feat_by_id.get(region["id"])
            if feat is None:
                print(f"    skip unmapped {iso3} {region['name']}")
                continue
            slug = f"mena-{iso3.lower()}-{more.bsm.slugify(region['name'])}"
            feat = {
                **feat,
                "id": slug,
                "properties": {
                    **feat["properties"],
                    "name": feat["properties"]["name"],
                    "slug": slug,
                },
            }
            composite_feats.append(feat)
            composite_regions.append(
                {
                    "id": slug,
                    "slug": slug,
                    "name": feat["properties"]["name"],
                    "value": region.get("value"),
                }
            )

    if mena_national:
        nat_feats = load_geojson(mena_national["geoUrl"])
        val_by_name = {
            more.bsm.norm_name(r["name"]): r["value"] for r in mena_national["regions"]
        }
        skipped = 0
        for feat in nat_feats:
            iso = (feat.get("properties") or {}).get("iso3") or more.iso_of(feat)
            name = (feat.get("properties") or {}).get("name") or more.admin1_name(feat)
            if iso in covered:
                skipped += 1
                continue
            slug = feat.get("id") or f"mena-{more.bsm.slugify(name)}"
            composite_feats.append(feat)
            composite_regions.append(
                {
                    "id": slug,
                    "slug": slug,
                    "name": name,
                    "value": val_by_name.get(more.bsm.norm_name(name)),
                }
            )
        print(f"  MENA national fill {len(composite_regions) - len(provincial_layers)} (skipped {skipped} with provinces)")

    mena_prov = more.catalog_entry(
        id="mena-prov-tfr",
        iso3="MENA",
        country="Middle East & North Africa",
        title="Total fertility rate, Middle East & North Africa by province",
        kind="province",
        year=2022,
        national=None,
        source=(
            "Provincial TFR where published: GASTAT Census 2022 (Saudi Arabia), "
            "HCP RGPH 2024 (Morocco), Jordan PFHS 2023, Yemen NHS 2013, Eurostat "
            "NUTS-2 2024 (Türkiye). Remaining countries are national World Bank WDI "
            "TFR except Saudi Arabia (GASTAT 2024) and Tunisia (INS 2024) on the "
            "Countries tab."
        ),
        sourceUrl="https://www.statcompiler.com/en/",
        geoUrl=more.write_geo("mena-prov-tfr", composite_feats, max_pts=55),
        note=(
            "Not one vintage. Provinces are drawn for Saudi Arabia (Census 2022), "
            "Morocco (RGPH 2024), Jordan, Yemen and Türkiye; every other polygon is "
            "a national TFR so the map is not empty. Egypt’s 2014 DHS published only "
            "regional (not governorate) TFR. Iran’s statistical office has not "
            "released redistributable provincial TFR. Arab Barometer is an opinion "
            "survey and does not publish TFR. Use the Countries tab for a national map."
        ),
        tab="Provinces",
        regions=composite_regions,
        scale="diverging-tfr",
        mid=2.1,
        labelValues=False,
    )
    print("  MENA provinces", len(composite_regions), "vintages:", ", ".join(vintages))
    new_maps.append(mena_prov)

    if mena_national:
        mena_national["tab"] = "Countries"
        mena_national["note"] = (
            "National TFR, latest official year. World Bank WDI except Saudi Arabia "
            "(GASTAT Population Estimates 2024: 2.0 all residents) and Tunisia "
            "(INS 2024: 1.54). Morocco on this tab is HCP RGPH 2024 (1.97). Open "
            "the Provinces tab for Saudi regions, Moroccan regions, Jordanian "
            "governorates, and other published provincial series."
        )

    for entry in new_maps:
        upsert(catalog, entry)
    CATALOG.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    print(f"catalog now {len(catalog['maps'])} maps")
    for m in new_maps:
        n = sum(1 for r in m["regions"] if r["value"] is not None)
        print(f"  {m['id']:22} {n:3}/{len(m['regions'])}  {m['title']}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
