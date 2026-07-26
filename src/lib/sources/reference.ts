/* eslint-disable no-console */
// Reference data shared by the seed and ingestion scripts: data sources and
// the indicator catalogue. Idempotent upserts so they can run any number of
// times safely.

import type { PrismaClient } from "@prisma/client";
import { INDICATORS } from "../indicators";

export const DATA_SOURCES = [
  {
    code: "WORLD_BANK",
    name: "World Bank Open Data",
    url: "https://data.worldbank.org",
    license: "CC BY-4.0",
    description: "World Development Indicators and population statistics.",
  },
  {
    code: "UN_WPP",
    name: "UN Population Division — World Population Prospects",
    url: "https://population.un.org/wpp/",
    license: "CC BY 3.0 IGO",
    description: "Official UN population estimates and projections.",
  },
  {
    code: "OECD",
    name: "OECD Data",
    url: "https://data.oecd.org",
    license: "OECD Terms",
    description: "Economic and social statistics for OECD members.",
  },
  {
    code: "IMF",
    name: "International Monetary Fund",
    url: "https://www.imf.org/en/Data",
    license: "IMF Terms",
    description: "World Economic Outlook macroeconomic data.",
  },
  {
    code: "MODEL",
    name: "birthrate.io demographic model",
    url: "/",
    license: "Modeled estimate",
    description: "Cohort-component projections derived from World Bank inputs.",
  },
  {
    code: "NATIONAL_CENSUS",
    name: "National statistical offices / census",
    url: "",
    license: "Various national licenses",
    description:
      "Ethnic & racial composition compiled from national population censuses.",
  },
  {
    code: "WHO_GUTTMACHER",
    name: "WHO / Guttmacher Institute",
    url: "https://www.guttmacher.org",
    license: "Compiled estimates",
    description:
      "Induced abortion rates compiled from WHO and Guttmacher Institute estimates and national health statistics.",
  },
  {
    code: "PEW",
    name: "Pew Research Center",
    url: "https://www.pewresearch.org/religion/",
    license: "Compiled estimates",
    description:
      "Religious composition compiled from Pew Research Center and national censuses.",
  },
  {
    code: "UN_DESA_MIGRATION",
    name: "UN DESA — International Migrant Stock 2024",
    url: "https://www.un.org/development/desa/pd/content/international-migrant-stock",
    license: "UN terms (CC BY 3.0 IGO)",
    description:
      "Bilateral international migrant stock by country of origin and destination (mid-2024 estimates), UN Population Division.",
  },
];

export async function ensureSources(prisma: PrismaClient) {
  for (const s of DATA_SOURCES) {
    await prisma.dataSource.upsert({
      where: { code: s.code },
      create: s,
      update: s,
    });
  }
  console.log(`✔ ${DATA_SOURCES.length} data sources`);
}

export async function ensureIndicators(prisma: PrismaClient) {
  const sourceMap = new Map(
    (await prisma.dataSource.findMany()).map((s) => [s.code, s.id]),
  );
  for (const def of INDICATORS) {
    const data = {
      code: def.code,
      slug: def.slug,
      name: def.name,
      shortName: def.shortName,
      description: def.description,
      unit: def.unit,
      category: def.category,
      higherIsBetter: def.higherIsBetter,
      decimals: def.decimals,
      sourceId: sourceMap.get(def.source) ?? null,
    };
    await prisma.indicator.upsert({
      where: { code: def.code },
      create: data,
      update: data,
    });
  }
  console.log(`✔ ${INDICATORS.length} indicators`);
}
