#!/usr/bin/env python3
"""Build comparable '82 equal-population regions' world maps for several years.

Unlike the digitized 1914 MapPorn PNG, these years are partitioned from Natural
Earth country polygons + UN/Gapminder population (Our World in Data CSVs):

  recursive geographic bipartition into N=82 regions of ~equal population.

Large countries are split into longitude strips (or admin-1 pieces when we have
them) so China/India/etc. can occupy multiple regions.

Outputs under public/geo/historic/ and src/lib/data/, plus a series manifest.
"""

from __future__ import annotations

import csv
import json
import math
import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

from shapely.geometry import mapping, shape
from shapely.ops import unary_union
from shapely.validation import make_valid

ROOT = Path(__file__).resolve().parents[1]
NE_PATH = ROOT / "scripts" / "cache" / "ne_110m_admin_0_countries.geojson"
OW_HIST = ROOT / ".tmp" / "owid-pop.csv"
OW_UN = ROOT / ".tmp" / "owid-pop-un.csv"
OW_PROJ = ROOT / ".tmp" / "owid-pop-proj.csv"

ADMIN1_FILES = {
    "CHN": ROOT / "public" / "geo" / "admin1-chn.json",
    "IND": ROOT / "public" / "geo" / "admin1-ind.json",
    "USA": ROOT / "public" / "geo" / "admin1-usa.json",
    "RUS": ROOT / "public" / "geo" / "admin1-rus.json",
}

N_REGIONS = 82
YEARS = [1945, 1990, 2026, 2050]

# Skip Antarctica and tiny non-sovereign crumbs.
SKIP_A3 = {"ATA", "ATF", "HMD", "SGS", "ESH", "-99"}

UI_COLORS = [
    "#c0392b", "#2980b9", "#27ae60", "#8e44ad", "#d35400", "#16a085",
    "#2c3e50", "#f39c12", "#e74c3c", "#3498db", "#1abc9c", "#9b59b6",
    "#e67e22", "#34495e", "#c0392b", "#2980b9", "#27ae60", "#8e44ad",
    "#d35400", "#16a085", "#2c3e50", "#f39c12", "#e74c3c", "#3498db",
    "#1abc9c", "#9b59b6", "#e67e22", "#7f8c8d", "#c0392b", "#2980b9",
    "#27ae60", "#8e44ad", "#d35400", "#16a085", "#2c3e50", "#f39c12",
    "#e74c3c", "#3498db", "#1abc9c", "#9b59b6", "#e67e22", "#34495e",
    "#c0392b", "#2980b9", "#27ae60", "#8e44ad", "#d35400", "#16a085",
    "#2c3e50", "#f39c12", "#e74c3c", "#3498db", "#1abc9c", "#9b59b6",
    "#e67e22", "#7f8c8d", "#c0392b", "#2980b9", "#27ae60", "#8e44ad",
    "#d35400", "#16a085", "#2c3e50", "#f39c12", "#e74c3c", "#3498db",
    "#1abc9c", "#9b59b6", "#e67e22", "#34495e", "#c0392b", "#2980b9",
    "#27ae60", "#8e44ad", "#d35400", "#16a085", "#2c3e50", "#f39c12",
    "#e74c3c", "#3498db",
]


def slugify(name: str) -> str:
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:48] or "region"


def load_population(year: int) -> dict[str, float]:
    """ISO3 → population for year. Prefer UN WPP; fall back to Gapminder hist."""
    out: dict[str, float] = {}

    def ingest(path: Path, prefer_proj: bool) -> None:
        if not path.exists():
            return
        with path.open(newline="", encoding="utf-8") as f:
            r = csv.DictReader(f)
            for row in r:
                if row.get("Year") != str(year):
                    continue
                code = (row.get("Code") or "").strip()
                if len(code) != 3 or code.startswith("OWID"):
                    continue
                raw = ""
                if prefer_proj:
                    raw = (
                        row.get("Population (Projected)")
                        or row.get("Population (projections) (Projected)")
                        or row.get("Population")
                        or ""
                    )
                else:
                    raw = row.get("Population") or ""
                try:
                    pop = float(raw)
                except (TypeError, ValueError):
                    continue
                if pop > 0:
                    out[code] = pop

    # Order: UN first for modern years, then hist/proj fill gaps.
    if year >= 1950:
        ingest(OW_UN, prefer_proj=True)
        ingest(OW_PROJ, prefer_proj=True)
        ingest(OW_HIST, prefer_proj=False)
    else:
        ingest(OW_HIST, prefer_proj=False)
        ingest(OW_PROJ, prefer_proj=False)

    # Common ISO aliases in NE vs OWID.
    aliases = {
        "SDS": "SSD",
        "SOL": "SOM",
        "KOS": "XKX",
        "PSX": "PSE",
        "WBG": "PSE",
    }
    for a, b in aliases.items():
        if a in out and b not in out:
            out[b] = out[a]
        if b in out and a not in out:
            out[a] = out[b]
    return out


@dataclass
class Unit:
    name: str
    iso3: str
    pop: float
    geom: object
    lon: float = 0.0
    lat: float = 0.0

    def __post_init__(self) -> None:
        c = self.geom.centroid
        self.lon = float(c.x)
        self.lat = float(c.y)


@dataclass
class Region:
    units: list[Unit] = field(default_factory=list)

    @property
    def pop(self) -> float:
        return sum(u.pop for u in self.units)

    @property
    def geom(self):
        geoms = [u.geom for u in self.units if not u.geom.is_empty]
        if not geoms:
            return None
        return make_valid(unary_union(geoms))

    def label(self) -> str:
        ordered = sorted(self.units, key=lambda u: -u.pop)
        if not ordered:
            return "Empty"
        top = ordered[0]
        if len(ordered) == 1:
            return top.name
        second = ordered[1]
        if second.pop >= top.pop * 0.35:
            return f"{top.name} · {second.name}"
        # Many small pieces: still lead with the largest.
        if len(ordered) >= 3 and ordered[2].pop >= top.pop * 0.2:
            return f"{top.name} · {second.name}"
        return top.name


def iso_of_feature(props: dict) -> str:
    for k in ("ADM0_A3", "ISO_A3", "GU_A3", "SOV_A3"):
        v = (props.get(k) or "").strip()
        if v and v not in SKIP_A3 and v != "-99":
            return v
    return ""


def load_countries(pops: dict[str, float]) -> list[Unit]:
    geo = json.loads(NE_PATH.read_text())
    units: list[Unit] = []
    for feat in geo["features"]:
        props = feat.get("properties") or {}
        iso = iso_of_feature(props)
        if not iso or iso in SKIP_A3:
            continue
        name = props.get("NAME") or props.get("ADMIN") or iso
        pop = pops.get(iso)
        if pop is None or pop <= 0:
            continue
        try:
            g = make_valid(shape(feat["geometry"]))
        except Exception:
            continue
        if g.is_empty:
            continue
        # Drop tiny scraps.
        if g.area < 1e-4 and pop < 500_000:
            continue
        units.append(Unit(name=str(name), iso3=iso, pop=float(pop), geom=g))
    return units


def load_admin1_pieces(iso3: str, country_pop: float, country_geom) -> list[Unit] | None:
    path = ADMIN1_FILES.get(iso3)
    if not path or not path.exists():
        return None
    raw = json.loads(path.read_text())
    feats = raw.get("features") or raw.get("regions") or []
    if not feats:
        return None
    pieces: list[Unit] = []
    areas: list[float] = []
    geoms = []
    names = []
    for feat in feats:
        props = feat.get("properties") or feat
        name = (
            props.get("name")
            or props.get("NAME")
            or props.get("name_en")
            or props.get("admin")
            or f"{iso3} region"
        )
        try:
            g = make_valid(shape(feat["geometry"]))
        except Exception:
            continue
        if g.is_empty:
            continue
        # Keep only parts that intersect the country outline.
        try:
            inter = g.intersection(country_geom)
        except Exception:
            inter = g
        if inter.is_empty:
            continue
        inter = make_valid(inter)
        a = float(inter.area)
        if a <= 0:
            continue
        geoms.append(inter)
        areas.append(a)
        names.append(str(name))
    total_a = sum(areas)
    if total_a <= 0 or len(geoms) < 2:
        return None
    for name, g, a in zip(names, geoms, areas):
        pieces.append(
            Unit(
                name=name,
                iso3=iso3,
                pop=country_pop * (a / total_a),
                geom=g,
            )
        )
    return pieces


def split_polygon_strips(unit: Unit, k: int) -> list[Unit]:
    """Split a unit into k longitude strips with roughly equal area (≈pop)."""
    if k <= 1:
        return [unit]
    g = unit.geom
    minx, miny, maxx, maxy = g.bounds
    if maxx - minx < 1e-6:
        # Degenerate: equal pop shards, same geom reference.
        return [
            Unit(
                name=f"{unit.name} {i + 1}",
                iso3=unit.iso3,
                pop=unit.pop / k,
                geom=g,
            )
            for i in range(k)
        ]

    # Cumulative area along longitude — sample cuts.
    width = maxx - minx
    target = g.area / k
    cuts = [minx]
    acc = 0.0
    steps = 80
    prev_x = minx
    for s in range(1, steps + 1):
        x = minx + width * s / steps
        strip = shape(
            {
                "type": "Polygon",
                "coordinates": [
                    [
                        [prev_x, miny - 1],
                        [x, miny - 1],
                        [x, maxy + 1],
                        [prev_x, maxy + 1],
                        [prev_x, miny - 1],
                    ]
                ],
            }
        )
        try:
            piece = g.intersection(strip)
        except Exception:
            piece = None
        if piece is not None and not piece.is_empty:
            acc += float(piece.area)
        if acc >= target * len(cuts) and len(cuts) < k:
            cuts.append(x)
        prev_x = x
    while len(cuts) < k:
        cuts.append(maxx)
    cuts.append(maxx)

    out: list[Unit] = []
    for i in range(k):
        x0, x1 = cuts[i], cuts[min(i + 1, len(cuts) - 1)]
        if x1 <= x0:
            x1 = x0 + width / k
        strip = shape(
            {
                "type": "Polygon",
                "coordinates": [
                    [
                        [x0, miny - 1],
                        [x1, miny - 1],
                        [x1, maxy + 1],
                        [x0, maxy + 1],
                        [x0, miny - 1],
                    ]
                ],
            }
        )
        try:
            piece = make_valid(g.intersection(strip))
        except Exception:
            continue
        if piece.is_empty:
            continue
        share = float(piece.area) / float(g.area) if g.area else 1 / k
        out.append(
            Unit(
                name=f"{unit.name} {i + 1}" if k > 1 else unit.name,
                iso3=unit.iso3,
                pop=unit.pop * share,
                geom=piece,
            )
        )
    if not out:
        return [unit]
    # Renormalize pop to exact total.
    s = sum(u.pop for u in out) or 1.0
    for u in out:
        u.pop *= unit.pop / s
    return out


def expand_large_units(units: list[Unit], target: float) -> list[Unit]:
    """Break countries much larger than one region into admin-1 or strips."""
    out: list[Unit] = []
    for u in units:
        n = max(1, int(round(u.pop / target)))
        if n <= 1:
            out.append(u)
            continue
        n = min(n, 24)  # cap shards per country
        admin = load_admin1_pieces(u.iso3, u.pop, u.geom)
        if admin and len(admin) >= 2:
            # If still too few pieces vs needed regions, keep admin1 as-is
            # (bipartition will group them). If one admin1 >> target, strip it.
            for a in admin:
                if a.pop > target * 1.6:
                    need = max(2, int(round(a.pop / target)))
                    out.extend(split_polygon_strips(a, min(need, 8)))
                else:
                    out.append(a)
            continue
        out.extend(split_polygon_strips(u, n))
    return out


def bipartition(units: list[Unit], k: int) -> list[list[Unit]]:
    if k <= 0:
        return []
    if not units:
        return [[] for _ in range(k)]
    if k == 1:
        return [units]
    if len(units) == 1:
        # Must invent strips so each region gets geometry.
        shards = split_polygon_strips(units[0], k)
        return [[s] for s in shards]

    # Choose axis with larger spread.
    lons = [u.lon for u in units]
    lats = [u.lat for u in units]
    use_lon = (max(lons) - min(lons)) >= (max(lats) - min(lats))
    ordered = sorted(units, key=lambda u: u.lon if use_lon else u.lat)

    total = sum(u.pop for u in ordered)
    left_k = k // 2
    right_k = k - left_k
    target_left = total * left_k / k

    acc = 0.0
    best_i = 1
    best_err = float("inf")
    for i in range(1, len(ordered)):
        acc += ordered[i - 1].pop
        # Prefer cuts that leave both sides with at least one unit.
        err = abs(acc - target_left)
        # Soft penalty if population imbalance extreme relative to k split.
        if err < best_err:
            best_err = err
            best_i = i

    left = ordered[:best_i]
    right = ordered[best_i:]
    if not left:
        left, right = ordered[:1], ordered[1:]
    if not right:
        left, right = ordered[:-1], ordered[-1:]

    return bipartition(left, left_k) + bipartition(right, right_k)


def simplify_geom(g, tol: float = 0.05):
    try:
        s = g.simplify(tol, preserve_topology=True)
        return make_valid(s) if not s.is_empty else g
    except Exception:
        return g


def build_year(year: int) -> dict:
    pops = load_population(year)
    units = load_countries(pops)
    world = sum(u.pop for u in units)
    target = world / N_REGIONS
    print(f"  {year}: {len(units)} countries, world={world/1e9:.2f}B, target≈{target/1e6:.1f}M")

    units = expand_large_units(units, target)
    print(f"       after splits: {len(units)} units")

    groups = bipartition(units, N_REGIONS)
    # Ensure exactly N_REGIONS non-empty.
    groups = [g for g in groups if g]
    while len(groups) < N_REGIONS:
        # Split the largest region.
        i = max(range(len(groups)), key=lambda j: sum(u.pop for u in groups[j]))
        big = groups.pop(i)
        if len(big) == 1:
            shards = split_polygon_strips(big[0], 2)
            groups.extend([[shards[0]], [shards[1]]])
        else:
            parts = bipartition(big, 2)
            groups.extend(parts)
    while len(groups) > N_REGIONS:
        # Merge two smallest by population that are lon-adjacent-ish.
        idxs = sorted(range(len(groups)), key=lambda j: sum(u.pop for u in groups[j]))
        a, b = idxs[0], idxs[1]
        merged = groups[a] + groups[b]
        for j in sorted((a, b), reverse=True):
            groups.pop(j)
        groups.append(merged)

    regions = [Region(units=g) for g in groups]
    # West→east order for stable colouring.
    regions.sort(key=lambda r: sum(u.lon * u.pop for u in r.units) / max(r.pop, 1))

    features = []
    areas = []
    groups_meta = []
    national_shares = {}

    for i, reg in enumerate(regions):
        code = f"e82-{year}-{i + 1:02d}"
        name = reg.label()
        color = UI_COLORS[i % len(UI_COLORS)]
        g = reg.geom
        if g is None or g.is_empty:
            continue
        g = simplify_geom(g, 0.08)
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "name": name,
                    "slug": code,
                    "iso3": "WLD",
                    "code": code,
                    "population": int(round(reg.pop)),
                },
                "geometry": json.loads(json.dumps(mapping(g))),
            }
        )
        groups_meta.append(
            {"id": code, "shortLabel": name, "color": color}
        )
        areas.append(
            {
                "code": code,
                "slug": code,
                "name": name,
                "plurality": code,
                "nationality": code,
                "population": int(round(reg.pop)),
                "shares": {code: 1.0},
            }
        )
        national_shares[code] = round(reg.pop / world, 6)

    pops_list = [a["population"] for a in areas]
    print(
        f"       regions={len(areas)} pop min/median/max "
        f"{min(pops_list)/1e6:.1f}/{sorted(pops_list)[len(pops_list)//2]/1e6:.1f}/{max(pops_list)/1e6:.1f}M"
    )

    geo = {"type": "FeatureCollection", "features": features}
    pack = {
        "id": f"world-pop82-{year}",
        "slug": f"world-pop82-{year}",
        "title": f"World divided into {N_REGIONS} equal-population regions, {year}",
        "year": year,
        "mapMode": "plurality",
        "primaryMetric": "nationality",
        "note": (
            f"Each region holds about {target/1e6:.0f} million people in {year} "
            f"({N_REGIONS} × {target/1e6:.0f}M ≈ {world/1e9:.2f} billion). "
            "Partitioned by recursive geographic bipartition of countries "
            "(large states split by province or longitude strips). Equal population "
            "first — borders are modern Natural Earth outlines, not period frontiers."
        ),
        "source": (
            "Population: Our World in Data / UN World Population Prospects "
            "(and Gapminder historical estimates before 1950). "
            "Borders: Natural Earth admin-0 (110m), with admin-1 splits for "
            "China, India, USA, and Russia where available."
        ),
        "sourceUrl": "https://ourworldindata.org/grapher/population-with-un-projections",
        "geoUrl": f"/geo/historic/world-pop82-{year}.json",
        "groups": groups_meta,
        "nationalShares": national_shares,
        "totalPopulation": int(round(world)),
        "areas": areas,
    }
    return {"geo": geo, "pack": pack, "target": target, "world": world}


def main() -> None:
    if not NE_PATH.exists():
        raise SystemExit(f"Missing {NE_PATH} — download Natural Earth countries first.")

    series = {
        "id": "world-pop82",
        "title": "World in 82 equal-population regions",
        "blurb": (
            "The same idea as the 1914 MapPorn reconstruction: carve the world into "
            f"{N_REGIONS} regions of equal population. Scrub years to watch dense "
            "belts shatter and empty continents stay huge."
        ),
        "nRegions": N_REGIONS,
        "years": [],
        "digitized1914": {
            "year": 1914,
            "slug": "world-pop82-1914",
            "href": "/maps/historic/world-pop82-1914",
            "note": "Hand-digitized from the MapPorn reconstruction (period regionalization).",
        },
    }

    for year in YEARS:
        print(f"Building {year}…")
        built = build_year(year)
        geo_path = ROOT / "public" / "geo" / "historic" / f"world-pop82-{year}.json"
        data_path = ROOT / "src" / "lib" / "data" / f"historic-world-pop82-{year}.json"
        geo_path.parent.mkdir(parents=True, exist_ok=True)
        data_path.parent.mkdir(parents=True, exist_ok=True)
        geo_path.write_text(json.dumps(built["geo"], separators=(",", ":")))
        data_path.write_text(json.dumps(built["pack"], indent=2) + "\n")
        series["years"].append(
            {
                "year": year,
                "slug": f"world-pop82-{year}",
                "geoUrl": f"/geo/historic/world-pop82-{year}.json",
                "packPath": f"historic-world-pop82-{year}.json",
                "targetPop": int(round(built["target"])),
                "worldPop": int(round(built["world"])),
                "nRegions": len(built["pack"]["areas"]),
            }
        )
        print(f"  wrote {geo_path.relative_to(ROOT)}")
        print(f"  wrote {data_path.relative_to(ROOT)}")

    manifest = ROOT / "src" / "lib" / "data" / "world-pop82-series.json"
    manifest.write_text(json.dumps(series, indent=2) + "\n")
    print(f"wrote {manifest.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
