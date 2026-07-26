import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Building2, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { ChartCard } from "@/components/charts/chart-card";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { PointMap } from "@/components/maps/point-map";
import {
  getCityBySlug,
  getCountryTimeSeries,
  getLatestValue,
} from "@/lib/queries";
import { SLUG } from "@/lib/indicators";
import { safe } from "@/lib/safe";
import { formatCompact, formatNumber } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const city = await safe(getCityBySlug(slug), null);
  if (!city) return { title: "City not found" };
  const title = `${city.name} — Population & Demographics`;
  const description = `Population and demographic context for ${city.name}, ${city.country.name}.`;
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

  const [fertility, gdpPerCapita, countryFertility, countryGdpPc] =
    await Promise.all([
      safe(getLatestValue(city.countryId, SLUG.fertility), null),
      safe(getLatestValue(city.countryId, SLUG.gdpPerCapita), null),
      safe(getCountryTimeSeries(city.countryId, SLUG.fertility), []),
      safe(getCountryTimeSeries(city.countryId, SLUG.gdpPerCapita), []),
    ]);

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
          </div>
        </div>
      </div>

      <div className="container space-y-8 py-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Metro Population"
            value={formatCompact(city.population ?? 0)}
          />
          <StatCard
            label="National Fertility"
            value={fertility ? formatNumber(fertility.value, 2) : "—"}
            sub="births/woman"
          />
          <StatCard
            label="National GDP/capita"
            value={gdpPerCapita ? `$${formatCompact(gdpPerCapita.value)}` : "—"}
          />
          <StatCard
            label="Coordinates"
            value={
              city.latitude && city.longitude
                ? `${city.latitude.toFixed(1)}, ${city.longitude.toFixed(1)}`
                : "—"
            }
          />
        </div>

        {city.latitude && city.longitude && (
          <PointMap
            lat={city.latitude}
            lng={city.longitude}
            label={`${city.name}, ${city.country.name}`}
            height={320}
          />
        )}

        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          City-level fertility and GDP series are not yet available globally.
          The charts below show national trends for{" "}
          <Link
            href={`/country/${city.country.slug}`}
            className="font-medium text-foreground hover:text-primary"
          >
            {city.country.name}
          </Link>{" "}
          as context.
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
      </div>
    </div>
  );
}
