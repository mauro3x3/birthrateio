"use client";

import { ChartCard } from "@/components/charts/chart-card";
import { MultiSeriesChart } from "@/components/charts/multi-series-chart";
import { GroupedBarChart } from "@/components/charts/grouped-bar-chart";

type Point = { year: number; value: number };

export function MigrationExtraCharts({
  frontexEuTotal,
  frontexRoutes,
  iomRegions,
}: {
  frontexEuTotal: Point[];
  frontexRoutes: Record<string, Point[]>;
  iomRegions: Record<string, Point[]>;
}) {
  const routeKeys = Object.keys(frontexRoutes).sort();
  const years = [
    ...new Set(frontexEuTotal.map((p) => p.year)),
  ].sort((a, b) => a - b);

  const routeRows = years.map((year) => {
    const row: Record<string, number | string | null> = { year };
    for (const key of routeKeys) {
      const hit = frontexRoutes[key]?.find((p) => p.year === year);
      row[key] = hit?.value ?? null;
    }
    return row;
  });

  const iomKeys = ["Mediterranean", "Europe", "Americas", "Global"].filter(
    (k) => iomRegions[k]?.length,
  );
  const iomYears = [
    ...new Set(iomKeys.flatMap((k) => iomRegions[k].map((p) => p.year))),
  ].sort((a, b) => a - b);
  const iomRows = iomYears.map((year) => {
    const row: Record<string, number | string | null> = { year };
    for (const key of iomKeys) {
      const hit = iomRegions[key]?.find((p) => p.year === year);
      row[key] = hit?.value ?? null;
    }
    return row;
  });

  const euRows = frontexEuTotal.map((p) => ({
    year: p.year,
    detections: p.value,
  }));

  return (
    <div className="space-y-8">
      {euRows.length > 0 && (
        <ChartCard
          title="Detected illegal border crossings — EU total"
          description="Frontex FRAN/JORA detections on EU external borders. Counts detections, not unique persons."
          source="Frontex"
          csvName="frontex-eu-detections"
          csvRows={euRows}
          defaultShowValues
        >
          <GroupedBarChart
            data={euRows}
            series={[{ key: "detections", label: "Detections" }]}
            xKey="year"
            unit="detections"
            decimals={0}
            height={320}
          />
        </ChartCard>
      )}

      {routeRows.length > 0 && routeKeys.length > 0 && (
        <ChartCard
          title="Detections by migratory route"
          description="Same Frontex series, split by route into the EU."
          source="Frontex"
          csvName="frontex-route-detections"
          csvRows={routeRows}
          valueLabels={false}
        >
          <MultiSeriesChart
            data={routeRows}
            series={routeKeys.map((k) => ({
              key: k,
              label: k,
            }))}
            unit="detections"
            decimals={0}
            height={360}
          />
        </ChartCard>
      )}

      {iomRows.length > 0 && (
        <ChartCard
          title="Recorded migrant deaths & disappearances"
          description="IOM Missing Migrants Project — known undercounts. Mediterranean is broken out from broader Europe."
          source="IOM Missing Migrants Project"
          csvName="iom-missing-migrants"
          csvRows={iomRows}
          valueLabels={false}
        >
          <MultiSeriesChart
            data={iomRows}
            series={iomKeys.map((k) => ({ key: k, label: k }))}
            unit="people"
            decimals={0}
            height={340}
          />
        </ChartCard>
      )}
    </div>
  );
}
