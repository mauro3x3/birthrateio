import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { FertilityClock } from "@/components/fertility-clock";
import { getWorldLatestValue } from "@/lib/queries";
import { SLUG } from "@/lib/indicators";
import { safe } from "@/lib/safe";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Fertility Clock — Live World Population & Births",
  description:
    "A live demographic clock: estimated world population, births and deaths today and this year, extrapolated from the latest UN and World Bank rates.",
  alternates: { canonical: "/clock" },
};

// Sensible fallbacks when DB is empty (approx. mid-2020s UN/WB levels).
const FALLBACK = {
  population: 8_200_000_000,
  asOfYear: 2024,
  growthRatePct: 0.9,
  birthRate: 16.5,
  deathRate: 7.5,
  tfr: 2.3,
};

export default async function ClockPage() {
  const [population, growth, birthRate, deathRate, tfr] = await Promise.all([
    safe(getWorldLatestValue(SLUG.population), null),
    safe(getWorldLatestValue(SLUG.populationGrowth), null),
    safe(getWorldLatestValue(SLUG.birthRate), null),
    safe(getWorldLatestValue(SLUG.deathRate), null),
    safe(getWorldLatestValue(SLUG.fertility), null),
  ]);

  const props = {
    population: population?.value ?? FALLBACK.population,
    asOfYear: population?.year ?? FALLBACK.asOfYear,
    growthRatePct: growth?.value ?? FALLBACK.growthRatePct,
    birthRate: birthRate?.value ?? FALLBACK.birthRate,
    deathRate: deathRate?.value ?? FALLBACK.deathRate,
    tfr: tfr?.value ?? FALLBACK.tfr,
    tfrYear: tfr?.year ?? FALLBACK.asOfYear,
    birthRateYear: birthRate?.year ?? FALLBACK.asOfYear,
    deathRateYear: deathRate?.year ?? FALLBACK.asOfYear,
    growthYear: growth?.year ?? FALLBACK.asOfYear,
  };

  return (
    <div>
      <PageHeader
        title="Fertility Clock"
        description="A live world population and vital-events clock — inspired by debt clocks, built for demographics."
      />

      <div className="border-b bg-[hsl(40_28%_97%)]">
        <div className="container space-y-8 py-8 md:py-12">
          <FertilityClock {...props} />

          <aside className="max-w-3xl space-y-3 border-l-2 border-[hsl(var(--brand-navy))]/25 pl-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Disclaimer:</span>{" "}
              Illustrative real-time extrapolation from the latest annual UN /
              World Bank rates — not an official live birth or death registry.
              Actual vital events vary by hour, season, and country; migration
              is reflected only via the published population growth rate.
            </p>
            <p>
              <span className="font-medium text-foreground">Method:</span>{" "}
              Population compounds from the mid-year World aggregate using the
              latest annual growth rate. Births and deaths apply crude birth and
              death rates (per 1,000 people) to the live population estimate,
              then prorate by elapsed fraction of the day or calendar year.
            </p>
            <p>
              Source: World Bank World Development Indicators (World / WLD
              aggregate)
              {population || birthRate || deathRate
                ? ` · latest years ${[
                    population?.year,
                    birthRate?.year,
                    deathRate?.year,
                  ]
                    .filter(Boolean)
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .join(", ")}`
                : ""}
              . Explore country profiles or the{" "}
              <Link
                href="/population"
                className="text-primary underline-offset-2 hover:underline"
              >
                population explorer
              </Link>
              .
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
