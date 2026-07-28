import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { ChartCard } from "@/components/charts/chart-card";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import {
  getAdmin1BySlug,
  getAdmin1TimeSeries,
  getCountryTimeSeries,
} from "@/lib/queries";
import { SLUG } from "@/lib/indicators";
import { safe } from "@/lib/safe";
import { formatCompact, formatNumber } from "@/lib/utils";
import admin1Meta from "@/lib/data/admin1-demographics.json";

export const revalidate = 86400;

const KIND_LABEL: Record<string, string> = {
  state: "State",
  province: "Province",
  land: "Land",
  oblast: "Oblast",
  krai: "Krai",
  republic: "Republic",
  "federal-city": "Federal city",
  "autonomous-okrug": "Autonomous okrug",
  "autonomous-region": "Autonomous region",
  municipality: "Municipality",
  "union-territory": "Union territory",
  district: "District",
};

function sourceNote(iso3: string, kind: "fertility" | "population") {
  const s = (admin1Meta.sources as Record<string, Record<string, string | null>>)[
    iso3
  ];
  if (!s) return { text: "National statistical office", url: null as string | null };
  if (kind === "fertility") {
    return { text: s.fertility ?? "National statistical office", url: s.fertilityUrl ?? null };
  }
  return {
    text: s.population ?? "National statistical office",
    url: s.populationUrl ?? null,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const admin1 = await safe(getAdmin1BySlug(slug), null);
  if (!admin1) return { title: "Region not found" };
  const title = `${admin1.name} — Population & Fertility`;
  const description = `Population and fertility statistics for ${admin1.name}, ${admin1.country.name}.`;
  return {
    title,
    description,
    alternates: { canonical: `/state/${slug}` },
    openGraph: { title, description, url: `/state/${slug}` },
  };
}

export default async function StatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin1 = await safe(getAdmin1BySlug(slug), null);
  if (!admin1) notFound();

  const [population, fertility, gfr, countryFertility] = await Promise.all([
    safe(getAdmin1TimeSeries(admin1.id, SLUG.population), []),
    safe(getAdmin1TimeSeries(admin1.id, SLUG.fertility), []),
    safe(getAdmin1TimeSeries(admin1.id, SLUG.generalFertilityRate), []),
    safe(getCountryTimeSeries(admin1.country.id, SLUG.fertility), []),
  ]);

  const latestPop = population.length
    ? population[population.length - 1]
    : null;
  const latestTfr = fertility.length
    ? fertility[fertility.length - 1]
    : null;
  const latestGfr = gfr.length ? gfr[gfr.length - 1] : null;
  const nationalLatest = countryFertility.length
    ? countryFertility[countryFertility.length - 1]
    : null;

  const fertSource = sourceNote(admin1.country.iso3, "fertility");
  const popSource = sourceNote(admin1.country.iso3, "population");
  const kindLabel = KIND_LABEL[admin1.kind] ?? admin1.kind;

  return (
    <div>
      <div className="border-b bg-muted/30">
        <div className="container space-y-4 py-8">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link
              href={`/country/${admin1.country.slug}`}
              className="hover:text-foreground"
            >
              {admin1.country.flagEmoji ? `${admin1.country.flagEmoji} ` : ""}
              {admin1.country.name}
            </Link>
            <span>/</span>
            <span className="text-foreground">{admin1.name}</span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{kindLabel}</Badge>
                {admin1.code ? (
                  <Badge variant="outline">{admin1.code}</Badge>
                ) : null}
              </div>
              <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">
                {admin1.name}
              </h1>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                Subnational demographics for {admin1.country.name}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="Population"
              value={
                latestPop ? formatCompact(latestPop.value) : "—"
              }
              sub={latestPop ? `latest · ${latestPop.year}` : undefined}
            />
            <StatCard
              label="Total fertility rate"
              value={
                latestTfr ? formatNumber(latestTfr.value, 2) : "—"
              }
              sub={latestTfr ? `births/woman · ${latestTfr.year}` : undefined}
            />
            <StatCard
              label="General fertility rate"
              value={
                latestGfr ? formatNumber(latestGfr.value, 1) : "—"
              }
              sub={
                latestGfr
                  ? `per 1,000 women 15–44 · ${latestGfr.year}`
                  : "U.S. states only"
              }
            />
            <StatCard
              label="National TFR"
              value={
                nationalLatest
                  ? formatNumber(nationalLatest.value, 2)
                  : "—"
              }
              sub={
                nationalLatest
                  ? `${admin1.country.name} · ${nationalLatest.year}`
                  : undefined
              }
            />
          </div>
        </div>
      </div>

      <div className="container space-y-8 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {population.length > 0 && (
            <ChartCard
              title="Population over time"
              description={kindLabel}
              source={popSource.text}
              csvRows={population}
              csvName={`${slug}-population`}
            >
              <TimeSeriesChart
                data={population}
                decimals={0}
                color="hsl(211 62% 45%)"
              />
              {popSource.url ? (
                <a
                  href={popSource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-xs text-primary hover:underline"
                >
                  Source details
                </a>
              ) : null}
            </ChartCard>
          )}

          {fertility.length > 0 && (
            <ChartCard
              title="Total fertility rate"
              description="Births per woman"
              source={fertSource.text}
              csvRows={fertility}
              csvName={`${slug}-fertility`}
            >
              <TimeSeriesChart
                data={fertility}
                decimals={2}
                unit="births/woman"
                color="hsl(340 72% 48%)"
              />
              {fertSource.url ? (
                <a
                  href={fertSource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-xs text-primary hover:underline"
                >
                  Source details
                </a>
              ) : null}
            </ChartCard>
          )}

          {gfr.length > 0 && (
            <ChartCard
              title="General fertility rate"
              description="Births per 1,000 women ages 15–44 (NCHS)"
              source={fertSource.text}
              csvRows={gfr}
              csvName={`${slug}-gfr`}
            >
              <TimeSeriesChart
                data={gfr}
                decimals={1}
                unit="per 1,000"
                color="hsl(24 85% 48%)"
              />
            </ChartCard>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          <Link
            href={`/country/${admin1.country.slug}`}
            className="underline underline-offset-2"
          >
            ← Back to {admin1.country.name}
          </Link>
          {" · "}
          <Link href="/states" className="underline underline-offset-2">
            All states &amp; provinces
          </Link>
        </p>
      </div>
    </div>
  );
}
