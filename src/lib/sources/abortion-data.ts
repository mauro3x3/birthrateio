/* eslint-disable no-console */
// Curated induced-abortion rates (abortions per 1,000 women aged 15–49 per
// year), compiled from WHO, the Guttmacher Institute and national health
// statistics. Reporting completeness varies widely between countries, and in
// places where abortion is legally restricted figures are modeled estimates,
// so values are best treated as indicative rather than exact.
//
// Stored as IndicatorValue rows for the "abortion-rate" indicator. Add a
// country by appending to ABORTION_RATES and re-running the seeder — no schema
// change required.

import type { PrismaClient } from "@prisma/client";
import { SLUG } from "../indicators";

export interface AbortionSeed {
  iso3: string;
  values: { year: number; rate: number }[];
}

// Single recent value unless a series is well documented.
const Y = (year: number, rate: number) => ({ year, rate });

export const ABORTION_RATES: AbortionSeed[] = [
  // --- Multi-year series (well-reported) ---
  {
    iso3: "USA",
    values: [Y(1990, 24.0), Y(2000, 16.0), Y(2010, 14.0), Y(2015, 12.0), Y(2020, 11.6)],
  },
  {
    iso3: "GBR",
    values: [Y(1995, 13.0), Y(2005, 16.0), Y(2010, 16.5), Y(2015, 16.0), Y(2021, 18.6)],
  },
  {
    iso3: "SWE",
    values: [Y(1990, 20.0), Y(2000, 18.0), Y(2010, 20.0), Y(2015, 18.2), Y(2020, 17.7)],
  },
  {
    iso3: "RUS",
    values: [Y(1990, 106.0), Y(2000, 55.0), Y(2010, 37.0), Y(2015, 30.0), Y(2020, 25.0)],
  },

  // --- Europe (recent single value) ---
  { iso3: "NOR", values: [Y(2020, 12.0)] },
  { iso3: "DNK", values: [Y(2020, 13.0)] },
  { iso3: "FIN", values: [Y(2020, 8.0)] },
  { iso3: "ISL", values: [Y(2020, 13.0)] },
  {
    // DREES: IVG rate per 1,000 women aged 15–49 (France, including DROM where published).
    iso3: "FRA",
    values: [
      Y(2010, 14.7),
      Y(2015, 14.4),
      Y(2019, 16.1),
      Y(2020, 15.4),
      Y(2022, 16.2),
    ],
  },
  { iso3: "DEU", values: [Y(2020, 6.0)] },
  { iso3: "NLD", values: [Y(2020, 9.0)] },
  { iso3: "BEL", values: [Y(2019, 9.0)] },
  { iso3: "CHE", values: [Y(2020, 7.0)] },
  { iso3: "AUT", values: [Y(2019, 5.0)] },
  { iso3: "ITA", values: [Y(2020, 6.0)] },
  { iso3: "ESP", values: [Y(2020, 12.0)] },
  { iso3: "PRT", values: [Y(2019, 8.0)] },
  { iso3: "IRL", values: [Y(2020, 6.0)] },
  { iso3: "GRC", values: [Y(2019, 7.0)] },
  { iso3: "POL", values: [Y(2020, 0.1)] },
  { iso3: "HUN", values: [Y(2019, 12.0)] },
  { iso3: "CZE", values: [Y(2020, 8.0)] },
  { iso3: "SVK", values: [Y(2019, 7.0)] },
  { iso3: "ROU", values: [Y(2019, 18.0)] },
  { iso3: "BGR", values: [Y(2019, 15.0)] },
  { iso3: "EST", values: [Y(2019, 12.0)] },
  { iso3: "LVA", values: [Y(2019, 12.0)] },
  { iso3: "LTU", values: [Y(2019, 8.0)] },
  { iso3: "UKR", values: [Y(2019, 14.0)] },
  { iso3: "BLR", values: [Y(2019, 14.0)] },
  { iso3: "GEO", values: [Y(2019, 20.0)] },

  // --- Americas ---
  { iso3: "CAN", values: [Y(2019, 12.0)] },
  { iso3: "CUB", values: [Y(2019, 30.0)] },
  { iso3: "URY", values: [Y(2019, 12.0)] },
  { iso3: "MEX", values: [Y(2019, 14.0)] },

  // --- Asia & Oceania ---
  { iso3: "JPN", values: [Y(2020, 7.0)] },
  { iso3: "KOR", values: [Y(2020, 7.0)] },
  { iso3: "CHN", values: [Y(2019, 20.0)] },
  { iso3: "IND", values: [Y(2015, 47.0)] },
  { iso3: "VNM", values: [Y(2019, 35.0)] },
  { iso3: "KAZ", values: [Y(2019, 21.0)] },
  { iso3: "SGP", values: [Y(2019, 6.0)] },
  { iso3: "ISR", values: [Y(2019, 9.0)] },
  { iso3: "TUR", values: [Y(2018, 12.0)] },
  { iso3: "AUS", values: [Y(2019, 14.0)] },
  { iso3: "NZL", values: [Y(2020, 14.0)] },

  // --- Africa (reported / legal access) ---
  { iso3: "ZAF", values: [Y(2019, 5.0)] },
  { iso3: "TUN", values: [Y(2019, 12.0)] },
];

export async function seedAbortion(prisma: PrismaClient) {
  const indicator = await prisma.indicator.findUnique({
    where: { slug: SLUG.abortionRate },
    select: { id: true, sourceId: true },
  });
  if (!indicator) {
    console.warn("⚠ abortion-rate indicator missing — run ensureIndicators first");
    return;
  }

  const countries = new Map(
    (await prisma.country.findMany({ select: { id: true, iso3: true } })).map(
      (c) => [c.iso3, c.id],
    ),
  );

  // Idempotent: clear existing abortion values, then re-insert.
  await prisma.indicatorValue.deleteMany({
    where: { indicatorId: indicator.id },
  });

  const records: Array<{
    subjectType: "COUNTRY";
    indicatorId: number;
    countryId: number;
    year: number;
    value: number;
    kind: "ESTIMATE";
    sourceId: number | null;
  }> = [];
  let missing = 0;
  for (const entry of ABORTION_RATES) {
    const countryId = countries.get(entry.iso3);
    if (!countryId) {
      missing++;
      continue;
    }
    for (const v of entry.values) {
      records.push({
        subjectType: "COUNTRY",
        indicatorId: indicator.id,
        countryId,
        year: v.year,
        value: v.rate,
        kind: "ESTIMATE",
        sourceId: indicator.sourceId ?? null,
      });
    }
  }

  const CHUNK = 2000;
  for (let i = 0; i < records.length; i += CHUNK) {
    await prisma.indicatorValue.createMany({ data: records.slice(i, i + CHUNK) });
  }
  console.log(
    `✔ ${records.length} abortion-rate values (${ABORTION_RATES.length - missing} countries${missing ? `, ${missing} not found` : ""})`,
  );
}
