import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftRight, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { ChartCard } from "@/components/charts/chart-card";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { MultiSeriesChart } from "@/components/charts/multi-series-chart";
import { PopulationPyramid } from "@/components/charts/population-pyramid";
import {
  CompositionChart,
  CompositionLegend,
} from "@/components/charts/composition-chart";
import { CompositionBar } from "@/components/charts/composition-bar";
import { EthnicityPyramid } from "@/components/charts/ethnicity-pyramid";
import { buildEthnicityPyramid } from "@/lib/ethnicity-pyramid";
import { RELIGION_COLORS, RELIGION_COLOR_FALLBACK } from "@/lib/sources/religion-data";
import {
  getComposition,
  getCompositionLatest,
  getCountryBySlug,
  getCountryStats,
  getCountryTimeSeries,
  getEmigrationDestinations,
  getImmigrationOrigins,
  getLatestValue,
  getCountryFertilityNowcast,
  getPopulationPyramid,
  getProjections,
  getAdmin1FertilityRanking,
} from "@/lib/queries";
import { MigrationBreakdownList } from "@/components/migration-breakdown";
import { BIRTH_BACKGROUND_NOTES } from "@/lib/sources/birth-background-data";
import {
  CRIME_AVAILABILITY_BY_ISO3,
  getCrimeMeta,
  USA_CRIME_NOTES,
} from "@/lib/sources/crime-by-origin-data";
import { SLUG } from "@/lib/indicators";
import { safe } from "@/lib/safe";
import { formatByUnit, formatCompact, formatNumber } from "@/lib/utils";
import { siteConfig } from "@/lib/site";
import { StackedBarChart } from "@/components/charts/stacked-bar-chart";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const country = await safe(getCountryBySlug(slug), null);
  if (!country) return { title: "Country not found" };
  const title = `${country.name} — Demographics, Fertility & Population`;
  const description = `Population, fertility rate, GDP, migration and projections for ${country.name}. Interactive charts and demographic data from World Bank, UN and OECD.`;
  return {
    title,
    description,
    alternates: { canonical: `/country/${slug}` },
    openGraph: { title, description, url: `/country/${slug}`, type: "profile" },
  };
}

function trend(series: { year: number; value: number }[]): number | null {
  if (series.length < 2) return null;
  const last = series[series.length - 1].value;
  const prev = series[series.length - 2].value;
  if (prev === 0) return null;
  return ((last - prev) / Math.abs(prev)) * 100;
}

export default async function CountryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const country = await safe(getCountryBySlug(slug), null);
  if (!country) notFound();

  const [
    population,
    fertility,
    birthRate,
    deathRate,
    gdp,
    gdpPerCapita,
    migration,
    lifeExp,
    historicDeathRate,
    childMortality,
    abortion,
    foreignBorn,
    foreignBornShare,
    unemploymentNativeBorn,
    unemploymentForeignBorn,
    immigrationOrigins,
    emigrationDestinations,
    stats,
    pyramid,
    projections,
    composition,
    birthsComposition,
    birthsBackground,
    religion,
    homicide,
    divorce,
    nonmarital,
    homeownership,
    fertilityNowcast,
    crimeAncestry,
    crimeCitizenship,
    crimeBackground,
    crimeRacePrison,
    crimeRaceArrest,
    crimeRaceMurder,
    foreignPrisonerShare,
    admin1Ranking,
  ] = await Promise.all([
    safe(getCountryTimeSeries(country.id, SLUG.population), []),
    safe(getCountryTimeSeries(country.id, SLUG.fertility), []),
    safe(getCountryTimeSeries(country.id, SLUG.birthRate), []),
    safe(getCountryTimeSeries(country.id, SLUG.deathRate), []),
    safe(getCountryTimeSeries(country.id, SLUG.gdp), []),
    safe(getCountryTimeSeries(country.id, SLUG.gdpPerCapita), []),
    safe(getCountryTimeSeries(country.id, SLUG.netMigration), []),
    safe(getCountryTimeSeries(country.id, SLUG.lifeExpectancy), []),
    safe(getCountryTimeSeries(country.id, SLUG.historicDeathRate), []),
    safe(getCountryTimeSeries(country.id, SLUG.childMortality), []),
    safe(getCountryTimeSeries(country.id, SLUG.abortionRate), []),
    safe(getCountryTimeSeries(country.id, SLUG.migrantStock), []),
    safe(getCountryTimeSeries(country.id, SLUG.migrantStockShare), []),
    safe(getCountryTimeSeries(country.id, SLUG.unemploymentNativeBorn), []),
    safe(getCountryTimeSeries(country.id, SLUG.unemploymentForeignBorn), []),
    safe(getImmigrationOrigins(country.id), null),
    safe(getEmigrationDestinations(country.id), null),
    safe(getCountryStats(country.id), {}),
    safe(getPopulationPyramid(country.id), { year: null, rows: [] }),
    safe(getProjections(country.id), []),
    safe(getComposition(country.id), { groups: [], data: [], note: null }),
    safe(getComposition(country.id, "BIRTHS_ETHNICITY"), {
      groups: [],
      data: [],
      note: null,
    }),
    safe(getComposition(country.id, "BIRTHS_BACKGROUND"), {
      groups: [],
      data: [],
      note: null,
    }),
    safe(getCompositionLatest(country.id, "RELIGION"), { year: null, items: [] }),
    safe(getCountryTimeSeries(country.id, SLUG.homicideRate), []),
    safe(getLatestValue(country.id, SLUG.divorceRate), null),
    safe(getLatestValue(country.id, SLUG.nonmaritalBirths), null),
    safe(getLatestValue(country.id, SLUG.homeownershipRate), null),
    safe(getCountryFertilityNowcast(country.id), null),
    safe(
      getComposition(country.id, "CRIME_ANCESTRY", { useCounts: true }),
      { groups: [], data: [], note: null, useCounts: false },
    ),
    safe(
      getComposition(country.id, "CRIME_CITIZENSHIP", { useCounts: true }),
      { groups: [], data: [], note: null, useCounts: false },
    ),
    safe(getComposition(country.id, "CRIME_BACKGROUND"), {
      groups: [],
      data: [],
      note: null,
      useCounts: false,
    }),
    safe(
      getComposition(country.id, "CRIME_RACE_PRISON", { useCounts: true }),
      { groups: [], data: [], note: null, useCounts: false },
    ),
    safe(
      getComposition(country.id, "CRIME_RACE_ARREST", { useCounts: true }),
      { groups: [], data: [], note: null, useCounts: false },
    ),
    safe(
      getComposition(country.id, "CRIME_RACE_MURDER", { useCounts: true }),
      { groups: [], data: [], note: null, useCounts: false },
    ),
    safe(getCountryTimeSeries(country.id, SLUG.foreignPrisonerShare), []),
    safe(getAdmin1FertilityRanking(country.id), []),
  ]);

  const crimeAvailability = CRIME_AVAILABILITY_BY_ISO3.get(country.iso3) ?? null;
  const crimeMeta = getCrimeMeta(country.iso3);
  const hasCrimeBreakdown =
    crimeAncestry.groups.length > 0 ||
    crimeCitizenship.groups.length > 0 ||
    crimeBackground.groups.length > 0 ||
    crimeRacePrison.groups.length > 0 ||
    crimeRaceArrest.groups.length > 0 ||
    crimeRaceMurder.groups.length > 0;

  const lifeExpStart = lifeExp.length ? lifeExp[0].year : null;
  const hasHistoricMortality =
    lifeExp.length > 0 ||
    historicDeathRate.length > 0 ||
    childMortality.length > 0;
  const lifeExpSource =
    lifeExpStart != null && lifeExpStart < 1960
      ? "OWID / HMD / UN (pre-1960) · World Bank (from 1960)"
      : "World Bank";

  // Build projection overlay rows keyed by year.
  const projByYear = new Map<number, Record<string, number>>();
  for (const p of projections) {
    const row = projByYear.get(p.year) ?? { year: p.year };
    row[p.scenario] = p.population;
    projByYear.set(p.year, row);
  }
  const projectionData = Array.from(projByYear.values()).sort(
    (a, b) => a.year - b.year,
  );

  // Continuous population trajectory: observed history (solid) flowing into the
  // UN medium-variant projection (dashed) through 2100 — the full-arc view.
  const lastHist = population.length ? population[population.length - 1] : null;
  const populationTrajectory: Record<string, number>[] = [
    ...population.map((p) => ({ year: p.year, observed: p.value })),
    ...projectionData
      .filter(
        (r) =>
          typeof r.medium === "number" &&
          (!lastHist || r.year > lastHist.year),
      )
      .map((r) => ({ year: r.year, projected: r.medium })),
  ];
  if (lastHist) {
    // Bridge point so the dashed projection connects to the solid history line.
    const bridge = populationTrajectory.find((r) => r.year === lastHist.year);
    if (bridge) bridge.projected = lastHist.value;
  }
  const hasProjection = populationTrajectory.some(
    (r) => typeof r.projected === "number",
  );

  // Crude birth vs death rates (per 1,000) — only chart when both series exist.
  const birthsVsDeaths: Record<string, number | null>[] = (() => {
    if (!birthRate.length || !deathRate.length) return [];
    const years = new Set([
      ...birthRate.map((p) => p.year),
      ...deathRate.map((p) => p.year),
    ]);
    const bMap = new Map(birthRate.map((p) => [p.year, p.value]));
    const dMap = new Map(deathRate.map((p) => [p.year, p.value]));
    return Array.from(years)
      .sort((a, b) => a - b)
      .map((year) => ({
        year,
        birthRate: bMap.get(year) ?? null,
        deathRate: dMap.get(year) ?? null,
      }));
  })();

  // Pyramid transform.
  const pyramidMap = new Map<
    string,
    { ageGroup: string; ageStart: number; male: number; female: number }
  >();
  for (const r of pyramid.rows) {
    const cur =
      pyramidMap.get(r.ageGroup) ??
      { ageGroup: r.ageGroup, ageStart: r.ageStart, male: 0, female: 0 };
    if (r.sex === "male") cur.male = r.population;
    else cur.female = r.population;
    pyramidMap.set(r.ageGroup, cur);
  }
  const pyramidRows = Array.from(pyramidMap.values());

  // Modeled population pyramid by ethnicity (blends overall + births comp).
  // Anchor "overall" to the composition snapshot closest to the pyramid's year
  // — NOT the last row, which may be a future census projection (e.g. the US
  // series runs to 2060). Using the projected future share would wrongly
  // flatten or even invert the age gradient (older cohorts should skew toward
  // the historical, less-diverse composition).
  const snapshotForYear = (
    rows: Array<Record<string, number>>,
    year: number,
  ): Record<string, number> | undefined => {
    if (!rows.length) return undefined;
    const past = rows.filter((r) => Number(r.year) <= year);
    return past.length ? past[past.length - 1] : rows[0];
  };
  const refYear = pyramid.year ?? new Date().getFullYear();
  const compLatest = snapshotForYear(
    composition.data as Array<Record<string, number>>,
    refYear,
  );
  const birthLatest =
    snapshotForYear(
      birthsComposition.data as Array<Record<string, number>>,
      refYear,
    ) ?? compLatest;
  const ethnicityPyramid =
    compLatest && composition.groups.length > 0 && pyramidRows.length > 0
      ? buildEthnicityPyramid(
          pyramidRows,
          Object.fromEntries(composition.groups.map((g) => [g, compLatest[g] ?? 0])),
          Object.fromEntries(
            composition.groups.map((g) => [g, (birthLatest ?? compLatest)[g] ?? 0]),
          ),
          composition.groups,
        )
      : null;

  const s = stats as Record<string, { value: number; year: number } | null>;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: country.name,
    url: `${siteConfig.url}/country/${slug}`,
    ...(country.latitude && country.longitude
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: country.latitude,
            longitude: country.longitude,
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

      {/* Header */}
      <div className="border-b bg-muted/30">
        <div className="container py-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/" className="hover:text-foreground">
                  Home
                </Link>
                <span>/</span>
                <Link href="/population" className="hover:text-foreground">
                  Countries
                </Link>
              </div>
              <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight md:text-4xl">
                <span className="text-4xl md:text-5xl">
                  {country.flagEmoji ?? "🏳️"}
                </span>
                {country.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {country.capital && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {country.capital}
                  </span>
                )}
                {country.continent && <Badge variant="secondary">{country.continent}</Badge>}
                {country.incomeGroup && (
                  <Badge variant="outline">{country.incomeGroup}</Badge>
                )}
                <Badge variant="outline">{country.iso3}</Badge>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link href={`/compare?countries=${country.slug}`}>
                <ArrowLeftRight className="h-4 w-4" /> Compare
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container space-y-8 py-8">
        {/* Key stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="Population"
            value={s[SLUG.population] ? formatCompact(s[SLUG.population]!.value) : "—"}
            sub={s[SLUG.population] ? `as of ${s[SLUG.population]!.year}` : ""}
            trend={trend(population)}
          />
          <StatCard
            label="Fertility Rate"
            value={
              s[SLUG.fertility]
                ? formatNumber(s[SLUG.fertility]!.value, 2)
                : "—"
            }
            sub="births/woman"
          />
          <StatCard
            label="Life Expectancy"
            value={
              s[SLUG.lifeExpectancy]
                ? `${formatNumber(s[SLUG.lifeExpectancy]!.value, 1)}y`
                : "—"
            }
          />
          <StatCard
            label="GDP / capita"
            value={
              s[SLUG.gdpPerCapita]
                ? `$${formatCompact(s[SLUG.gdpPerCapita]!.value)}`
                : "—"
            }
          />
          <StatCard
            label="Pop. Growth"
            value={
              s[SLUG.populationGrowth]
                ? `${formatNumber(s[SLUG.populationGrowth]!.value, 2)}%`
                : "—"
            }
          />
          <StatCard
            label="Net Migration"
            value={
              s[SLUG.netMigration]
                ? formatCompact(s[SLUG.netMigration]!.value)
                : "—"
            }
          />
        </div>

        {/* Charts grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="Population over time"
            description={
              hasProjection
                ? "Total population · observed (solid) and UN medium projection to 2100 (dashed)"
                : "Total population"
            }
            source={
              hasProjection
                ? "World Bank · UN World Population Prospects 2024"
                : "World Bank"
            }
            csvRows={hasProjection ? populationTrajectory : population}
            csvName={`${slug}-population`}
          >
            {hasProjection ? (
              <MultiSeriesChart
                data={populationTrajectory}
                decimals={0}
                series={[
                  {
                    key: "observed",
                    label: "Observed",
                    color: "hsl(211 62% 45%)",
                  },
                  {
                    key: "projected",
                    label: "Projected (UN medium)",
                    color: "hsl(211 62% 45%)",
                    dashed: true,
                  },
                ]}
              />
            ) : (
              <TimeSeriesChart
                data={population}
                decimals={0}
                color="hsl(211 62% 45%)"
              />
            )}
          </ChartCard>

          <ChartCard
            title="Fertility rate over time"
            description="Births per woman · dashed line = replacement (2.1)"
            source="World Bank"
            csvRows={fertility}
            csvName={`${slug}-fertility`}
          >
            <TimeSeriesChart
              data={fertility}
              decimals={2}
              referenceY={2.1}
              referenceLabel="Replacement"
              color="hsl(340 82% 52%)"
            />
          </ChartCard>

          {fertilityNowcast &&
            (fertilityNowcast.tfr2024 != null ||
              fertilityNowcast.tfr2025 != null ||
              fertilityNowcast.tfr2026 != null) && (
              <div className="lg:col-span-2 rounded-lg border bg-muted/30 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">
                      Provisional fertility nowcast
                    </p>
                    <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                      Source: {fertilityNowcast.sourceNote}
                      {fertilityNowcast.compiledByUrl ? (
                        <>
                          {" "}
                          · compiled by{" "}
                          <a
                            href={fertilityNowcast.compiledByUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2 hover:text-foreground"
                          >
                            @{fertilityNowcast.compiledBy}
                          </a>
                        </>
                      ) : null}
                      .{" "}
                      <Link
                        href="/fertility"
                        className="underline underline-offset-2"
                      >
                        Full nowcast table
                      </Link>{" "}
                      · provisional, may be revised.
                    </p>
                  </div>
                  {fertilityNowcast.changePct != null &&
                    fertilityNowcast.months != null && (
                      <p className="text-sm text-muted-foreground">
                        YTD births ({fertilityNowcast.months} mo){" "}
                        <strong
                          className={
                            fertilityNowcast.changePct >= 0
                              ? "text-emerald-700"
                              : "text-red-700"
                          }
                        >
                          {fertilityNowcast.changePct >= 0 ? "+" : ""}
                          {fertilityNowcast.changePct.toFixed(1)}%
                        </strong>{" "}
                        YoY
                      </p>
                    )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {fertilityNowcast.tfr2024 != null && (
                    <div className="rounded-md border bg-background px-3 py-2">
                      <p className="text-xs text-muted-foreground">TFR 2024</p>
                      <p className="text-xl font-semibold tabular-nums">
                        {formatNumber(fertilityNowcast.tfr2024, 2)}
                      </p>
                    </div>
                  )}
                  {fertilityNowcast.tfr2025 != null && (
                    <div className="rounded-md border bg-background px-3 py-2">
                      <p className="text-xs text-muted-foreground">TFR 2025</p>
                      <p className="text-xl font-semibold tabular-nums">
                        {formatNumber(fertilityNowcast.tfr2025, 2)}
                      </p>
                    </div>
                  )}
                  {fertilityNowcast.tfr2026 != null && (
                    <div className="rounded-md border bg-background px-3 py-2">
                      <p className="text-xs text-muted-foreground">TFR 2026</p>
                      <p className="text-xl font-semibold tabular-nums">
                        {formatNumber(fertilityNowcast.tfr2026, 2)}
                      </p>
                    </div>
                  )}
                  {fertilityNowcast.birthsCurrent != null && (
                    <div className="rounded-md border bg-background px-3 py-2">
                      <p className="text-xs text-muted-foreground">
                        Births YTD
                        {fertilityNowcast.months != null
                          ? ` (${fertilityNowcast.months} mo)`
                          : ""}
                      </p>
                      <p className="text-xl font-semibold tabular-nums">
                        {formatCompact(fertilityNowcast.birthsCurrent)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

          {birthsVsDeaths.length > 0 && (
            <ChartCard
              title="Births vs deaths"
              description="Crude birth rate and crude death rate · per 1,000 population (not absolute counts)"
              source="World Bank"
              csvRows={birthsVsDeaths}
              csvName={`${slug}-births-vs-deaths`}
            >
              <MultiSeriesChart
                data={birthsVsDeaths}
                decimals={1}
                unit="per 1,000"
                series={[
                  {
                    key: "birthRate",
                    label: "Birth rate",
                    color: "hsl(155 55% 38%)",
                  },
                  {
                    key: "deathRate",
                    label: "Death rate",
                    color: "hsl(0 65% 48%)",
                  },
                ]}
              />
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Rates per 1,000 people per year — not absolute birth or death
                counts. When the birth rate exceeds the death rate, natural
                increase is positive (before migration).
              </p>
            </ChartCard>
          )}

          <ChartCard
            title="GDP over time"
            description="Current US$"
            source="World Bank"
            csvRows={gdp}
            csvName={`${slug}-gdp`}
          >
            <TimeSeriesChart
              data={gdp}
              decimals={0}
              unit="US$"
              color="hsl(155 55% 38%)"
            />
          </ChartCard>

          <ChartCard
            title="Net migration over time"
            description="Net migrants per year (immigrants − emigrants)"
            source="World Bank"
            csvRows={migration}
            csvName={`${slug}-migration`}
          >
            <TimeSeriesChart
              data={migration}
              decimals={0}
              color="hsl(280 65% 60%)"
              referenceY={0}
              referenceLabel="Net zero"
            />
          </ChartCard>

          {foreignBorn.length > 0 && (
            <ChartCard
              title="Foreign-born population over time"
              description="Immigrant / diaspora population living in the country"
              source="World Bank / UN DESA"
              csvRows={foreignBorn}
              csvName={`${slug}-foreign-born`}
            >
              <TimeSeriesChart
                data={foreignBorn}
                decimals={0}
                color="hsl(190 75% 34%)"
              />
            </ChartCard>
          )}

          {foreignBornShare.length > 0 && (
            <ChartCard
              title="Foreign-born share over time"
              description="Foreign-born residents as % of the population"
              source="World Bank / UN DESA"
              csvRows={foreignBornShare}
              csvName={`${slug}-foreign-born-share`}
            >
              <TimeSeriesChart
                data={foreignBornShare}
                decimals={1}
                unit="%"
                color="hsl(221 83% 53%)"
              />
            </ChartCard>
          )}

          {unemploymentNativeBorn.length > 0 &&
            unemploymentForeignBorn.length > 0 && (
              <ChartCard
                title="Unemployment: native-born vs foreign-born"
                description="Ages 15–64 · % of labour force in each place-of-birth group. Foreign-born rates are often more cyclical."
                source="OECD — Labour market outcomes of immigrants"
                csvRows={(() => {
                  const years = new Set([
                    ...unemploymentNativeBorn.map((p) => p.year),
                    ...unemploymentForeignBorn.map((p) => p.year),
                  ]);
                  const nb = new Map(
                    unemploymentNativeBorn.map((p) => [p.year, p.value]),
                  );
                  const fb = new Map(
                    unemploymentForeignBorn.map((p) => [p.year, p.value]),
                  );
                  return [...years]
                    .sort((a, b) => a - b)
                    .map((year) => ({
                      year,
                      ...(nb.has(year) ? { nativeBorn: nb.get(year)! } : {}),
                      ...(fb.has(year) ? { foreignBorn: fb.get(year)! } : {}),
                    }));
                })()}
                csvName={`${slug}-unemployment-birthplace`}
              >
                <MultiSeriesChart
                  data={(() => {
                    const years = new Set([
                      ...unemploymentNativeBorn.map((p) => p.year),
                      ...unemploymentForeignBorn.map((p) => p.year),
                    ]);
                    const nb = new Map(
                      unemploymentNativeBorn.map((p) => [p.year, p.value]),
                    );
                    const fb = new Map(
                      unemploymentForeignBorn.map((p) => [p.year, p.value]),
                    );
                    return [...years]
                      .sort((a, b) => a - b)
                      .map((year) => ({
                        year,
                        ...(nb.has(year) ? { nativeBorn: nb.get(year)! } : {}),
                        ...(fb.has(year) ? { foreignBorn: fb.get(year)! } : {}),
                      }));
                  })()}
                  decimals={1}
                  unit="%"
                  series={[
                    {
                      key: "nativeBorn",
                      label: "Native-born",
                      color: "hsl(211 62% 45%)",
                    },
                    {
                      key: "foreignBorn",
                      label: "Foreign-born",
                      color: "hsl(24 85% 48%)",
                    },
                  ]}
                />
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  OECD definition: unemployed share of the labour force among
                  native-born vs foreign-born residents aged 15–64. National
                  offices (e.g. Statistics Sweden) may publish slightly different
                  figures for other age bands or months — we show the
                  internationally comparable OECD series. Latest: native-born{" "}
                  <strong>
                    {formatNumber(
                      unemploymentNativeBorn[unemploymentNativeBorn.length - 1]
                        ?.value ?? 0,
                      1,
                    )}
                    %
                  </strong>
                  , foreign-born{" "}
                  <strong>
                    {formatNumber(
                      unemploymentForeignBorn[
                        unemploymentForeignBorn.length - 1
                      ]?.value ?? 0,
                      1,
                    )}
                    %
                  </strong>{" "}
                  (
                  {
                    unemploymentForeignBorn[unemploymentForeignBorn.length - 1]
                      ?.year
                  }
                  ).
                </p>
              </ChartCard>
            )}
        </div>

        {/* Bilateral migration: origins of immigrants & where the diaspora lives */}
        {(immigrationOrigins?.rows.length || emigrationDestinations?.rows.length) ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {immigrationOrigins?.rows.length ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Where immigrants come from
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Largest foreign-born communities in {country.name} by country
                    of birth ({immigrationOrigins.latestYear})
                    {immigrationOrigins.prevYear
                      ? ` · arrow shows change since ${immigrationOrigins.prevYear}`
                      : ""}
                    .
                  </p>
                </CardHeader>
                <CardContent>
                  <MigrationBreakdownList data={immigrationOrigins} />
                  <p className="mt-4 text-xs text-muted-foreground">
                    Source: UN DESA International Migrant Stock 2024
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {emigrationDestinations?.rows.length ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Where the {country.name} diaspora lives
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Top destinations for people born in {country.name} who now
                    live abroad ({emigrationDestinations.latestYear})
                    {emigrationDestinations.prevYear
                      ? ` · arrow shows change since ${emigrationDestinations.prevYear}`
                      : ""}
                    .
                  </p>
                </CardHeader>
                <CardContent>
                  <MigrationBreakdownList data={emigrationDestinations} />
                  <p className="mt-4 text-xs text-muted-foreground">
                    Source: UN DESA International Migrant Stock 2024
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}

        {/* Projections + pyramid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="Population projections to 2100"
            description="Official UN projections — Low / Medium / High variants"
            source="UN World Population Prospects 2024"
            csvRows={projectionData}
            csvName={`${slug}-projections`}
          >
            <MultiSeriesChart
              data={projectionData}
              decimals={0}
              series={[
                { key: "high", label: "High variant", color: "hsl(142 71% 45%)" },
                { key: "medium", label: "Medium variant", color: "hsl(221 83% 53%)" },
                { key: "low", label: "Low variant", color: "hsl(0 72% 51%)" },
              ]}
            />
          </ChartCard>

          <ChartCard
            title={`Population pyramid${pyramid.year ? ` (${pyramid.year})` : ""}`}
            description="Age & sex structure · share of total population by 5-year cohort"
            source="birthrate.io model"
            csvRows={pyramidRows}
            csvName={`${slug}-pyramid`}
          >
            <PopulationPyramid rows={pyramidRows} />
          </ChartCard>
        </div>

        {/* Modeled population pyramid by ethnicity */}
        {ethnicityPyramid && (
          <ChartCard
            title="Population pyramid by ethnicity"
            description="Modeled age structure by ethnic group — younger cohorts blend toward the composition of births, so diaspora & minority groups skew young"
            source="birthrate.io model (census + births composition)"
          >
            <CompositionLegend groups={ethnicityPyramid.groups} />
            <EthnicityPyramid
              rows={ethnicityPyramid.rows}
              groups={ethnicityPyramid.groups}
              maxValue={ethnicityPyramid.maxValue}
            />
          </ChartCard>
        )}

        {/* Ethnic / racial composition over time (only when available) */}
        {(composition.groups.length > 0 ||
          birthsComposition.groups.length > 0) && (
          <div className="grid gap-6 lg:grid-cols-2">
            {composition.groups.length > 0 && (
              <ChartCard
                title="Ethnic composition over time"
                description="Share of total population by ethnic / racial group"
                source="National census"
                csvRows={composition.data}
                csvName={`${slug}-ethnic-composition`}
              >
                <CompositionLegend groups={composition.groups} />
                <CompositionChart
                  data={composition.data}
                  groups={composition.groups}
                />
              </ChartCard>
            )}

            {birthsComposition.groups.length > 0 && (
              <ChartCard
                title="Births by ethnicity over time"
                description="Share of newborns by mother's ethnic / racial group"
                source="National vital statistics"
                csvRows={birthsComposition.data}
                csvName={`${slug}-births-by-ethnicity`}
              >
                <CompositionLegend groups={birthsComposition.groups} />
                <CompositionChart
                  data={birthsComposition.data}
                  groups={birthsComposition.groups}
                />
              </ChartCard>
            )}
          </div>
        )}

        {/* Births by migrant / native background over time (only when available) */}
        {birthsBackground.groups.length > 0 && (
          <ChartCard
            title="Births by migrant background over time"
            description="Share of newborns born to native vs migrant-background parents"
            source="National statistical office"
            csvRows={birthsBackground.data}
            csvName={`${slug}-births-by-background`}
          >
            <CompositionLegend groups={birthsBackground.groups} />
            <CompositionChart
              data={birthsBackground.data}
              groups={birthsBackground.groups}
            />
            {BIRTH_BACKGROUND_NOTES.get(country.iso3) && (
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Source &amp; definition:</span>{" "}
                {BIRTH_BACKGROUND_NOTES.get(country.iso3)}
              </p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Each country&apos;s statistical office defines &ldquo;migrant
              background&rdquo; differently (mother&apos;s citizenship, country
              of birth, or parents&apos; origin), so figures are not directly
              comparable across countries and may be out of date. Always check
              the cited source for the latest official numbers.
            </p>
          </ChartCard>
        )}

        {/* Fertility & GDP per capita extra row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="GDP per capita over time"
            description="Current US$"
            source="World Bank"
            csvRows={gdpPerCapita}
            csvName={`${slug}-gdp-per-capita`}
          >
            <TimeSeriesChart
              data={gdpPerCapita}
              decimals={0}
              unit="US$"
              color="hsl(190 90% 42%)"
            />
          </ChartCard>

          {abortion.length > 0 && (
            <ChartCard
              title="Abortion rate over time"
              description="Induced abortions per 1,000 women aged 15–49"
              source="WHO / Guttmacher (compiled)"
              csvRows={abortion}
              csvName={`${slug}-abortion-rate`}
            >
              <TimeSeriesChart
                data={abortion}
                decimals={1}
                unit="per 1,000"
                color="hsl(340 82% 52%)"
              />
            </ChartCard>
          )}
        </div>

        {hasHistoricMortality && (
          <section className="space-y-6">
            <div className="border-b pb-2">
              <h2 className="text-xl font-semibold tracking-tight">
                Historic mortality
              </h2>
              <p className="text-sm text-muted-foreground">
                Life expectancy, death rates and child mortality as far back as
                vital registration and historical reconstructions allow
                {lifeExpStart != null ? ` (from ${lifeExpStart})` : ""}.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {lifeExp.length > 0 && (
                <ChartCard
                  title="Life expectancy over time"
                  description="Years at birth"
                  source={lifeExpSource}
                  csvRows={lifeExp}
                  csvName={`${slug}-life-expectancy`}
                >
                  <TimeSeriesChart
                    data={lifeExp}
                    decimals={1}
                    unit="years"
                    color="hsl(25 95% 53%)"
                  />
                </ChartCard>
              )}

              {historicDeathRate.length > 0 && (
                <ChartCard
                  title="Historic crude death rate"
                  description="Deaths per 1,000 people · Human Mortality Database"
                  source="HMD via Our World in Data"
                  csvRows={historicDeathRate}
                  csvName={`${slug}-historic-death-rate`}
                >
                  <TimeSeriesChart
                    data={historicDeathRate}
                    decimals={1}
                    unit="per 1,000"
                    color="hsl(0 65% 48%)"
                  />
                </ChartCard>
              )}

              {childMortality.length > 0 && (
                <ChartCard
                  title="Under-five mortality"
                  description="Deaths before age 5 per 1,000 live births"
                  source="Our World in Data (Gapminder · UN IGME)"
                  csvRows={childMortality}
                  csvName={`${slug}-child-mortality`}
                >
                  <TimeSeriesChart
                    data={childMortality}
                    decimals={1}
                    unit="per 1,000 births"
                    color="hsl(340 70% 42%)"
                  />
                </ChartCard>
              )}
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              Pre-1960 life expectancy and long child-mortality series are from{" "}
              <Link
                href="https://ourworldindata.org/grapher/life-expectancy"
                className="underline underline-offset-2"
                target="_blank"
                rel="noreferrer"
              >
                Our World in Data
              </Link>{" "}
              (Riley, Zijdeman et al., HMD, UN). Historic crude death rates cover
              countries in the{" "}
              <Link
                href="https://www.mortality.org"
                className="underline underline-offset-2"
                target="_blank"
                rel="noreferrer"
              >
                Human Mortality Database
              </Link>{" "}
              only — Sweden from 1751, France from 1816, and so on. Crude rates
              are not age-standardized. See also the{" "}
              <Link href="/mortality" className="underline underline-offset-2">
                mortality explorer
              </Link>
              .
            </p>
          </section>
        )}

        {/* Society, housing & beliefs */}
        {(divorce ||
          nonmarital ||
          homeownership ||
          homicide.length > 0 ||
          religion.items.length > 0) && (
          <section className="space-y-6">
            <div className="border-b pb-2">
              <h2 className="text-xl font-semibold tracking-tight">
                Society, housing &amp; beliefs
              </h2>
              <p className="text-sm text-muted-foreground">
                Family, crime, housing and religion indicators
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label="Homicide rate"
                value={
                  homicide.length
                    ? formatNumber(homicide[homicide.length - 1].value, 1)
                    : "—"
                }
                sub="per 100,000"
              />
              <StatCard
                label="Divorce rate"
                value={divorce ? formatNumber(divorce.value, 1) : "—"}
                sub={divorce ? `per 1,000 · ${divorce.year}` : "per 1,000"}
              />
              <StatCard
                label="Births outside marriage"
                value={
                  nonmarital ? `${formatNumber(nonmarital.value, 1)}%` : "—"
                }
                sub={nonmarital ? `of births · ${nonmarital.year}` : "of births"}
              />
              <StatCard
                label="Home ownership"
                value={
                  homeownership
                    ? `${formatNumber(homeownership.value, 1)}%`
                    : "—"
                }
                sub={
                  homeownership
                    ? `of households · ${homeownership.year}`
                    : "of households"
                }
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {homicide.length > 0 && (
                <ChartCard
                  title="Homicide rate over time"
                  description="Intentional homicides per 100,000 people"
                  source="World Bank / UNODC"
                  csvRows={homicide}
                  csvName={`${slug}-homicide-rate`}
                >
                  <TimeSeriesChart
                    data={homicide}
                    decimals={1}
                    unit="per 100k"
                    color="hsl(0 72% 51%)"
                  />
                </ChartCard>
              )}

              {religion.items.length > 0 && (
                <ChartCard
                  title={`Religious composition${religion.year ? ` (${religion.year})` : ""}`}
                  description="Share of population by religion"
                  source="Pew Research / census"
                  csvRows={religion.items}
                  csvName={`${slug}-religion`}
                >
                  <CompositionBar
                    items={religion.items.map((it) => ({
                      ...it,
                      color:
                        RELIGION_COLORS[it.name] ?? RELIGION_COLOR_FALLBACK,
                    }))}
                  />
                </ChartCard>
              )}
            </div>
          </section>
        )}

        {/* Subnational states / provinces */}
        {admin1Ranking.length > 0 && (
          <section className="space-y-4">
            <div className="border-b pb-2">
              <h2 className="text-xl font-semibold tracking-tight">
                States &amp; provinces
              </h2>
              <p className="text-sm text-muted-foreground">
                Total fertility rate by first-level administrative division ·{" "}
                <Link href="/states" className="underline underline-offset-2">
                  browse all countries
                </Link>
              </p>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Division</th>
                    <th className="px-4 py-3 font-medium text-right">
                      Population
                    </th>
                    <th className="px-4 py-3 font-medium text-right">TFR</th>
                    <th className="px-4 py-3 font-medium text-right">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {admin1Ranking.map((row, i) => (
                    <tr
                      key={row.slug}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="px-4 py-2 text-muted-foreground tabular-nums">
                        {i + 1}
                      </td>
                      <td className="px-4 py-2 font-medium">
                        <Link
                          href={`/state/${row.slug}`}
                          className="hover:underline"
                        >
                          {row.name}
                        </Link>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {row.kind.replace(/-/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.population != null
                          ? formatCompact(row.population)
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium">
                        {formatNumber(row.value, 2)}
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground tabular-nums">
                        {row.year}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Crime by ancestry / origin — only when published, else availability note */}
        {(hasCrimeBreakdown ||
          foreignPrisonerShare.length > 0 ||
          crimeAvailability) && (
          <section className="space-y-6">
            <div className="border-b pb-2">
              <h2 className="text-xl font-semibold tracking-tight">
                Crime by ancestry, origin &amp; race
              </h2>
              <p className="text-sm text-muted-foreground">
                Official statistics where published · definitions differ by
                country ·{" "}
                <Link href="/crime" className="underline underline-offset-2">
                  see full availability guide
                </Link>
              </p>
            </div>

            {crimeAvailability && !hasCrimeBreakdown && (
              <Card>
                <CardContent className="space-y-2 py-5 text-sm leading-relaxed text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">
                      {country.name}:{" "}
                      {crimeAvailability.status === "NOT_AVAILABLE"
                        ? "does not publish"
                        : "only limited"}{" "}
                      comparable crime-by-ancestry statistics.
                    </span>{" "}
                    {crimeAvailability.detail}
                  </p>
                  {crimeAvailability.sourceUrl ? (
                    <a
                      href={crimeAvailability.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Related source
                    </a>
                  ) : null}
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              {crimeAncestry.groups.length > 0 && (
                <ChartCard
                  title="Persons guilty in crimes by ancestry"
                  description="Absolute counts · Danish origin / immigrants / descendants"
                  source="Statistics Denmark (STRAFNA9)"
                  csvRows={crimeAncestry.data}
                  csvName={`${slug}-crime-ancestry`}
                >
                  <CompositionLegend groups={crimeAncestry.groups} />
                  <StackedBarChart
                    data={crimeAncestry.data}
                    groups={crimeAncestry.groups}
                  />
                  {crimeMeta ? (
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      {crimeMeta.note}
                    </p>
                  ) : null}
                </ChartCard>
              )}

              {crimeCitizenship.groups.length > 0 && (
                <ChartCard
                  title="Persons charged by citizenship"
                  description="Absolute counts · Norwegian vs foreign citizens"
                  source="Statistics Norway (SSB 09421)"
                  csvRows={crimeCitizenship.data}
                  csvName={`${slug}-crime-citizenship`}
                >
                  <CompositionLegend groups={crimeCitizenship.groups} />
                  <StackedBarChart
                    data={crimeCitizenship.data}
                    groups={crimeCitizenship.groups}
                  />
                  {crimeMeta ? (
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      {crimeMeta.note}
                    </p>
                  ) : null}
                </ChartCard>
              )}

              {crimeBackground.groups.length > 0 && (
                <ChartCard
                  title="Share of registered offences by background"
                  description="Brå research study · 2007 vs 2018"
                  source="Brå report 2021:9"
                  csvRows={crimeBackground.data}
                  csvName={`${slug}-crime-background`}
                >
                  <CompositionLegend groups={crimeBackground.groups} />
                  <CompositionChart
                    data={crimeBackground.data}
                    groups={crimeBackground.groups}
                  />
                  {crimeMeta ? (
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      {crimeMeta.note}
                    </p>
                  ) : null}
                </ChartCard>
              )}

              {crimeRacePrison.groups.length > 0 && (
                <ChartCard
                  title="Sentenced prisoners by race / Hispanic origin"
                  description="Absolute counts · sentence of more than 1 year · state & federal"
                  source="BJS Prisoners Statistical Tables"
                  csvRows={crimeRacePrison.data}
                  csvName={`${slug}-prisoners-race`}
                >
                  <CompositionLegend groups={crimeRacePrison.groups} />
                  <StackedBarChart
                    data={crimeRacePrison.data}
                    groups={crimeRacePrison.groups}
                  />
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {USA_CRIME_NOTES.prisoners}
                  </p>
                </ChartCard>
              )}

              {crimeRaceArrest.groups.length > 0 && (
                <ChartCard
                  title="Arrests by race"
                  description="Absolute counts · FBI UCR Table 43 · agency coverage varies"
                  source="FBI Crime in the United States"
                  csvRows={crimeRaceArrest.data}
                  csvName={`${slug}-arrests-race`}
                >
                  <CompositionLegend groups={crimeRaceArrest.groups} />
                  <StackedBarChart
                    data={crimeRaceArrest.data}
                    groups={crimeRaceArrest.groups}
                  />
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {USA_CRIME_NOTES.arrests}
                  </p>
                </ChartCard>
              )}

              {crimeRaceMurder.groups.length > 0 && (
                <ChartCard
                  title="Murder arrests by race"
                  description="Murder and nonnegligent manslaughter arrests · FBI UCR Table 43"
                  source="FBI Crime in the United States"
                  csvRows={crimeRaceMurder.data}
                  csvName={`${slug}-murder-arrests-race`}
                >
                  <CompositionLegend groups={crimeRaceMurder.groups} />
                  <StackedBarChart
                    data={crimeRaceMurder.data}
                    groups={crimeRaceMurder.groups}
                  />
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {USA_CRIME_NOTES.murderArrests}
                  </p>
                </ChartCard>
              )}

              {foreignPrisonerShare.length > 0 && (
                <ChartCard
                  title="Foreign citizenship share of prisoners"
                  description="Eurostat · citizenship, not immigrant ancestry"
                  source="Eurostat crim_pris_ctz"
                  csvRows={foreignPrisonerShare}
                  csvName={`${slug}-foreign-prisoners`}
                >
                  <TimeSeriesChart
                    data={foreignPrisonerShare}
                    decimals={1}
                    unit="%"
                    color="hsl(0 65% 45%)"
                  />
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    Share of persons held in prison with foreign citizenship.
                    This is not a conviction-by-ancestry series.
                  </p>
                </ChartCard>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
