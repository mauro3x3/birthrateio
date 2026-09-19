/* eslint-disable no-console */
import type { PrismaClient } from "@prisma/client";
import data from "../data/irregular-migrant-stocks.json";
import { SLUG } from "../indicators";
import { seedCountryIndicatorSeries } from "./seed-indicator-series";

export const IRREGULAR_STOCK_NOTE = data.definition;
export const IRREGULAR_STOCK_SOURCE_URL = data.sourceUrl;

export async function seedIrregularStocks(prisma: PrismaClient) {
  const countries: Record<string, { stock: { year: number; value: number }[] }> =
    {};
  for (const [iso3, entry] of Object.entries(data.countries)) {
    countries[iso3] = {
      stock: entry.stock.map((p) => ({ year: p.year, value: p.value })),
    };
  }
  await seedCountryIndicatorSeries(prisma, {
    sourceCode: "ZENODO_IRREGULAR",
    label: "irregular-migrant-stocks",
    seriesToSlug: { stock: SLUG.irregularMigrantStock },
    countries,
  });
}
