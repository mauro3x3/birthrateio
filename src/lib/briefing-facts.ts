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
  getLatestFertilityForIso3s,
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
  } | null;
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
        }
      : null;

  const curatedIso = briefingPeerIso3s(country.iso3, country.continent);
  const continentIso = country.continent
    ? await getContinentIso3s(country.continent, country.iso3)
    : [];
  const poolIso = [...new Set([...curatedIso, ...continentIso])];
  const [poolRows, labor] = await Promise.all([
    getLatestFertilityForIso3s(poolIso),
    stats[SLUG.fertility] && stats[SLUG.lifeExpectancy]
      ? getLaborOutlook({
          countryId: country.id,
          tfr: stats[SLUG.fertility]!.value,
          lifeExpectancy: stats[SLUG.lifeExpectancy]!.value,
          netMigrationAnnual: stats[SLUG.netMigration]?.value ?? null,
        })
      : Promise.resolve(null),
  ]);

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
  if (lowestPeer && selfTfr) {
    callouts.push({
      label: `${lowestPeer.name} TFR`,
      value: fmtTfr(lowestPeer.tfr),
      hint: `${country.name} is ${fmtTfr(selfTfr.value)}. Same neighborhood, different workforce in a generation.`,
    });
  }

  const map = getCountryMapEntry(country.iso3);
  const hasTfr = (seriesMap[SLUG.fertility] ?? []).length > 1;
  const hasPop = (seriesMap[SLUG.population] ?? []).length > 1;
  const hasMig = (seriesMap[SLUG.netMigration] ?? []).length > 1;
  const hasDep = (seriesMap[SLUG.ageDependencyRatio] ?? []).length > 1;

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
    stats,
    nowcast: nc,
    series: {
      tfr: thin(seriesMap[SLUG.fertility] ?? []),
      population: thin(seriesMap[SLUG.population] ?? []),
      migration: thin(seriesMap[SLUG.netMigration] ?? []),
      dependency: thin(seriesMap[SLUG.ageDependencyRatio] ?? []),
      share65: thin(seriesMap[SLUG.popShare65plus] ?? []),
      share1564: thin(seriesMap[SLUG.popShare15to64] ?? []),
    },
    groupTfr,
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
        (c.id === "migration" && hasMig) ||
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
