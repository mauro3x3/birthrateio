/**
 * Province ethnic share estimates for Iran dig-in panels.
 * Iran does not publish an official ethnicity census by province.
 * Figures below are compiled from Wikipedia / Iranian Cultural Council
 * survey citations and marked as estimates — not SCI census counts.
 */

export type IranGroupBlurb = {
  id: string;
  blurb: string;
};

export type IranProvinceEstimate = {
  code: string;
  /** 2016 SCI census population when known. */
  population?: number;
  shares: Record<string, number>;
  /** Short note shown under the breakdown. */
  note: string;
  source?: string;
};

export const IRAN_GROUP_BLURBS: IranGroupBlurb[] = [
  {
    id: "persian",
    blurb:
      "Speak Persian (Farsi). Mostly Twelver Shia — Iran’s national majority language and faith.",
  },
  {
    id: "azeris",
    blurb:
      "Speak Azerbaijani Turkish. Mostly Twelver Shia, like most of Iran’s northwest.",
  },
  {
    id: "kurds",
    blurb:
      "Speak Kurdish dialects. Mix of Sunni and Shia; many border Kurds are Sunni.",
  },
  {
    id: "lurs",
    blurb:
      "Speak Luri (Indo-European, close to Persian). Mostly Twelver Shia.",
  },
  {
    id: "gilaki_mazani",
    blurb:
      "Speak Gilaki or Mazanderani along the Caspian coast. Mostly Twelver Shia.",
  },
  {
    id: "arabs",
    blurb:
      "Speak Khuzestani Arabic (and Persian). Mostly Twelver Shia in Iran.",
  },
  {
    id: "baluchs",
    blurb:
      "Speak Balochi. Mostly Sunni (Hanafi) — unusual in Shia-majority Iran.",
  },
  {
    id: "turkmens",
    blurb:
      "Speak Turkmen on the Turkmen Sahra plain. Mostly Sunni.",
  },
  {
    id: "other",
    blurb:
      "Smaller communities (Armenians, Assyrians, Jews, Qashqai, and others).",
  },
];

export const IRAN_ESTIMATES_DISCLAIMER =
  "Iran does not publish provincial ethnicity percentages. Shares below are rough estimates from Wikipedia and Iranian Cultural Council survey citations — not an official census.";

/**
 * Soft default when a province only has a plurality colour and no survey %.
 * Dominant ~82%, remainder folded into “other”.
 */
function soft(
  plurality: string,
  population: number,
  note: string,
): Omit<IranProvinceEstimate, "code"> {
  const shares: Record<string, number> = {
    persian: 0,
    azeris: 0,
    kurds: 0,
    lurs: 0,
    gilaki_mazani: 0,
    arabs: 0,
    baluchs: 0,
    turkmens: 0,
    other: 18,
  };
  shares[plurality] = (shares[plurality] ?? 0) + 82;
  if (plurality === "other") shares.other = 100;
  return {
    population,
    shares,
    note,
    source: "Heuristic estimate from map plurality (no published provincial %).",
  };
}

export const IRAN_PROVINCE_ESTIMATES: IranProvinceEstimate[] = [
  {
    code: "iran-sistan-and-baluchestan",
    population: 2_775_014,
    shares: {
      baluchs: 65.4,
      persian: 33.2,
      kurds: 0.4,
      other: 1.0,
    },
    note: "Baloch majority; Sistani Persians are the main minority. Most Baloch are Sunni (Hanafi); Sistanis are mostly Shia.",
    source:
      "Wikipedia / Iranian Cultural Council survey (fa.wiki province page).",
  },
  {
    code: "iran-khuzestan",
    population: 4_710_509,
    shares: {
      arabs: 33.6,
      persian: 31.9,
      lurs: 30.0,
      other: 4.5,
    },
    note: "One of Iran’s most mixed provinces — Arabs, Persians, and Bakhtiari/Lurs in roughly similar shares. Mostly Shia.",
    source: "Wikipedia citing 2010 General Culture Council survey.",
  },
  {
    code: "iran-west-azerbaijan",
    population: 3_265_219,
    shares: {
      azeris: 76.2,
      kurds: 21.7,
      persian: 0.8,
      other: 1.3,
    },
    note: "Azeris and Kurds share the province; some linguists argue Kurdish may be a slight mother-tongue majority. Figures contested.",
    source: "Wikipedia citing a 2012 ethnic composition table (unofficial).",
  },
  {
    code: "iran-golestan",
    population: 1_868_819,
    shares: {
      turkmens: 34.2,
      gilaki_mazani: 30.4,
      persian: 14.9,
      baluchs: 10.9,
      other: 9.6,
    },
    note: "Turkmens on the northern plain (Turkmen Sahra), Mazanderanis and Persians inland. Turkmens are mostly Sunni.",
    source: "Wikipedia citing 2006 Ministry of Education estimate.",
  },
  {
    code: "iran-lorestan",
    population: 1_760_649,
    shares: {
      lurs: 64.5,
      persian: 21.7,
      kurds: 12.4,
      other: 1.4,
    },
    note: "Northern Luri and Bakhtiari Lurs dominate; Laki (often classed with Kurds) is strong in the north.",
    source: "Wikipedia language table for Lorestan (rounded into ethnic buckets).",
  },
  {
    code: "iran-east-azerbaijan",
    population: 3_909_652,
    ...soft(
      "azeris",
      3_909_652,
      "Core Azerbaijani-speaking province; almost entirely Twelver Shia.",
    ),
  },
  {
    code: "iran-ardabil",
    population: 1_270_420,
    ...soft(
      "azeris",
      1_270_420,
      "Azerbaijani-speaking and overwhelmingly Twelver Shia.",
    ),
  },
  {
    code: "iran-zanjan",
    population: 1_057_461,
    ...soft(
      "azeris",
      1_057_461,
      "Azerbaijani-speaking northwest plateau; mostly Twelver Shia.",
    ),
  },
  {
    code: "iran-gilan",
    population: 2_530_696,
    shares: {
      gilaki_mazani: 85,
      persian: 10,
      other: 5,
    },
    note: "Gilaks along the Caspian; Persian is the urban lingua franca. Mostly Twelver Shia.",
    source: "Estimate from ethnographic descriptions (no official %).",
  },
  {
    code: "iran-mazandaran",
    population: 3_283_582,
    shares: {
      gilaki_mazani: 85,
      persian: 10,
      other: 5,
    },
    note: "Mazanderani (Tabari) homeland on the Caspian. Mostly Twelver Shia.",
    source: "Estimate from ethnographic descriptions (no official %).",
  },
  {
    code: "iran-kurdistan",
    population: 1_603_011,
    shares: { kurds: 90, persian: 7, other: 3 },
    note: "Kurdish-majority; mix of Sunni and Shia communities.",
    source: "Estimate from ethnographic descriptions (no official %).",
  },
  {
    code: "iran-kermanshah",
    population: 1_952_434,
    shares: { kurds: 85, persian: 8, lurs: 4, other: 3 },
    note: "Kurdish-majority with Laki and Persian minorities. Mixed Sunni/Shia.",
    source: "Estimate from ethnographic descriptions (no official %).",
  },
  {
    code: "iran-ilam",
    population: 580_158,
    shares: { kurds: 80, lurs: 12, persian: 5, other: 3 },
    note: "Kurdish (incl. Poshte-Kuhi Laks) with Lur minorities. Mostly Shia.",
    source: "Estimate from ethnographic descriptions (no official %).",
  },
  {
    code: "iran-north-khorasan",
    population: 863_092,
    shares: { kurds: 55, persian: 30, turkmens: 10, other: 5 },
    note: "Kurdish plurality with Persians and Turkmens — one of Iran’s mixed northeast provinces.",
    source: "Estimate from ethnographic descriptions (no official %).",
  },
  {
    code: "iran-chaharmahal-and-bakhtiari",
    population: 947_763,
    shares: { lurs: 88, persian: 8, other: 4 },
    note: "Bakhtiari Lur heartland; mostly Twelver Shia.",
    source: "Estimate from ethnographic descriptions (no official %).",
  },
  {
    code: "iran-kohgiluyeh-and-boyer-ahmad",
    population: 713_052,
    shares: { lurs: 90, persian: 6, other: 4 },
    note: "Southern Lur province; mostly Twelver Shia.",
    source: "Estimate from ethnographic descriptions (no official %).",
  },
  // Persian-plurality provinces — soft majorities
  {
    code: "iran-tehran",
    population: 13_267_637,
    shares: { persian: 70, azeris: 18, other: 12 },
    note: "Capital province is Persian-speaking but highly mixed (large Azeri and other migrant communities).",
    source: "Rough urban estimate — Tehran has no official ethnic census.",
  },
  {
    code: "iran-alborz",
    population: 2_712_400,
    shares: { persian: 72, azeris: 15, other: 13 },
    note: "Karaj metro is Persian-majority with large migrant minorities.",
    source: "Rough urban estimate (no official %).",
  },
  {
    code: "iran-isfahan",
    population: 5_120_850,
    ...soft("persian", 5_120_850, "Persian heartland; mostly Twelver Shia."),
  },
  {
    code: "iran-fars",
    population: 4_851_274,
    shares: { persian: 78, lurs: 8, other: 14 },
    note: "Persian heartland with Qashqai Turkic and Lur minorities in the south/west.",
    source: "Estimate from ethnographic descriptions (no official %).",
  },
  {
    code: "iran-razavi-khorasan",
    population: 6_434_501,
    shares: { persian: 80, kurds: 10, other: 10 },
    note: "Persian-majority around Mashhad, with notable Kurdish communities.",
    source: "Estimate from ethnographic descriptions (no official %).",
  },
  {
    code: "iran-south-khorasan",
    population: 768_898,
    ...soft("persian", 768_898, "Sparse Persian-majority east; mostly Twelver Shia."),
  },
  {
    code: "iran-kerman",
    population: 3_164_718,
    ...soft("persian", 3_164_718, "Persian-majority southeast plateau."),
  },
  {
    code: "iran-yazd",
    population: 1_138_533,
    ...soft("persian", 1_138_533, "Persian-majority; historic Zoroastrian minority."),
  },
  {
    code: "iran-hormozgan",
    population: 1_776_415,
    shares: { persian: 70, baluchs: 15, arabs: 8, other: 7 },
    note: "Persian Bandari coast with Baloch and Arab minorities.",
    source: "Estimate from ethnographic descriptions (no official %).",
  },
  {
    code: "iran-bushehr",
    population: 1_163_400,
    ...soft("persian", 1_163_400, "Persian Gulf coast; mostly Twelver Shia."),
  },
  {
    code: "iran-qom",
    population: 1_292_283,
    ...soft("persian", 1_292_283, "Shia clerical centre; Persian-majority with migrant Arabs."),
  },
  {
    code: "iran-qazvin",
    population: 1_273_761,
    shares: { persian: 70, azeris: 22, other: 8 },
    note: "Persian with a substantial Azerbaijani-speaking minority.",
    source: "Estimate from ethnographic descriptions (no official %).",
  },
  {
    code: "iran-markazi",
    population: 1_429_475,
    ...soft("persian", 1_429_475, "Central Persian plateau; mostly Twelver Shia."),
  },
  {
    code: "iran-hamadan",
    population: 1_738_234,
    shares: { persian: 70, azeris: 12, lurs: 10, kurds: 5, other: 3 },
    note: "Mixed west-central province on the edge of Lur and Azeri zones.",
    source: "Estimate from ethnographic descriptions (no official %).",
  },
  {
    code: "iran-semnan",
    population: 702_360,
    ...soft("persian", 702_360, "Sparse Persian desert province."),
  },
];

export function iranGroupBlurb(groupId: string | undefined): string | null {
  if (!groupId) return null;
  return IRAN_GROUP_BLURBS.find((g) => g.id === groupId)?.blurb ?? null;
}

export function iranProvinceEstimate(
  code: string,
): IranProvinceEstimate | undefined {
  return IRAN_PROVINCE_ESTIMATES.find((p) => p.code === code);
}
