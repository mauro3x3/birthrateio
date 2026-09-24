/**
 * Subnational religion plurality packs for country maps
 * (governorate / state majority faith where the pattern is well known).
 */

import catalog from "@/lib/data/subnational-maps.json";

export type ReligionGroup = {
  id: string;
  shortLabel: string;
  color: string;
};

export type ReligionArea = {
  id: string;
  slug: string;
  name: string;
  plurality: string;
  shares?: Record<string, number>;
};

export type ReligionMapPack = {
  iso3: string;
  year: number;
  geoUrl: string;
  note: string;
  source: string;
  sourceUrl: string;
  groups: ReligionGroup[];
  areas: ReligionArea[];
};

const SHIA = { id: "shia", shortLabel: "Shia", color: "#1e8449" };
const SUNNI = { id: "sunni", shortLabel: "Sunni", color: "#27ae60" };
const MIXED = { id: "mixed", shortLabel: "Mixed", color: "#95a5a6" };
const CHRISTIAN = {
  id: "christian",
  shortLabel: "Christian",
  color: "#5dade2",
};
const MUSLIM = { id: "muslim", shortLabel: "Muslim", color: "#27ae60" };
const HINDU = { id: "hindu", shortLabel: "Hindu", color: "#e67e22" };
const OTHER = { id: "other", shortLabel: "Other", color: "#bdc3c7" };

/** Iraq governorates — approximate sectarian majority (post-2003 patterns). */
const IRQ: ReligionMapPack = {
  iso3: "IRQ",
  year: 2020,
  geoUrl: "/geo/maps/irq-tfr.json",
  note: "Governorate majority by sect (illustrative). KRG north is mostly Sunni Kurdish; south and shrine cities Shia; Anbar / west Sunni Arab; Baghdad and Kirkuk mixed.",
  source:
    "CIA World Factbook / commonly cited governorate sectarian majorities (not an official Iraqi census religion table).",
  sourceUrl: "https://www.cia.gov/the-world-factbook/countries/iraq/",
  groups: [SHIA, SUNNI, MIXED, OTHER],
  areas: [
    {
      id: "iraq-anbar",
      slug: "iraq-anbar",
      name: "Anbar",
      plurality: "sunni",
      shares: { sunni: 0.9, shia: 0.05, other: 0.05 },
    },
    {
      id: "iraq-karbala",
      slug: "iraq-karbala",
      name: "Karbala",
      plurality: "shia",
      shares: { shia: 0.95, sunni: 0.03, other: 0.02 },
    },
    {
      id: "iraq-najaf",
      slug: "iraq-najaf",
      name: "Najaf",
      plurality: "shia",
      shares: { shia: 0.95, sunni: 0.03, other: 0.02 },
    },
    {
      id: "iraq-babil",
      slug: "iraq-babil",
      name: "Babil",
      plurality: "shia",
      shares: { shia: 0.85, sunni: 0.1, other: 0.05 },
    },
    {
      id: "iraq-baghdad",
      slug: "iraq-baghdad",
      name: "Baghdad",
      plurality: "mixed",
      shares: { shia: 0.5, sunni: 0.4, other: 0.1 },
    },
    {
      id: "iraq-qadisiyah",
      slug: "iraq-qadisiyah",
      name: "Qadisiyah",
      plurality: "shia",
      shares: { shia: 0.9, sunni: 0.05, other: 0.05 },
    },
    {
      id: "iraq-muthanna",
      slug: "iraq-muthanna",
      name: "Muthanna",
      plurality: "shia",
      shares: { shia: 0.92, sunni: 0.05, other: 0.03 },
    },
    {
      id: "iraq-dhi-qar",
      slug: "iraq-dhi-qar",
      name: "Dhi Qar",
      plurality: "shia",
      shares: { shia: 0.92, sunni: 0.05, other: 0.03 },
    },
    {
      id: "iraq-basra",
      slug: "iraq-basra",
      name: "Basra",
      plurality: "shia",
      shares: { shia: 0.85, sunni: 0.1, other: 0.05 },
    },
    {
      id: "iraq-maysan",
      slug: "iraq-maysan",
      name: "Maysan",
      plurality: "shia",
      shares: { shia: 0.92, sunni: 0.05, other: 0.03 },
    },
    {
      id: "iraq-wasit",
      slug: "iraq-wasit",
      name: "Wasit",
      plurality: "shia",
      shares: { shia: 0.85, sunni: 0.1, other: 0.05 },
    },
    {
      id: "iraq-nineveh",
      slug: "iraq-nineveh",
      name: "Nineveh",
      plurality: "sunni",
      shares: { sunni: 0.7, shia: 0.1, other: 0.2 },
    },
    {
      id: "iraq-dohuk",
      slug: "iraq-dohuk",
      name: "Dohuk",
      plurality: "sunni",
      shares: { sunni: 0.9, other: 0.1 },
    },
    {
      id: "iraq-saladin",
      slug: "iraq-saladin",
      name: "Saladin",
      plurality: "sunni",
      shares: { sunni: 0.85, shia: 0.1, other: 0.05 },
    },
    {
      id: "iraq-diyala",
      slug: "iraq-diyala",
      name: "Diyala",
      plurality: "mixed",
      shares: { sunni: 0.45, shia: 0.45, other: 0.1 },
    },
    {
      id: "iraq-kirkuk",
      slug: "iraq-kirkuk",
      name: "Kirkuk",
      plurality: "mixed",
      shares: { sunni: 0.4, shia: 0.3, other: 0.3 },
    },
    {
      id: "iraq-erbil",
      slug: "iraq-erbil",
      name: "Erbil",
      plurality: "sunni",
      shares: { sunni: 0.9, other: 0.1 },
    },
    {
      id: "iraq-sulaymaniyah",
      slug: "iraq-sulaymaniyah",
      name: "Sulaymaniyah",
      plurality: "sunni",
      shares: { sunni: 0.9, other: 0.1 },
    },
  ],
};

const NGA_MUSLIM = [
  "kano",
  "katsina",
  "sokoto",
  "zamfara",
  "kebbi",
  "jigawa",
  "bauchi",
  "yobe",
  "borno",
  "gombe",
  "kaduna",
  "niger",
];
const NGA_MIXED = [
  "plateau",
  "nasarawa",
  "taraba",
  "adamawa",
  "kwara",
  "kogi",
  "benue",
  "fct",
  "abuja",
];

const IDN_HINDU = ["bali"];
const IDN_CHRISTIAN = [
  "papua",
  "west papua",
  "papua barat",
  "north sulawesi",
  "sulawesi utara",
  "east nusa tenggara",
  "nusa tenggara timur",
  "maluku",
  "north maluku",
  "maluku utara",
];

function regionsFor(iso3: string): { id: string; slug: string; name: string }[] {
  for (const m of catalog.maps) {
    if (m.iso3 === iso3 && m.regions?.length) {
      return m.regions.map((r) => ({ id: r.id, slug: r.slug, name: r.name }));
    }
  }
  return [];
}

function buildNga(): ReligionMapPack {
  const areas: ReligionArea[] = regionsFor("NGA").map((r) => {
    const nl = r.name.toLowerCase();
    if (NGA_MUSLIM.some((k) => nl.includes(k))) {
      return {
        ...r,
        plurality: "muslim",
        shares: { muslim: 0.85, christian: 0.1, other: 0.05 },
      };
    }
    if (NGA_MIXED.some((k) => nl.includes(k))) {
      return {
        ...r,
        plurality: "mixed",
        shares: { muslim: 0.45, christian: 0.45, other: 0.1 },
      };
    }
    return {
      ...r,
      plurality: "christian",
      shares: { christian: 0.8, muslim: 0.15, other: 0.05 },
    };
  });
  return {
    iso3: "NGA",
    year: 2018,
    geoUrl: "/geo/maps/nga-tfr.json",
    note: "State-level Christian / Muslim majority (illustrative belt map). Middle Belt states marked mixed.",
    source: "Pew Research & Nigerian demographic surveys (state religion majority patterns).",
    sourceUrl: "https://www.pewresearch.org/religion/",
    groups: [MUSLIM, CHRISTIAN, MIXED, OTHER],
    areas,
  };
}

function buildIdn(): ReligionMapPack {
  const areas: ReligionArea[] = regionsFor("IDN").map((r) => {
    const nl = r.name.toLowerCase();
    let plurality = "muslim";
    let shares: Record<string, number> = {
      muslim: 0.9,
      christian: 0.05,
      other: 0.05,
    };
    if (IDN_HINDU.some((k) => nl.includes(k))) {
      plurality = "hindu";
      shares = { hindu: 0.83, muslim: 0.13, other: 0.04 };
    } else if (IDN_CHRISTIAN.some((k) => nl.includes(k))) {
      plurality = "christian";
      shares = { christian: 0.7, muslim: 0.25, other: 0.05 };
    }
    return { ...r, plurality, shares };
  });
  return {
    iso3: "IDN",
    year: 2020,
    geoUrl: "/geo/maps/idn-tfr.json",
    note: "Province religion majority. Bali is Hindu; Papua, North Sulawesi, East Nusa Tenggara and similar are Christian-plurality; most others Muslim.",
    source: "BPS Indonesia religion by province (majority coding).",
    sourceUrl: "https://www.bps.go.id/",
    groups: [MUSLIM, CHRISTIAN, HINDU, OTHER],
    areas,
  };
}

const BY_ISO3: Record<string, ReligionMapPack> = {
  IRQ,
  NGA: buildNga(),
  IDN: buildIdn(),
};

export function religionMapFor(iso3: string): ReligionMapPack | null {
  const pack = BY_ISO3[iso3.toUpperCase()];
  if (!pack || pack.areas.length === 0) return null;
  return pack;
}
