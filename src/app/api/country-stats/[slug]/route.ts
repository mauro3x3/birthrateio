import { NextResponse } from "next/server";
import {
  getCountryBySlug,
  getLatestValue,
  getPopulationPyramid,
  getRecentMean,
} from "@/lib/queries";
import { SLUG } from "@/lib/indicators";
import { AGE_GROUPS } from "@/lib/demography";

export const dynamic = "force-dynamic";

/** Latest demographic stats for a country — used by the simulator. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const country = await getCountryBySlug(slug);
  if (!country) {
    return NextResponse.json({ error: "Country not found" }, { status: 404 });
  }

  const [
    population,
    fertility,
    lifeExpectancy,
    netMigration,
    gdpPerCapita,
    share0to14,
    share15to64,
    share65plus,
  ] = await Promise.all([
    getLatestValue(country.id, SLUG.population),
    getLatestValue(country.id, SLUG.fertility),
    getLatestValue(country.id, SLUG.lifeExpectancy),
    // Net migration is annual and spiky — use a 5-year mean so the simulator's
    // default scenario isn't driven by one anomalous year.
    getRecentMean(country.id, SLUG.netMigration, 5),
    getLatestValue(country.id, SLUG.gdpPerCapita),
    getLatestValue(country.id, SLUG.popShare0to14),
    getLatestValue(country.id, SLUG.popShare15to64),
    getLatestValue(country.id, SLUG.popShare65plus),
  ]);

  // Real 5-year pyramid (length 21 per sex, ordered youngest → oldest).
  const pyr = await getPopulationPyramid(country.id);
  let pyramid: { male: number[]; female: number[]; year: number } | null = null;
  if (pyr.year && pyr.rows.length > 0) {
    const male = new Array(AGE_GROUPS.length).fill(0);
    const female = new Array(AGE_GROUPS.length).fill(0);
    for (const r of pyr.rows) {
      const idx = Math.min(AGE_GROUPS.length - 1, Math.floor(r.ageStart / 5));
      if (r.sex === "male") male[idx] = r.population;
      else if (r.sex === "female") female[idx] = r.population;
    }
    pyramid = { male, female, year: pyr.year };
  }

  return NextResponse.json({
    slug: country.slug,
    name: country.name,
    flagEmoji: country.flagEmoji,
    population: population?.value ?? null,
    fertility: fertility?.value ?? null,
    lifeExpectancy: lifeExpectancy?.value ?? null,
    netMigration: netMigration?.value ?? null,
    gdpPerCapita: gdpPerCapita?.value ?? null,
    ageShares: {
      youth: share0to14?.value ?? null,
      working: share15to64?.value ?? null,
      old: share65plus?.value ?? null,
    },
    pyramid,
    years: {
      population: population?.year ?? null,
      fertility: fertility?.year ?? null,
      lifeExpectancy: lifeExpectancy?.year ?? null,
      netMigration: netMigration?.year ?? null,
      gdpPerCapita: gdpPerCapita?.year ?? null,
    },
  });
}
