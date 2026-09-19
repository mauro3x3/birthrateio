/* eslint-disable no-console */
import type { PrismaClient } from "@prisma/client";
import data from "../data/eurostat-lfpr-citizenship.json";
import { SLUG } from "../indicators";
import { seedCountryIndicatorSeries } from "./seed-indicator-series";

export const LFPR_CITIZENSHIP_NOTE = data.definition;
export const LFPR_CITIZENSHIP_SOURCE_URL = data.sourceUrl;

export async function seedEurostatLfpr(prisma: PrismaClient) {
  await seedCountryIndicatorSeries(prisma, {
    sourceCode: "EUROSTAT",
    label: "eurostat-lfpr-citizenship",
    seriesToSlug: {
      nationals: SLUG.lfprNationals,
      foreignCitizens: SLUG.lfprForeignCitizens,
    },
    countries: data.countries as Record<
      string,
      Record<string, { year: number; value: number }[]>
    >,
  });
}
