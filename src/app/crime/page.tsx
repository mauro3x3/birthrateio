import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ChartCard } from "@/components/charts/chart-card";
import {
  CompositionChart,
  CompositionLegend,
} from "@/components/charts/composition-chart";
import { StackedBarChart } from "@/components/charts/stacked-bar-chart";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { RankingTable } from "@/components/ranking-table";
import {
  CRIME_DATA_AVAILABILITY,
  getCrimeMeta,
  USA_CRIME_NOTES,
} from "@/lib/sources/crime-by-origin-data";
import {
  getComposition,
  getCountryBySlug,
  getCountryTimeSeries,
  getRanking,
} from "@/lib/queries";
import { SLUG } from "@/lib/indicators";
import { safe } from "@/lib/safe";
import { prisma } from "@/lib/prisma";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Crime by Ancestry & Origin — Where Countries Publish Data",
  description:
    "Convictions and offences by ancestry, immigrant background, or citizenship — only where official statistics exist. Clear notes when countries do not publish comparable data.",
  alternates: { canonical: "/crime" },
};

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Full series",
  PARTIAL: "Partial",
  LIMITED: "Limited / reports",
  HISTORICAL: "Historical only",
  NOT_AVAILABLE: "Not published",
};

const STATUS_CLASS: Record<string, string> = {
  AVAILABLE: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  PARTIAL: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  LIMITED: "bg-amber-500/15 text-amber-900 dark:text-amber-200",
  HISTORICAL: "bg-violet-500/15 text-violet-800 dark:text-violet-300",
  NOT_AVAILABLE: "bg-muted text-muted-foreground",
};

export default async function CrimePage() {
  const emptyComp = {
    groups: [] as string[],
    data: [] as Record<string, number>[],
    note: null as string | null,
    useCounts: false,
  };

  const [denmarkC, norwayC, swedenC, usaC, austriaC, prisonRanking, slugRows] =
    await Promise.all([
      safe(getCountryBySlug("denmark"), null),
      safe(getCountryBySlug("norway"), null),
      safe(getCountryBySlug("sweden"), null),
      safe(getCountryBySlug("united-states"), null),
      safe(getCountryBySlug("austria"), null),
      safe(
        getRanking(SLUG.foreignPrisonerShare, { order: "desc", limit: 20 }),
        [],
      ),
      safe(
        prisma.country.findMany({
          where: {
            iso3: {
              in: CRIME_DATA_AVAILABILITY.countries.map((c) => c.iso3),
            },
          },
          select: { iso3: true, slug: true, name: true },
        }),
        [],
      ),
    ]);

  const [
    denmarkSeries,
    norwaySeries,
    swedenSeries,
    usaPrison,
    usaArrest,
    usaMurder,
    austriaPrison,
  ] = await Promise.all([
    denmarkC
      ? safe(
          getComposition(denmarkC.id, "CRIME_ANCESTRY", { useCounts: true }),
          emptyComp,
        )
      : emptyComp,
    norwayC
      ? safe(
          getComposition(norwayC.id, "CRIME_CITIZENSHIP", {
            useCounts: true,
          }),
          emptyComp,
        )
      : emptyComp,
    swedenC
      ? safe(getComposition(swedenC.id, "CRIME_BACKGROUND"), emptyComp)
      : emptyComp,
    usaC
      ? safe(
          getComposition(usaC.id, "CRIME_RACE_PRISON", { useCounts: true }),
          emptyComp,
        )
      : emptyComp,
    usaC
      ? safe(
          getComposition(usaC.id, "CRIME_RACE_ARREST", { useCounts: true }),
          emptyComp,
        )
      : emptyComp,
    usaC
      ? safe(
          getComposition(usaC.id, "CRIME_RACE_MURDER", { useCounts: true }),
          emptyComp,
        )
      : emptyComp,
    austriaC
      ? safe(getCountryTimeSeries(austriaC.id, SLUG.foreignPrisonerShare), [])
      : [],
  ]);

  const slugByIso3 = new Map(slugRows.map((c) => [c.iso3, c]));
  const denmark = denmarkC
    ? { country: denmarkC, series: denmarkSeries }
    : null;
  const norway = norwayC ? { country: norwayC, series: norwaySeries } : null;
  const sweden = swedenC ? { country: swedenC, series: swedenSeries } : null;

  const availability = [...CRIME_DATA_AVAILABILITY.countries].sort((a, b) => {
    const order = [
      "AVAILABLE",
      "PARTIAL",
      "LIMITED",
      "HISTORICAL",
      "NOT_AVAILABLE",
    ];
    return order.indexOf(a.status) - order.indexOf(b.status);
  });

  return (
    <div>
      <PageHeader
        title="Crime by ancestry, origin & race"
        description="Official convictions, offences, arrests and prisoners broken down by ancestry, immigrant background, citizenship, or race — only where statistical offices publish them. Clear notes when they don’t."
      />

      <div className="container space-y-10 py-8">
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {CRIME_DATA_AVAILABILITY.note} Definitions are not internationally
          harmonised: Denmark’s “ancestry” is not the same as U.S. race
          categories, Norway’s citizenship of charged persons, Sweden’s Brå
          background groups, or Eurostat’s foreign-citizen prisoners. Always
          read the source note on each chart.
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          {denmark && denmark.series.groups.length > 0 && (
            <ChartCard
              title="Denmark — persons guilty in crimes by ancestry"
              description="Absolute counts · Danish origin / immigrants / descendants (DST STRAFNA9)"
              source="Statistics Denmark"
              csvRows={denmark.series.data}
              csvName="denmark-crime-ancestry"
            >
              <CompositionLegend groups={denmark.series.groups} />
              <StackedBarChart
                data={denmark.series.data}
                groups={denmark.series.groups}
              />
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {getCrimeMeta("DNK")?.note}{" "}
                <Link
                  href="/country/denmark"
                  className="underline underline-offset-2"
                >
                  Denmark profile
                </Link>
              </p>
            </ChartCard>
          )}

          {norway && norway.series.groups.length > 0 && (
            <ChartCard
              title="Norway — persons charged by citizenship"
              description="Absolute counts · Norwegian vs foreign citizens (SSB 09421)"
              source="Statistics Norway"
              csvRows={norway.series.data}
              csvName="norway-crime-citizenship"
            >
              <CompositionLegend groups={norway.series.groups} />
              <StackedBarChart
                data={norway.series.data}
                groups={norway.series.groups}
              />
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {getCrimeMeta("NOR")?.note} Immigrant-background tables
                (including Norwegian-born to immigrant parents) appear only in
                periodic SSB Excel releases, not this annual StatBank series.{" "}
                <Link
                  href="/country/norway"
                  className="underline underline-offset-2"
                >
                  Norway profile
                </Link>
              </p>
            </ChartCard>
          )}
        </div>

        {sweden && sweden.series.groups.length > 0 && (
          <ChartCard
            title="Sweden — share of registered offences by background"
            description="Brå research study (not an annual StatBank series) · 2007 vs 2018"
            source="Brå report 2021:9"
            csvRows={sweden.series.data}
            csvName="sweden-crime-background"
          >
            <CompositionLegend groups={sweden.series.groups} />
            <CompositionChart
              data={sweden.series.data}
              groups={sweden.series.groups}
            />
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {getCrimeMeta("SWE")?.note}{" "}
              <Link
                href="/country/sweden"
                className="underline underline-offset-2"
              >
                Sweden profile
              </Link>
            </p>
          </ChartCard>
        )}

        {(usaPrison.groups.length > 0 ||
          usaArrest.groups.length > 0 ||
          usaMurder.groups.length > 0) && (
          <section className="space-y-6">
            <div className="border-b pb-2">
              <h2 className="text-xl font-semibold tracking-tight">
                United States — crime by race
              </h2>
              <p className="text-sm text-muted-foreground">
                Federal race series (not immigrant ancestry) ·{" "}
                <Link
                  href="/country/united-states"
                  className="underline underline-offset-2"
                >
                  U.S. profile
                </Link>
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {usaPrison.groups.length > 0 && (
                <ChartCard
                  title="Sentenced prisoners by race / Hispanic origin"
                  description="BJS · sentence &gt; 1 year · state & federal jurisdiction"
                  source="Bureau of Justice Statistics"
                  csvRows={usaPrison.data}
                  csvName="usa-prisoners-race"
                >
                  <CompositionLegend groups={usaPrison.groups} />
                  <StackedBarChart
                    data={usaPrison.data}
                    groups={usaPrison.groups}
                  />
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {USA_CRIME_NOTES.prisoners}
                  </p>
                </ChartCard>
              )}
              {usaArrest.groups.length > 0 && (
                <ChartCard
                  title="Arrests by race"
                  description="FBI UCR Table 43 · Hispanic ethnicity reported separately (not shown)"
                  source="FBI Crime in the United States"
                  csvRows={usaArrest.data}
                  csvName="usa-arrests-race"
                >
                  <CompositionLegend groups={usaArrest.groups} />
                  <StackedBarChart
                    data={usaArrest.data}
                    groups={usaArrest.groups}
                  />
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {USA_CRIME_NOTES.arrests}
                  </p>
                </ChartCard>
              )}
              {usaMurder.groups.length > 0 && (
                <ChartCard
                  title="Murder arrests by race"
                  description="Murder and nonnegligent manslaughter · FBI UCR Table 43"
                  source="FBI Crime in the United States"
                  csvRows={usaMurder.data}
                  csvName="usa-murder-arrests-race"
                >
                  <CompositionLegend groups={usaMurder.groups} />
                  <StackedBarChart
                    data={usaMurder.data}
                    groups={usaMurder.groups}
                  />
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {USA_CRIME_NOTES.murderArrests}
                  </p>
                </ChartCard>
              )}
            </div>
          </section>
        )}

        {prisonRanking.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="Foreign citizenship share of prisoners"
              description="Related Eurostat measure — citizenship, not ancestry"
              source="Eurostat crim_pris_ctz"
            >
              <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                {CRIME_DATA_AVAILABILITY.eurostatPrisonCitizenship}
              </p>
              <RankingTable
                rows={prisonRanking}
                unit="%"
                decimals={1}
                valueLabel="Foreign citizens"
              />
            </ChartCard>
            {austriaPrison.length > 0 && (
              <ChartCard
                title="Austria — foreign prisoner share over time"
                description="Example Eurostat series · % of prisoners with foreign citizenship"
                source="Eurostat"
                csvRows={austriaPrison}
                csvName="austria-foreign-prisoners"
              >
                <TimeSeriesChart
                  data={austriaPrison}
                  decimals={1}
                  unit="%"
                  color="hsl(0 65% 45%)"
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  Country profiles show this series when Eurostat publishes it
                  for that country.
                </p>
              </ChartCard>
            )}
          </div>
        )}

        <section className="space-y-4">
          <div className="border-b pb-2">
            <h2 className="text-xl font-semibold tracking-tight">
              Who publishes what?
            </h2>
            <p className="text-sm text-muted-foreground">
              Availability registry · updated {CRIME_DATA_AVAILABILITY.updated}
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Country</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {availability.map((row) => {
                  const c = slugByIso3.get(row.iso3);
                  return (
                    <tr
                      key={row.iso3}
                      className="border-b border-border/60 align-top last:border-0"
                    >
                      <td className="px-4 py-3 font-medium">
                        {c ? (
                          <Link
                            href={`/country/${c.slug}`}
                            className="hover:underline"
                          >
                            {c.name}
                          </Link>
                        ) : (
                          row.iso3
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[row.status] ?? STATUS_CLASS.NOT_AVAILABLE}`}
                        >
                          {STATUS_LABEL[row.status] ?? row.status}
                        </span>
                        {row.level ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {row.level.replace(/_/g, " ")}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <p className="leading-relaxed">{row.detail}</p>
                        {row.sourceUrl ? (
                          <a
                            href={row.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-xs text-primary hover:underline"
                          >
                            Source
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
