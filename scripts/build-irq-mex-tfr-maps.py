#!/usr/bin/env python3
"""Add Iraq 2025, Mexico 2024 TFR maps + append to subnational-maps catalog."""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "src" / "lib" / "data" / "subnational-maps.json"
GEO_OUT = ROOT / "public" / "geo" / "maps"
CACHE = ROOT / ".cache" / "census"


def slugify(name: str, prefix: str) -> str:
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return f"{prefix}-{s}"


def simplify_ring(ring, step: int = 1):
    if step <= 1 or len(ring) < 20:
        return ring
    out = ring[::step]
    if out[-1] != ring[-1]:
        out.append(ring[-1])
    return out


def light_simplify(geom: dict, max_pts: int = 800) -> dict:
    """Very light decimation so large geoBoundaries files stay under ~1MB."""

    def count(coords):
        n = 0

        def walk(c):
            nonlocal n
            if isinstance(c[0], (int, float)):
                n += 1
                return
            for x in c:
                walk(x)

        walk(coords)
        return n

    def simp(coords, step):
        if isinstance(coords[0][0], (int, float)):
            return simplify_ring(coords, step)
        return [simp(c, step) for c in coords]

    n = count(geom["coordinates"])
    if n <= max_pts:
        return geom
    step = max(2, n // max_pts)
    return {"type": geom["type"], "coordinates": simp(geom["coordinates"], step)}


# BirthGauge Iraq 2025 — from map labels (Kurdish provinces: no data).
IRAQ_TFR_2025 = {
    "Ninawa": 3.13,
    "Kirkuk": 3.18,
    "Al-Anbar": 3.01,
    "Salah al-Din": 2.82,
    "Diyala": 2.52,
    "Baghdad": 2.59,
    "Babil": 2.88,
    "Wasit": 2.97,
    "Karbala": 3.66,
    "An-Najaf": 3.49,
    "Al-Qadisiyah": 2.68,
    "Dhi Qar": 2.56,
    "Maysan": 3.32,
    "Al-Muthanna": 3.51,
    "Al-Basrah": 3.37,
    # Kurdish region — explicitly null on BirthGauge map
    "Dohuk": None,
    "Erbil": None,
    "Al-Sulaimaniyah": None,
}

IRAQ_NAME_ALIASES = {
    "Al-Anbar": "Anbar",
    "An-Najaf": "Najaf",
    "Al-Qadisiyah": "Qadisiyah",
    "Al-Muthanna": "Muthanna",
    "Al-Basrah": "Basra",
    "Salah al-Din": "Saladin",
    "Al-Sulaimaniyah": "Sulaymaniyah",
    "Ninawa": "Nineveh",
}

# ENADID 2018 (quinquenio 2013–2017) TGF by entidad.
MEXICO_ENADID_2018 = {
    "Aguascalientes": 2.33,
    "Baja California": 2.00,
    "Baja California Sur": 2.10,
    "Campeche": 2.17,
    "Coahuila de Zaragoza": 2.53,
    "Colima": 2.04,
    "Chiapas": 2.80,
    "Chihuahua": 2.21,
    "Ciudad de México": 1.34,
    "Distrito Federal": 1.34,
    "Durango": 2.33,
    "Guanajuato": 2.14,
    "Guerrero": 2.46,
    "Hidalgo": 2.11,
    "Jalisco": 2.20,
    "México": 1.82,
    "Mexico": 1.82,
    "Michoacán de Ocampo": 2.31,
    "Michoacan de Ocampo": 2.31,
    "Morelos": 2.02,
    "Nayarit": 2.25,
    "Nuevo León": 2.01,
    "Nuevo Leon": 2.01,
    "Oaxaca": 2.16,
    "Puebla": 2.23,
    "Querétaro": 1.93,
    "Queretaro de Arteaga": 1.93,
    "Quintana Roo": 2.01,
    "San Luis Potosí": 2.18,
    "San Luis Potosi": 2.18,
    "Sinaloa": 2.14,
    "Sonora": 2.10,
    "Tabasco": 2.21,
    "Tamaulipas": 2.14,
    "Tlaxcala": 2.15,
    "Veracruz de Ignacio de la Llave": 2.14,
    "Yucatán": 2.12,
    "Yucatan": 2.12,
    "Zacatecas": 2.71,
}

# BirthGauge / IFS published 2024 pins
MEXICO_PIN_2024 = {
    "Ciudad de México": 0.79,
    "Distrito Federal": 0.79,
    "Baja California": 1.04,
    "Querétaro": 1.06,
    "Queretaro de Arteaga": 1.06,
}

MEXICO_DISPLAY = {
    "Distrito Federal": "Mexico City",
    "Mexico": "Mexico State",
    "México": "Mexico State",
    "Michoacan de Ocampo": "Michoacán",
    "Michoacán de Ocampo": "Michoacán",
    "Coahuila de Zaragoza": "Coahuila",
    "Veracruz de Ignacio de la Llave": "Veracruz",
    "Queretaro de Arteaga": "Querétaro",
    "Nuevo Leon": "Nuevo León",
    "San Luis Potosi": "San Luis Potosí",
    "Yucatan": "Yucatán",
}


def mexico_tfr_2024(shape_name: str) -> float:
    if shape_name in MEXICO_PIN_2024:
        return MEXICO_PIN_2024[shape_name]
    base = MEXICO_ENADID_2018.get(shape_name)
    if base is None:
        raise KeyError(shape_name)
    # Scale ENADID quinquenio levels to Intercensal/BirthGauge 2024 national 1.23
    # using national ENADID trienium ~2.07 as the bridge.
    return round(base * (1.23 / 2.07), 2)


def build_geo(iso: str, cache_name: str, value_for, prefix: str, display_for=None):
    raw = json.loads((CACHE / cache_name).read_text())
    feats = []
    regions = []
    for f in raw["features"]:
        name = f["properties"]["shapeName"]
        slug = slugify(display_for(name) if display_for else name, prefix)
        disp = display_for(name) if display_for else name
        val = value_for(name)
        geom = light_simplify(f["geometry"], max_pts=1200 if iso == "MEX" else 900)
        feats.append(
            {
                "type": "Feature",
                "properties": {"name": disp, "slug": slug, "iso3": iso},
                "geometry": geom,
            }
        )
        regions.append(
            {
                "id": slug,
                "slug": slug,
                "name": disp,
                "value": val,
            }
        )
    GEO_OUT.mkdir(parents=True, exist_ok=True)
    dest = GEO_OUT / f"{iso.lower()}-tfr.json"
    dest.write_text(
        json.dumps({"type": "FeatureCollection", "features": feats}, separators=(",", ":"))
        + "\n"
    )
    print(f"wrote {dest.relative_to(ROOT)} ({len(feats)} features, {dest.stat().st_size} bytes)")
    return regions


def upsert(entry: dict) -> None:
    cat = json.loads(CATALOG.read_text())
    maps = [m for m in cat["maps"] if m.get("id") != entry["id"]]
    maps.append(entry)
    cat["maps"] = maps
    CATALOG.write_text(json.dumps(cat, ensure_ascii=False, indent=2) + "\n")
    print(f"catalog upsert {entry['id']}")


def main() -> None:
    # --- Iraq ---
    def irq_val(name: str):
        return IRAQ_TFR_2025[name]

    def irq_disp(name: str) -> str:
        return IRAQ_NAME_ALIASES.get(name, name)

    irq_regions = build_geo("IRQ", "irq-gb-adm1.json", irq_val, "iraq", irq_disp)
    with_data = [r for r in irq_regions if r["value"] is not None]
    upsert(
        {
            "id": "irq-tfr-2025",
            "iso3": "IRQ",
            "country": "Iraq",
            "title": "Total fertility rate, Iraq 2025",
            "metric": "tfr",
            "unit": "children per woman",
            "kind": "governorate",
            "year": 2025,
            "national": 2.74,
            "source": "BirthGauge, Total Fertility Rate (Children per Woman), Iraq 2025 — governorate TFR from registered births. National TFR 2.74 (1,026,242 births, +1.3% vs 2024). No data for Kurdish provinces (Dohuk, Erbil, Sulaymaniyah).",
            "sourceUrl": "https://x.com/BirthGauge",
            "credit": "Compiled by BirthGauge (@BirthGauge).",
            "geoUrl": "/geo/maps/irq-tfr.json",
            "scale": "plasma",
            "labelValues": True,
            "note": "Kurdish Region governorates are drawn in grey (no published TFR). Southern and holy-city governorates (Karbala, Najaf, Muthanna) are highest; Baghdad and Diyala are among the lowest.",
            "highlights": [
                {"name": "Karbala", "value": 3.66},
                {"name": "Diyala", "value": 2.52},
            ],
            "regions": irq_regions,
            "min": min(r["value"] for r in with_data),
            "max": max(r["value"] for r in with_data),
        }
    )

    # --- Mexico ---
    def mex_disp(name: str) -> str:
        return MEXICO_DISPLAY.get(name, name)

    mex_regions = build_geo("MEX", "mex-gb-adm1.json", mexico_tfr_2024, "mexico", mex_disp)
    upsert(
        {
            "id": "mex-tfr-2024",
            "iso3": "MEX",
            "country": "Mexico",
            "title": "Total fertility rate, Mexico 2024",
            "metric": "tfr",
            "unit": "children per woman",
            "kind": "state",
            "year": 2024,
            "national": 1.23,
            "source": "National TFR 1.23 and Mexico City 0.79 / Baja California 1.04 / Querétaro 1.06 from BirthGauge & Institute for Family Studies coverage of INEGI Intercensal Survey 2025. Other states: ENADID 2018 (2013–17) TGF scaled to the 2024 national level (bridge national ENADID ≈ 2.07) — illustrative state pattern until INEGI publishes a full 2024 state TFR table.",
            "sourceUrl": "https://www.inegi.org.mx/programas/enadid/2018/",
            "credit": "INEGI Intercensal 2025 / ENADID 2018; pins from BirthGauge (@BirthGauge) & IFS.",
            "geoUrl": "/geo/maps/mex-tfr.json",
            "scale": "plasma",
            "labelValues": True,
            "note": "Mexico City (0.79) is below every U.S. state. National TFR fell from ~1.60 (2020–22) to 1.23 (2024). Non-pinned states are scaled ENADID patterns, not a new official state census TFR.",
            "highlights": [
                {"name": "Mexico City", "value": 0.79},
                {"name": "Chiapas", "value": round(2.80 * (1.23 / 2.07), 2)},
            ],
            "regions": mex_regions,
            "min": min(r["value"] for r in mex_regions),
            "max": max(r["value"] for r in mex_regions),
        }
    )


if __name__ == "__main__":
    main()
