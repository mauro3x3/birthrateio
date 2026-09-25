/**
 * Country-specific stakes for political briefings.
 * `stakes` are reader-facing. `notes` are instructions for the model only.
 * Numbers that belong on a chart live in official packs (CBS, NFHS, FERT1).
 */
export type BriefingAngle = {
  iso3: string;
  headline: string;
  stakes: string[];
  /** Optional long-form politics section. Compiled briefing uses this when set. */
  politicsBody?: string;
  notes: string[];
  cite: string[];
};

const GENERIC: BriefingAngle = {
  iso3: "",
  headline:
    "National fertility, age structure, and migration set the size of the next workforce and the next electorate.",
  stakes: [
    "Period TFR versus replacement (~2.1) is the first number — then who is having the children, if an official split exists.",
    "Neighbors on the same World Bank series are the “ah, they have X children” chart.",
    "2040 workers are mostly already born; TFR shows up around 2060. Who works, retirement age, and migration move 2040.",
    "Family policy elsewhere (France, Hungary, Korea) has not returned a high-income country to replacement in recent decades.",
  ],
  notes: [
    "State the latest period TFR, whether it is below replacement, and how long it has been there.",
    "Separate timing (delayed births) from a smaller completed family size; one year is not a regime change.",
    "If group TFR exists on this site, use that table. If it does not, say so — do not invent a split.",
    "Close with the fiscal and political constraint, not a recommended policy.",
  ],
  cite: [
    "World Bank / UN WPP series on the country page",
    "National statistical office vital statistics where BirthGauge nowcasts them",
  ],
};

const BY_ISO3: Record<string, BriefingAngle> = {
  ISR: {
    iso3: "ISR",
    headline:
      "Israel still has developed-world-high fertility, but the politics sit in the gaps between Jewish, Arab, Haredi, and settlement schedules — not in the national average.",
    stakes: [
      "National period TFR is still near 2.8–2.9, an OECD outlier. The average is not the story.",
      "CBS 2023: Jewish women 3.00, Muslim 2.81, Druze 1.75, Arab women 2.66. Jewish and Muslim period rates have converged since the 1960s, when Muslim TFR was above 9.",
      "Compare with neighbors on the same World Bank series: West Bank & Gaza, Jordan, Egypt, Syria, Lebanon. That is the “ah, they have X children” chart.",
      "Haredi fertility is a religiosity split inside the Jewish population. CBS reports Ultra-Orthodox (Haredi) TFR at 6.8 in 2022–24 versus 1.9 for not-religious/secular Jewish women (all Jewish women 3.1). The Israel Democracy Institute’s earlier estimate was 6.4 in 2020–2022 versus 2.5 for other Jewish women; IDI puts the Haredi population at about 1.39 million in 2024 (13.9%), with CBS-based projections toward 16% in 2030.",
      "Jewish fertility in Judea and Samaria is the highest district schedule on the CBS map — Taub Center reading of CBS locality data puts it at 5.26 in 2020, versus about 3.9 in Jerusalem and the low-2s in Tel Aviv and Haifa.",
      "Haredi men are about half employed (IDI: 54% in 2024) versus ~87% of other Jewish men. That is the budget story: fewer income-tax payers, more child-allowance and school-place spending, a smaller draft pool.",
    ],
    politicsBody: `The average is not the story. National period TFR near 2.8–2.9 is an OECD outlier, but the politics sit in who is having the children.

CBS 2023 religion table: Jewish women 3.00, Muslim 2.81, Druze 1.75, Arab women 2.66. Jewish and Muslim period rates have converged since the 1960s, when Muslim TFR was above 9. The remaining gap that moves coalitions is religiosity inside the Jewish population. CBS religiosity (2022–24): Ultra-Orthodox (Haredi) 6.8, Religious (Dati) 3.7, traditional-religious 2.7, traditional-not-religious 2.1, not-religious/secular 1.9 — all Jewish women 3.1. Muslim women: religious or very religious 2.7, not so religious / not religious 2.1 (all Muslims 2.5); excluding the Southern District / Negev Bedouin, non-religious Muslim women are about 1.76. The Israel Democracy Institute’s earlier Haredi estimate was 6.4 in 2020–2022 versus 2.5 for other Jewish women. IDI puts the Haredi population at about 1.39 million in 2024 (13.9% of Israel), of whom 57% are under 20 — versus 31% in the rest of the Jewish population. CBS-based IDI projections: 16% of Israel by 2030, and about a million Haredim aged 20 and under (a quarter of that age group).

Judea and Samaria is a separate geography, not a religion row. Taub Center, from CBS locality data, puts the district TFR at 5.26 in 2020 — the highest in the country. Jerusalem was about 3.9; Haifa, Tel Aviv, and the Centre were in the low-to-mid 2s. CBS reported 4.89 there in 2018. Those localities are younger and more religious (national-religious and Haredi towns such as Modi'in Illit and Beitar Illit). A staffer who only quotes the national 2.87 will miss that the next school cohort, and later the next electorate, is growing faster in those places than in Tel Aviv. This is Israeli-locality fertility, not the Palestinian West Bank series on the neighbor chart.

Employment is where fertility becomes a budget line. IDI (first nine months of 2024): 54% of Haredi men ages 25–66 were employed, down from 55.5% in 2023, after a decade stuck in the low-50s. Other Jewish men are around 87%. Haredi women are a different picture: about 80% employed, close to other Jewish women (83%). So the typical Haredi household is not “nobody works” — it is often one earner, usually the woman, on shorter hours. IDI 2022: Haredi men worked 36.5 hours a week versus 45 for other Jewish men, and earned NIS 9,929 a month versus NIS 20,464 (49%). Haredi households took home NIS 14,816 gross versus NIS 24,466.

That gap shows up twice in the Treasury. On the tax side, IDI: non-Haredi Jewish households paid about three times more in mandatory contributions (income tax, health, and National Insurance) — NIS 4,496 a month versus NIS 1,469. On the spending side, child allowances scale with the number of children; a TFR of 6.8 versus 1.9 means more Bituach Leumi cheques per household even before any targeted stipend. School places scale the same way: IDI 2023–24, about 401,000 pupils in Haredi education — one in five students in Israel, 26% of the Jewish school system, 28% of elementary. Only 16% of Haredi students were eligible for a bagrut (matriculation) in 2021–22, versus 85% in state and state-religious schools. That is both a current education bill and a later tax-receipt problem if those cohorts earn less.

Yeshiva and kollel study is the male alternative to work and to the draft. IDI: about 169,400 yeshiva and kollel students at the start of 2024, up 8.5% in one year — faster than Haredi population growth. Over 2013–2023 the yeshiva/kollel headcount rose 83% while Haredi IDF enlistment fell 36% (1,972 to 1,266). Poverty stays high after transfers: 34% of Haredi families below the line in 2022 versus 14% of other Jewish families; 47% of Haredi children versus 28% nationally. Housing pressure is local: large young families in Bnei Brak, Beit Shemesh, and the Haredi settlement cities.

Put a round number on the long run, still as a model not a verdict. The Finance Ministry’s chief economist has estimated that closing Haredi employment and wage gaps would add about 0.6 percentage points to annual growth in the long run. IDI has put the cumulative GDP loss, if today’s education and employment gaps persist, on the order of 10% of GDP by 2050 — about NIS 160 billion in 2023 terms. None of that tells a minister which lever to pull. It does tell a new staffer why the national TFR is the wrong slide for a coalition, education, or defence-budget meeting.`,
    notes: [
      "Cite CBS religiosity TFR (Haredi 6.8 in 2022–24) as the official religiosity split; IDI 6.4 (2020–2022) is the earlier research estimate used for employment/fiscal context.",
      "Judea and Samaria TFR: Taub Center from CBS locality data, 5.26 in 2020; CBS 4.89 in 2018. Do not invent a later settler TFR.",
      "Expand politics with IDI 2024 employment (Haredi men 54% vs ~87% other Jewish men; women ~80%), tax (NIS 4,496 vs 1,469 mandatory contributions), 401k Haredi pupils (1 in 5), bagrut 16% vs 85%, yeshiva 169k vs 1,266 enlistments, poverty 34%/47%. MoF chief economist +0.6pp long-run growth; IDI ~10% GDP by 2050 / NIS 160bn. Descriptive only.",
      "Do not write a security, annexation, or draft recommendation. Do write that relative cohort size is already a political and budget input.",
    ],
    cite: [
      "CBS Statistical Abstract 2024, population and fertility diagrams (2022–2023 religion TFR)",
      "CBS, Fertility of Jewish and Other Women in Israel by Level of Religiosity",
      "Israel Democracy Institute, Statistical Report on Ultra-Orthodox Society in Israel 2024",
      "Taub Center, Demographic Trends in Israel (CBS district TFR through 2020)",
      "Ministry of Finance Chief Economist long-run growth estimates (Haredi employment/wage gaps)",
    ],
  },
  IND: {
    iso3: "IND",
    headline:
      "India is already below replacement in NFHS-5, but religion and state maps still decide which India is aging.",
    stakes: [
      "NFHS-5 (2019–21) national TFR is 1.99. Muslim 2.36, Hindu 1.94 — a gap that has narrowed sharply since NFHS-1.",
      "State maps (SRS / NFHS) matter more than the religion row for school places and internal migration.",
      "A large working-age cohort is a dividend only if jobs and skills absorb it. That is an economic constraint, not a communal slogan.",
    ],
    notes: [
      "Use NFHS-5 Table 4.2 for religion TFR. Do not invent a later religion split.",
      "Point to the India TFR map for states. No policy prescription on communal politics.",
    ],
    cite: ["IIPS / MoHFW NFHS-5 Table 4.2", "birthrate.io India TFR map"],
  },
  USA: {
    iso3: "USA",
    headline:
      "U.S. fertility is below replacement; the population is shifting by race and Hispanic origin, and Social Security math is an age-structure story.",
    stakes: [
      "Census: non-Hispanic White share fell from about 80% in 1980 to 58% in 2020; projections put it near 44% by 2060, with Hispanic rising toward 28%.",
      "Births lead the stock: by 2022 nearly half of births were to non-Hispanic White mothers — lower than their share of residents. Groups also differ by age and by metro/region.",
      "NCHS 2023 TFR by race and Hispanic origin of the mother is the official fertility split — Hispanic ~1.95, non-Hispanic White ~1.53, non-Hispanic Black ~1.58.",
      "Immigration is the main reason population still grows while national TFR is below 2.1. UN DESA stock and World Bank net migration are the series to cite.",
      "FY2024 federal outlays ~$6.8T (CBO); Social Security ~$1.45T and Medicare ~$0.87T already dominate the age-linked budget.",
      "State maps (CDC / BirthGauge) and /demographics/us show the geography of births and ACS race shares.",
    ],
    notes: [
      "Use Census Bureau race/Hispanic shares for 1980–2020 and label 2030–2060 as projections.",
      "Use NCHS race/Hispanic-origin TFR for fertility splits. Do not invent a religion TFR.",
      "For migration fiscal effects, cite National Academies 2017 — first generation vs U.S.-born children — not a blog estimate.",
      "For the budget section, use the curated CBO FY2024 Social Security / Medicare / total outlays figures.",
    ],
    cite: [
      "U.S. Census Bureau (race/Hispanic origin; projections)",
      "CDC/NCHS natality and TFR by race and Hispanic origin",
      "UN DESA International Migrant Stock",
      "CBO Monthly Budget Review FY2024",
      "National Academies, The Economic and Fiscal Consequences of Immigration (2017)",
      "Census ACS race and Hispanic origin",
    ],
  },
  DNK: {
    iso3: "DNK",
    headline:
      "Denmark publishes ancestry TFR. That is the series to use in any briefing about welfare, schools, or crime — not a web estimate.",
    stakes: [
      "Statistics Denmark FERT1 splits Danish origin, western/non-western immigrants, and descendants.",
      "Crime-by-ancestry tables exist on this site; they belong in their own section with the NSO definition.",
      "National TFR near 1.5 is the budget story; ancestry TFR is the composition story.",
    ],
    notes: [
      "Use FERT1 only. Do not invent a Muslim TFR.",
      "If crime is mentioned, keep the NSO definition and do not mix it with TFR in one sentence as causation.",
    ],
    cite: ["Statistics Denmark FERT1"],
  },
  NOR: {
    iso3: "NOR",
    headline:
      "Norway’s immigrant-category TFR (table 12482) is the official composition series.",
    stakes: [
      "Statistics Norway table 12482 is the immigrant-category fertility series — not a homemade western/non-western split.",
      "Petroleum revenue delays the pension constraint; it does not repeal age structure.",
    ],
    notes: ["Use SSB 12482 only. No invented religion TFR."],
    cite: ["Statistics Norway table 12482"],
  },
  JPN: {
    iso3: "JPN",
    headline:
      "Japan is the textbook ultra-low, ultra-aged case: the 2040 workforce is mostly already born.",
    stakes: [
      "TFR has been far below replacement for decades; the pyramid is the exhibit.",
      "Immigration is small relative to the gap. That is arithmetic, not a verdict on whether inflows should rise.",
      "Prefecture maps show Tokyo versus the rest.",
    ],
    notes: [
      "Do not invent an ethnicity TFR for Japan.",
      "The 2040 labour force is mostly people already born — say that plainly.",
    ],
    cite: ["IPSS / MHLW vital statistics", "birthrate.io Japan map"],
  },
  ITA: {
    iso3: "ITA",
    headline:
      "Italy combines very low fertility with a heavy old-age structure and large regional gaps.",
    stakes: [
      "Mezzogiorno versus North is a migration-and-fertility story at once.",
      "Pension spending is the fiscal exhibit; births are the lagging input.",
    ],
    notes: ["Use Istat / Eurostat NUTS 2. No invented religion TFR."],
    cite: ["Istat", "Eurostat NUTS 2 fertility"],
  },
  DEU: {
    iso3: "DEU",
    headline:
      "Germany’s population stability is a migration story sitting on below-replacement fertility.",
    stakes: [
      "Net migration, not TFR, has been the swing factor for headcount.",
      "Births by mother’s citizenship exist; a Denmark-style ancestry TFR does not.",
    ],
    notes: [
      "Do not invent an ancestry TFR. Destatis citizenship-of-mother births are allowed if you have them in the facts.",
    ],
    cite: ["Destatis", "birthrate.io Germany census map (country of birth)"],
  },
  NGA: {
    iso3: "NGA",
    headline:
      "Nigeria is still high fertility by world standards, with a young pyramid that dominates West African birth shares.",
    stakes: [
      "NDHS 2023–24 state TFR is the map to use, not a single national slogan.",
      "A youth bulge is a jobs and services constraint before it is anything else.",
    ],
    notes: ["Use NDHS 2023–24 for states. Do not invent a religion TFR."],
    cite: ["NDHS 2023–24", "birthrate.io Nigeria map"],
  },
  CHN: {
    iso3: "CHN",
    headline:
      "China’s fertility collapse is recent, large, and already visible in births. The one-child cohorts are now the parents.",
    stakes: [
      "National TFR is well below 1.5 in compiled recent years; provincial maps are estimates, not an NBS TFR table.",
      "Aging speed, not just level, is the briefing point.",
    ],
    notes: [
      "Label provincial TFR as estimates if used. Do not invent ethnicity TFR.",
    ],
    cite: ["NBS births", "BirthGauge China compilation"],
  },
  FRA: {
    iso3: "FRA",
    headline:
      "France’s relatively high European TFR still sits below replacement; family policy is the political story, not a return to 2.1.",
    stakes: [
      "INSEE period TFR has been among the highest in Western Europe for decades, yet remains under replacement.",
      "Immigrant vs native-born fertility gaps exist in research literature; cite INSEE/Eurostat carefully and do not invent a religion TFR.",
      "Pension age and dependency are the fiscal exhibit; births are the lagging input.",
    ],
    notes: [
      "Prefer INSEE and Eurostat. No homemade Muslim TFR.",
      "Family-policy history (allocations, crèches) belongs as context, not as proof that TFR can be dialled back to 2.1.",
    ],
    cite: ["INSEE", "Eurostat", "birthrate.io France country page"],
  },
  GBR: {
    iso3: "GBR",
    headline:
      "UK fertility is below replacement; ONS ethnicity and country-of-birth birth statistics are the composition series — not a single national slogan.",
    stakes: [
      "ONS period TFR for England & Wales is the headline; Scotland and NI have their own releases.",
      "Births by mother’s country of birth and ethnicity (where published) beat invented group TFRs.",
      "Net migration has been the swing factor for population growth while TFR stays below 2.1.",
    ],
    notes: [
      "Use ONS; do not invent a religion TFR for the UK.",
      "Point to /demographics/uk for census maps.",
    ],
    cite: ["ONS", "birthrate.io UK demographics"],
  },
  KOR: {
    iso3: "KOR",
    headline:
      "South Korea is the ultra-low TFR case among large economies: family policy spend has not restored replacement.",
    stakes: [
      "Period TFR near or below 1.0 in recent years is the exhibit — among the lowest recorded for a large high-income country.",
      "Housing, work culture, and marriage timing dominate the public debate; say what the data show, not which lever to pull.",
      "The 2040 workforce is mostly already born.",
    ],
    notes: [
      "Use Statistics Korea / World Bank series. No invented ethnicity TFR.",
    ],
    cite: ["Statistics Korea", "birthrate.io Korea country page"],
  },
  BRA: {
    iso3: "BRA",
    headline:
      "Brazil has completed a fast fertility transition; regional and education gaps still shape the age structure.",
    stakes: [
      "National TFR is below replacement; Northern and lower-education schedules remain higher than the South and Southeast.",
      "The demographic dividend window narrows as the pyramid ages — jobs and productivity are the constraint.",
    ],
    notes: ["Prefer IBGE / World Bank. No invented religion TFR."],
    cite: ["IBGE", "World Bank"],
  },
  MEX: {
    iso3: "MEX",
    headline:
      "Mexico’s fertility fall is advanced; migration to the United States still frames population and labour debates on both sides of the border.",
    stakes: [
      "Period TFR is near or below replacement in recent World Bank / UN compilations.",
      "State variation and education gradients matter more than the national average for school planning.",
      "Net migration and remittances are separate series from TFR — keep them in their own section.",
    ],
    notes: ["INEGI / World Bank. No invented ethnicity TFR."],
    cite: ["INEGI", "World Bank", "UN DESA migrant stock"],
  },
  CAN: {
    iso3: "CAN",
    headline:
      "Canada’s below-replacement fertility sits under a high-immigration population model; Statistics Canada origin splits are the composition series.",
    stakes: [
      "National TFR is well below 2.1; population growth is dominated by permanent and temporary immigration.",
      "StatCan publishes immigrant / non-immigrant fertility where available — use that, not a homemade religion table.",
      "Provincial age structures diverge (Atlantic aging vs. high-inflow metros).",
    ],
    notes: ["Statistics Canada only for group splits."],
    cite: ["Statistics Canada", "birthrate.io Canada page"],
  },
  AUS: {
    iso3: "AUS",
    headline:
      "Australia combines below-replacement fertility with migration-led growth; ABS is the source for births and overseas-born shares.",
    stakes: [
      "Period TFR below replacement; net overseas migration drives headcount.",
      "State maps (NSW/Vic vs. smaller states) show where births and overseas-born residents concentrate.",
    ],
    notes: ["ABS only. No invented religion TFR."],
    cite: ["ABS", "birthrate.io Australia page"],
  },
  ESP: {
    iso3: "ESP",
    headline:
      "Spain pairs very low fertility with rapid aging and large regional gaps between empty interior provinces and coastal metros.",
    stakes: [
      "INE period TFR is among the lowest in Europe.",
      "Foreign-born shares and births to foreign mothers are the composition series where published.",
      "Pension and health spending track the 65+ share more tightly than any one year’s TFR.",
    ],
    notes: ["INE / Eurostat. No invented religion TFR."],
    cite: ["INE", "Eurostat"],
  },
  POL: {
    iso3: "POL",
    headline:
      "Poland’s low fertility and emigration of working-age adults tighten the workers-per-retiree path faster than TFR alone implies.",
    stakes: [
      "Period TFR well below replacement; EU free movement shaped net migration for two decades.",
      "Family-policy packages (e.g. child benefits) are politically salient — cite GUS outcomes, not campaign claims.",
    ],
    notes: ["GUS / Eurostat. Descriptive only on policy."],
    cite: ["GUS", "Eurostat"],
  },
  SWE: {
    iso3: "SWE",
    headline:
      "Sweden’s fertility is below replacement; Statistics Sweden origin and foreign-born series are the composition tables to cite.",
    stakes: [
      "Period TFR has drifted down from the Nordic ‘high’ of the 1980s–90s.",
      "Foreign-born vs Swedish-born fertility gaps exist in SCB tables — use those definitions exactly.",
      "Welfare-state financing is an age-structure story as much as a birth story.",
    ],
    notes: ["SCB only. Do not invent a Muslim TFR."],
    cite: ["Statistics Sweden (SCB)", "Eurostat"],
  },
};

export function getBriefingAngle(iso3: string): BriefingAngle {
  return BY_ISO3[iso3.toUpperCase()] ?? { ...GENERIC, iso3: iso3.toUpperCase() };
}
