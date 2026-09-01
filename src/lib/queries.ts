import "server-only";
import { prisma } from "@/lib/prisma";
import { INDICATOR_BY_SLUG, SLUG } from "@/lib/indicators";
import { parseSearchQuery } from "@/lib/search-query";
import { countryHrefForSearch, suggestSearch } from "@/lib/search-insights";
import { resolveCountrySlug } from "@/lib/country-aliases";
import { unstable_cache } from "next/cache";

// ---------------------------------------------------------------------------
// All reads go through this layer. Heavy aggregate reads are wrapped in
// unstable_cache so the homepage / explorers don't re-query Postgres on every
// request — the data only changes when ingestion runs.
// ---------------------------------------------------------------------------

export type TimeSeriesPoint = { year: number; value: number; kind: string };

export type RankingRow = {
  iso3: string;
  slug: string;
  name: string;
  flagEmoji: string | null;
  continent: string | null;
  value: number;
  year: number;
};

async function indicatorId(slug: string): Promise<number | null> {
  const def = INDICATOR_BY_SLUG.get(slug);
  if (!def) return null;
  const ind = await prisma.indicator.findUnique({
    where: { slug },
    select: { id: true },
  });
  return ind?.id ?? null;
}

/**
 * Most recent ingestion timestamp across a set of indicators — drives the
 * "data updated" stamp in topic page headers.
 */
export const getIndicatorsUpdatedAt = unstable_cache(
  async (slugs: string[]): Promise<Date | null> => {
    if (slugs.length === 0) return null;
    const rows = await prisma.indicator.findMany({
      where: { slug: { in: slugs } },
      select: { updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 1,
    });
    return rows[0]?.updatedAt ?? null;
  },
  ["indicators-updated-at"],
  { revalidate: 3600, tags: ["indicators"] },
);

export const getAllCountries = unstable_cache(
  async () => {
    return prisma.country.findMany({
      where: { isAggregate: false },
      select: {
        id: true,
        iso3: true,
        iso2: true,
        slug: true,
        name: true,
        flagEmoji: true,
        continent: true,
        subregion: true,
        incomeGroup: true,
      },
      orderBy: { name: "asc" },
    });
  },
  ["all-countries"],
  { revalidate: 3600, tags: ["countries"] },
);

export async function getCountryBySlug(slug: string) {
  const resolved = resolveCountrySlug(slug);
  return prisma.country.findUnique({
    where: { slug: resolved },
    include: { region: true },
  });
}

export async function getCountryByIso3(iso3: string) {
  return prisma.country.findUnique({ where: { iso3 } });
}

export async function getCountryTimeSeries(
  countryId: number,
  slug: string,
): Promise<TimeSeriesPoint[]> {
  const id = await indicatorId(slug);
  if (!id) return [];
  const rows = await prisma.indicatorValue.findMany({
    where: { countryId, indicatorId: id, dimension: null },
    select: { year: true, value: true, kind: true },
    orderBy: { year: "asc" },
  });
  return rows.map((r) => ({ year: r.year, value: r.value, kind: r.kind }));
}

export type CountrySeriesMap = Record<string, TimeSeriesPoint[]>;

/**
 * Time series for many indicators at once, keyed by slug. Country pages read
 * dozens of series; fetching them one indicator at a time turned the page into
 * a pile of sequential round trips.
 */
export async function getCountrySeriesBatch(
  countryId: number,
  slugs: readonly string[],
): Promise<CountrySeriesMap> {
  const known = slugs.filter((slug) => INDICATOR_BY_SLUG.has(slug));
  if (known.length === 0) return {};

  const indicators = await prisma.indicator.findMany({
    where: { slug: { in: known } },
    select: { id: true, slug: true },
  });
  if (indicators.length === 0) return {};

  const slugById = new Map(indicators.map((i) => [i.id, i.slug]));
  const rows = await prisma.indicatorValue.findMany({
    where: {
      countryId,
      indicatorId: { in: indicators.map((i) => i.id) },
      dimension: null,
    },
    select: { indicatorId: true, year: true, value: true, kind: true },
    orderBy: { year: "asc" },
  });

  const out: CountrySeriesMap = {};
  for (const r of rows) {
    const slug = slugById.get(r.indicatorId);
    if (!slug) continue;
    (out[slug] ??= []).push({ year: r.year, value: r.value, kind: r.kind });
  }
  return out;
}

/** Latest non-null value for a country + indicator. */
export async function getLatestValue(
  countryId: number,
  slug: string,
): Promise<{ value: number; year: number } | null> {
  const id = await indicatorId(slug);
  if (!id) return null;
  const row = await prisma.indicatorValue.findFirst({
    where: { countryId, indicatorId: id, dimension: null, kind: "ESTIMATE" },
    select: { value: true, year: true },
    orderBy: { year: "desc" },
  });
  return row ? { value: row.value, year: row.year } : null;
}

/** Latest World Bank "World" (WLD) aggregate value for an indicator. */
export async function getWorldLatestValue(
  slug: string,
): Promise<{ value: number; year: number } | null> {
  const world = await prisma.country.findFirst({
    where: { iso3: "WLD" },
    select: { id: true },
  });
  if (!world) return null;
  return getLatestValue(world.id, slug);
}

/** Mean of a country's most recent `n` annual values — smooths single-year
 * spikes (e.g. a migration surge) so defaults aren't driven by one outlier. */
export async function getRecentMean(
  countryId: number,
  slug: string,
  n = 5,
): Promise<{ value: number; year: number } | null> {
  const id = await indicatorId(slug);
  if (!id) return null;
  const rows = await prisma.indicatorValue.findMany({
    where: {
      countryId,
      indicatorId: id,
      subjectType: "COUNTRY",
      dimension: null,
    },
    orderBy: { year: "desc" },
    take: n,
    select: { value: true, year: true },
  });
  if (rows.length === 0) return null;
  const mean = rows.reduce((s, r) => s + r.value, 0) / rows.length;
  return { value: mean, year: rows[0].year };
}

/** Most recent year that has data for an indicator across countries. */
export async function getLatestYear(slug: string): Promise<number | null> {
  const id = await indicatorId(slug);
  if (!id) return null;
  const row = await prisma.indicatorValue.findFirst({
    where: { indicatorId: id, subjectType: "COUNTRY", dimension: null },
    select: { year: true },
    orderBy: { year: "desc" },
  });
  return row?.year ?? null;
}

export async function getYearsForIndicator(slug: string): Promise<number[]> {
  const id = await indicatorId(slug);
  if (!id) return [];
  const rows = await prisma.indicatorValue.findMany({
    where: { indicatorId: id, subjectType: "COUNTRY", dimension: null },
    select: { year: true },
    distinct: ["year"],
    orderBy: { year: "asc" },
  });
  return rows.map((r) => r.year);
}

const RANKING_COUNTRY_SELECT = {
  iso3: true,
  slug: true,
  name: true,
  flagEmoji: true,
  continent: true,
} as const;

/**
 * Ranking using each country's OWN most recent value (within a recency window),
 * rather than a single global latest year. This avoids sparse/biased tables for
 * indicators with uneven reporting lag (e.g. GDP), where the newest year only
 * has a handful of reporters. Years can differ per row and are shown as such.
 */
export async function getLatestRanking(
  slug: string,
  opts: { order?: "asc" | "desc"; limit?: number; maxAgeYears?: number } = {},
): Promise<RankingRow[]> {
  const id = await indicatorId(slug);
  if (!id) return [];
  const latest = await getLatestYear(slug);
  if (!latest) return [];
  const cutoff = latest - (opts.maxAgeYears ?? 15);
  const rows = await prisma.indicatorValue.findMany({
    where: {
      indicatorId: id,
      subjectType: "COUNTRY",
      dimension: null,
      year: { gte: cutoff },
      country: { isAggregate: false },
    },
    distinct: ["countryId"],
    orderBy: [{ countryId: "asc" }, { year: "desc" }],
    select: { value: true, year: true, country: { select: RANKING_COUNTRY_SELECT } },
  });
  const mapped = rows
    .filter((r) => r.country)
    .map((r) => ({
      iso3: r.country!.iso3,
      slug: r.country!.slug,
      name: r.country!.name,
      flagEmoji: r.country!.flagEmoji,
      continent: r.country!.continent,
      value: r.value,
      year: r.year,
    }));
  mapped.sort((a, b) => (opts.order === "asc" ? a.value - b.value : b.value - a.value));
  return opts.limit ? mapped.slice(0, opts.limit) : mapped;
}

/**
 * Where a country sits in the latest ranking for an indicator.
 * Returns null when the country has no recent value.
 */
export async function getCountryRankBySlug(
  countrySlug: string,
  indicatorSlug: string,
  opts: { order?: "asc" | "desc" } = {},
): Promise<{
  rank: number;
  total: number;
  value: number;
  year: number;
} | null> {
  const ranking = await getLatestRanking(indicatorSlug, {
    order: opts.order ?? "desc",
  });
  const idx = ranking.findIndex((r) => r.slug === countrySlug);
  if (idx < 0) return null;
  const row = ranking[idx];
  return {
    rank: idx + 1,
    total: ranking.length,
    value: row.value,
    year: row.year,
  };
}

/** Peer countries in the same continent, for internal linking. */
export async function getRelatedCountries(
  countryId: number,
  opts: { continent?: string | null; limit?: number } = {},
): Promise<
  Array<{
    slug: string;
    name: string;
    flagEmoji: string | null;
    continent: string | null;
  }>
> {
  const limit = opts.limit ?? 8;
  let continent = opts.continent;
  if (!continent) {
    const self = await prisma.country.findUnique({
      where: { id: countryId },
      select: { continent: true },
    });
    continent = self?.continent ?? null;
  }
  if (!continent) {
    return prisma.country.findMany({
      where: { isAggregate: false, id: { not: countryId } },
      select: {
        slug: true,
        name: true,
        flagEmoji: true,
        continent: true,
      },
      orderBy: { name: "asc" },
      take: limit,
    });
  }
  return prisma.country.findMany({
    where: {
      isAggregate: false,
      id: { not: countryId },
      continent,
    },
    select: {
      slug: true,
      name: true,
      flagEmoji: true,
      continent: true,
    },
    orderBy: { name: "asc" },
    take: limit,
  });
}

/** Country ranking for an indicator. Defaults to each country's latest value;
 * pass an explicit `year` for a single-year snapshot (used by maps). */
export async function getRanking(
  slug: string,
  opts: { year?: number; order?: "asc" | "desc"; limit?: number } = {},
): Promise<RankingRow[]> {
  const id = await indicatorId(slug);
  if (!id) return [];
  if (opts.year == null) {
    return getLatestRanking(slug, { order: opts.order, limit: opts.limit });
  }
  const year = opts.year;
  if (!year) return [];
  const rows = await prisma.indicatorValue.findMany({
    where: {
      indicatorId: id,
      subjectType: "COUNTRY",
      year,
      dimension: null,
      country: { isAggregate: false },
    },
    select: {
      value: true,
      year: true,
      country: {
        select: {
          iso3: true,
          slug: true,
          name: true,
          flagEmoji: true,
          continent: true,
        },
      },
    },
    orderBy: { value: opts.order ?? "desc" },
    take: opts.limit,
  });
  return rows
    .filter((r) => r.country)
    .map((r) => ({
      iso3: r.country!.iso3,
      slug: r.country!.slug,
      name: r.country!.name,
      flagEmoji: r.country!.flagEmoji,
      continent: r.country!.continent,
      value: r.value,
      year: r.year,
    }));
}

/** Choropleth payload: iso3 -> value for a given indicator/year. */
export const getMapData = unstable_cache(
  async (slug: string, year?: number) => {
    const id = await indicatorId(slug);
    if (!id) return { year: null as number | null, values: [] as RankingRow[] };
    const resolvedYear = year ?? (await getLatestYear(slug));
    if (!resolvedYear) return { year: null, values: [] };
    const values = await getRanking(slug, { year: resolvedYear, order: "desc" });
    return { year: resolvedYear, values };
  },
  ["map-data"],
  { revalidate: 3600, tags: ["indicators"] },
);

/** Build choropleth frames for several years (for the animated time slider). */
export const getMapFrames = unstable_cache(
  async (slug: string, opts: { step?: number; maxFrames?: number } = {}) => {
    const id = await indicatorId(slug);
    if (!id) return [] as { year: number; data: RankingRow[] }[];
    const years = await getYearsForIndicator(slug);
    if (years.length === 0) return [] as { year: number; data: RankingRow[] }[];
    const step = opts.step ?? 5;
    const maxFrames = opts.maxFrames ?? 12;
    const latest = years[years.length - 1];
    const yearSet = new Set(years);
    // Pick evenly spaced years ending on the latest available year.
    const picked: number[] = [];
    for (let y = latest; y >= years[0]; y -= step) {
      if (yearSet.has(y)) picked.unshift(y);
      if (picked.length >= maxFrames) break;
    }
    if (!picked.includes(latest)) picked.push(latest);

    // One round-trip for every frame. The old per-year Promise.all could fire
    // 60+ queries at once, which times out on Vercel Hobby / a cold Neon
    // compute and then ISR caches the empty fallback page.
    const rows = await prisma.indicatorValue.findMany({
      where: {
        indicatorId: id,
        subjectType: "COUNTRY",
        year: { in: picked },
        dimension: null,
        country: { isAggregate: false },
      },
      select: {
        value: true,
        year: true,
        country: { select: RANKING_COUNTRY_SELECT },
      },
    });

    const byYear = new Map<number, RankingRow[]>();
    for (const y of picked) byYear.set(y, []);
    for (const r of rows) {
      if (!r.country) continue;
      const list = byYear.get(r.year);
      if (!list) continue;
      list.push({
        iso3: r.country.iso3,
        slug: r.country.slug,
        name: r.country.name,
        flagEmoji: r.country.flagEmoji,
        continent: r.country.continent,
        value: r.value,
        year: r.year,
      });
    }
    for (const list of byYear.values()) {
      list.sort((a, b) => b.value - a.value);
    }
    return picked
      .map((year) => ({ year, data: byYear.get(year) ?? [] }))
      .filter((f) => f.data.length > 0);
  },
  ["map-frames"],
  { revalidate: 3600, tags: ["indicators"] },
);

/**
 * Official World aggregate series for an indicator (World Bank "WLD" row),
 * returned as year → value. Falls back to an empty object when unavailable.
 */
export const getWorldByYear = unstable_cache(
  async (slug: string, years: number[]) => {
    const id = await indicatorId(slug);
    if (!id || years.length === 0) return {} as Record<number, number>;
    const world = await prisma.country.findFirst({
      where: { iso3: "WLD" },
      select: { id: true },
    });
    if (!world) return {} as Record<number, number>;
    const rows = await prisma.indicatorValue.findMany({
      where: {
        indicatorId: id,
        countryId: world.id,
        dimension: null,
        year: { in: years },
      },
      select: { year: true, value: true },
    });
    const out: Record<number, number> = {};
    for (const r of rows) out[r.year] = r.value;
    return out;
  },
  ["world-by-year"],
  { revalidate: 3600, tags: ["indicators"] },
);

/**
 * Population-weighted global average of an indicator for given years.
 * Returns a map of year → weighted mean (weighted by `weightSlug`, e.g. population).
 */
export const getWeightedGlobalByYear = unstable_cache(
  async (valueSlug: string, weightSlug: string, years: number[]) => {
    const [valId, wId] = await Promise.all([
      indicatorId(valueSlug),
      indicatorId(weightSlug),
    ]);
    if (!valId || !wId || years.length === 0) return {} as Record<number, number>;

    const [vals, weights] = await Promise.all([
      prisma.indicatorValue.findMany({
        where: {
          indicatorId: valId,
          subjectType: "COUNTRY",
          dimension: null,
          year: { in: years },
          country: { isAggregate: false },
        },
        select: { countryId: true, year: true, value: true },
      }),
      prisma.indicatorValue.findMany({
        where: {
          indicatorId: wId,
          subjectType: "COUNTRY",
          dimension: null,
          year: { in: years },
          country: { isAggregate: false },
        },
        select: { countryId: true, year: true, value: true },
      }),
    ]);

    const wMap = new Map<string, number>();
    for (const w of weights)
      if (w.countryId) wMap.set(`${w.year}:${w.countryId}`, w.value);

    const num = new Map<number, number>();
    const den = new Map<number, number>();
    for (const v of vals) {
      if (!v.countryId) continue;
      const w = wMap.get(`${v.year}:${v.countryId}`);
      if (w == null || !Number.isFinite(v.value) || !Number.isFinite(w)) continue;
      num.set(v.year, (num.get(v.year) ?? 0) + v.value * w);
      den.set(v.year, (den.get(v.year) ?? 0) + w);
    }

    const out: Record<number, number> = {};
    for (const [y, n] of num) {
      const d = den.get(y);
      if (d) out[y] = n / d;
    }
    return out;
  },
  ["weighted-global"],
  { revalidate: 3600, tags: ["indicators"] },
);

/** Countries with the largest fertility increase/decline over a window. */
export const getFertilityChanges = unstable_cache(
  async (window = 10, limit = 6) => {
    const id = await indicatorId(SLUG.fertility);
    if (!id) return { increases: [], declines: [] };
    const latest = await getLatestYear(SLUG.fertility);
    if (!latest) return { increases: [], declines: [] };
    const past = latest - window;

    const [withIds, pastRows] = await Promise.all([
      prisma.indicatorValue.findMany({
        where: {
          indicatorId: id,
          subjectType: "COUNTRY",
          year: latest,
          dimension: null,
          country: { isAggregate: false },
        },
        select: {
          value: true,
          countryId: true,
          country: {
            select: { iso3: true, slug: true, name: true, flagEmoji: true },
          },
        },
      }),
      prisma.indicatorValue.findMany({
        where: {
          indicatorId: id,
          subjectType: "COUNTRY",
          year: past,
          dimension: null,
        },
        select: { value: true, countryId: true },
      }),
    ]);

    const pastByCountry = new Map<number, number>();
    for (const r of pastRows) if (r.countryId) pastByCountry.set(r.countryId, r.value);

    const deltas = withIds
      .map((r) => {
        const p = r.countryId ? pastByCountry.get(r.countryId) : undefined;
        if (p === undefined || !r.country) return null;
        return {
          iso3: r.country.iso3,
          slug: r.country.slug,
          name: r.country.name,
          flagEmoji: r.country.flagEmoji,
          from: p,
          to: r.value,
          change: r.value - p,
          pct: p !== 0 ? ((r.value - p) / p) * 100 : 0,
          window,
          latestYear: latest,
        };
      })
      .filter(Boolean) as Array<{
      iso3: string;
      slug: string;
      name: string;
      flagEmoji: string | null;
      from: number;
      to: number;
      change: number;
      pct: number;
      window: number;
      latestYear: number;
    }>;

    const sorted = [...deltas].sort((a, b) => a.change - b.change);
    return {
      declines: sorted.slice(0, limit),
      increases: [...sorted].reverse().slice(0, limit),
    };
  },
  ["fertility-changes"],
  { revalidate: 3600, tags: ["indicators"] },
);

export async function getCountryStats(countryId: number) {
  const slugs = [
    SLUG.population,
    SLUG.fertility,
    SLUG.lifeExpectancy,
    SLUG.gdpPerCapita,
    SLUG.populationGrowth,
    SLUG.netMigration,
  ];
  const entries = await Promise.all(
    slugs.map(async (s) => [s, await getLatestValue(countryId, s)] as const),
  );
  return Object.fromEntries(entries);
}

export async function getPopulationPyramid(countryId: number, year?: number) {
  const resolvedYear =
    year ??
    (
      await prisma.populationByAge.findFirst({
        where: { countryId },
        select: { year: true },
        orderBy: { year: "desc" },
      })
    )?.year;
  if (!resolvedYear) return { year: null as number | null, rows: [] };
  const rows = await prisma.populationByAge.findMany({
    where: { countryId, year: resolvedYear, sex: { in: ["male", "female"] } },
    select: { ageGroup: true, ageStart: true, sex: true, population: true },
    orderBy: { ageStart: "asc" },
  });
  return { year: resolvedYear, rows };
}

/** Ethnic/racial composition over time for a country (stacked-area chart). */
export async function getComposition(
  countryId: number,
  groupKind = "ETHNICITY",
  opts?: { useCounts?: boolean },
) {
  const rows = await prisma.groupComposition.findMany({
    where: { countryId, groupKind },
    select: { year: true, groupName: true, share: true, population: true },
    orderBy: { year: "asc" },
  });
  if (rows.length === 0) return { groups: [], data: [], note: null as string | null };

  const useCounts =
    opts?.useCounts === true &&
    rows.some((r) => r.population != null && r.population > 0);

  // Union of group names, preserving first-seen order.
  const groups: string[] = [];
  const byYear = new Map<number, Record<string, number>>();
  for (const r of rows) {
    if (!groups.includes(r.groupName)) groups.push(r.groupName);
    const row = byYear.get(r.year) ?? { year: r.year };
    row[r.groupName] = useCounts
      ? (r.population ?? 0)
      : (r.share ?? 0);
    byYear.set(r.year, row);
  }
  // Ensure every year has every group (0 when missing) for clean stacking.
  const data = Array.from(byYear.values())
    .map((row) => {
      for (const g of groups) if (!(g in row)) row[g] = 0;
      return row;
    })
    .sort((a, b) => (a.year as number) - (b.year as number));

  return { groups, data, note: null as string | null, useCounts };
}

/** Latest-year composition snapshot for a single bar/list (e.g. religion). */
export async function getCompositionLatest(
  countryId: number,
  groupKind = "RELIGION",
) {
  const latest = await prisma.groupComposition.findFirst({
    where: { countryId, groupKind },
    select: { year: true },
    orderBy: { year: "desc" },
  });
  if (!latest) return { year: null as number | null, items: [] };
  const rows = await prisma.groupComposition.findMany({
    where: { countryId, groupKind, year: latest.year },
    select: { groupName: true, share: true },
  });
  const items = rows
    .map((r) => ({ name: r.groupName, value: r.share ?? 0 }))
    .sort((a, b) => b.value - a.value);
  return { year: latest.year, items };
}

export async function getProjections(countryId: number) {
  return prisma.populationProjection.findMany({
    where: { countryId },
    select: { year: true, scenario: true, population: true },
    orderBy: [{ scenario: "asc" }, { year: "asc" }],
  });
}

export const getUpcomingReleases = unstable_cache(
  async (limit = 12) => {
    return prisma.dataRelease.findMany({
      where: { releaseDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      orderBy: { releaseDate: "asc" },
      take: limit,
      include: { source: true },
    });
  },
  ["upcoming-releases"],
  { revalidate: 3600, tags: ["releases"] },
);

export async function getAllReleases() {
  return prisma.dataRelease.findMany({
    orderBy: { releaseDate: "asc" },
    include: { source: true },
  });
}

export async function getCities(limit = 200) {
  return prisma.city.findMany({
    orderBy: { population: "desc" },
    take: limit,
    include: {
      country: {
        select: {
          name: true,
          slug: true,
          flagEmoji: true,
          continent: true,
          iso3: true,
        },
      },
    },
  });
}

export async function getCityBySlug(slug: string) {
  return prisma.city.findUnique({
    where: { slug },
    include: { country: true },
  });
}

/** First-level admin divisions for a country (states, Länder, provinces…). */
export async function getAdmin1ByCountry(countryId: number) {
  return prisma.admin1.findMany({
    where: { countryId },
    orderBy: [{ population: "desc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
      population: true,
      code: true,
    },
  });
}

export async function getAdmin1BySlug(slug: string) {
  return prisma.admin1.findUnique({
    where: { slug },
    include: {
      country: {
        select: {
          id: true,
          slug: true,
          name: true,
          iso3: true,
          flagEmoji: true,
        },
      },
    },
  });
}

export async function getAdmin1TimeSeries(
  admin1Id: number,
  indicatorSlug: string,
): Promise<TimeSeriesPoint[]> {
  const id = await indicatorId(indicatorSlug);
  if (!id) return [];
  const rows = await prisma.indicatorValue.findMany({
    where: {
      admin1Id,
      indicatorId: id,
      subjectType: "ADMIN1",
      dimension: null,
    },
    select: { year: true, value: true, kind: true },
    orderBy: { year: "asc" },
  });
  return rows.map((r) => ({ year: r.year, value: r.value, kind: r.kind }));
}

/** Latest fertility ranking of admin1 units within a country. */
export async function getAdmin1FertilityRanking(countryId: number) {
  const id = await indicatorId(SLUG.fertility);
  if (!id) return [];
  const divisions = await prisma.admin1.findMany({
    where: { countryId },
    select: { id: true, slug: true, name: true, kind: true, population: true },
  });
  if (!divisions.length) return [];
  const ids = divisions.map((d) => d.id);
  const rows = await prisma.indicatorValue.findMany({
    where: {
      subjectType: "ADMIN1",
      indicatorId: id,
      admin1Id: { in: ids },
      dimension: null,
    },
    select: { admin1Id: true, year: true, value: true },
    orderBy: { year: "desc" },
  });
  const latest = new Map<number, { year: number; value: number }>();
  for (const r of rows) {
    if (r.admin1Id == null) continue;
    if (!latest.has(r.admin1Id)) {
      latest.set(r.admin1Id, { year: r.year, value: r.value });
    }
  }
  return divisions
    .map((d) => {
      const v = latest.get(d.id);
      if (!v) return null;
      return {
        id: d.id,
        slug: d.slug,
        name: d.name,
        kind: d.kind,
        population: d.population,
        year: v.year,
        value: v.value,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => b.value - a.value);
}

/** Annual urban-agglomeration population (1950–2035) for a city, UN WUP. */
export async function getCityPopulationSeries(
  cityId: number,
): Promise<TimeSeriesPoint[]> {
  const id = await indicatorId(SLUG.cityPopulation);
  if (!id) return [];
  const rows = await prisma.indicatorValue.findMany({
    where: { cityId, indicatorId: id, subjectType: "CITY", dimension: null },
    select: { year: true, value: true, kind: true },
    orderBy: { year: "asc" },
  });
  return rows.map((r) => ({ year: r.year, value: r.value, kind: r.kind }));
}

export type CityPopulationStats = {
  latestYear: number;
  latestValue: number;
  peakYear: number;
  peakValue: number;
  projected2035: number | null;
  /** Growth over the last 20 observed years, as a fraction (0.12 = +12%). */
  growth20yr: number | null;
  /** Compound annual growth rate over the last 20 observed years (fraction). */
  cagr20yr: number | null;
  since1990: number | null;
};

/** Derived growth summary for a city's population series. */
export function computeCityPopulationStats(
  series: TimeSeriesPoint[],
): CityPopulationStats | null {
  const est = series.filter((p) => p.kind === "ESTIMATE");
  if (est.length === 0) return null;
  const latest = est[est.length - 1];
  const at = (y: number) => series.find((p) => p.year === y)?.value ?? null;

  let peak = est[0];
  for (const p of series) if (p.value > peak.value) peak = p;

  const twentyAgo = at(latest.year - 20);
  const growth20yr =
    twentyAgo && twentyAgo > 0 ? latest.value / twentyAgo - 1 : null;
  const cagr20yr =
    twentyAgo && twentyAgo > 0
      ? Math.pow(latest.value / twentyAgo, 1 / 20) - 1
      : null;
  const y1990 = at(1990);
  const since1990 = y1990 && y1990 > 0 ? latest.value / y1990 - 1 : null;

  return {
    latestYear: latest.year,
    latestValue: latest.value,
    peakYear: peak.year,
    peakValue: peak.value,
    projected2035: at(2035),
    growth20yr,
    cagr20yr,
    since1990,
  };
}

/** City / metro TFR series from national statistical offices (when available). */
export async function getCityFertilitySeries(
  cityId: number,
): Promise<TimeSeriesPoint[]> {
  const id = await indicatorId(SLUG.cityFertility);
  if (!id) return [];
  const rows = await prisma.indicatorValue.findMany({
    where: { cityId, indicatorId: id, subjectType: "CITY", dimension: null },
    select: { year: true, value: true, kind: true },
    orderBy: { year: "asc" },
  });
  return rows.map((r) => ({ year: r.year, value: r.value, kind: r.kind }));
}

/** Foreign-born / foreign-citizenship share time series for a city. */
export async function getCityForeignBornSeries(
  cityId: number,
): Promise<TimeSeriesPoint[]> {
  const id = await indicatorId(SLUG.cityForeignBornShare);
  if (!id) return [];
  const rows = await prisma.indicatorValue.findMany({
    where: { cityId, indicatorId: id, subjectType: "CITY", dimension: null },
    select: { year: true, value: true, kind: true },
    orderBy: { year: "asc" },
  });
  return rows.map((r) => ({ year: r.year, value: r.value, kind: r.kind }));
}

export type CityAgeShares = {
  year: number;
  share0to14: number;
  share15to64: number;
  share65plus: number;
};

/** Latest age-structure shares for a city (0–14 / 15–64 / 65+). */
export async function getCityAgeShares(
  cityId: number,
): Promise<CityAgeShares | null> {
  const id = await indicatorId(SLUG.cityAgeShare);
  if (!id) return null;
  const rows = await prisma.indicatorValue.findMany({
    where: {
      cityId,
      indicatorId: id,
      subjectType: "CITY",
      dimension: "age",
    },
    select: { year: true, value: true, dimensionValue: true },
    orderBy: { year: "desc" },
  });
  if (rows.length === 0) return null;
  const year = rows[0].year;
  const atYear = rows.filter((r) => r.year === year);
  const get = (key: string) =>
    atYear.find((r) => r.dimensionValue === key)?.value;
  const share0to14 = get("0-14");
  const share15to64 = get("15-64");
  const share65plus = get("65+");
  if (share0to14 == null || share15to64 == null || share65plus == null) {
    return null;
  }
  return { year, share0to14, share15to64, share65plus };
}

export async function getCitySubdivisions(cityId: number) {
  return prisma.citySubdivision.findMany({
    where: { cityId },
    orderBy: [{ population: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
}

/** City racial / ethnic composition time series (stacked chart ready). */
export async function getCityRaceComposition(cityId: number): Promise<{
  years: number[];
  groups: string[];
  rows: Record<string, number>[];
  sourceNote: string | null;
  sourceUrl: string | null;
  geographyNote: string | null;
} | null> {
  const records = await prisma.cityGroupComposition.findMany({
    where: { cityId, groupKind: "RACE" },
    orderBy: [{ year: "asc" }, { groupName: "asc" }],
  });
  if (records.length === 0) return null;
  const years = [...new Set(records.map((r) => r.year))].sort((a, b) => a - b);
  const groupSet = new Set(records.map((r) => r.groupName));
  // Prefer a stable display order when present.
  const preferred = [
    "White (non-Hispanic)",
    "Hispanic",
    "Black (non-Hispanic)",
    "Asian (non-Hispanic)",
    "Other / Multiple",
  ];
  const groups = [
    ...preferred.filter((g) => groupSet.has(g)),
    ...[...groupSet].filter((g) => !preferred.includes(g)).sort(),
  ];
  const rows = years.map((year) => {
    const row: Record<string, number> = { year };
    for (const g of groups) {
      const hit = records.find((r) => r.year === year && r.groupName === g);
      if (hit) row[g] = hit.share;
    }
    return row;
  });
  const meta = records[records.length - 1];
  return {
    years,
    groups,
    rows,
    sourceNote: meta.sourceNote,
    sourceUrl: meta.sourceUrl,
    geographyNote: meta.geographyNote,
  };
}

/** Borough-level race shares (NYC counties etc.), latest year. */
export async function getCityBoroughRace(cityId: number): Promise<{
  year: number;
  groupOrder: string[];
  rows: Array<{
    name: string;
    population: number | null;
    groups: Record<string, number>;
  }>;
  sourceNote: string | null;
  sourceUrl: string | null;
} | null> {
  const records = await prisma.cityGroupComposition.findMany({
    where: { cityId, groupKind: "RACE_BOROUGH" },
    orderBy: [{ geographyNote: "asc" }, { groupName: "asc" }],
  });
  if (records.length === 0) return null;
  const year = Math.max(...records.map((r) => r.year));
  const atYear = records.filter((r) => r.year === year);
  const byBorough = new Map<
    string,
    { population: number | null; groups: Record<string, number> }
  >();
  const groupSet = new Set<string>();
  for (const r of atYear) {
    const borough = r.geographyNote ?? "Unknown";
    const groupName = r.groupName.includes("::")
      ? r.groupName.split("::").slice(1).join("::")
      : r.groupName;
    groupSet.add(groupName);
    const cur = byBorough.get(borough) ?? { population: null, groups: {} };
    cur.groups[groupName] = r.share;
    if (r.population != null) cur.population = r.population;
    byBorough.set(borough, cur);
  }
  const preferred = [
    "White (non-Hispanic)",
    "Hispanic",
    "Black (non-Hispanic)",
    "Asian (non-Hispanic)",
    "Other / Multiple",
  ];
  const groupOrder = [
    ...preferred.filter((g) => groupSet.has(g)),
    ...[...groupSet].filter((g) => !preferred.includes(g)).sort(),
  ];
  const meta = atYear[0];
  return {
    year,
    groupOrder,
    rows: [...byBorough.entries()].map(([name, v]) => ({
      name,
      population: v.population,
      groups: v.groups,
    })),
    sourceNote: meta.sourceNote,
    sourceUrl: meta.sourceUrl,
  };
}

export async function getCityZipStats(cityId: number) {
  return prisma.cityZipStat.findMany({
    where: { cityId },
    orderBy: [{ medianHouseholdIncome: "desc" }, { zip: "asc" }],
  });
}

export async function getFertilityNowcasts(asOfLabel = "2026") {
  return prisma.fertilityNowcast.findMany({
    where: { asOfLabel },
    include: {
      country: {
        select: { slug: true, flagEmoji: true, name: true },
      },
    },
    orderBy: [{ tfr2026: "asc" }, { label: "asc" }],
  });
}

export async function getCountryFertilityNowcast(countryId: number) {
  return prisma.fertilityNowcast.findFirst({
    where: { countryId, asOfLabel: "2026" },
  });
}

export async function getCityMedianIncome(
  cityId: number,
): Promise<{ year: number; value: number } | null> {
  const id = await indicatorId(SLUG.cityMedianIncome);
  if (!id) return null;
  const row = await prisma.indicatorValue.findFirst({
    where: { cityId, indicatorId: id, subjectType: "CITY" },
    orderBy: { year: "desc" },
    select: { year: true, value: true },
  });
  return row;
}

/** Milestone years for a readable historical population table. */
export function cityPopulationMilestones(
  series: TimeSeriesPoint[],
  years: number[] = [1950, 1960, 1970, 1980, 1985, 1990, 2000, 2010, 2015, 2018, 2025, 2035],
): Array<{ year: number; value: number; kind: string; changeFromPrev: number | null }> {
  const byYear = new Map(series.map((p) => [p.year, p]));
  const out: Array<{
    year: number;
    value: number;
    kind: string;
    changeFromPrev: number | null;
  }> = [];
  for (const y of years) {
    const p = byYear.get(y);
    if (!p) continue;
    const prev = out[out.length - 1];
    const changeFromPrev =
      prev && prev.value > 0 ? p.value / prev.value - 1 : null;
    out.push({
      year: p.year,
      value: p.value,
      kind: p.kind,
      changeFromPrev,
    });
  }
  return out;
}

/** Rank of a city among all seeded cities by (denormalised) population. */
export async function getCityRank(
  cityId: number,
): Promise<{ rank: number; total: number } | null> {
  const city = await prisma.city.findUnique({
    where: { id: cityId },
    select: { population: true },
  });
  if (!city?.population) return null;
  const [ahead, total] = await Promise.all([
    prisma.city.count({ where: { population: { gt: city.population } } }),
    prisma.city.count({ where: { population: { not: null } } }),
  ]);
  return { rank: ahead + 1, total };
}

/** Common nicknames / abbreviations → city slug. */
const CITY_SEARCH_ALIASES: Record<string, string[]> = {
  nyc: ["new-york"],
  "new york city": ["new-york"],
  "n.y.c": ["new-york"],
  "n.y.c.": ["new-york"],
  la: ["los-angeles"],
  "l.a": ["los-angeles"],
  "l.a.": ["los-angeles"],
  sf: ["san-francisco"],
  "sfo": ["san-francisco"],
  "san fran": ["san-francisco"],
  "mexico city": ["mexico-city"],
  cdmx: ["mexico-city"],
  "sao paulo": ["sao-paulo"],
  "são paulo": ["sao-paulo"],
  "hong kong": ["hong-kong"],
  hk: ["hong-kong"],
  "tel aviv": ["tel-aviv"],
  "rio": ["rio-de-janeiro"],
  "rio de janeiro": ["rio-de-janeiro"],
  "washington dc": ["washington"],
  "washington d.c": ["washington"],
  "washington d.c.": ["washington"],
  "dc": ["washington"],
};

/** Search countries, cities and states/provinces for the global search box. */
export async function search(query: string) {
  if (!query.trim())
    return { countries: [], cities: [], regions: [], topics: [], insights: [] };
  const { placeQuery, topic } = parseSearchQuery(query);
  const suggested = suggestSearch(query);
  const q = (placeQuery || query).trim();
  const qLower = q.toLowerCase();
  // Slug form: "new york" → "new-york" so spaced queries hit hyphenated slugs.
  const qSlug = qLower.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const aliasSlugs = CITY_SEARCH_ALIASES[qLower] ?? CITY_SEARCH_ALIASES[qSlug] ?? [];
  const topicHits =
    suggested.topics.length > 0
      ? suggested.topics
      : topic
        ? [
            {
              id: topic.id,
              title: topic.label,
              href: topic.href,
              description:
                placeQuery && topic.hash
                  ? `${topic.label} for matching places`
                  : `Browse ${topic.label.toLowerCase()} data`,
            },
          ]
        : [];

  if (!placeQuery) {
    return {
      countries: [],
      cities: [],
      regions: [],
      topics: topicHits,
      insights: suggested.insights,
    };
  }

  const cityOr: Array<Record<string, unknown>> = [
    { name: { contains: q, mode: "insensitive" } },
    { slug: { contains: q, mode: "insensitive" } },
  ];
  if (qSlug && qSlug !== qLower) {
    cityOr.push({ slug: { contains: qSlug, mode: "insensitive" } });
  }
  for (const slug of aliasSlugs) {
    cityOr.push({ slug: { equals: slug } });
  }

  const [countries, cities, regions] = await Promise.all([
    prisma.country.findMany({
      where: {
        isAggregate: false,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          ...(qSlug
            ? [{ slug: { contains: qSlug, mode: "insensitive" as const } }]
            : []),
          { iso3: { contains: q.toUpperCase(), mode: "insensitive" } },
        ],
      },
      select: { slug: true, name: true, flagEmoji: true, continent: true },
      take: 8,
    }),
    prisma.city.findMany({
      where: { OR: cityOr },
      select: {
        slug: true,
        name: true,
        population: true,
        country: { select: { name: true, flagEmoji: true } },
      },
      orderBy: [{ population: "desc" }],
      take: 8,
    }),
    prisma.admin1.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          ...(qSlug
            ? [{ slug: { contains: qSlug, mode: "insensitive" as const } }]
            : []),
        ],
      },
      select: {
        slug: true,
        name: true,
        kind: true,
        country: { select: { name: true, flagEmoji: true } },
      },
      orderBy: [{ population: "desc" }],
      take: 6,
    }),
  ]);
  const countryHits = countries.map((c) => {
    const dest = countryHrefForSearch(c.slug, topic);
    return { ...c, href: dest.href, hint: dest.hint };
  });
  const countryHrefs = new Set(countryHits.map((c) => c.href));
  return {
    countries: countryHits,
    cities,
    regions,
    topics: topicHits,
    insights: suggested.insights.filter((i) => !countryHrefs.has(i.href)),
  };
}

export async function getDataStats() {
  const [countries, indicators, values, releases] = await Promise.all([
    prisma.country.count({ where: { isAggregate: false } }),
    prisma.indicator.count(),
    prisma.indicatorValue.count(),
    prisma.dataRelease.count(),
  ]);
  return { countries, indicators, values, releases };
}

// ---------------------------------------------------------------------------
// Bilateral migration corridors (UN DESA International Migrant Stock 2024).
// "Where immigrants come from" and "where the diaspora lives".
// ---------------------------------------------------------------------------

export type MigrationCorridor = {
  iso3: string;
  slug: string;
  name: string;
  flagEmoji: string | null;
  value: number; // migrant stock in the latest available year
  prevValue: number | null; // value in the comparison year (for growth)
  share: number; // share of the total across all corridors (0–1)
};

export type MigrationBreakdown = {
  latestYear: number;
  prevYear: number | null;
  total: number; // sum across all corridors in the latest year
  rows: MigrationCorridor[];
};

type CorridorPartner = {
  iso3: string;
  slug: string;
  name: string;
  flagEmoji: string | null;
  isAggregate: boolean;
};

function buildBreakdown(
  flows: { year: number; value: number; partner: CorridorPartner }[],
  limit: number,
): MigrationBreakdown | null {
  if (flows.length === 0) return null;
  const latestYear = Math.max(...flows.map((f) => f.year));
  // Comparison year: the most recent year that is at least a decade earlier.
  const earlierYears = [
    ...new Set(flows.map((f) => f.year).filter((y) => y <= latestYear - 10)),
  ].sort((a, b) => b - a);
  const prevYear = earlierYears[0] ?? null;

  const byPartner = new Map<
    string,
    { partner: CorridorPartner; latest: number; prev: number | null }
  >();
  for (const f of flows) {
    if (f.partner.isAggregate) continue;
    const entry =
      byPartner.get(f.partner.iso3) ??
      { partner: f.partner, latest: 0, prev: null };
    if (f.year === latestYear) entry.latest = f.value;
    if (prevYear != null && f.year === prevYear) entry.prev = f.value;
    byPartner.set(f.partner.iso3, entry);
  }

  const all = [...byPartner.values()].filter((e) => e.latest > 0);
  const total = all.reduce((sum, e) => sum + e.latest, 0);
  const rows = all
    .sort((a, b) => b.latest - a.latest)
    .slice(0, limit)
    .map((e) => ({
      iso3: e.partner.iso3,
      slug: e.partner.slug,
      name: e.partner.name,
      flagEmoji: e.partner.flagEmoji,
      value: e.latest,
      prevValue: e.prev,
      share: total > 0 ? e.latest / total : 0,
    }));

  return { latestYear, prevYear, total, rows };
}

/** Top origin countries of immigrants living in `countryId`. */
export async function getImmigrationOrigins(
  countryId: number,
  limit = 12,
): Promise<MigrationBreakdown | null> {
  const flows = await prisma.migrationFlow.findMany({
    where: { destinationId: countryId, metric: "stock" },
    select: {
      year: true,
      value: true,
      origin: {
        select: {
          iso3: true,
          slug: true,
          name: true,
          flagEmoji: true,
          isAggregate: true,
        },
      },
    },
  });
  return buildBreakdown(
    flows.map((f) => ({ year: f.year, value: f.value, partner: f.origin })),
    limit,
  );
}

/** Top destination countries where people born in `countryId` now live. */
export async function getEmigrationDestinations(
  countryId: number,
  limit = 12,
): Promise<MigrationBreakdown | null> {
  const flows = await prisma.migrationFlow.findMany({
    where: { originId: countryId, metric: "stock" },
    select: {
      year: true,
      value: true,
      destination: {
        select: {
          iso3: true,
          slug: true,
          name: true,
          flagEmoji: true,
          isAggregate: true,
        },
      },
    },
  });
  return buildBreakdown(
    flows.map((f) => ({
      year: f.year,
      value: f.value,
      partner: f.destination,
    })),
    limit,
  );
}
