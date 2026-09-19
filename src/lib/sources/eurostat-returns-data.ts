/* eslint-disable no-console */
import type { PrismaClient } from "@prisma/client";
import data from "../data/eurostat-returns.json";
import { SLUG } from "../indicators";
import { seedCountryIndicatorSeries } from "./seed-indicator-series";

export const EUROSTAT_RETURNS_NOTE = data.definition;
export const EUROSTAT_RETURNS_SOURCE_URL = data.sourceUrl;

export async function seedEurostatReturns(prisma: PrismaClient) {
  await seedCountryIndicatorSeries(prisma, {
    sourceCode: "EUROSTAT",
    label: "eurostat-returns",
    seriesToSlug: {
      orderedToLeave: SLUG.orderedToLeave,
      returnedAfterOrder: SLUG.returnedAfterOrder,
      returnRate: SLUG.returnRate,
    },
    countries: data.countries as Record<
      string,
      Record<string, { year: number; value: number }[]>
    >,
  });
}
