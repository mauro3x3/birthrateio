import type { IndicatorChartSpec } from "@/components/country-indicator-grid";
import { SLUG } from "@/lib/indicators";

// Chart groups appended to the hand-built panels on a country page. Each group
// renders only the indicators that country actually reports, so sparse series
// (literacy, Gini, contraceptive use) simply disappear rather than showing an
// empty frame.

export const ECONOMY_CHARTS: readonly IndicatorChartSpec[] = [
  {
    slug: SLUG.gdpPerCapitaReal,
    title: "GDP per capita, inflation-adjusted",
    description: "Output per person at constant 2015 prices",
    unit: "US$ (2015)",
    color: "hsl(155 55% 38%)",
  },
  {
    slug: SLUG.gdpPerCapitaPppReal,
    title: "GDP per capita at purchasing power parity",
    description:
      "Constant 2021 international dollars — adjusted for local price levels and inflation",
    unit: "int'l $",
    color: "hsl(190 90% 42%)",
  },
  {
    slug: SLUG.gniPerCapita,
    title: "GNI per capita",
    description: "Gross national income per person, Atlas method",
    unit: "US$",
    color: "hsl(211 62% 45%)",
  },
  {
    slug: SLUG.inflation,
    title: "Inflation",
    description: "Annual change in consumer prices",
    unit: "%",
    color: "hsl(24 85% 48%)",
    referenceY: 0,
    referenceLabel: "Zero",
  },
  {
    slug: SLUG.unemployment,
    title: "Unemployment",
    description: "Share of the labour force out of work · modelled ILO estimate",
    unit: "%",
    color: "hsl(0 65% 48%)",
    source: "World Bank / ILO",
  },
  {
    slug: SLUG.gini,
    title: "Income inequality",
    description: "Gini index · 0 = perfect equality, 100 = maximum inequality",
    unit: "index",
    color: "hsl(280 65% 55%)",
  },
  {
    slug: SLUG.femaleLabourForce,
    title: "Female labour force participation",
    description: "Share of women aged 15+ working or looking for work",
    unit: "%",
    color: "hsl(340 82% 52%)",
    source: "World Bank / ILO",
  },
  {
    slug: SLUG.exportsShareGdp,
    title: "Exports as a share of GDP",
    description: "Exported goods and services relative to total output",
    unit: "% of GDP",
    color: "hsl(198 70% 40%)",
  },
];

export const DEMOGRAPHY_CHARTS: readonly IndicatorChartSpec[] = [
  {
    slug: SLUG.ageDependencyRatio,
    title: "Age dependency ratio",
    description: "People under 15 and over 64 per 100 of working age",
    unit: "per 100",
    color: "hsl(262 60% 52%)",
  },
  {
    slug: SLUG.populationDensity,
    title: "Population density",
    description: "People per square kilometre of land area",
    unit: "per km²",
    color: "hsl(211 62% 45%)",
  },
  {
    slug: SLUG.ruralPopulation,
    title: "Rural population share",
    description: "Share living outside areas classified as urban",
    unit: "%",
    color: "hsl(95 40% 38%)",
  },
  {
    slug: SLUG.urbanPopulationGrowth,
    title: "Urban population growth",
    description:
      "Annual change in the urban population, including reclassification of places as urban",
    unit: "%",
    color: "hsl(24 85% 48%)",
    referenceY: 0,
    referenceLabel: "Zero",
  },
  {
    slug: SLUG.femalePopulationShare,
    title: "Female share of the population",
    description: "Women as a percentage of all residents",
    unit: "%",
    color: "hsl(340 82% 52%)",
    referenceY: 50,
    referenceLabel: "Parity",
  },
  {
    slug: SLUG.adolescentFertility,
    title: "Adolescent fertility",
    description: "Births per 1,000 women aged 15–19",
    unit: "per 1,000",
    color: "hsl(300 55% 45%)",
  },
  {
    slug: SLUG.contraceptivePrevalence,
    title: "Contraceptive use",
    description:
      "Married or in-union women aged 15–49 using any method · survey years only",
    unit: "%",
    color: "hsl(174 60% 34%)",
    source: "World Bank / DHS & MICS surveys",
  },
];

export const MORTALITY_CHARTS: readonly IndicatorChartSpec[] = [
  {
    slug: SLUG.lifeExpectancyFemale,
    title: "Life expectancy, women",
    description: "Years at birth under current mortality patterns",
    unit: "years",
    color: "hsl(340 82% 52%)",
  },
  {
    slug: SLUG.lifeExpectancyMale,
    title: "Life expectancy, men",
    description: "Years at birth under current mortality patterns",
    unit: "years",
    color: "hsl(211 62% 45%)",
  },
  {
    slug: SLUG.infantMortality,
    title: "Infant mortality",
    description: "Deaths before the first birthday per 1,000 live births",
    unit: "per 1,000",
    color: "hsl(0 65% 48%)",
  },
  {
    slug: SLUG.maternalMortality,
    title: "Maternal mortality",
    description:
      "Deaths related to pregnancy or childbirth per 100,000 live births · modelled estimate",
    unit: "per 100,000",
    color: "hsl(350 60% 38%)",
    source: "World Bank / WHO, UNICEF, UNFPA",
  },
  {
    slug: SLUG.suicideRate,
    title: "Suicide rate",
    description: "Age-standardised deaths per 100,000 people",
    unit: "per 100,000",
    color: "hsl(220 20% 40%)",
    source: "World Bank / WHO",
  },
];

export const HEALTH_CHARTS: readonly IndicatorChartSpec[] = [
  {
    slug: SLUG.healthExpenditure,
    title: "Health spending",
    description: "All current health spending, public and private, as a share of GDP",
    unit: "% of GDP",
    color: "hsl(174 60% 34%)",
    source: "World Bank / WHO Global Health Expenditure Database",
  },
  {
    slug: SLUG.hospitalBeds,
    title: "Hospital beds",
    description: "Inpatient beds per 1,000 people",
    unit: "per 1,000",
    color: "hsl(198 70% 40%)",
  },
];

export const EDUCATION_CHARTS: readonly IndicatorChartSpec[] = [
  {
    slug: SLUG.literacyRate,
    title: "Adult literacy",
    description: "Share of people aged 15+ able to read and write",
    unit: "%",
    color: "hsl(262 60% 52%)",
    source: "World Bank / UNESCO",
  },
  {
    slug: SLUG.secondaryEnrollment,
    title: "Secondary school enrolment",
    description: "Gross enrolment ratio — can exceed 100% with over-age pupils",
    unit: "% gross",
    color: "hsl(211 62% 45%)",
    source: "World Bank / UNESCO",
  },
  {
    slug: SLUG.tertiaryEnrollment,
    title: "Tertiary enrolment",
    description: "Higher-education enrolment as a share of the post-secondary age group",
    unit: "% gross",
    color: "hsl(280 65% 55%)",
    source: "World Bank / UNESCO",
  },
  {
    slug: SLUG.educationExpenditure,
    title: "Education spending",
    description: "Government spending on education as a share of GDP",
    unit: "% of GDP",
    color: "hsl(155 55% 38%)",
    source: "World Bank / UNESCO",
  },
];

export const DEVELOPMENT_CHARTS: readonly IndicatorChartSpec[] = [
  {
    slug: SLUG.internetUsers,
    title: "Internet use",
    description: "Share of the population online in the last three months",
    unit: "%",
    color: "hsl(221 83% 53%)",
    source: "World Bank / ITU",
  },
  {
    slug: SLUG.electricityAccess,
    title: "Access to electricity",
    description: "Share of the population with a grid or off-grid supply",
    unit: "%",
    color: "hsl(45 90% 42%)",
  },
];

/** Every extra series a country page reads, for the batched fetch. */
export const COUNTRY_EXTRA_SLUGS: readonly string[] = [
  ...ECONOMY_CHARTS,
  ...DEMOGRAPHY_CHARTS,
  ...MORTALITY_CHARTS,
  ...HEALTH_CHARTS,
  ...EDUCATION_CHARTS,
  ...DEVELOPMENT_CHARTS,
].map((spec) => spec.slug);
