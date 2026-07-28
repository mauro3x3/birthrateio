/* eslint-disable no-console */
// Curated city-level Total Fertility Rates from national statistical offices.
// Accuracy over coverage: only geographies with published official TFR series.
//
// IMPORTANT: caller must run ensureIndicators (and ensureSources) first so the
// "city-fertility" indicator and NATIONAL_STATS data source exist.

import type { PrismaClient } from "@prisma/client";
import { SLUG } from "../indicators";

export interface CityFertilitySeries {
  citySlug: string;
  geographyNote: string;
  source: string;
  sourceUrl: string;
  unit: string;
  points: { year: number; value: number }[];
}

/**
 * Official city / matching-admin TFR series.
 * Values are births per woman (US DOHMH publishes per 1,000 women — converted).
 */
export const CITY_FERTILITY: CityFertilitySeries[] = [
  {
    // Tokyo Metropolis (prefecture) — MHLW Vital Statistics via TMG yearbook.
    // 2014≈1.15, 2020≈1.12 (current revised series; older overviews listed ~1.13),
    // 2023=0.99. 2023 from MHLW/TMG press release (確定数).
    citySlug: "tokyo",
    geographyNote: "Tokyo Metropolis / prefecture (東京都)",
    source: "MHLW / Tokyo Metropolitan Government",
    sourceUrl:
      "https://www.hokeniryo.metro.tokyo.lg.jp/kiban/chosa_tokei/jinkodotaitokei/tokyotozentai",
    unit: "births per woman",
    points: [
      { year: 1984, value: 1.43 },
      { year: 1985, value: 1.44 },
      { year: 1986, value: 1.37 },
      { year: 1987, value: 1.35 },
      { year: 1988, value: 1.31 },
      { year: 1989, value: 1.24 },
      { year: 1990, value: 1.23 },
      { year: 1991, value: 1.18 },
      { year: 1992, value: 1.14 },
      { year: 1993, value: 1.1 },
      { year: 1994, value: 1.14 },
      { year: 1995, value: 1.11 },
      { year: 1996, value: 1.07 },
      { year: 1997, value: 1.05 },
      { year: 1998, value: 1.05 },
      { year: 1999, value: 1.03 },
      { year: 2000, value: 1.07 },
      { year: 2001, value: 1.0 },
      { year: 2002, value: 1.02 },
      { year: 2003, value: 1.0 },
      { year: 2004, value: 1.01 },
      { year: 2005, value: 1.0 },
      { year: 2006, value: 1.02 },
      { year: 2007, value: 1.05 },
      { year: 2008, value: 1.09 },
      { year: 2009, value: 1.12 },
      { year: 2010, value: 1.12 },
      { year: 2011, value: 1.06 },
      { year: 2012, value: 1.09 },
      { year: 2013, value: 1.13 },
      { year: 2014, value: 1.15 },
      { year: 2015, value: 1.24 },
      { year: 2016, value: 1.24 },
      { year: 2017, value: 1.21 },
      { year: 2018, value: 1.2 },
      { year: 2019, value: 1.15 },
      { year: 2020, value: 1.12 },
      { year: 2021, value: 1.08 },
      { year: 2022, value: 1.04 },
      { year: 2023, value: 0.99 },
    ],
  },
  {
    // Osaka Prefecture — MHLW Vital Statistics (prefecture table).
    citySlug: "osaka",
    geographyNote: "Osaka Prefecture (大阪府)",
    source: "MHLW Vital Statistics",
    sourceUrl: "https://www.mhlw.go.jp/toukei/list/81-1a.html",
    unit: "births per woman",
    points: [
      { year: 2000, value: 1.31 },
      { year: 2002, value: 1.22 },
      { year: 2003, value: 1.2 },
      { year: 2004, value: 1.2 },
      { year: 2005, value: 1.21 },
      { year: 2016, value: 1.37 },
      { year: 2017, value: 1.35 },
      { year: 2018, value: 1.35 },
      { year: 2019, value: 1.31 },
      { year: 2020, value: 1.31 },
      { year: 2021, value: 1.27 },
      { year: 2022, value: 1.22 },
      { year: 2023, value: 1.19 },
    ],
  },
  {
    // NYC DOHMH Summary of Vital Statistics Table PC1 — TFR per 1,000 women,
    // converted to births per woman.
    citySlug: "new-york",
    geographyNote: "New York City (5 boroughs)",
    source: "NYC DOHMH Bureau of Vital Statistics",
    sourceUrl: "https://www.nyc.gov/site/doh/data/data-sets/vital-statistics-data.page",
    unit: "births per woman",
    points: [
      { year: 2000, value: 1.918 },
      { year: 2001, value: 1.884 },
      { year: 2002, value: 1.866 },
      { year: 2003, value: 1.891 },
      { year: 2004, value: 1.898 },
      { year: 2005, value: 1.891 },
      { year: 2006, value: 1.935 },
      { year: 2007, value: 1.976 },
      { year: 2008, value: 1.937 },
      { year: 2009, value: 1.902 },
      { year: 2010, value: 1.863 },
      { year: 2011, value: 1.835 },
      { year: 2012, value: 1.825 },
      { year: 2013, value: 1.769 },
      { year: 2014, value: 1.767 },
      { year: 2015, value: 1.754 },
      { year: 2016, value: 1.739 },
      { year: 2017, value: 1.689 },
      { year: 2018, value: 1.714 },
      { year: 2019, value: 1.679 },
      { year: 2020, value: 1.453 },
      { year: 2021, value: 1.543 },
      { year: 2022, value: 1.569 },
    ],
  },
  {
    // ONS region "London" (Greater London) — Births in England and Wales /
    // births by area of usual residence. Sparse but verified annual points.
    citySlug: "london",
    geographyNote: "Greater London (ONS English region)",
    source: "ONS",
    sourceUrl:
      "https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths",
    unit: "births per woman",
    points: [
      { year: 2010, value: 2.0 },
      { year: 2016, value: 1.72 },
      { year: 2020, value: 1.54 },
      { year: 2021, value: 1.44 },
      { year: 2022, value: 1.39 },
      { year: 2023, value: 1.33 },
      { year: 2024, value: 1.35 },
    ],
  },
  {
    // Seoul Special City — KOSTAT / KOSIS Population Trends Survey.
    citySlug: "seoul",
    geographyNote: "Seoul Special City (서울특별시)",
    source: "KOSTAT (Statistics Korea)",
    sourceUrl: "https://kosis.kr",
    unit: "births per woman",
    points: [
      { year: 1993, value: 1.558 },
      { year: 1997, value: 1.338 },
      { year: 2002, value: 1.006 },
      { year: 2005, value: 0.932 },
      { year: 2010, value: 1.015 },
      { year: 2011, value: 1.014 },
      { year: 2012, value: 1.059 },
      { year: 2013, value: 0.96 },
      { year: 2014, value: 1.002 },
      { year: 2015, value: 1.001 },
      { year: 2016, value: 0.941 },
      { year: 2017, value: 0.836 },
      { year: 2018, value: 0.761 },
      { year: 2019, value: 0.717 },
      { year: 2020, value: 0.642 },
      { year: 2021, value: 0.626 },
      { year: 2022, value: 0.593 },
      { year: 2023, value: 0.552 },
      { year: 2024, value: 0.581 },
    ],
  },
  {
    // City-state — Singapore Department of Statistics resident TFR
    // (citizens + permanent residents). Matches Population in Brief / DOS.
    citySlug: "singapore",
    geographyNote: "Singapore (resident population: citizens + PRs)",
    source: "Singapore DOS / NPTD Population in Brief",
    sourceUrl: "https://www.population.gov.sg/files/media-centre/publications/",
    unit: "births per woman",
    points: [
      { year: 2000, value: 1.6 },
      { year: 2001, value: 1.41 },
      { year: 2002, value: 1.37 },
      { year: 2003, value: 1.27 },
      { year: 2004, value: 1.26 },
      { year: 2005, value: 1.26 },
      { year: 2006, value: 1.28 },
      { year: 2007, value: 1.29 },
      { year: 2008, value: 1.28 },
      { year: 2009, value: 1.22 },
      { year: 2010, value: 1.15 },
      { year: 2011, value: 1.2 },
      { year: 2012, value: 1.29 },
      { year: 2013, value: 1.19 },
      { year: 2014, value: 1.25 },
      { year: 2015, value: 1.24 },
      { year: 2016, value: 1.2 },
      { year: 2017, value: 1.16 },
      { year: 2018, value: 1.14 },
      { year: 2019, value: 1.14 },
      { year: 2020, value: 1.1 },
      { year: 2021, value: 1.12 },
      { year: 2022, value: 1.04 },
      { year: 2023, value: 0.97 },
    ],
  },
  {
    // City-state — Hong Kong C&SD total fertility rate (live births per woman).
    // C&SD historically quotes per 1,000 women; values here are per woman.
    citySlug: "hong-kong",
    geographyNote: "Hong Kong SAR (whole territory)",
    source: "Hong Kong Census and Statistics Department",
    sourceUrl:
      "https://www.censtatd.gov.hk/en/data/stat_report/product/FA100090/att/B72302FA2023XXXXB0100.pdf",
    unit: "births per woman",
    points: [
      { year: 2000, value: 1.032 },
      { year: 2001, value: 0.931 },
      { year: 2002, value: 0.941 },
      { year: 2003, value: 0.901 },
      { year: 2004, value: 0.922 },
      { year: 2005, value: 0.959 },
      { year: 2006, value: 0.984 },
      { year: 2007, value: 1.028 },
      { year: 2008, value: 1.064 },
      { year: 2009, value: 1.055 },
      { year: 2010, value: 1.127 },
      { year: 2011, value: 1.204 },
      { year: 2012, value: 1.285 },
      { year: 2013, value: 1.125 },
      { year: 2014, value: 1.235 },
      { year: 2015, value: 1.196 },
      { year: 2016, value: 1.205 },
      { year: 2017, value: 1.128 },
      { year: 2018, value: 1.08 },
      { year: 2019, value: 1.064 },
      { year: 2020, value: 0.883 },
      { year: 2021, value: 0.772 },
      { year: 2022, value: 0.701 },
      { year: 2023, value: 0.751 },
    ],
  },
  {
    // Berlin Land — Destatis zusammengefasste Geburtenziffer (Geburtsjahrmethode).
    // Pre-2023 points on Zensus-2011 population base; 2022–23 also published on
    // Zensus-2022 base (1.32 / 1.23) — we keep the 2011-base continuity here.
    citySlug: "berlin",
    geographyNote: "Berlin (Bundesland / Land Berlin)",
    source: "Destatis",
    sourceUrl:
      "https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Bevoelkerung/Geburten/",
    unit: "births per woman",
    points: [
      { year: 2019, value: 1.41 },
      { year: 2020, value: 1.37 },
      { year: 2021, value: 1.39 },
      { year: 2022, value: 1.25 },
      { year: 2023, value: 1.17 },
    ],
  },
  {
    // Paris département (75) — INSEE indicateur conjoncturel de fécondité.
    citySlug: "paris",
    geographyNote: "Paris département (75) — Ville de Paris",
    source: "INSEE",
    sourceUrl: "https://www.insee.fr/en/statistiques/serie/001744425",
    unit: "births per woman",
    points: [
      { year: 2020, value: 1.47 },
      { year: 2021, value: 1.47 },
      { year: 2022, value: 1.38 },
      { year: 2023, value: 1.27 },
    ],
  },
];

export async function seedCityFertility(prisma: PrismaClient): Promise<void> {
  // Caller must ensureIndicators has city-fertility (and NATIONAL_STATS source).
  const [indicator, source] = await Promise.all([
    prisma.indicator.findUnique({
      where: { slug: SLUG.cityFertility },
      select: { id: true },
    }),
    prisma.dataSource.findUnique({
      where: { code: "NATIONAL_STATS" },
      select: { id: true },
    }),
  ]);

  if (!indicator) {
    console.log(
      "⚠ city-fertility indicator missing; run ensureIndicators first",
    );
    return;
  }

  const sourceId =
    source?.id ??
    (
      await prisma.dataSource.findUnique({
        where: { code: "NATIONAL_CENSUS" },
        select: { id: true },
      })
    )?.id ??
    null;

  const cities = new Map(
    (
      await prisma.city.findMany({
        where: { slug: { in: CITY_FERTILITY.map((s) => s.citySlug) } },
        select: { id: true, slug: true },
      })
    ).map((c) => [c.slug, c.id]),
  );

  let inserted = 0;
  let citiesSeeded = 0;

  for (const series of CITY_FERTILITY) {
    const cityId = cities.get(series.citySlug);
    if (!cityId) {
      console.log(`⚠ city slug "${series.citySlug}" not in DB — skip TFR`);
      continue;
    }

    await prisma.indicatorValue.deleteMany({
      where: {
        subjectType: "CITY",
        indicatorId: indicator.id,
        cityId,
      },
    });

    if (series.points.length === 0) continue;

    await prisma.indicatorValue.createMany({
      data: series.points.map((p) => ({
        subjectType: "CITY",
        indicatorId: indicator.id,
        cityId,
        year: p.year,
        value: p.value,
        kind: "ESTIMATE",
        sourceId,
      })),
    });
    inserted += series.points.length;
    citiesSeeded++;
  }

  console.log(
    `✔ ${inserted} city-fertility rows for ${citiesSeeded}/${CITY_FERTILITY.length} cities (NATIONAL_STATS)`,
  );
}
