import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const EUROPE = [
  "ALB", "AUT", "BEL", "BGR", "BIH", "BLR", "CHE", "CYP", "CZE", "DEU", "DNK",
  "ESP", "EST", "FIN", "FRA", "GBR", "GRC", "HRV", "HUN", "IRL", "ISL", "ITA",
  "LTU", "LUX", "LVA", "MDA", "MKD", "MLT", "MNE", "NLD", "NOR", "POL", "PRT",
  "ROU", "RUS", "SRB", "SVK", "SVN", "SWE", "UKR", "XKX",
];

const COLORS: Record<string, string> = {
  DEU: "#1a5276",
  FRA: "#2874a6",
  GBR: "#5dade2",
  ITA: "#922b21",
  ESP: "#c0392b",
  POL: "#c0392b",
  ROU: "#f39c12",
  NLD: "#e67e22",
  BEL: "#7d3c98",
  RUS: "#4a2c6a",
  UKR: "#f4d03f",
  SWE: "#1e8449",
  NOR: "#16a085",
  CHE: "#1abc9c",
  AUT: "#b9770e",
  GRC: "#8e44ad",
  PRT: "#27ae60",
  CZE: "#5499c7",
  HUN: "#a93226",
  DNK: "#d35400",
};

const HIST_YEARS = [1960, 1970, 1980, 1990, 2000, 2010, 2020, 2024];
const PROJ_YEARS = [2030, 2040, 2050, 2060, 2070, 2080, 2090, 2100];

async function main() {
  const p = new PrismaClient();
  const ind = await p.indicator.findUnique({
    where: { slug: "population" },
    select: { id: true },
  });
  if (!ind) throw new Error("population indicator missing");

  const countries = await p.country.findMany({
    where: { iso3: { in: EUROPE }, isAggregate: false },
    select: { id: true, iso3: true, name: true, flagEmoji: true },
  });
  const idToCountry = new Map(countries.map((c) => [c.id, c]));

  const rows = await p.indicatorValue.findMany({
    where: {
      indicatorId: ind.id,
      subjectType: "COUNTRY",
      countryId: { in: countries.map((c) => c.id) },
      dimension: null,
      year: { in: HIST_YEARS },
    },
    select: { countryId: true, year: true, value: true },
  });

  const byIso = new Map<
    string,
    { name: string; flag: string; values: Record<string, number> }
  >();
  for (const r of rows) {
    if (r.countryId == null || r.value == null) continue;
    const c = idToCountry.get(r.countryId);
    if (!c) continue;
    let entry = byIso.get(c.iso3);
    if (!entry) {
      entry = { name: c.name, flag: c.flagEmoji ?? "", values: {} };
      byIso.set(c.iso3, entry);
    }
    entry.values[String(r.year)] = Math.round(r.value);
  }

  const wpp = JSON.parse(
    readFileSync(join(process.cwd(), "src/lib/data/wpp-projections.json"), "utf8"),
  ) as {
    years: number[];
    data: Record<string, { medium?: number[] }>;
  };

  for (const iso3 of EUROPE) {
    const medium = wpp.data[iso3]?.medium;
    if (!medium) continue;
    const entry = byIso.get(iso3);
    if (!entry) continue;
    for (const y of PROJ_YEARS) {
      const idx = wpp.years.indexOf(y);
      if (idx < 0 || medium[idx] == null) continue;
      entry.values[String(y)] = Math.round(medium[idx]);
    }
  }

  const years = [...HIST_YEARS, ...PROJ_YEARS].filter((y) =>
    [...byIso.values()].some((e) => e.values[String(y)] != null),
  );

  const series = [...byIso.entries()]
    .map(([iso3, e]) => ({
      id: iso3.toLowerCase(),
      iso3,
      name: e.name,
      flag: e.flag,
      color: COLORS[iso3] ?? "#5d6d7e",
      values: Object.fromEntries(
        years
          .filter((y) => e.values[String(y)] != null)
          .map((y) => [String(y), e.values[String(y)]]),
      ),
    }))
    .filter((s) => Object.keys(s.values).length >= 6)
    .sort((a, b) => {
      const ya = years[years.length - 1];
      return (b.values[String(ya)] ?? 0) - (a.values[String(ya)] ?? 0);
    });

  const pack = {
    id: "europe-population",
    slug: "europe-population",
    title: "Europe by population",
    subtitle: "Total residents, 1960–2100",
    metricLabel: "People",
    metricKind: "count",
    unit: "",
    decimals: 0,
    topN: 15,
    years,
    note: "Historical totals from World Bank WDI (national statistical offices → UN → World Bank). From 2030 onward: UN World Population Prospects 2024 medium variant. Borders are today’s countries for the whole span.",
    source: "World Bank SP.POP.TOTL; UN WPP 2024 medium variant for projection years.",
    sourceUrl: "https://population.un.org/wpp/",
    sidebarTitle: "Sum of ranked countries",
    series,
  };

  const outDir = join(process.cwd(), "src/lib/data/stories");
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, "europe-population.json");
  writeFileSync(out, JSON.stringify(pack, null, 2) + "\n");
  console.log(
    `wrote ${out} (${series.length} countries, years ${years[0]}–${years[years.length - 1]})`,
  );
  const latest = String(years[years.length - 1]);
  series.slice(0, 10).forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name}: ${(s.values[latest] ?? 0).toLocaleString()}`);
  });
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
