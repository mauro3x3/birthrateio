import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Building2, MapPin, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { ChartCard } from "@/components/charts/chart-card";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { MultiSeriesChart } from "@/components/charts/multi-series-chart";
import { PointMap } from "@/components/maps/point-map";
import { CitySubdivisionsTable } from "@/components/city-subdivisions";
import {
  getCityBySlug,
  getCityPopulationSeries,
  getCityRank,
  computeCityPopulationStats,
  cityPopulationMilestones,
  getCityFertilitySeries,
  getCityForeignBornSeries,
  getCityAgeShares,
  getCitySubdivisions,
  getCityRaceComposition,
  getCityBoroughRace,
  getCityZipStats,
  getCityMedianIncome,
  getCountryTimeSeries,
  getLatestValue,
} from "@/lib/queries";
import { CITY_FERTILITY } from "@/lib/sources/city-fertility-data";
import { CITY_FOREIGN_BORN, CITY_AGE_SHARES } from "@/lib/sources/city-demographics-data";
import nycAcs from "@/lib/data/nyc-acs.json";
import { CityRaceChart } from "@/components/charts/city-race-chart";
import {
  CityZipIncomeTable,
  BoroughRaceTable,
} from "@/components/city-income-race";
import { SLUG } from "@/lib/indicators";
import { safe } from "@/lib/safe";
import { formatCompact, formatNumber } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

export const revalidate = 3600;

const WUP_SOURCE = "UN World Urbanization Prospects 2018";
const WUP_URL = "https://population.un.org/wup/";

function formatPct(x: number | null, digits = 0): string {
  if (x == null) return "—";
  return `${x >= 0 ? "+" : ""}${(x * 100).toFixed(digits)}%`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const city = await safe(getCityBySlug(slug), null);
  if (!city) return { title: "City not found" };
  const title = `${city.name} — Population, Fertility & Demographics`;
  const description = `Historical urban population (1950–2035), growth, city fertility, neighbourhoods and demographics for ${city.name}, ${city.country.name}. Sourced from the UN and national statistical offices.`;
  return {
    title,
    description,
    alternates: { canonical: `/city/${slug}` },
    openGraph: { title, description, url: `/city/${slug}` },
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const city = await safe(getCityBySlug(slug), null);
  if (!city) notFound();

  const [
    popSeries,
    rank,
    cityFertility,
    cityForeignBorn,
    cityAge,
    subdivisions,
    raceComp,
    boroughRace,
    zipStats,
    medianIncome,
    nationalFertilityLatest,
    nationalGdpLatest,
    countryFertility,
    countryGdpPc,
  ] = await Promise.all([
    safe(getCityPopulationSeries(city.id), []),
    safe(getCityRank(city.id), null),
    safe(getCityFertilitySeries(city.id), []),
    safe(getCityForeignBornSeries(city.id), []),
    safe(getCityAgeShares(city.id), null),
    safe(getCitySubdivisions(city.id), []),
    safe(getCityRaceComposition(city.id), null),
    safe(getCityBoroughRace(city.id), null),
    safe(getCityZipStats(city.id), []),
    safe(getCityMedianIncome(city.id), null),
    safe(getLatestValue(city.countryId, SLUG.fertility), null),
    safe(getLatestValue(city.countryId, SLUG.gdpPerCapita), null),
    safe(getCountryTimeSeries(city.countryId, SLUG.fertility), []),
    safe(getCountryTimeSeries(city.countryId, SLUG.gdpPerCapita), []),
  ]);

  const stats = computeCityPopulationStats(popSeries);
  const hasHistory = popSeries.length > 0;
  const milestones = cityPopulationMilestones(popSeries);
  const fertilityMeta = CITY_FERTILITY.find((s) => s.citySlug === slug);
  const foreignMeta = [...CITY_FOREIGN_BORN]
    .filter((s) => s.citySlug === slug)
    .sort((a, b) => b.year - a.year)[0];
  const ageMeta = CITY_AGE_SHARES.find((s) => s.citySlug === slug);

  const trajectory: Record<string, number>[] = [
    ...popSeries
      .filter((p) => p.kind === "ESTIMATE")
      .map((p) => ({ year: p.year, observed: p.value })),
    ...popSeries
      .filter((p) => p.kind === "PROJECTION")
      .map((p) => ({ year: p.year, projected: p.value })),
  ];
  const lastEst = [...popSeries].reverse().find((p) => p.kind === "ESTIMATE");
  if (lastEst) {
    const bridge = trajectory.find((r) => r.year === lastEst.year);
    if (bridge) bridge.projected = lastEst.value;
  }

  const headlinePop = stats?.latestValue ?? city.population ?? 0;
  const headlineYear = stats?.latestYear;
  const growing = (stats?.cagr20yr ?? 0) >= 0;
  const latestCityTfr = cityFertility[cityFertility.length - 1];
  const latestForeign = cityForeignBorn[cityForeignBorn.length - 1];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "City",
    name: city.name,
    url: `${siteConfig.url}/city/${slug}`,
    containedInPlace: { "@type": "Country", name: city.country.name },
    ...(city.latitude && city.longitude
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: city.latitude,
            longitude: city.longitude,
          },
        }
      : {}),
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="border-b bg-muted/30">
        <div className="container py-8">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/cities" className="hover:text-foreground">
              Cities
            </Link>
            <span>/</span>
            <Link
              href={`/country/${city.country.slug}`}
              className="hover:text-foreground"
            >
              {city.country.name}
            </Link>
          </div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight md:text-4xl">
            <Building2 className="h-8 w-8 text-primary" />
            {city.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link
              href={`/country/${city.country.slug}`}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <span className="text-lg">{city.country.flagEmoji}</span>
              {city.country.name}
            </Link>
            {city.admin1 && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {city.admin1}
              </span>
            )}
            {city.isCapital && <Badge variant="secondary">Capital</Badge>}
            {rank && (
              <Badge variant="secondary">
                #{rank.rank} of {formatNumber(rank.total, 0)} tracked cities
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="container space-y-10 py-8">
        {/* Headline stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Urban agglomeration"
            value={formatCompact(headlinePop)}
            sub={headlineYear ? `${headlineYear} · UN WUP` : "metro area"}
          />
          {hasHistory && stats ? (
            <StatCard
              label="Growth (20 yrs)"
              value={formatPct(stats.growth20yr)}
              sub={
                stats.cagr20yr != null
                  ? `${formatPct(stats.cagr20yr, 2)} / yr CAGR`
                  : undefined
              }
            />
          ) : (
            <StatCard
              label="National fertility"
              value={
                nationalFertilityLatest
                  ? formatNumber(nationalFertilityLatest.value, 2)
                  : "—"
              }
              sub="births/woman"
            />
          )}
          {latestCityTfr ? (
            <StatCard
              label="City fertility"
              value={formatNumber(latestCityTfr.value, 2)}
              sub={`${latestCityTfr.year} · ${fertilityMeta?.geographyNote ?? "local TFR"}`}
            />
          ) : (
            <StatCard
              label="Peak population"
              value={stats ? formatCompact(stats.peakValue) : "—"}
              sub={stats ? String(stats.peakYear) : undefined}
            />
          )}
          {latestForeign ? (
            <StatCard
              label="Foreign-born / foreign"
              value={`${formatNumber(latestForeign.value, 1)}%`}
              sub={`${latestForeign.year}${foreignMeta ? ` · ${foreignMeta.definition.split("—")[0].trim()}` : ""}`}
            />
          ) : medianIncome ? (
            <StatCard
              label="Median household income"
              value={`$${formatCompact(medianIncome.value)}`}
              sub={`${medianIncome.year} · ACS`}
            />
          ) : (
            <StatCard
              label="Projected 2035"
              value={
                stats?.projected2035 != null
                  ? formatCompact(stats.projected2035)
                  : "—"
              }
              sub="UN projection"
            />
          )}
        </div>

        {medianIncome && latestForeign && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Median household income"
              value={`$${formatCompact(medianIncome.value)}`}
              sub={`${medianIncome.year} · ACS / Census`}
            />
            {raceComp && (
              <StatCard
                label="Largest racial group"
                value={(() => {
                  const latest = raceComp.rows[raceComp.rows.length - 1];
                  let best = raceComp.groups[0];
                  let bestV = -1;
                  for (const g of raceComp.groups) {
                    const v = latest[g];
                    if (typeof v === "number" && v > bestV) {
                      bestV = v;
                      best = g;
                    }
                  }
                  return `${bestV.toFixed(0)}%`;
                })()}
                sub={(() => {
                  const latest = raceComp.rows[raceComp.rows.length - 1];
                  let best = raceComp.groups[0];
                  let bestV = -1;
                  for (const g of raceComp.groups) {
                    const v = latest[g];
                    if (typeof v === "number" && v > bestV) {
                      bestV = v;
                      best = g;
                    }
                  }
                  return `${best} · ${latest.year}`;
                })()}
              />
            )}
          </div>
        )}

        {/* Historical population — centrepiece */}
        {hasHistory && (
          <section className="space-y-4">
            <ChartCard
              title="Population over time"
              description="Urban agglomeration (contiguous built-up area) · observed 1950–2018 (solid) and UN projection to 2035 (dashed)"
              source={WUP_SOURCE}
              csvRows={trajectory}
              csvName={`${slug}-population`}
            >
              <MultiSeriesChart
                data={trajectory}
                decimals={0}
                height={400}
                series={[
                  {
                    key: "observed",
                    label: "Observed",
                    color: "hsl(211 62% 45%)",
                  },
                  {
                    key: "projected",
                    label: "UN projection",
                    color: "hsl(211 62% 45%)",
                    dashed: true,
                  },
                ]}
              />
            </ChartCard>

            {/* Milestone years table — answers "what was it in 1985 / 2000 / 2010?" */}
            {milestones.length > 0 && (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Year</th>
                      <th className="px-3 py-2 font-medium text-right">
                        Population
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        Change
                      </th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.map((m) => (
                      <tr
                        key={m.year}
                        className="border-b last:border-0 even:bg-muted/20"
                      >
                        <td className="px-3 py-2 font-medium tabular-nums">
                          {m.year}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatNumber(m.value, 0)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right tabular-nums ${
                            m.changeFromPrev == null
                              ? "text-muted-foreground"
                              : m.changeFromPrev >= 0
                                ? "text-emerald-700"
                                : "text-red-700"
                          }`}
                        >
                          {formatPct(m.changeFromPrev)}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {m.kind === "PROJECTION" ? "UN projection" : "Estimate"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                  Source:{" "}
                  <a
                    href={WUP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {WUP_SOURCE}
                  </a>
                  . Values are for the urban agglomeration, not the
                  administrative city boundary.
                </p>
              </div>
            )}

            {stats && (
              <div className="rounded-lg border bg-card p-5">
                <div className="flex items-start gap-3">
                  {growing ? (
                    <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  ) : (
                    <TrendingDown className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  )}
                  <div className="space-y-1 text-sm">
                    <p>
                      Since 1990, {city.name}&rsquo;s urban agglomeration grew
                      from{" "}
                      <strong>
                        {formatCompact(
                          popSeries.find((p) => p.year === 1990)?.value ??
                            stats.latestValue,
                        )}
                      </strong>{" "}
                      to <strong>{formatCompact(stats.latestValue)}</strong> (
                      {formatPct(stats.since1990)}). The UN projects{" "}
                      <strong>
                        {stats.projected2035 != null
                          ? formatCompact(stats.projected2035)
                          : "—"}
                      </strong>{" "}
                      by 2035
                      {stats.peakYear > stats.latestYear
                        ? ""
                        : ` · peak so far in ${stats.peakYear}`}.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Estimates run through 2018; later years are UN projections.
                      Source: {WUP_SOURCE}.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* City-level fertility */}
        {cityFertility.length > 0 && (
          <ChartCard
            title={`Fertility rate — ${city.name}`}
            description={
              fertilityMeta
                ? `${fertilityMeta.geographyNote} · total fertility rate`
                : "City / metro total fertility rate"
            }
            source={fertilityMeta?.source ?? "National statistical office"}
            csvRows={cityFertility}
            csvName={`${slug}-city-fertility`}
          >
            <TimeSeriesChart
              data={cityFertility}
              decimals={2}
              height={320}
              referenceY={2.1}
              referenceLabel="Replacement"
              color="hsl(340 82% 52%)"
            />
          </ChartCard>
        )}

        {/* Demographics */}
        {(cityAge || cityForeignBorn.length > 0) && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              Demographics
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cityAge && (
                <>
                  <StatCard
                    label="Ages 0–14"
                    value={`${formatNumber(cityAge.share0to14, 1)}%`}
                    sub={`${cityAge.year}`}
                  />
                  <StatCard
                    label="Ages 15–64"
                    value={`${formatNumber(cityAge.share15to64, 1)}%`}
                    sub={`${cityAge.year}`}
                  />
                  <StatCard
                    label="Ages 65+"
                    value={`${formatNumber(cityAge.share65plus, 1)}%`}
                    sub={`${cityAge.year}`}
                  />
                </>
              )}
              {latestForeign && (
                <StatCard
                  label="Foreign-born / foreign"
                  value={`${formatNumber(latestForeign.value, 1)}%`}
                  sub={String(latestForeign.year)}
                />
              )}
            </div>
            {ageMeta && (
              <p className="text-xs text-muted-foreground">
                Age structure source:{" "}
                {ageMeta.sourceUrl ? (
                  <a
                    href={ageMeta.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {ageMeta.sourceNote}
                  </a>
                ) : (
                  ageMeta.sourceNote
                )}
                .
              </p>
            )}
            {cityForeignBorn.length > 1 && (
              <ChartCard
                title="Foreign-born / foreign citizenship share"
                description={
                  foreignMeta?.definition ??
                  "Share of population that is foreign-born or holds foreign citizenship"
                }
                source={foreignMeta?.sourceNote ?? "National statistical office"}
                csvRows={cityForeignBorn}
                csvName={`${slug}-foreign-born`}
              >
                <TimeSeriesChart
                  data={cityForeignBorn}
                  decimals={1}
                  unit="%"
                  height={280}
                  color="hsl(190 75% 34%)"
                />
              </ChartCard>
            )}
            {cityForeignBorn.length === 1 && foreignMeta && (
              <p className="text-xs text-muted-foreground">
                {foreignMeta.definition}. Source:{" "}
                {foreignMeta.sourceUrl ? (
                  <a
                    href={foreignMeta.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {foreignMeta.sourceNote}
                  </a>
                ) : (
                  foreignMeta.sourceNote
                )}
                .
              </p>
            )}
          </section>
        )}

        {/* Racial / ethnic composition */}
        {raceComp && (
          <ChartCard
            title={`Racial / ethnic composition — ${city.name}`}
            description={
              raceComp.geographyNote
                ? `${raceComp.geographyNote} · share of population`
                : "Share of population by race / ethnicity"
            }
            source={raceComp.sourceNote ?? "National census"}
            csvRows={raceComp.rows}
            csvName={`${slug}-race`}
          >
            <CityRaceChart data={raceComp.rows} groups={raceComp.groups} />
          </ChartCard>
        )}

        {boroughRace && (
          <BoroughRaceTable
            year={boroughRace.year}
            groupOrder={boroughRace.groupOrder}
            sourceNote={boroughRace.sourceNote}
            sourceUrl={boroughRace.sourceUrl}
            rows={boroughRace.rows.map((r) => {
              const income =
                slug === "new-york"
                  ? nycAcs.nyc.boroughs.find((b) => b.name === r.name)
                      ?.medianHouseholdIncome
                  : null;
              return {
                ...r,
                medianHouseholdIncome: income ?? null,
              };
            })}
          />
        )}

        {zipStats.length > 0 && (
          <CityZipIncomeTable
            cityName={city.name}
            rows={zipStats.map((z) => ({
              zip: z.zip,
              population: z.population,
              medianHouseholdIncome: z.medianHouseholdIncome,
              year: z.year,
              sourceNote: z.sourceNote,
              sourceUrl: z.sourceUrl,
            }))}
          />
        )}

        {/* Neighborhoods / wards / boroughs */}
        {subdivisions.length > 0 && (
          <CitySubdivisionsTable
            cityName={city.name}
            rows={subdivisions.map((s) => ({
              slug: s.slug,
              name: s.name,
              kind: s.kind,
              population: s.population,
              year: s.year,
              areaKm2: s.areaKm2,
              sourceNote: s.sourceNote,
              sourceUrl: s.sourceUrl,
            }))}
          />
        )}

        {/* Map — secondary visual, not the hero */}
        {city.latitude && city.longitude && (
          <section className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">Location</h2>
            <PointMap
              lat={city.latitude}
              lng={city.longitude}
              label={`${city.name}, ${city.country.name}`}
              height={280}
            />
            <p className="text-xs text-muted-foreground">
              Coordinates {city.latitude.toFixed(2)}, {city.longitude.toFixed(2)}{" "}
              · map tiles © OpenStreetMap / CARTO
            </p>
          </section>
        )}

        {/* National context */}
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight">
              National context — {city.country.name}
            </h2>
            <Link
              href={`/country/${city.country.slug}`}
              className="text-sm text-primary hover:underline"
            >
              Full country profile →
            </Link>
          </div>
          <div className="mb-4 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            Where city-level figures are unavailable, we show{" "}
            <strong>national</strong> series for {city.country.name} as context —
            never invented neighbourhood or city estimates. Latest national
            fertility:{" "}
            <strong>
              {nationalFertilityLatest
                ? formatNumber(nationalFertilityLatest.value, 2)
                : "—"}
            </strong>
            {nationalGdpLatest
              ? ` · GDP/capita $${formatCompact(nationalGdpLatest.value)}`
              : ""}
            .
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title={`${city.country.name} — Fertility rate`}
              description="National total fertility rate"
              source="World Bank"
              csvRows={countryFertility}
              csvName={`${slug}-country-fertility`}
            >
              <TimeSeriesChart
                data={countryFertility}
                decimals={2}
                referenceY={2.1}
                referenceLabel="Replacement"
                color="hsl(340 82% 52%)"
              />
            </ChartCard>
            <ChartCard
              title={`${city.country.name} — GDP per capita`}
              description="National GDP per capita (US$)"
              source="World Bank"
              csvRows={countryGdpPc}
              csvName={`${slug}-country-gdp-pc`}
            >
              <TimeSeriesChart
                data={countryGdpPc}
                decimals={0}
                unit="US$"
                color="hsl(142 71% 45%)"
              />
            </ChartCard>
          </div>
        </section>
      </div>
    </div>
  );
}
