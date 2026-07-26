import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INDICATOR_BY_SLUG } from "@/lib/indicators";

export const dynamic = "force-dynamic";

// GET /api/compare?countries=japan,india&indicator=fertility-rate
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const countrySlugs = (searchParams.get("countries") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
  const indicatorSlug = searchParams.get("indicator") ?? "fertility-rate";

  const def = INDICATOR_BY_SLUG.get(indicatorSlug);
  if (!def || countrySlugs.length === 0) {
    return NextResponse.json({ countries: [], rows: [], meta: null });
  }

  try {
    const [indicator, countries] = await Promise.all([
      prisma.indicator.findUnique({ where: { slug: indicatorSlug } }),
      prisma.country.findMany({
        where: { slug: { in: countrySlugs } },
        select: { id: true, slug: true, name: true, flagEmoji: true },
      }),
    ]);
    if (!indicator) {
      return NextResponse.json({ countries: [], rows: [], meta: null });
    }

    const values = await prisma.indicatorValue.findMany({
      where: {
        indicatorId: indicator.id,
        subjectType: "COUNTRY",
        dimension: null,
        countryId: { in: countries.map((c) => c.id) },
      },
      select: { countryId: true, year: true, value: true },
      orderBy: { year: "asc" },
    });

    const slugById = new Map(countries.map((c) => [c.id, c.slug]));
    const byYear = new Map<number, Record<string, number>>();
    for (const v of values) {
      if (!v.countryId) continue;
      const slug = slugById.get(v.countryId);
      if (!slug) continue;
      const row = byYear.get(v.year) ?? { year: v.year };
      row[slug] = v.value;
      byYear.set(v.year, row);
    }
    const rows = Array.from(byYear.values()).sort((a, b) => a.year - b.year);

    // Order countries to match requested order.
    const ordered = countrySlugs
      .map((s) => countries.find((c) => c.slug === s))
      .filter(Boolean);

    return NextResponse.json({
      countries: ordered,
      rows,
      meta: {
        name: def.name,
        unit: def.unit,
        decimals: def.decimals,
      },
    });
  } catch {
    return NextResponse.json({ countries: [], rows: [], meta: null });
  }
}
