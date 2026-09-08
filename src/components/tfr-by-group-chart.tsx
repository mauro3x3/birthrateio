"use client";

import * as React from "react";
import { ChartCard } from "@/components/charts/chart-card";
import { GroupedBarChart } from "@/components/charts/grouped-bar-chart";
import {
  TFR_DHS_BACKGROUND,
  TFR_DHS_BACKGROUND_META,
  type TfrDhsBackgroundCountry,
  type TfrGroupRow,
  type TfrUsGroupPack,
} from "@/lib/sources/tfr-by-group-data";

const TFR_COLOR = "hsl(200 60% 36%)";

function rowsToBars(rows: TfrGroupRow[], national?: number | null) {
  const data = rows.map((r) => ({
    year: r.group,
    tfr: r.value,
  }));
  if (national != null && !rows.some((r) => r.group === "All women")) {
    data.push({ year: "National", tfr: national });
  }
  return data;
}

export function TfrUsGroupChart({
  pack,
  title,
  className,
}: {
  pack: TfrUsGroupPack;
  title: string;
  className?: string;
}) {
  const data = React.useMemo(
    () => rowsToBars(pack.groups),
    [pack.groups],
  );
  return (
    <div className={className}>
      <ChartCard
        title={title}
        description={pack.note}
        source={pack.source}
        csvRows={pack.groups}
        csvName={`${pack.iso3.toLowerCase()}-tfr-${pack.year}`}
      >
        <GroupedBarChart
          data={data}
          series={[
            { key: "tfr", label: `TFR ${pack.year}`, color: TFR_COLOR },
          ]}
          height={360}
          unit={pack.unit}
          decimals={pack.decimals}
          referenceY={2.1}
          referenceLabel="Replacement 2.1"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          <a
            href={pack.sourceUrl}
            className="underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            Source table
          </a>
          {pack.doi ? (
            <>
              {" "}
              ·{" "}
              <a
                href={pack.doi}
                className="underline underline-offset-2"
                target="_blank"
                rel="noreferrer"
              >
                DOI
              </a>
            </>
          ) : null}
        </p>
      </ChartCard>
    </div>
  );
}

export function TfrDhsBackgroundChart({
  dimension,
  initialIso3 = "NGA",
}: {
  dimension: "education" | "wealth";
  initialIso3?: string;
}) {
  const [iso3, setIso3] = React.useState(initialIso3);
  const current: TfrDhsBackgroundCountry | undefined =
    TFR_DHS_BACKGROUND.find((c) => c.iso3 === iso3) ?? TFR_DHS_BACKGROUND[0];
  if (!current) return null;

  const rows =
    dimension === "education" ? current.education : current.wealth;
  const data = rowsToBars(rows, current.national);
  const title =
    dimension === "education"
      ? `TFR by education — ${current.country} ${current.year}`
      : `TFR by wealth quintile — ${current.country} ${current.year}`;
  const description =
    dimension === "education"
      ? "DHS education groups are No education, Primary, Secondary, and Higher. TFR is for the three years before interview."
      : "DHS household wealth quintile, not income. TFR is for the three years before interview.";

  return (
    <ChartCard
      title={title}
      description={description}
      source={TFR_DHS_BACKGROUND_META.source}
      csvRows={rows.map((r) => ({
        country: current.country,
        year: current.year,
        survey: current.survey,
        group: r.group,
        tfr: r.value,
      }))}
      csvName={`dhs-tfr-by-${dimension}-${current.iso3.toLowerCase()}`}
      titleExtra={
        <label className="flex items-center gap-2 text-sm font-normal text-foreground">
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Survey
          </span>
          <select
            className="h-8 max-w-[14rem] rounded-sm border border-input bg-background px-2 text-sm outline-none focus:border-ring"
            value={current.iso3}
            onChange={(e) => setIso3(e.target.value)}
          >
            {TFR_DHS_BACKGROUND.map((c) => (
              <option key={c.iso3} value={c.iso3}>
                {c.country} ({c.year})
              </option>
            ))}
          </select>
        </label>
      }
    >
      <GroupedBarChart
        data={data}
        series={[
          { key: "tfr", label: "TFR", color: TFR_COLOR },
        ]}
        height={340}
        unit={TFR_DHS_BACKGROUND_META.unit}
        decimals={2}
        referenceY={2.1}
        referenceLabel="Replacement 2.1"
      />
      {current.national != null ? (
        <p className="mt-2 text-xs text-muted-foreground">
          National TFR in this survey: {current.national.toFixed(1)} ({current.survey}).
          The National bar is the published all-women figure, not an average of the groups.
        </p>
      ) : null}
    </ChartCard>
  );
}

