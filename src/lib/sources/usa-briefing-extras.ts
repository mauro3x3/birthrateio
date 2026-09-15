/**
 * Curated, cited extras for the United States briefing.
 * Numbers must stay tied to the sources below — do not invent others in prose.
 */
export type UsaBriefingExtras = {
  budget: {
    yearLabel: string;
    totalOutlaysT: number;
    socialSecurityT: number;
    medicareB: number;
    outlaysPctGdp: number;
    source: string;
    sourceUrl: string;
  };
  migrationFiscal: {
    note: string;
    source: string;
    sourceUrl: string;
  };
  compositionWhy: string;
};

export const USA_BRIEFING_EXTRAS: UsaBriefingExtras = {
  budget: {
    yearLabel: "FY2024",
    totalOutlaysT: 6.8,
    socialSecurityT: 1.45,
    medicareB: 869,
    outlaysPctGdp: 23.4,
    source:
      "CBO Monthly Budget Review: Summary for Fiscal Year 2024 — total outlays $6.8T (23.4% of GDP); Social Security benefits $1.448T; Medicare ~$869B (timing-adjusted).",
    sourceUrl: "https://www.cbo.gov/publication/60843",
  },
  migrationFiscal:
    {
      note: "The National Academies (2017) found that first-generation immigrants, on average, cost more in state and local services than they pay in taxes over a 75-year horizon, while their U.S.-born children are strongly net fiscal contributors. Federal accounts look different (payroll taxes, income taxes). Age and education of arrivals drive the result more than nativity alone — working-age, higher-educated arrivals pay more; older and lower-educated arrivals draw more. This is an accounting result, not a verdict on whether immigration should rise or fall.",
      source:
        "National Academies of Sciences, Engineering, and Medicine, The Economic and Fiscal Consequences of Immigration (2017)",
      sourceUrl: "https://nap.nationalacademies.org/catalog/23550/the-economic-and-fiscal-consequences-of-immigration",
    },
  compositionWhy: `Race and Hispanic origin are census categories, not destiny — but they shape where people live, how old each group is, and how fast each group grows. Non-Hispanic White Americans are older on average than Hispanic and Black Americans, so their share of births is already lower than their share of residents. That feeds school rolls, local politics, and the future electorate without anyone “planning” it.

Different groups concentrate in different places: Hispanic growth has been large in the Southwest and in metro corridors; Black Americans remain disproportionately in the South and large cities; Asian Americans are concentrated in a handful of metro areas. Local school districts and housing markets feel that first. National averages hide it.

Frustration and cultural conflict show up when relative size changes fast in a place — new majorities in school boards, different languages in clinics, different party lean by group. That is descriptive demography. It does not tell a minister which coalition to build. It does tell a staffer why a national TFR slide is the wrong chart for an election, school-finance, or redistricting meeting.`,
};
