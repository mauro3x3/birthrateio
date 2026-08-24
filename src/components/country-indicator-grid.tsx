import { ChartCard } from "@/components/charts/chart-card";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { INDICATOR_BY_SLUG } from "@/lib/indicators";
import type { CountrySeriesMap } from "@/lib/queries";

/**
 * Chart configuration for one catalogue indicator. Titles and units default to
 * the catalogue entry; the overrides exist because catalogue names carry full
 * price-base qualifiers that are too long for a chart heading.
 */
export type IndicatorChartSpec = {
  slug: string;
  title?: string;
  description?: string;
  /** Short unit for axis and tooltip labels. */
  unit?: string;
  color: string;
  source?: string;
  referenceY?: number;
  referenceLabel?: string;
};

export function CountryIndicatorGrid({
  specs,
  series,
  countrySlug,
}: {
  specs: readonly IndicatorChartSpec[];
  series: CountrySeriesMap;
  countrySlug: string;
}) {
  const available = specs.filter((spec) => (series[spec.slug]?.length ?? 0) > 0);
  if (available.length === 0) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {available.map((spec) => {
        const def = INDICATOR_BY_SLUG.get(spec.slug);
        const data = series[spec.slug];
        return (
          <ChartCard
            key={spec.slug}
            title={spec.title ?? def?.name ?? spec.slug}
            description={spec.description ?? def?.description}
            source={spec.source ?? "World Bank"}
            csvRows={data}
            csvName={`${countrySlug}-${spec.slug}`}
          >
            <TimeSeriesChart
              data={data}
              decimals={def?.decimals ?? 1}
              unit={spec.unit}
              color={spec.color}
              referenceY={spec.referenceY}
              referenceLabel={spec.referenceLabel}
            />
          </ChartCard>
        );
      })}
    </div>
  );
}

/** Does a country have data for any indicator in a group? */
export function hasAnySeries(
  series: CountrySeriesMap,
  specs: readonly IndicatorChartSpec[],
): boolean {
  return specs.some((spec) => (series[spec.slug]?.length ?? 0) > 0);
}
