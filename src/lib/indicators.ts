import type { IndicatorCategory } from "@/lib/enums";

// Canonical indicator catalogue. `code` matches the World Bank API series id so
// the same definition drives both ingestion and the UI. Adding a new indicator
// is a one-line change here — no schema migration required.
export interface IndicatorDef {
  code: string;
  slug: string;
  name: string;
  shortName: string;
  description: string;
  unit: string;
  category: IndicatorCategory;
  higherIsBetter: boolean | null;
  decimals: number;
  source: string; // DataSource.code
}

export const INDICATORS: IndicatorDef[] = [
  {
    code: "SP.DYN.TFRT.IN",
    slug: "fertility-rate",
    name: "Total Fertility Rate",
    shortName: "Fertility Rate",
    description:
      "Average number of children that would be born to a woman over her lifetime given current age-specific fertility rates.",
    unit: "births per woman",
    category: "FERTILITY",
    higherIsBetter: null,
    decimals: 2,
    source: "WORLD_BANK",
  },
  {
    code: "SP.DYN.CBRT.IN",
    slug: "birth-rate",
    name: "Crude Birth Rate",
    shortName: "Birth Rate",
    description: "Number of live births per 1,000 people per year.",
    unit: "per 1,000 people",
    category: "FERTILITY",
    higherIsBetter: null,
    decimals: 1,
    source: "WORLD_BANK",
  },
  {
    code: "SP.DYN.CDRT.IN",
    slug: "death-rate",
    name: "Crude Death Rate",
    shortName: "Death Rate",
    description: "Number of deaths per 1,000 people per year.",
    unit: "per 1,000 people",
    category: "MORTALITY",
    higherIsBetter: false,
    decimals: 1,
    source: "WORLD_BANK",
  },
  {
    code: "SP.POP.TOTL",
    slug: "population",
    name: "Total Population",
    shortName: "Population",
    description: "Total resident population, all ages and both sexes.",
    unit: "people",
    category: "POPULATION",
    higherIsBetter: null,
    decimals: 0,
    source: "WORLD_BANK",
  },
  {
    code: "SP.POP.GROW",
    slug: "population-growth",
    name: "Population Growth",
    shortName: "Pop. Growth",
    description: "Annual population growth rate (%).",
    unit: "% annual",
    category: "POPULATION",
    higherIsBetter: null,
    decimals: 2,
    source: "WORLD_BANK",
  },
  {
    code: "SP.DYN.LE00.IN",
    slug: "life-expectancy",
    name: "Life Expectancy at Birth",
    shortName: "Life Expectancy",
    description:
      "Number of years a newborn would live if mortality patterns at birth stayed constant.",
    unit: "years",
    category: "MORTALITY",
    higherIsBetter: true,
    decimals: 1,
    source: "WORLD_BANK",
  },
  {
    code: "SP.URB.TOTL.IN.ZS",
    slug: "urban-population",
    name: "Urban Population",
    shortName: "Urban %",
    description: "Share of the population living in urban areas (%).",
    unit: "% of total",
    category: "POPULATION",
    higherIsBetter: null,
    decimals: 1,
    source: "WORLD_BANK",
  },
  {
    code: "SM.POP.NETM",
    slug: "net-migration",
    name: "Net Migration",
    shortName: "Net Migration",
    description:
      "Net number of migrants (immigrants minus emigrants) in a year.",
    unit: "people",
    category: "MIGRATION",
    higherIsBetter: null,
    decimals: 0,
    source: "WORLD_BANK",
  },
  {
    code: "SP.POP.0014.TO.ZS",
    slug: "pop-share-0-14",
    name: "Population Ages 0–14 (% of total)",
    shortName: "Ages 0–14",
    description:
      "Share of the population aged 0–14. Used to anchor the current age structure for projections.",
    unit: "% of population",
    category: "POPULATION",
    higherIsBetter: null,
    decimals: 1,
    source: "WORLD_BANK",
  },
  {
    code: "SP.POP.1564.TO.ZS",
    slug: "pop-share-15-64",
    name: "Population Ages 15–64 (% of total)",
    shortName: "Ages 15–64",
    description:
      "Share of the population of working age (15–64). Used to anchor the current age structure for projections.",
    unit: "% of population",
    category: "POPULATION",
    higherIsBetter: null,
    decimals: 1,
    source: "WORLD_BANK",
  },
  {
    code: "SP.POP.65UP.TO.ZS",
    slug: "pop-share-65-plus",
    name: "Population Ages 65+ (% of total)",
    shortName: "Ages 65+",
    description:
      "Share of the population aged 65 and over. Used to anchor the current age structure for projections.",
    unit: "% of population",
    category: "POPULATION",
    higherIsBetter: null,
    decimals: 1,
    source: "WORLD_BANK",
  },
  {
    code: "SM.POP.TOTL",
    slug: "migrant-stock",
    name: "Foreign-born Population",
    shortName: "Foreign-born",
    description:
      "International migrant stock — the number of people living in a country who were born in another country (the immigrant / diaspora population).",
    unit: "people",
    category: "MIGRATION",
    higherIsBetter: null,
    decimals: 0,
    source: "WORLD_BANK",
  },
  {
    code: "SM.POP.TOTL.ZS",
    slug: "migrant-stock-share",
    name: "Foreign-born Population (% of total)",
    shortName: "Foreign-born %",
    description:
      "International migrant stock as a share of the total population — how large the foreign-born / diaspora population is relative to the country.",
    unit: "% of population",
    category: "MIGRATION",
    higherIsBetter: null,
    decimals: 1,
    source: "WORLD_BANK",
  },
  {
    code: "NY.GDP.MKTP.CD",
    slug: "gdp",
    name: "GDP (current US$)",
    shortName: "GDP",
    description: "Gross domestic product at current US dollar prices.",
    unit: "current US$",
    category: "ECONOMY",
    higherIsBetter: true,
    decimals: 0,
    source: "WORLD_BANK",
  },
  {
    code: "NY.GDP.PCAP.CD",
    slug: "gdp-per-capita",
    name: "GDP per Capita (current US$)",
    shortName: "GDP / capita",
    description: "Gross domestic product divided by midyear population.",
    unit: "current US$",
    category: "ECONOMY",
    higherIsBetter: true,
    decimals: 0,
    source: "WORLD_BANK",
  },
  {
    code: "NY.GDP.MKTP.KD.ZG",
    slug: "gdp-growth",
    name: "GDP Growth",
    shortName: "GDP Growth",
    description: "Annual percentage growth rate of GDP at constant prices.",
    unit: "% annual",
    category: "ECONOMY",
    higherIsBetter: true,
    decimals: 2,
    source: "WORLD_BANK",
  },
  {
    // Not a World Bank series — curated from WHO/Guttmacher. The code is a
    // stable internal id (kept out of the World Bank ingestion loop).
    code: "ABORTION.RATE",
    slug: "abortion-rate",
    name: "Abortion Rate",
    shortName: "Abortion Rate",
    description:
      "Induced abortions per 1,000 women aged 15–49 per year. Compiled from WHO and Guttmacher Institute estimates; reporting completeness varies by country.",
    unit: "per 1,000 women 15–49",
    category: "FERTILITY",
    higherIsBetter: null,
    decimals: 1,
    source: "WHO_GUTTMACHER",
  },
  {
    code: "VC.IHR.PSRC.P5",
    slug: "homicide-rate",
    name: "Intentional Homicide Rate",
    shortName: "Homicide Rate",
    description: "Intentional homicides per 100,000 people.",
    unit: "per 100,000",
    category: "CRIME",
    higherIsBetter: false,
    decimals: 1,
    source: "WORLD_BANK",
  },
  {
    code: "DIVORCE.RATE",
    slug: "divorce-rate",
    name: "Crude Divorce Rate",
    shortName: "Divorce Rate",
    description:
      "Divorces per 1,000 population per year. Compiled from OECD, Eurostat and UN statistics.",
    unit: "per 1,000 people",
    category: "SOCIETY",
    higherIsBetter: null,
    decimals: 1,
    source: "OECD",
  },
  {
    code: "BIRTHS.NONMARITAL",
    slug: "nonmarital-births",
    name: "Births Outside Marriage",
    shortName: "Nonmarital Births",
    description:
      "Share of live births to unmarried mothers (%). Compiled from OECD and Eurostat.",
    unit: "% of births",
    category: "SOCIETY",
    higherIsBetter: null,
    decimals: 1,
    source: "OECD",
  },
  {
    code: "HOME.OWNERSHIP",
    slug: "homeownership-rate",
    name: "Home Ownership Rate",
    shortName: "Home Ownership",
    description:
      "Share of households that own their home (%). Compiled from OECD, Eurostat and national statistics.",
    unit: "% of households",
    category: "HOUSING",
    higherIsBetter: null,
    decimals: 1,
    source: "OECD",
  },
  {
    // City-level urban agglomeration population, annual 1950–2035, from the UN
    // World Urbanization Prospects. Stored against City rows (subjectType=CITY).
    code: "CITY.POP.WUP",
    slug: "city-population",
    name: "Urban Agglomeration Population",
    shortName: "City Population",
    description:
      "Population of the urban agglomeration (contiguous built-up area), annual 1950–2035. Estimates through 2018 and UN projections thereafter.",
    unit: "people",
    category: "POPULATION",
    higherIsBetter: null,
    decimals: 0,
    source: "UN_WUP",
  },
  {
    // City / metro-area TFR from national statistical offices. Caller must run
    // ensureIndicators so slug "city-fertility" exists before seedCityFertility.
    code: "CITY.TFR",
    slug: "city-fertility",
    name: "City Total Fertility Rate",
    shortName: "City TFR",
    description:
      "Total fertility rate for a city or matching administrative geography (prefecture, borough set, département, etc.), compiled from national statistical offices. Geography notes on each series clarify the exact unit.",
    unit: "births per woman",
    category: "FERTILITY",
    higherIsBetter: null,
    decimals: 2,
    source: "NATIONAL_STATS",
  },
  {
    code: "CITY.FOREIGN.BORN.SHARE",
    slug: "city-foreign-born-share",
    name: "City Foreign-born / Foreign Citizenship Share",
    shortName: "City Foreign-born %",
    description:
      "Share of the city population that is foreign-born or holds foreign citizenship, per the definition used by the national statistical office (noted per series).",
    unit: "% of population",
    category: "MIGRATION",
    higherIsBetter: null,
    decimals: 1,
    source: "NATIONAL_STATS",
  },
  {
    // Age-structure shares stored with dimension="age" /
    // dimensionValue in {"0-14","15-64","65+"}.
    code: "CITY.AGE.SHARE",
    slug: "city-age-share",
    name: "City Population Age Share",
    shortName: "City Age Share",
    description:
      "Share of the city population in broad age groups (0–14, 15–64, 65+), from national censuses and official estimates. Breakdown via dimension=age.",
    unit: "% of population",
    category: "POPULATION",
    higherIsBetter: null,
    decimals: 1,
    source: "NATIONAL_STATS",
  },
  {
    code: "CITY.MEDIAN.INCOME",
    slug: "city-median-income",
    name: "City Median Household Income",
    shortName: "City median income",
    description:
      "Median household income for the city (Census place), U.S. dollars. U.S. cities from ACS.",
    unit: "current US$",
    category: "ECONOMY",
    higherIsBetter: true,
    decimals: 0,
    source: "US_CENSUS",
  },
];

export const INDICATOR_BY_SLUG = new Map(INDICATORS.map((i) => [i.slug, i]));
export const INDICATOR_BY_CODE = new Map(INDICATORS.map((i) => [i.code, i]));

// Convenience slugs referenced throughout the app.
export const SLUG = {
  fertility: "fertility-rate",
  birthRate: "birth-rate",
  deathRate: "death-rate",
  population: "population",
  populationGrowth: "population-growth",
  lifeExpectancy: "life-expectancy",
  netMigration: "net-migration",
  popShare0to14: "pop-share-0-14",
  popShare15to64: "pop-share-15-64",
  popShare65plus: "pop-share-65-plus",
  migrantStock: "migrant-stock",
  migrantStockShare: "migrant-stock-share",
  gdp: "gdp",
  gdpPerCapita: "gdp-per-capita",
  gdpGrowth: "gdp-growth",
  abortionRate: "abortion-rate",
  homicideRate: "homicide-rate",
  divorceRate: "divorce-rate",
  nonmaritalBirths: "nonmarital-births",
  homeownershipRate: "homeownership-rate",
  cityPopulation: "city-population",
  cityFertility: "city-fertility",
  cityForeignBornShare: "city-foreign-born-share",
  cityAgeShare: "city-age-share",
  cityMedianIncome: "city-median-income",
} as const;
