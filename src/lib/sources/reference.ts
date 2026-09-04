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
    code: "NATIONAL_STATS",
    name: "National statistical offices (vital statistics & census)",
    url: "",
    license: "Various national licenses",
    description:
      "City-level fertility, age structure and foreign-born shares from national statistical offices (MHLW/e-Stat, CDC/NCHS, ONS, INSEE, KOSTAT, Destatis, DOS, C&SD, etc.).",
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
  {
    code: "UN_WUP",
    name: "UN World Urbanization Prospects 2018",
    url: "https://population.un.org/wup/",
    license: "CC BY 3.0 IGO",
    description:
      "Population of urban agglomerations with 300,000+ inhabitants, annual 1950–2035 (estimates to 2018, projections thereafter), UN Population Division.",
  },
  {
    code: "US_CENSUS",
    name: "U.S. Census Bureau (ACS / Decennial)",
    url: "https://www.census.gov",
    license: "U.S. Government public domain",
    description:
      "American Community Survey and Decennial Census figures for U.S. cities, counties and ZCTAs (accessed via Census Reporter).",
  },
  {
    code: "BIRTHGAUGE",
    name: "BirthGauge provisional fertility tracker",
    url: "https://x.com/BirthGauge",
    license: "Compiled from national NSOs",
    description:
      "Provisional / partial-year births and TFR nowcasts compiled from national statistical offices and ministries of health (BirthGauge). Not a substitute for final annual official TFR.",
  },
  {
    code: "EUROSTAT",
    name: "Eurostat",
    url: "https://ec.europa.eu/eurostat",
    license: "Eurostat terms (CC BY 4.0)",
    description:
      "European statistical office — crime, population and social statistics for EU/EFTA and candidate countries.",
  },
  {
    code: "OWID",
    name: "Our World in Data",
    url: "https://ourworldindata.org",
    license: "CC BY",
    description:
      "Compiled long-run demographic series (life expectancy, child mortality and related indicators) from academic reconstructions, HMD, UN IGME and UN WPP.",
  },
  {
    code: "HMD",
    name: "Human Mortality Database",
    url: "https://www.mortality.org",
    license: "HMD terms",
    description:
      "Detailed mortality and population data for countries with high-quality vital registration, via Our World in Data grapher extracts.",
  },
  {
    code: "HFD",
    name: "Human Fertility Database",
    url: "https://www.humanfertility.org",
    license: "HFD terms (free for research/non-commercial use)",
    description:
      "Detailed period and cohort fertility data reconstructed from official birth registration statistics, for countries with long vital-registration series (coverage starts 1891-1950 depending on country). Via Our World in Data grapher extracts.",
  },
  {
    code: "GAPMINDER",
    name: "Gapminder Foundation",
    url: "https://www.gapminder.org/data/",
    license: "CC BY 4.0",
    description:
      "Long-run demographic reconstructions (e.g. total fertility rate back to 1800) compiled by Gapminder from historical vital statistics, census records and UN sources.",
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
