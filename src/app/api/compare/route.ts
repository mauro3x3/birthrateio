import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INDICATOR_BY_SLUG, SLUG } from "@/lib/indicators";
import {
  BIRTHGAUGE_BIRTHS_SOURCE,
  BIRTHGAUGE_SOURCE,
  birthgaugeBirthsByYear,
  birthgaugeTfrByYear,
  BG_TFR_FROM_YEAR,
} from "@/lib/compare-freshen";

export const dynamic = "force-dynamic";

type Row = Record<string, number | null> & { year: number };

async function loadCountrySeries(
  countryIds: number[],
  indicatorSlug: string,
): Promise<Map<number, Map<number, number>>> {
  // countryId → (year → value)
  const out = new Map<number, Map<number, number>>();
  const indicator = await prisma.indicator.findUnique({
    where: { slug: indicatorSlug },
  });
  if (!indicator) return out;
  const values = await prisma.indicatorValue.findMany({
    where: {
      indicatorId: indicator.id,
      subjectType: "COUNTRY",
      dimension: null,
      countryId: { in: countryIds },
    },
    select: { countryId: true, year: true, value: true },
    orderBy: { year: "asc" },
  });
  for (const v of values) {
    if (!v.countryId) continue;
    let series = out.get(v.countryId);
    if (!series) {
      series = new Map();
      out.set(v.countryId, series);
    }
    series.set(v.year, v.value);
  }
  return out;
}

function toRows(
  countries: { id: number; slug: string }[],
  seriesByCountry: Map<number, Map<number, number>>,
): Row[] {
  const years = new Set<number>();
  for (const m of seriesByCountry.values()) {
    for (const y of m.keys()) years.add(y);
  }
  const rows: Row[] = [];
  for (const year of [...years].sort((a, b) => a - b)) {
    const row: Row = { year };
    for (const c of countries) {
      const v = seriesByCountry.get(c.id)?.get(year);
      row[c.slug] = v ?? null;
    }
    rows.push(row);
  }
  return rows;
}

// GET /api/compare?countries=japan,india&indicator=fertility-rate
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const countrySlugs = (searchParams.get("countries") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
  const indicatorSlug = searchParams.get("indicator") ?? "fertility-rate";

  if (countrySlugs.length === 0) {
    return NextResponse.json({ countries: [], rows: [], meta: null });
  }

  try {
    const countries = await prisma.country.findMany({
      where: { slug: { in: countrySlugs } },
      select: { id: true, slug: true, name: true, flagEmoji: true, iso3: true },
    });
    const ordered = countrySlugs
      .map((s) => countries.find((c) => c.slug === s))
      .filter(Boolean) as typeof countries;

    if (indicatorSlug === "live-births") {
      const [pop, cbr] = await Promise.all([
        loadCountrySeries(
          ordered.map((c) => c.id),
          SLUG.population,
        ),
        loadCountrySeries(
          ordered.map((c) => c.id),
          SLUG.birthRate,
        ),
      ]);
      const seriesByCountry = new Map<number, Map<number, number>>();
      for (const c of ordered) {
        const pops = pop.get(c.id) ?? new Map();
        const rates = cbr.get(c.id) ?? new Map();
        const derived = new Map<number, number>();
        const years = new Set([...pops.keys(), ...rates.keys()]);
        for (const y of years) {
          const p = pops.get(y);
          const r = rates.get(y);
          if (p != null && r != null && p > 0 && r > 0) {
            derived.set(y, Math.round((p * r) / 1000));
          }
        }
        // Overlay BirthGauge absolute births for recent years.
        for (const [y, v] of birthgaugeBirthsByYear(c.slug)) {
          derived.set(y, v);
        }
        seriesByCountry.set(c.id, derived);
      }
      const rows = toRows(ordered, seriesByCountry);
      return NextResponse.json({
        countries: ordered,
        rows,
        meta: {
          name: "Live births",
          unit: "births",
          decimals: 0,
          source: BIRTHGAUGE_BIRTHS_SOURCE,
          freshened: true,
        },
      });
    }

    const def = INDICATOR_BY_SLUG.get(indicatorSlug);
    if (!def) {
      return NextResponse.json({ countries: [], rows: [], meta: null });
    }

    const seriesByCountry = await loadCountrySeries(
      ordered.map((c) => c.id),
      indicatorSlug,
    );

    let freshened = false;
    if (indicatorSlug === "fertility-rate") {
      for (const c of ordered) {
        let series = seriesByCountry.get(c.id);
        if (!series) {
          series = new Map();
          seriesByCountry.set(c.id, series);
        }
        const bg = birthgaugeTfrByYear(c.slug);
        for (const [y, v] of bg) {
          // Drop lagging WDI points in the BirthGauge window so the line
          // continues to the map-grade latest year.
          if (y >= BG_TFR_FROM_YEAR) {
            series.set(y, v);
            freshened = true;
          }
        }
        // Remove stale WDI years beyond the last BG year when BG exists,
        // so tooltips don't stop at 2022 while maps show 2025/26.
        if (bg.size > 0) {
          const lastBg = Math.max(...bg.keys());
          for (const y of [...series.keys()]) {
            if (y > lastBg && y >= BG_TFR_FROM_YEAR && !bg.has(y)) {
              series.delete(y);
            }
          }
        }
      }
    }

    const rows = toRows(ordered, seriesByCountry);
    return NextResponse.json({
      countries: ordered,
      rows,
      meta: {
        name: def.name,
        unit: def.unit,
        decimals: def.decimals,
        source:
          indicatorSlug === "fertility-rate" && freshened
            ? BIRTHGAUGE_SOURCE
            : undefined,
        freshened,
      },
    });
  } catch {
    return NextResponse.json({ countries: [], rows: [], meta: null });
  }
}
