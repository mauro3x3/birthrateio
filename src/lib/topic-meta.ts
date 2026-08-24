import { SLUG } from "@/lib/indicators";

export type TopicMeta = {
  /** Hub path, used as the lookup key. */
  href: string;
  title: string;
  /** Indicators documented on the page, in reading order. */
  indicators: string[];
  /** Sibling pages worth visiting next. */
  related: { title: string; href: string; note: string }[];
  /** Caveats a reader needs before interpreting the page. Keep to one line each. */
  caveats?: string[];
};

/**
 * Per-hub metadata: which indicators a page documents, what to read next, and
 * the caveats that belong next to the numbers. Drives the definition block,
 * source attribution, and "related" rail on every topic hub.
 */
export const TOPIC_META: TopicMeta[] = [
  {
    href: "/fertility",
    title: "Fertility",
    indicators: [
      SLUG.fertility,
      SLUG.fertilityProvisional,
      SLUG.birthRate,
      SLUG.adolescentFertility,
      SLUG.contraceptivePrevalence,
    ],
    related: [
      {
        title: "Population",
        href: "/population",
        note: "How fertility feeds through to population size",
      },
      {
        title: "Mortality",
        href: "/mortality",
        note: "The other half of natural change",
      },
      {
        title: "States & provinces",
        href: "/states",
        note: "Subnational fertility within countries",
      },
      {
        title: "Simulator",
        href: "/simulator",
        note: "Project a population under different fertility paths",
      },
    ],
    caveats: [
      "The total fertility rate is a period measure: it describes one year's rates, not the completed families of real women.",
      "Provisional figures come from national statistical offices ahead of final annual data and are revised.",
    ],
  },
  {
    href: "/population",
    title: "Population",
    indicators: [
      SLUG.population,
      SLUG.populationGrowth,
      SLUG.popShare0to14,
      SLUG.popShare15to64,
      SLUG.popShare65plus,
      SLUG.urbanPopulation,
      SLUG.ruralPopulation,
      SLUG.urbanPopulationGrowth,
      SLUG.populationDensity,
      SLUG.ageDependencyRatio,
      SLUG.femalePopulationShare,
    ],
    related: [
      {
        title: "Fertility",
        href: "/fertility",
        note: "The main driver of long-run population change",
      },
      {
        title: "Migration",
        href: "/migration",
        note: "Why growth can diverge from natural change",
      },
      {
        title: "Cities",
        href: "/cities",
        note: "Where that population actually lives",
      },
      {
        title: "Simulator",
        href: "/simulator",
        note: "Build your own projection scenario",
      },
    ],
    caveats: [
      "Figures beyond the current year are UN projections conditional on assumptions, not forecasts.",
    ],
  },
  {
    href: "/migration",
    title: "Migration",
    indicators: [
      SLUG.netMigration,
      SLUG.migrantStock,
      SLUG.migrantStockShare,
    ],
    related: [
      {
        title: "Population",
        href: "/population",
        note: "How migration changes population totals",
      },
      {
        title: "Cities",
        href: "/cities",
        note: "Metro areas where migrants concentrate",
      },
      {
        title: "UK census",
        href: "/demographics/uk",
        note: "Ethnic group detail for England & Wales",
      },
      {
        title: "US demographics",
        href: "/demographics",
        note: "Race and Hispanic origin by U.S. state",
      },
    ],
    caveats: [
      "Net migration nets arrivals against departures, so a small figure can hide very large flows in both directions.",
      "Migration statistics are among the least complete demographic data; definitions and coverage differ by country.",
    ],
  },
  {
    href: "/mortality",
    title: "Mortality",
    indicators: [
      SLUG.lifeExpectancy,
      SLUG.lifeExpectancyFemale,
      SLUG.lifeExpectancyMale,
      SLUG.deathRate,
      SLUG.childMortality,
      SLUG.infantMortality,
      SLUG.maternalMortality,
      SLUG.suicideRate,
      SLUG.historicDeathRate,
    ],
    related: [
      {
        title: "Fertility",
        href: "/fertility",
        note: "The other half of natural change",
      },
      {
        title: "Population",
        href: "/population",
        note: "How mortality shapes age structure",
      },
      {
        title: "GDP",
        href: "/gdp",
        note: "Income and longevity move together",
      },
    ],
    caveats: [
      "Life expectancy at birth is a period measure and does not predict how long people born today will actually live.",
      "Crude death rates are not age-standardised, so older populations look worse at identical mortality risk.",
    ],
  },
  {
    href: "/gdp",
    title: "GDP",
    indicators: [
      SLUG.gdp,
      SLUG.gdpPerCapita,
      SLUG.gdpGrowth,
      SLUG.gdpReal,
      SLUG.gdpPerCapitaReal,
      SLUG.gdpPerCapitaPpp,
      SLUG.gdpPerCapitaPppReal,
      SLUG.gniPerCapita,
      SLUG.inflation,
      SLUG.unemployment,
      SLUG.gini,
      SLUG.femaleLabourForce,
      SLUG.exportsShareGdp,
    ],
    related: [
      {
        title: "Population",
        href: "/population",
        note: "The denominator behind GDP per capita",
      },
      {
        title: "Mortality",
        href: "/mortality",
        note: "Income and life expectancy move together",
      },
      {
        title: "Compare",
        href: "/compare",
        note: "Put economies side by side",
      },
    ],
    caveats: [
      "Headline GDP figures are at current US dollar prices; use the constant-price series to compare a country across years and the PPP series to compare countries with each other.",
      "PPP conversions rest on international price surveys, which are themselves estimates and are revised when a new benchmark round is published.",
    ],
  },
  {
    href: "/crime",
    title: "Crime",
    indicators: [SLUG.homicideRate, SLUG.foreignPrisonerShare],
    related: [
      {
        title: "Migration",
        href: "/migration",
        note: "Foreign-born population for context",
      },
      {
        title: "US demographics",
        href: "/demographics",
        note: "Population composition by state",
      },
    ],
    caveats: [
      "Homicide is the only crime counted consistently enough for international comparison; other offence counts reflect reporting and policing practice as much as underlying crime.",
      "Citizenship is not ancestry or migration background, and prison populations reflect sentencing and remand policy as well as offending.",
    ],
  },
  {
    href: "/cities",
    title: "Cities",
    indicators: [
      SLUG.cityPopulation,
      SLUG.cityFertility,
      SLUG.cityForeignBornShare,
    ],
    related: [
      {
        title: "Population",
        href: "/population",
        note: "National population totals",
      },
      {
        title: "Fertility",
        href: "/fertility",
        note: "How city fertility compares to national",
      },
      {
        title: "States & provinces",
        href: "/states",
        note: "Regional detail between city and country",
      },
    ],
    caveats: [
      "City figures cover the urban agglomeration (contiguous built-up area), which rarely matches municipal boundaries.",
    ],
  },
  {
    href: "/states",
    title: "States & provinces",
    indicators: [SLUG.fertility, SLUG.generalFertilityRate],
    related: [
      {
        title: "Fertility",
        href: "/fertility",
        note: "National fertility rates",
      },
      {
        title: "Cities",
        href: "/cities",
        note: "Metro-level detail",
      },
      {
        title: "US demographics",
        href: "/demographics",
        note: "Composition of U.S. states",
      },
    ],
    caveats: [
      "Subnational definitions and reference years differ by country, so cross-country comparison of regions is unreliable.",
    ],
  },
  {
    href: "/demographics",
    title: "US demographics",
    indicators: [],
    related: [
      {
        title: "UK census",
        href: "/demographics/uk",
        note: "The equivalent view for England & Wales",
      },
      {
        title: "States & provinces",
        href: "/states",
        note: "Fertility by U.S. state",
      },
      {
        title: "Cities",
        href: "/cities",
        note: "City-level composition",
      },
    ],
    caveats: [
      "Race and Hispanic origin are self-reported census categories specific to the United States and are not comparable to ethnicity data elsewhere.",
    ],
  },
  {
    href: "/demographics/uk",
    title: "UK census",
    indicators: [],
    related: [
      {
        title: "US demographics",
        href: "/demographics",
        note: "The equivalent view for U.S. states",
      },
      {
        title: "Migration",
        href: "/migration",
        note: "Foreign-born population by country",
      },
    ],
    caveats: [
      "ONS Census 2021 ethnic-group categories are specific to England & Wales and are not comparable with other countries.",
    ],
  },
];

const META_BY_HREF = new Map(TOPIC_META.map((t) => [t.href, t]));

export function topicMeta(href: string): TopicMeta | undefined {
  return META_BY_HREF.get(href);
}
