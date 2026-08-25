import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ChartCard } from "@/components/charts/chart-card";
import { ChartBrandProvider } from "@/components/charts/chart-brand";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { CiteThis } from "@/components/data/cite-this";
import { RankingTable } from "@/components/ranking-table";
import { Badge } from "@/components/ui/badge";
import { resolveCountrySlug } from "@/lib/country-aliases";
import {
  COUNTRY_TOPICS,
  COUNTRY_TOPIC_BY_ID,
  countryTopicHref,
  topicPageMetaDescription,
  topicPageTitle,
  type CountryTopicId,
} from "@/lib/country-topics";
import { INDICATOR_BY_SLUG, SLUG } from "@/lib/indicators";
import {
  getCountryBySlug,
  getCountryRankBySlug,
  getCountrySeriesBatch,
  getCountryTimeSeries,
  getProjections,
  getRanking,
  getRelatedCountries,
  getWorldLatestValue,
} from "@/lib/queries";
import { safe } from "@/lib/safe";
import { siteConfig } from "@/lib/site";
import { formatByUnit, formatCompact, formatNumber } from "@/lib/utils";


export const countryTopicRevalidate = 86400;

function formatLeadValue(
  value: number,
  unit: string,
  decimals: number,
): string {
  return formatByUnit(value, unit, decimals);
}

function buildLeadProse(opts: {
  countryName: string;
  topicName: string;
  metricLabel: string;
  definition: string;
  valueLabel: string;
  year: number;
  rank: number | null;
  total: number | null;
  worldLabel: string | null;
  firstYear: number | null;
  firstValueLabel: string | null;
  changeLabel: string | null;
}) {
  const rankBit =
    opts.rank && opts.total
      ? ` That places ${opts.countryName} ${opts.rank} of ${opts.total} countries with recent data.`
      : "";
  const worldBit = opts.worldLabel
    ? ` The world figure for the same period is ${opts.worldLabel}.`
    : "";
  const historyBit =
    opts.firstYear && opts.firstValueLabel && opts.changeLabel
      ? ` In ${opts.firstYear} the figure was ${opts.firstValueLabel} — ${opts.changeLabel} since then.`
      : opts.firstYear && opts.firstValueLabel
        ? ` Comparable figures begin in ${opts.firstYear}, when the value was ${opts.firstValueLabel}.`
        : "";

  return `${opts.countryName}'s ${opts.metricLabel} is ${opts.valueLabel} as of ${opts.year} — ${opts.definition}.${rankBit}${worldBit}${historyBit}`;
}

export async function generateCountryTopicMetadata(
  topicId: CountryTopicId,
  slug: string,
): Promise<Metadata> {
  const topic = COUNTRY_TOPIC_BY_ID.get(topicId);
  if (!topic) return { title: "Not found" };
  const canonicalSlug = resolveCountrySlug(slug);
  const country = await safe(getCountryBySlug(canonicalSlug), null);
  if (!country) return { title: "Country not found" };

  let primarySlug = topic.primarySlug;
  let rank = await safe(
    getCountryRankBySlug(canonicalSlug, primarySlug, { order: topic.order }),
    null,
  );
  // GDP PPP series can be thinner — fall back to current-dollar per capita.
  if (!rank && topicId === "gdp") {
    primarySlug = SLUG.gdpPerCapita;
    rank = await safe(
      getCountryRankBySlug(canonicalSlug, primarySlug, { order: topic.order }),
      null,
    );
  }

  const ind = INDICATOR_BY_SLUG.get(primarySlug);
  const valueLabel = rank
    ? formatLeadValue(rank.value, topic.unit, ind?.decimals ?? topic.decimals)
    : undefined;
  const title = topicPageTitle(topic, country.name, rank?.year);
  const description = topicPageMetaDescription(topic, country.name, {
    valueLabel,
    year: rank?.year,
    rank: rank?.rank,
    total: rank?.total,
  });
  const path = countryTopicHref(topicId, country.slug);

  return {
    title: `${title} — Charts & Data`,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: "article",
    },
  };
}

export async function CountryTopicPage({
  topicId,
  slug,
}: {
  topicId: CountryTopicId;
  slug: string;
}) {
  const topic = COUNTRY_TOPIC_BY_ID.get(topicId);
  if (!topic) notFound();

  const canonicalSlug = resolveCountrySlug(slug);
  if (canonicalSlug !== slug) {
    permanentRedirect(countryTopicHref(topicId, canonicalSlug));
  }

  const country = await safe(getCountryBySlug(canonicalSlug), null);
  if (!country) notFound();

  let primarySlug = topic.primarySlug;
  let primarySeries = await safe(
    getCountryTimeSeries(country.id, primarySlug),
    [],
  );
  if (primarySeries.length === 0 && topicId === "gdp") {
    primarySlug = SLUG.gdpPerCapita;
    primarySeries = await safe(
      getCountryTimeSeries(country.id, primarySlug),
      [],
    );
  }

  const secondarySlugs = topic.secondarySlugs.filter((s) => s !== primarySlug);
  const [
    rank,
    world,
    related,
    secondary,
    nearbyRanking,
    projections,
    popShares,
  ] = await Promise.all([
    safe(
      getCountryRankBySlug(slug, primarySlug, { order: topic.order }),
      null,
    ),
    safe(getWorldLatestValue(primarySlug), null),
    safe(
      getRelatedCountries(country.id, {
        continent: country.continent,
        limit: 10,
      }),
      [],
    ),
    safe(getCountrySeriesBatch(country.id, secondarySlugs), {}),
    safe(getRanking(primarySlug, { order: topic.order, limit: 12 }), []),
    topicId === "population"
      ? safe(getProjections(country.id), [])
      : Promise.resolve([]),
    topicId === "population"
      ? safe(
          getCountrySeriesBatch(country.id, [
            SLUG.popShare0to14,
            SLUG.popShare15to64,
            SLUG.popShare65plus,
          ]),
          {},
        )
      : Promise.resolve({} as Record<string, never>),
  ]);

  const primaryInd = INDICATOR_BY_SLUG.get(primarySlug);
  const decimals = primaryInd?.decimals ?? topic.decimals;
  const latest =
    rank ??
    (primarySeries.length
      ? {
          value: primarySeries[primarySeries.length - 1].value,
          year: primarySeries[primarySeries.length - 1].year,
          rank: null as number | null,
          total: null as number | null,
        }
      : null);

  if (!latest && primarySeries.length === 0) {
    // Still show the page shell with a clear empty state so the URL is crawlable.
  }

  const valueLabel = latest
    ? formatLeadValue(latest.value, topic.unit, decimals)
    : null;
  const worldLabel = world
    ? formatLeadValue(world.value, topic.unit, decimals)
    : null;

  const first = primarySeries[0] ?? null;
  const firstValueLabel = first
    ? formatLeadValue(first.value, topic.unit, decimals)
    : null;
  let changeLabel: string | null = null;
  if (first && latest && first.value !== 0) {
    const pct = ((latest.value - first.value) / Math.abs(first.value)) * 100;
    const abs = latest.value - first.value;
    if (topic.unit.includes("%") || topic.primarySlug.includes("growth")) {
      changeLabel = `${abs >= 0 ? "up" : "down"} ${formatNumber(Math.abs(abs), decimals)} points`;
    } else if (Math.abs(pct) >= 0.5) {
      changeLabel = `${pct >= 0 ? "up" : "down"} ${formatNumber(Math.abs(pct), 0)}%`;
    }
  }

  const lead =
    latest && valueLabel
      ? buildLeadProse({
          countryName: country.name,
          topicName: topic.name,
          metricLabel: topic.metricLabel,
          definition: topic.definition,
          valueLabel,
          year: latest.year,
          rank: "rank" in latest ? (latest.rank as number | null) : null,
          total: "total" in latest ? (latest.total as number | null) : null,
          worldLabel,
          firstYear: first?.year ?? null,
          firstValueLabel,
          changeLabel,
        })
      : `${country.name} does not yet have a published series for ${topic.metricLabel} in our database. Browse the ${topic.name.toLowerCase()} explorer for countries that do.`;

  const path = countryTopicHref(topicId, slug);
  const pageTitle = topicPageTitle(topic, country.name, latest?.year);

  // Projection snapshot for population pages (2050 medium variant).
  const proj2050 =
    topicId === "population"
      ? projections.find((p) => p.year === 2050 && p.scenario === "medium")
      : null;
  const proj2100 =
    topicId === "population"
      ? projections.find((p) => p.year === 2100 && p.scenario === "medium")
      : null;

  const age0 = popShares[SLUG.popShare0to14]?.at(-1);
  const age15 = popShares[SLUG.popShare15to64]?.at(-1);
  const age65 = popShares[SLUG.popShare65plus]?.at(-1);

  const otherTopics = COUNTRY_TOPICS.filter((t) => t.id !== topicId);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: pageTitle,
    description: lead,
    url: `${siteConfig.url}${path}`,
    creator: { "@type": "Organization", name: siteConfig.name },
    temporalCoverage: first
      ? `${first.year}/${latest?.year ?? first.year}`
      : undefined,
    spatialCoverage: {
      "@type": "Place",
      name: country.name,
      identifier: country.iso3,
    },
    variableMeasured: primaryInd?.name ?? topic.metricLabel,
    isBasedOn: "https://data.worldbank.org/",
  };

  const sourceName =
    primaryInd?.source === "WORLD_BANK"
      ? "World Bank"
      : primaryInd?.source === "OWID"
        ? "Our World in Data"
        : "Official statistics";

  // Nearby ranking: put this country in context (show slice around its rank).
  const contextRows = (() => {
    if (!rank) return nearbyRanking.slice(0, 10);
    const full = nearbyRanking; // only top 12 fetched — enough for "top of table" context
    return full;
  })();

  return (
    <ChartBrandProvider subject={country.name} path={path}>
      <div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <PageHeader
          title={
            <span className="inline-flex flex-wrap items-center gap-3">
              <span className="text-4xl md:text-5xl">
                {country.flagEmoji ?? "🏳️"}
              </span>
              <span>
                {country.name} {topic.name.toLowerCase()}
                {latest?.year ? (
                  <span className="text-muted-foreground"> ({latest.year})</span>
                ) : null}
              </span>
            </span>
          }
          description={lead}
        >
          {rank ? (
            <Badge variant="secondary" className="tabular-nums">
              Rank {rank.rank} / {rank.total}
            </Badge>
          ) : null}
        </PageHeader>

        <div className="container space-y-10 py-8">
          {/* Key figures — server-rendered numbers Google can index */}
          <section aria-labelledby="key-figures">
            <h2
              id="key-figures"
              className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
            >
              Key figures
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="border-t border-border pt-3">
                <dt className="text-xs text-muted-foreground">
                  {topic.metricLabel}
                </dt>
                <dd className="mt-1 font-serif text-2xl font-semibold tabular-nums tracking-tight">
                  {valueLabel ?? "—"}
                </dd>
                <dd className="text-xs text-muted-foreground">
                  {latest ? latest.year : "—"}
                </dd>
              </div>
              <div className="border-t border-border pt-3">
                <dt className="text-xs text-muted-foreground">World</dt>
                <dd className="mt-1 font-serif text-2xl font-semibold tabular-nums tracking-tight">
                  {worldLabel ?? "—"}
                </dd>
                <dd className="text-xs text-muted-foreground">
                  {world ? world.year : "—"}
                </dd>
              </div>
              <div className="border-t border-border pt-3">
                <dt className="text-xs text-muted-foreground">Series start</dt>
                <dd className="mt-1 font-serif text-2xl font-semibold tabular-nums tracking-tight">
                  {firstValueLabel ?? "—"}
                </dd>
                <dd className="text-xs text-muted-foreground">
                  {first ? first.year : "—"}
                </dd>
              </div>
              <div className="border-t border-border pt-3">
                <dt className="text-xs text-muted-foreground">Global rank</dt>
                <dd className="mt-1 font-serif text-2xl font-semibold tabular-nums tracking-tight">
                  {rank ? `#${rank.rank}` : "—"}
                </dd>
                <dd className="text-xs text-muted-foreground">
                  {rank ? `of ${rank.total}` : "—"}
                </dd>
              </div>
            </dl>
          </section>

          {primarySeries.length > 0 && (
            <ChartCard
              title={`${country.name} ${topic.metricLabel} over time`}
              description={`${primaryInd?.name ?? topic.metricLabel} · ${topic.unit}`}
              source={sourceName}
              csvRows={primarySeries}
              csvName={`${slug}-${primarySlug}`}
            >
              <TimeSeriesChart
                data={primarySeries}
                decimals={decimals}
                unit={
                  topic.unit.includes("%")
                    ? "%"
                    : topic.unit.includes("US$") || topic.unit.includes("$")
                      ? undefined
                      : undefined
                }
                color="hsl(211 62% 45%)"
                referenceY={
                  topicId === "fertility"
                    ? 2.1
                    : topicId === "migration"
                      ? 0
                      : undefined
                }
                referenceLabel={
                  topicId === "fertility"
                    ? "Replacement"
                    : topicId === "migration"
                      ? "Net zero"
                      : undefined
                }
              />
            </ChartCard>
          )}

          {/* Population-specific SSR blocks */}
          {topicId === "population" && (age0 || age15 || age65) && (
            <section aria-labelledby="age-structure">
              <h2
                id="age-structure"
                className="font-serif text-xl font-semibold tracking-tight text-primary"
              >
                Population by age
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Share of {country.name}&apos;s population in broad age groups
                {age0 ? ` as of ${age0.year}` : ""}. A young age structure raises
                crude birth rates even at moderate fertility; an older one raises
                crude death rates even when mortality risk at every age is falling.
              </p>
              <dl className="mt-5 grid grid-cols-3 gap-4">
                {[
                  { label: "Ages 0–14", point: age0 },
                  { label: "Ages 15–64", point: age15 },
                  { label: "Ages 65+", point: age65 },
                ].map((g) => (
                  <div key={g.label} className="border-t border-border pt-3">
                    <dt className="text-xs text-muted-foreground">{g.label}</dt>
                    <dd className="mt-1 font-serif text-2xl font-semibold tabular-nums">
                      {g.point
                        ? `${formatNumber(g.point.value, 1)}%`
                        : "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {topicId === "population" && (proj2050 || proj2100) && (
            <section aria-labelledby="projections">
              <h2
                id="projections"
                className="font-serif text-xl font-semibold tracking-tight text-primary"
              >
                Population projection
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                UN World Population Prospects medium variant — a projection
                conditional on assumed fertility, mortality and migration paths,
                not a forecast of what will happen.
              </p>
              <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {latest && (
                  <div className="border-t border-border pt-3">
                    <dt className="text-xs text-muted-foreground">
                      Latest estimate
                    </dt>
                    <dd className="mt-1 font-serif text-2xl font-semibold tabular-nums">
                      {formatCompact(latest.value)}
                    </dd>
                    <dd className="text-xs text-muted-foreground">
                      {latest.year}
                    </dd>
                  </div>
                )}
                {proj2050 && (
                  <div className="border-t border-border pt-3">
                    <dt className="text-xs text-muted-foreground">
                      Projected 2050
                    </dt>
                    <dd className="mt-1 font-serif text-2xl font-semibold tabular-nums">
                      {formatCompact(proj2050.population)}
                    </dd>
                    <dd className="text-xs text-muted-foreground">
                      UN medium
                    </dd>
                  </div>
                )}
                {proj2100 && (
                  <div className="border-t border-border pt-3">
                    <dt className="text-xs text-muted-foreground">
                      Projected 2100
                    </dt>
                    <dd className="mt-1 font-serif text-2xl font-semibold tabular-nums">
                      {formatCompact(proj2100.population)}
                    </dd>
                    <dd className="text-xs text-muted-foreground">
                      UN medium
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {/* Secondary series */}
          {secondarySlugs.map((s) => {
            const series = secondary[s];
            if (!series?.length) return null;
            const ind = INDICATOR_BY_SLUG.get(s);
            if (!ind) return null;
            return (
              <ChartCard
                key={s}
                title={ind.name}
                description={ind.description}
                source={
                  ind.source === "WORLD_BANK" ? "World Bank" : ind.source
                }
                csvRows={series}
                csvName={`${slug}-${s}`}
              >
                <TimeSeriesChart
                  data={series}
                  decimals={ind.decimals}
                  color="hsl(155 55% 38%)"
                />
              </ChartCard>
            );
          })}

          {contextRows.length > 0 && (
            <section aria-labelledby="context-ranking">
              <h2
                id="context-ranking"
                className="font-serif text-xl font-semibold tracking-tight text-primary"
              >
                How {country.name} compares
              </h2>
              <p className="mt-2 mb-5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Latest available {topic.metricLabel} for every country.{" "}
                <Link href={topic.hubPath} className="link-editorial">
                  Full {topic.name.toLowerCase()} rankings →
                </Link>
              </p>
              <RankingTable
                rows={contextRows}
                unit={topic.unit}
                decimals={decimals}
                valueLabel={topic.name}
                linkTopic={topicId}
              />
            </section>
          )}

          {/* Internal linking: peers + other topics + country hub */}
          <section aria-labelledby="related-countries">
            <h2
              id="related-countries"
              className="font-serif text-xl font-semibold tracking-tight text-primary"
            >
              Related countries
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {country.continent
                ? `Other countries in ${country.continent} — compare their ${topic.metricLabel}, or open the full country profile.`
                : `Compare ${topic.metricLabel} with other countries.`}
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={countryTopicHref(topicId, r.slug)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <span className="text-lg">{r.flagEmoji ?? "🏳️"}</span>
                    <span className="font-medium">{r.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {topic.name}
                    </span>
                  </Link>
                  <div className="flex flex-wrap gap-x-3 px-2 pb-1 text-xs text-muted-foreground">
                    <Link
                      href={`/country/${r.slug}`}
                      className="hover:text-foreground"
                    >
                      Profile
                    </Link>
                    <Link
                      href={`/compare/${slug}/${r.slug}`}
                      className="hover:text-foreground"
                    >
                      Compare
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="more-on-country">
            <h2
              id="more-on-country"
              className="font-serif text-xl font-semibold tracking-tight text-primary"
            >
              More on {country.name}
            </h2>
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <li>
                <Link
                  href={`/country/${slug}`}
                  className="link-editorial font-medium"
                >
                  Full country profile →
                </Link>
              </li>
              {otherTopics.map((t) => (
                <li key={t.id}>
                  <Link
                    href={countryTopicHref(t.id, slug)}
                    className="link-editorial"
                  >
                    {t.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={topic.hubPath} className="link-editorial">
                  All {topic.name.toLowerCase()} data
                </Link>
              </li>
              <li>
                <Link
                  href={`/compare?countries=${slug}`}
                  className="link-editorial"
                >
                  Compare
                </Link>
              </li>
            </ul>
          </section>

          <CiteThis
            title={pageTitle}
            path={path}
            sources={[sourceName]}
          />

          <p className="text-xs leading-relaxed text-muted-foreground">
            Figures are estimates from statistical agencies and may be revised.
            See{" "}
            <Link href="/methodology" className="underline underline-offset-2">
              methodology
            </Link>{" "}
            and{" "}
            <Link href="/sources" className="underline underline-offset-2">
              data sources
            </Link>
            .
          </p>
        </div>
      </div>
    </ChartBrandProvider>
  );
}

/** Thin route helpers so each App Router folder stays one file. */
export function makeCountryTopicHandlers(topicId: CountryTopicId) {
  return {
    generateMetadata: async ({
      params,
    }: {
      params: Promise<{ slug: string }>;
    }) => {
      const { slug } = await params;
      return generateCountryTopicMetadata(topicId, slug);
    },
    Page: async ({ params }: { params: Promise<{ slug: string }> }) => {
      const { slug } = await params;
      return <CountryTopicPage topicId={topicId} slug={slug} />;
    },
  };
}
