/* eslint-disable no-console */
// Generates modeled data that the raw World Bank series don't provide directly:
//   * Population pyramids (age/sex structure) for the latest year
//   * Population projections to 2100 by TFR scenario
//   * A curated upcoming data-release calendar
//
// Pyramids/projections are produced by the cohort-component engine seeded from
// real World Bank population, fertility and life-expectancy values, and are
// stored against the MODEL data source so provenance stays honest.

import type { PrismaClient } from "@prisma/client";
import {
  buildStablePopulation,
  project,
  AGE_GROUPS,
  AGE_STARTS,
} from "../demography";
import { SLUG } from "../indicators";
import { fetchRealPyramids } from "./pyramid-data";
import { seedCities } from "./cities-data";
import { seedEthnicity } from "./ethnicity-data";
import { seedAbortion } from "./abortion-data";
import { seedSocial } from "./social-data";
import { seedReligion } from "./religion-data";
import { seedWppProjections, WPP_ISO3 } from "./wpp-projections-data";

async function latestValueMap(
  prisma: PrismaClient,
  slug: string,
): Promise<Map<number, { value: number; year: number }>> {
  const ind = await prisma.indicator.findUnique({
    where: { slug },
    select: { id: true },
  });
  const out = new Map<number, { value: number; year: number }>();
  if (!ind) return out;
  const rows = await prisma.indicatorValue.findMany({
    where: {
      indicatorId: ind.id,
      subjectType: "COUNTRY",
      dimension: null,
      kind: "ESTIMATE",
    },
    select: { countryId: true, value: true, year: true },
    orderBy: { year: "desc" },
  });
  for (const r of rows) {
    if (r.countryId && !out.has(r.countryId)) {
      out.set(r.countryId, { value: r.value, year: r.year });
    }
  }
  return out;
}

export async function generateDerivedData(prisma: PrismaClient) {
  console.log("\n→ Generating derived data (pyramids, projections)…");
  const model = await prisma.dataSource.findUnique({ where: { code: "MODEL" } });
  const wbSource = await prisma.dataSource.findUnique({
    where: { code: "WORLD_BANK" },
  });
  const countries = await prisma.country.findMany({
    where: { isAggregate: false },
    select: { id: true, iso3: true },
  });

  // Real 5-year pyramids from the World Bank age-sex series (best source).
  let realPyramids = new Map<
    string,
    { year: number; male: number[]; female: number[] }
  >();
  try {
    realPyramids = await fetchRealPyramids();
  } catch (err) {
    console.warn(
      "  ↳ could not fetch real pyramids, falling back to model:",
      (err as Error).message,
    );
  }

  const [pop, tfr, e0, mig, y014, y1564, y65] = await Promise.all([
    latestValueMap(prisma, SLUG.population),
    latestValueMap(prisma, SLUG.fertility),
    latestValueMap(prisma, SLUG.lifeExpectancy),
    latestValueMap(prisma, SLUG.netMigration),
    latestValueMap(prisma, SLUG.popShare0to14),
    latestValueMap(prisma, SLUG.popShare15to64),
    latestValueMap(prisma, SLUG.popShare65plus),
  ]);

  let pyramidCount = 0;
  let projCount = 0;

  for (const c of countries) {
    const population = pop.get(c.id)?.value;
    if (!population) continue;
    const baseYear = pop.get(c.id)!.year;
    const fertility = tfr.get(c.id)?.value ?? 2.1;
    const lifeExp = e0.get(c.id)?.value ?? 72;
    const migration = mig.get(c.id)?.value ?? 0;

    // Prefer the REAL World Bank pyramid as the projection base. Fall back to a
    // model anchored to real broad age shares (momentum-preserving), then to a
    // pure stable population if even those are missing.
    const real = realPyramids.get(c.iso3);
    const youth = y014.get(c.id)?.value;
    const working = y1564.get(c.id)?.value;
    const old = y65.get(c.id)?.value;
    const shares =
      youth != null && working != null && old != null
        ? { youth, working, old }
        : undefined;

    const base = real
      ? { male: real.male, female: real.female }
      : buildStablePopulation(population, fertility, lifeExp, shares);
    const pyramidYear = real?.year ?? baseYear;
    const pyramidSourceId = real ? wbSource?.id ?? null : model?.id ?? null;

    // --- Pyramid (latest year) -------------------------------------------
    await prisma.populationByAge.deleteMany({ where: { countryId: c.id } });
    const pyramidRows = AGE_GROUPS.flatMap((ageGroup, i) => [
      {
        countryId: c.id,
        year: pyramidYear,
        ageGroup,
        ageStart: AGE_STARTS[i],
        sex: "male",
        population: Math.round(base.male[i]),
        kind: "ESTIMATE" as const,
        sourceId: pyramidSourceId,
      },
      {
        countryId: c.id,
        year: pyramidYear,
        ageGroup,
        ageStart: AGE_STARTS[i],
        sex: "female",
        population: Math.round(base.female[i]),
        kind: "ESTIMATE" as const,
        sourceId: pyramidSourceId,
      },
    ]);
    await prisma.populationByAge.createMany({ data: pyramidRows });
    pyramidCount++;

    // --- Projections to 2100 by scenario ---------------------------------
    // Official UN WPP projections are seeded below and take precedence; only
    // run the homegrown cohort model as a fallback for countries WPP lacks.
    if (WPP_ISO3.has(c.iso3)) continue;
    await prisma.populationProjection.deleteMany({ where: { countryId: c.id } });
    const steps = Math.ceil((2100 - baseYear) / 5);
    const scenarios: { name: string; tfr: number }[] = [
      { name: "low", tfr: Math.max(1.0, fertility - 0.5) },
      { name: "medium", tfr: fertility },
      { name: "high", tfr: fertility + 0.5 },
    ];
    const projRows = scenarios.flatMap(({ name, tfr: scenTfr }) => {
      const snaps = project(
        base,
        {
          tfr: scenTfr,
          lifeExpectancy: lifeExp,
          netMigrationPerStep: migration * 5, // annual net migration → 5y step
        },
        baseYear,
        steps,
      );
      return snaps.map((s) => ({
        countryId: c.id,
        year: s.year,
        scenario: name,
        population: Math.round(s.total),
        sourceId: model?.id ?? null,
      }));
    });
    const CHUNK = 2000;
    for (let i = 0; i < projRows.length; i += CHUNK) {
      await prisma.populationProjection.createMany({
        data: projRows.slice(i, i + CHUNK),
      });
    }
    projCount += projRows.length;
  }
  console.log(
    `✔ ${pyramidCount} pyramids, ${projCount} model projection rows (fallback)`,
  );

  await seedWppProjections(prisma);
  await seedCities(prisma);
  await seedEthnicity(prisma);
  await seedAbortion(prisma);
  await seedSocial(prisma);
  await seedReligion(prisma);
  await seedReleases(prisma);
}

// Curated, realistic upcoming data-release calendar. Dates are generated
// relative to "now" so the calendar always shows forthcoming items.
async function seedReleases(prisma: PrismaClient) {
  const sources = new Map(
    (await prisma.dataSource.findMany()).map((s) => [s.code, s.id]),
  );
  const now = new Date();
  const plus = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d;
  };

  const releases = [
    {
      title: "World Population Prospects — Annual Revision",
      dataset: "WPP Population & Projections",
      sourceCode: "UN_WPP",
      region: "Global",
      category: "POPULATION" as const,
      releaseDate: plus(21),
      url: "https://population.un.org/wpp/",
    },
    {
      title: "World Development Indicators — Quarterly Update",
      dataset: "WDI",
      sourceCode: "WORLD_BANK",
      region: "Global",
      category: "ECONOMY" as const,
      releaseDate: plus(9),
      url: "https://data.worldbank.org",
    },
    {
      title: "OECD Fertility Rates Update",
      dataset: "Family Database — Fertility",
      sourceCode: "OECD",
      region: "OECD",
      category: "FERTILITY" as const,
      releaseDate: plus(34),
      url: "https://data.oecd.org",
    },
    {
      title: "International Migration Outlook",
      dataset: "Migration Statistics",
      sourceCode: "OECD",
      region: "OECD",
      category: "MIGRATION" as const,
      releaseDate: plus(52),
      url: "https://www.oecd.org/migration/",
    },
    {
      title: "World Economic Outlook",
      dataset: "WEO Database",
      sourceCode: "IMF",
      region: "Global",
      category: "ECONOMY" as const,
      releaseDate: plus(45),
      url: "https://www.imf.org/en/Publications/WEO",
    },
    {
      title: "UN World Fertility Data",
      dataset: "Fertility Indicators",
      sourceCode: "UN_WPP",
      region: "Global",
      category: "FERTILITY" as const,
      releaseDate: plus(68),
      url: "https://population.un.org/",
    },
    {
      title: "World Bank Population Estimates & Projections",
      dataset: "Health Nutrition & Population",
      sourceCode: "WORLD_BANK",
      region: "Global",
      category: "POPULATION" as const,
      releaseDate: plus(15),
      url: "https://data.worldbank.org",
    },
    {
      title: "OECD Economic Outlook",
      dataset: "GDP & Growth Projections",
      sourceCode: "OECD",
      region: "OECD",
      category: "ECONOMY" as const,
      releaseDate: plus(40),
      url: "https://www.oecd.org/economic-outlook/",
    },
  ];

  await prisma.dataRelease.deleteMany({});
  for (const r of releases) {
    await prisma.dataRelease.create({
      data: {
        title: r.title,
        dataset: r.dataset,
        sourceId: sources.get(r.sourceCode) ?? null,
        sourceName: r.sourceCode,
        region: r.region,
        category: r.category,
        releaseDate: r.releaseDate,
        status: "SCHEDULED",
        url: r.url,
      },
    });
  }
  console.log(`✔ ${releases.length} upcoming releases`);
}
