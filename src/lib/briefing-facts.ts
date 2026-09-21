import "server-only";
import { SLUG } from "@/lib/indicators";
import { getBriefingAngle } from "@/lib/briefing-angles";
import { getLaborOutlook, type LaborOutlook } from "@/lib/briefing-labor";
import {
  getContinentIso3s,
  getCountryBySlug,
  getCountryFertilityNowcast,
  getCountrySeriesBatch,
  getCountryStats,
  getEmigrationDestinations,
  getImmigrationOrigins,
  getLatestFertilityForIso3s,
  getPopulationPyramid,
  type MigrationBreakdown,
} from "@/lib/queries";
import { briefingPeerIso3s, pickPeerIso3s } from "@/lib/briefing-neighbors";
import {
  BRIEFING_CHARTS,
  BRIEFING_MODULES,
  type BriefingChartId,
  type BriefingModuleId,
  type BriefingPlaceAfter,
} from "@/lib/briefing-modules";
import { getCountryMapEntry } from "@/lib/country-map-atlas";
import { getTfrAncestryPack } from "@/lib/sources/tfr-by-ancestry-data";
import {
  COMPOSITIONS,
  COMPOSITIONS_BIRTHS,
} from "@/lib/sources/ethnicity-data";
import { RELIGIONS } from "@/lib/sources/religion-data";
import {
  getTfrDhsBackground,
  TFR_DHS_BACKGROUND_META,
  TFR_US_HISPANIC_ORIGIN,
} from "@/lib/sources/tfr-by-group-data";
import { getBriefingExtras, type BriefingExtras } from "@/lib/sources/briefing-extras";
import {
  getOecdImmigrantFiscal,
  getPolaniBreakeven,
} from "@/lib/sources/europe-immigrant-fiscal-data";
import type { PyramidRow } from "@/components/charts/population-pyramid";

export type BriefingNeighbor = {
  iso3: string;
  name: string;
  slug: string;
  flagEmoji: string | null;
  tfr: number;
  year: number;
  isSubject?: boolean;
};

export type BriefingCallout = {
  label: string;
  value: string;
  hint: string;
};

export type BriefingComposition = {
  headline: string;
  source: string;
  groups: string[];
  points: { year: number; groups: Record<string, number> }[];
  /** First year treated as a projection (e.g. 2030 for US Census). */
  projectionFromYear?: number;
  unit: string;
};

export type BriefingFacts = {
  name: string;
  slug: string;
  iso3: string;
  flagEmoji: string | null;
  stats: Record<string, { value: number; year: number } | null>;
  nowcast: { year: number; tfr: number; source: string } | null;
  series: Record<string, { year: number; value: number }[]>;
  groupTfr: {
    headline: string;
    source: string;
    sourceUrl: string;
    groups: string[];
    latest: Record<string, number>;
    latestYear: number;
    points: { year: number; groups: Record<string, number> }[];
    colors?: Record<string, string>;
    dashed?: string[];
    decimals?: number;
    unit?: string;
    defaultFrom?: number;
  } | null;
  composition: BriefingComposition | null;
  birthsComposition: BriefingComposition | null;
  religion: BriefingComposition | null;
  pyramid: { year: number; rows: PyramidRow[] } | null;
  immigrationOrigins: MigrationBreakdown | null;
  emigrationDestinations: MigrationBreakdown | null;
  migrantStock: { value: number; year: number } | null;
  migrantStockShare: { value: number; year: number } | null;
  extras: BriefingExtras;
  /** @deprecated use extras */
  usaExtras: BriefingExtras | null;
  neighbors: BriefingNeighbor[];
  labor: LaborOutlook | null;
  callouts: BriefingCallout[];
  mapHref: string | null;
  angle: ReturnType<typeof getBriefingAngle>;
  modules: typeof BRIEFING_MODULES;
  charts: Array<(typeof BRIEFING_CHARTS)[number] & { available: boolean }>;
};

function thin(
  series: { year: number; value: number }[],
  max = 16,
): { year: number; value: number }[] {
  if (series.length <= max) return series;
  const out: { year: number; value: number }[] = [];
  const last = series.length - 1;
  for (let i = 0; i < max - 1; i++) {
    const idx = Math.round((i / (max - 2)) * (last - 1));
    const pt = series[idx];
    if (!out.length || out[out.length - 1].year !== pt.year) out.push(pt);
  }
  const end = series[last];
  if (out[out.length - 1]?.year !== end.year) out.push(end);
  return out;
}

function tidyCountryName(name: string) {
  return name
    .replace(/, Arab Rep\.$/, "")
    .replace(/, Islamic Rep\.$/, "")
    .replace(/^Syrian Arab Republic$/, "Syria")
    .replace(/^West Bank and Gaza$/, "West Bank & Gaza")
    .replace(/^Russian Federation$/, "Russia")
    .replace(/^Korea, Rep\.$/, "South Korea")
    .replace(/^Egypt, Arab Rep\.$/, "Egypt");
}

function fmtTfr(n: number) {
  return n.toFixed(2);
}

function fmtPeople(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}k`;
  return String(Math.round(n));
}

function compositionFromSeed(
  iso3: string,
  kind: "population" | "births",
): BriefingComposition | null {
  const seed = (kind === "population" ? COMPOSITIONS : COMPOSITIONS_BIRTHS).find(
    (c) => c.iso3 === iso3.toUpperCase(),
  );
  if (!seed || seed.years.length < 2) return null;
  const projectionFromYear =
    kind === "population" && iso3.toUpperCase() === "USA" ? 2030 : undefined;
  return {
    headline:
      kind === "population"
        ? "Population share by race / ethnicity"
        : "Share of births by mother's race / ethnicity",
    source: seed.note ?? "National statistical office",
    groups: seed.order,
    points: seed.years.map((y) => ({ year: y.year, groups: y.groups })),
    projectionFromYear,
    unit: "% of " + (kind === "population" ? "population" : "births"),
  };
}

function religionFromSeed(iso3: string): BriefingComposition | null {
  const seed = RELIGIONS.find((c) => c.iso3 === iso3.toUpperCase());
  if (!seed || seed.years.length < 1) return null;
  return {
    headline: "Population share by religion",
    source: seed.note ?? "Pew Research Center / national census (curated)",
    groups: seed.order,
    points: seed.years.map((y) => ({ year: y.year, groups: y.groups })),
    unit: "% of population",
  };
}

function usRaceTfrPack(): BriefingFacts["groupTfr"] {
  const pack = TFR_US_HISPANIC_ORIGIN;
  const groups = pack.groups
    .filter((g) => g.group !== "All women")
    .map((g) => g.group);
  const latest = Object.fromEntries(
    pack.groups
      .filter((g) => g.group !== "All women")
      .map((g) => [g.group, g.value]),
  );
  return {
    headline: "Total fertility rate by race and Hispanic origin",
    source: pack.source,
    sourceUrl: pack.sourceUrl,
    groups,
    latest,
    latestYear: pack.year,
    points: [{ year: pack.year, groups: latest }],
    decimals: pack.decimals,
    unit: pack.unit,
  };
}

function dhsEducationTfrPack(iso3: string): BriefingFacts["groupTfr"] | null {
  const dhs = getTfrDhsBackground(iso3);
  if (!dhs || dhs.education.length < 2) return null;
  const groups = dhs.education.map((g) => g.group);
  const latest = Object.fromEntries(dhs.education.map((g) => [g.group, g.value]));
  return {
    headline: "Total fertility rate by education (DHS)",
    source: `${TFR_DHS_BACKGROUND_META.source}; ${dhs.survey}`,
    sourceUrl: TFR_DHS_BACKGROUND_META.sourceUrl,
    groups,
    latest,
    latestYear: dhs.year,
    points: [{ year: dhs.year, groups: latest }],
    decimals: 2,
    unit: TFR_DHS_BACKGROUND_META.unit,
  };
}

export async function getBriefingFacts(
  slug: string,
): Promise<BriefingFacts | null> {
  const country = await getCountryBySlug(slug);
  if (!country) return null;

  const [stats, seriesMap, nowcast] = await Promise.all([
    getCountryStats(country.id),
    getCountrySeriesBatch(country.id, [
      SLUG.fertility,
      SLUG.population,
      SLUG.netMigration,
      SLUG.ageDependencyRatio,
      SLUG.popShare65plus,
      SLUG.popShare15to64,
      SLUG.lifeExpectancy,
      SLUG.gdpPerCapita,
      SLUG.migrantStock,
      SLUG.migrantStockShare,
      SLUG.healthExpenditure,
      SLUG.educationExpenditure,
    ]),
    getCountryFertilityNowcast(country.id),
  ]);

  const pack = getTfrAncestryPack(country.iso3);
  const latestSnap = pack?.series[pack.series.length - 1];
  const groupTfr =
    pack && latestSnap
      ? {
          headline: pack.headline ?? pack.metric,
          source: pack.source,
          sourceUrl: pack.sourceUrl,
          groups: pack.groups,
          latest: latestSnap.groups,
          latestYear: latestSnap.year,
          points: pack.series,
          colors: pack.colors,
          dashed: pack.dashed,
          decimals: pack.decimals,
          unit: pack.unit,
          defaultFrom: pack.defaultFrom,
        }
      : country.iso3 === "USA"
        ? usRaceTfrPack()
        : dhsEducationTfrPack(country.iso3);

  const composition = compositionFromSeed(country.iso3, "population");
  const birthsComposition = compositionFromSeed(country.iso3, "births");
  const religion = religionFromSeed(country.iso3);

  const curatedIso = briefingPeerIso3s(country.iso3, country.continent);
  const continentIso = country.continent
    ? await getContinentIso3s(country.continent, country.iso3)
    : [];
  const poolIso = [...new Set([...curatedIso, ...continentIso])];
  const [poolRows, labor, pyramidRaw, immigrationOrigins, emigrationDestinations] =
    await Promise.all([
      getLatestFertilityForIso3s(poolIso),
      stats[SLUG.fertility] && stats[SLUG.lifeExpectancy]
        ? getLaborOutlook({
            countryId: country.id,
            tfr: stats[SLUG.fertility]!.value,
            lifeExpectancy: stats[SLUG.lifeExpectancy]!.value,
            netMigrationAnnual: stats[SLUG.netMigration]?.value ?? null,
          })
        : Promise.resolve(null),
      getPopulationPyramid(country.id),
      getImmigrationOrigins(country.id, 8),
      getEmigrationDestinations(country.id, 6),
    ]);

  const pyramidMap = new Map<string, PyramidRow>();
  for (const r of pyramidRaw.rows) {
    const cur =
      pyramidMap.get(r.ageGroup) ??
      { ageGroup: r.ageGroup, ageStart: r.ageStart, male: 0, female: 0 };
    if (r.sex === "male") cur.male = r.population;
    else if (r.sex === "female") cur.female = r.population;
    pyramidMap.set(r.ageGroup, cur);
  }
  const pyramidRows = Array.from(pyramidMap.values()).sort(
    (a, b) => a.ageStart - b.ageStart,
  );
  const pyramid =
    pyramidRaw.year != null && pyramidRows.length > 0
      ? { year: pyramidRaw.year, rows: pyramidRows }
      : null;

  const migrantStockSeries = seriesMap[SLUG.migrantStock] ?? [];
  const migrantShareSeries = seriesMap[SLUG.migrantStockShare] ?? [];
  const migrantStock = migrantStockSeries.length
    ? migrantStockSeries[migrantStockSeries.length - 1]
    : null;
  const migrantStockShare = migrantShareSeries.length
    ? migrantShareSeries[migrantShareSeries.length - 1]
    : null;

  const extras = getBriefingExtras(country.iso3);

  // Fold series tips into stats so fallback / API can cite health, 65+, etc.
  const tip = (slug: string) => {
    const series = seriesMap[slug] ?? [];
    return series.length ? series[series.length - 1] : null;
  };
  const statsWithExtras: BriefingFacts["stats"] = {
    ...stats,
    [SLUG.popShare65plus]: tip(SLUG.popShare65plus),
    [SLUG.popShare15to64]: tip(SLUG.popShare15to64),
    [SLUG.healthExpenditure]: tip(SLUG.healthExpenditure),
    [SLUG.educationExpenditure]: tip(SLUG.educationExpenditure),
    [SLUG.ageDependencyRatio]: tip(SLUG.ageDependencyRatio),
    [SLUG.migrantStock]: migrantStock,
    [SLUG.migrantStockShare]: migrantStockShare,
  };

  const selfTfr = stats[SLUG.fertility];
  const chosenIso = new Set(
    pickPeerIso3s(
      curatedIso,
      poolRows.map((n) => ({ iso3: n.iso3, tfr: n.tfr })),
      selfTfr?.value ?? null,
      5,
    ),
  );
  const peers = poolRows
    .filter((n) => chosenIso.has(n.iso3.toUpperCase()))
    .map((n) => ({ ...n, name: tidyCountryName(n.name) }));
  const neighbors: BriefingNeighbor[] = [
    ...(selfTfr
      ? [
          {
            iso3: country.iso3,
            name: tidyCountryName(country.name),
            slug: country.slug,
            flagEmoji: country.flagEmoji,
            tfr: selfTfr.value,
            year: selfTfr.year,
            isSubject: true,
          },
        ]
      : []),
    ...peers,
  ].sort((a, b) => b.tfr - a.tfr);

  const lowestPeer = peers.slice().sort((a, b) => a.tfr - b.tfr)[0];
  const callouts: BriefingCallout[] = [];
  if (selfTfr) {
    callouts.push({
      label: "Period TFR",
      value: fmtTfr(selfTfr.value),
      hint:
        selfTfr.value >= 2.1
          ? `Above replacement (~2.1). ${selfTfr.year}.`
          : `Below replacement (~2.1). ${selfTfr.year}.`,
    });
  }
  if (labor) {
    callouts.push({
      label: `Working-age ${labor.now.year}`,
      value: fmtPeople(labor.now.working),
      hint: "Ages 15–64. These people pay most of the tax.",
    });
    callouts.push({
      label: `Workers per retiree, ${labor.at2040.year}`,
      value: labor.at2040.workersPerRetiree.toFixed(1),
      hint: `Now ${labor.now.workersPerRetiree.toFixed(1)}. 2040 workers are mostly already born.`,
    });
  }
  const healthTip = tip(SLUG.healthExpenditure);
  if (healthTip) {
    callouts.push({
      label: `Health spend, ${healthTip.year}`,
      value: `${healthTip.value.toFixed(1)}% GDP`,
      hint: "World Bank current health expenditure — age-linked cost pressure gauge.",
    });
  }
  if (lowestPeer && selfTfr) {
    callouts.push({
      label: `${lowestPeer.name} TFR`,
      value: fmtTfr(lowestPeer.tfr),
      hint: `${country.name} is ${fmtTfr(selfTfr.value)}. Same neighborhood, different workforce in a generation.`,
    });
  }
  if (composition) {
    const latestHist =
      composition.points
        .filter(
          (p) =>
            composition.projectionFromYear == null ||
            p.year < composition.projectionFromYear,
        )
        .at(-1) ?? composition.points.at(-1);
    if (latestHist) {
      const top = composition.groups
        .map((k) => ({ k, v: latestHist.groups[k] ?? 0 }))
        .sort((a, b) => b.v - a.v)[0];
      if (top) {
        callouts.push({
          label: `${top.k}, ${latestHist.year}`,
          value: `${top.v.toFixed(1)}%`,
          hint: "Largest group share of residents on the curated composition series.",
        });
      }
    }
  } else if (religion) {
    const snap = religion.points[religion.points.length - 1];
    const top = religion.groups
      .map((k) => ({ k, v: snap.groups[k] ?? 0 }))
      .sort((a, b) => b.v - a.v)[0];
    if (top) {
      callouts.push({
        label: `${top.k}, ${snap.year}`,
        value: `${top.v.toFixed(1)}%`,
        hint: "Largest religion share on the curated Pew / census snapshot.",
      });
    }
  }

  const polaniBreak = getPolaniBreakeven(country.iso3);
  const oecdFiscal = getOecdImmigrantFiscal(country.iso3);
  if (polaniBreak) {
    callouts.push({
      label: "Fiscal break-even",
      value: `${polaniBreak.percentile}th pct`,
      hint: `Polani 2026 · main-earner pay percentile for a couple+2 kids arriving at 30 to break even over 60 years.`,
    });
  } else if (oecdFiscal) {
    callouts.push({
      label: "Immigrant fiscal (OECD)",
      value: `${oecdFiscal.foreignA.toFixed(1)}% GDP`,
      hint: `Spec A 2006–18 · individual taxes/benefits. Spec C2 (full public goods): ${oecdFiscal.foreignC2.toFixed(2)}% GDP.`,
    });
  }

  const map = getCountryMapEntry(country.iso3);
  const hasTfr = (seriesMap[SLUG.fertility] ?? []).length > 1;
  const hasPop = (seriesMap[SLUG.population] ?? []).length > 1;
  const hasMig = (seriesMap[SLUG.netMigration] ?? []).length > 1;
  const hasDep = (seriesMap[SLUG.ageDependencyRatio] ?? []).length > 1;
  const hasHealth = (seriesMap[SLUG.healthExpenditure] ?? []).length > 1;
  const hasShare65 = (seriesMap[SLUG.popShare65plus] ?? []).length > 1;

  const nc = nowcast
    ? nowcast.tfr2026 != null
      ? { year: 2026, tfr: nowcast.tfr2026, source: nowcast.sourceNote }
      : nowcast.tfr2025 != null
        ? { year: 2025, tfr: nowcast.tfr2025, source: nowcast.sourceNote }
        : nowcast.tfr2024 != null
          ? { year: 2024, tfr: nowcast.tfr2024, source: nowcast.sourceNote }
          : null
    : null;

  return {
    name: country.name,
    slug: country.slug,
    iso3: country.iso3,
    flagEmoji: country.flagEmoji,
    stats: statsWithExtras,
    nowcast: nc,
    series: {
      tfr: thin(seriesMap[SLUG.fertility] ?? []),
      population: thin(seriesMap[SLUG.population] ?? []),
      migration: thin(seriesMap[SLUG.netMigration] ?? []),
      dependency: thin(seriesMap[SLUG.ageDependencyRatio] ?? []),
      share65: thin(seriesMap[SLUG.popShare65plus] ?? []),
      share1564: thin(seriesMap[SLUG.popShare15to64] ?? []),
      health: thin(seriesMap[SLUG.healthExpenditure] ?? []),
      education: thin(seriesMap[SLUG.educationExpenditure] ?? []),
    },
    groupTfr,
    composition,
    birthsComposition,
    religion,
    pyramid,
    immigrationOrigins,
    emigrationDestinations,
    migrantStock,
    migrantStockShare,
    extras,
    usaExtras: extras,
    neighbors,
    labor,
    callouts,
    mapHref:
      map?.geoUrl && map.metrics.length > 0
        ? `/maps/${country.iso3.toLowerCase()}`
        : null,
    angle: getBriefingAngle(country.iso3),
    modules: BRIEFING_MODULES,
    charts: BRIEFING_CHARTS.map((c) => ({
      ...c,
      available:
        (c.id === "tfr" && hasTfr) ||
        (c.id === "population" && hasPop) ||
        (c.id === "groups" && !!groupTfr && groupTfr.points.length >= 1) ||
        (c.id === "composition" && !!composition) ||
        (c.id === "birthsComposition" && !!birthsComposition) ||
        (c.id === "religion" && !!religion) ||
        (c.id === "pyramid" && !!pyramid) ||
        (c.id === "migration" && hasMig) ||
        (c.id === "migrationOrigins" &&
          !!immigrationOrigins &&
          immigrationOrigins.rows.length >= 3) ||
        (c.id === "migrationDestinations" &&
          !!emigrationDestinations &&
          emigrationDestinations.rows.length >= 2) ||
        (c.id === "budget" && !!extras.budget) ||
        (c.id === "immigrantFiscal" &&
          (!!getOecdImmigrantFiscal(country.iso3) ||
            !!getPolaniBreakeven(country.iso3))) ||
        (c.id === "health" && hasHealth) ||
        (c.id === "share65" && hasShare65) ||
        (c.id === "dependency" && hasDep) ||
        (c.id === "neighbors" && neighbors.length >= 3) ||
        (c.id === "labor" && !!labor),
    })),
  };
}

export function isModuleId(v: string): v is BriefingModuleId {
  return BRIEFING_MODULES.some((m) => m.id === v);
}

export function isChartId(v: string): v is BriefingChartId {
  return BRIEFING_CHARTS.some((c) => c.id === v);
}

export function isPlaceAfter(v: string): v is BriefingPlaceAfter {
  return v === "top" || BRIEFING_MODULES.some((m) => m.id === v);
}
