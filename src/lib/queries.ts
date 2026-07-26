import "server-only";
import { prisma } from "@/lib/prisma";
import { INDICATOR_BY_SLUG, SLUG } from "@/lib/indicators";
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
  return prisma.country.findUnique({
    where: { slug },
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
    const years = await getYearsForIndicator(slug);
    if (years.length === 0) return [] as { year: number; data: RankingRow[] }[];
    const step = opts.step ?? 5;
    const maxFrames = opts.maxFrames ?? 12;
    const latest = years[years.length - 1];
    // Pick evenly spaced years ending on the latest available year.
    const picked: number[] = [];
    for (let y = latest; y >= years[0]; y -= step) {
      if (years.includes(y)) picked.unshift(y);
      if (picked.length >= maxFrames) break;
    }
    if (!picked.includes(latest)) picked.push(latest);
    const frames = await Promise.all(
      picked.map(async (year) => ({
        year,
        data: await getRanking(slug, { year, order: "desc" }),
      })),
    );
    return frames.filter((f) => f.data.length > 0);
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
) {
  const rows = await prisma.groupComposition.findMany({
    where: { countryId, groupKind },
    select: { year: true, groupName: true, share: true },
    orderBy: { year: "asc" },
  });
  if (rows.length === 0) return { groups: [], data: [], note: null as string | null };

  // Union of group names, preserving first-seen order.
  const groups: string[] = [];
  const byYear = new Map<number, Record<string, number>>();
  for (const r of rows) {
    if (!groups.includes(r.groupName)) groups.push(r.groupName);
    const row = byYear.get(r.year) ?? { year: r.year };
    row[r.groupName] = r.share ?? 0;
    byYear.set(r.year, row);
  }
  // Ensure every year has every group (0 when missing) for clean stacking.
  const data = Array.from(byYear.values())
    .map((row) => {
      for (const g of groups) if (!(g in row)) row[g] = 0;
      return row;
    })
    .sort((a, b) => (a.year as number) - (b.year as number));

  return { groups, data, note: null as string | null };
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
    include: { country: { select: { name: true, slug: true, flagEmoji: true } } },
  });
}

export async function getCityBySlug(slug: string) {
  return prisma.city.findUnique({
    where: { slug },
    include: { country: true },
  });
}

/** Search countries + cities by name for the global search box. */
export async function search(query: string) {
  if (!query.trim()) return { countries: [], cities: [] };
  const q = query.trim();
  const [countries, cities] = await Promise.all([
    prisma.country.findMany({
      where: {
        isAggregate: false,
        OR: [
          // SQLite LIKE is case-insensitive for ASCII; on Postgres use citext
          // or add `mode: "insensitive"` for full case-insensitivity.
          { name: { contains: q } },
          { iso3: { contains: q.toUpperCase() } },
        ],
      },
      select: { slug: true, name: true, flagEmoji: true, continent: true },
      take: 8,
    }),
    prisma.city.findMany({
      where: { name: { contains: q } },
      select: {
        slug: true,
        name: true,
        country: { select: { name: true, flagEmoji: true } },
      },
      take: 6,
    }),
  ]);
  return { countries, cities };
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
