import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { ChartCard } from "@/components/charts/chart-card";
import { MapCard } from "@/components/maps/map-card";
import { DivorceMarriageSeriesChart } from "@/components/divorce-marriage-series-chart";
import {
  divorceMarriageLatestRows,
  getDivorceMarriage,
} from "@/lib/sources/eurostat-divorce-marriage-data";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Divorces per 100 marriages — Europe over time",
  description:
    "Eurostat DIVMARPCT choropleth and time series: annual divorces relative to annual marriages across the EU, EFTA, Türkiye, and neighbours, 1960–2024.",
  alternates: { canonical: "/demographics/divorce-marriage" },
};

const EUROPE_FOCUS = {
  center: [54, 20] as [number, number],
  zoom: 3.35,
};

const EUROPE_CLAMP = {
  west: -25,
  south: 34,
  east: 48,
  north: 72,
};

export default function DivorceMarriagePage() {
  const pack = getDivorceMarriage();
  const ranking = divorceMarriageLatestRows();
  const firstYear = pack.europeFrames[0]?.year;
  const lastYear = pack.europeFrames[pack.europeFrames.length - 1]?.year;
  // Frame Europe + Türkiye; keep Russia/Caucasus off the default camera.
  const focusIso3s = [
    ...new Set(
      pack.europeFrames
        .flatMap((f) => f.data.map((d) => d.iso3))
        .filter(
          (iso) =>
            !["RUS", "GEO", "ARM", "AZE", "KAZ"].includes(iso),
        ),
    ),
  ];

  const tur = pack.countries.find((c) => c.iso3 === "TUR");
  const high = ranking[0];
  const low = ranking[ranking.length - 1];

  return (
    <div>
      <PageHeader
        title="Divorces per 100 marriages"
        description={`${pack.definition} Europe and neighbours, ${firstYear}–${lastYear}.`}
      />

      <div className="container space-y-14 py-8">
        <section>
          <SectionHeading
            id="map"
            title="Europe map"
            description="Scrub the year to compare how the ratio moved as marriage rates fell and divorce patterns shifted. Türkiye, the UK (to 2016), EFTA, and the Western Balkans sit alongside the EU-27."
            tocLabel="Map"
          />
          <div className="mt-5">
            <MapCard
              id="divorce-marriage-map"
              title={`${pack.title}, ${firstYear}–${lastYear}`}
              description={pack.note}
              source={pack.source}
              frames={pack.europeFrames}
              unit={pack.unit}
              decimals={1}
              scaleType="plasma"
              height={520}
              appearance="light"
              focusIso3s={focusIso3s}
              focusCamera={EUROPE_FOCUS}
              focusClamp={EUROPE_CLAMP}
              frameStats={pack.europeFrames.map((f) => ({
                year: f.year,
                label: `${f.data.length} countries`,
              }))}
            />
          </div>
        </section>

        <section>
          <SectionHeading
            id="series"
            title="Compare countries over time"
            description="Türkiye rose from about 10 divorces per 100 marriages in 2003 to 33 in 2024 — still below Spain or Sweden, but climbing as marriages fall. Toggle countries to overlay paths."
            tocLabel="Time series"
          />
          <div className="mt-5">
            <ChartCard
              title="Divorces per 100 marriages"
              description={`${pack.countries.length} national series from Eurostat. Default overlay: ${pack.chartDefault
                .map(
                  (iso) =>
                    pack.countries.find((c) => c.iso3 === iso)?.name ?? iso,
                )
                .join(", ")}.`}
              source={pack.source}
              csvRows={pack.countries.flatMap((c) =>
                c.series.map((p) => ({
                  iso3: c.iso3,
                  geo: c.geo,
                  country: c.name,
                  year: p.year,
                  divorces_per_100_marriages: p.value,
                })),
              )}
              csvName="eurostat-divorce-marriage"
            >
              <DivorceMarriageSeriesChart
                countries={pack.countries}
                defaultIso3s={pack.chartDefault}
                height={400}
              />
            </ChartCard>
          </div>
        </section>

        <section>
          <SectionHeading
            id="ranking"
            title="Latest reading"
            description="Each country uses its most recent published year — some EU members still lag on 2023–24."
            tocLabel="Ranking"
          />
          <div className="mt-5 overflow-x-auto border border-border">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Country</th>
                  <th className="px-3 py-2 font-medium tabular-nums">Year</th>
                  <th className="px-3 py-2 font-medium tabular-nums">
                    Per 100 marriages
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r, i) => (
                  <tr
                    key={r.iso3}
                    className="border-b border-border/70 last:border-0"
                  >
                    <td className="px-3 py-1.5 tabular-nums text-muted-foreground">
                      {i + 1}
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="mr-1.5" aria-hidden>
                        {r.flag}
                      </span>
                      {r.name}
                      {!r.eu27 ? (
                        <span className="ml-1.5 text-[10px] text-muted-foreground">
                          non-EU
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-1.5 tabular-nums text-muted-foreground">
                      {r.year}
                    </td>
                    <td className="px-3 py-1.5 font-medium tabular-nums">
                      {r.value.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="max-w-2xl space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="font-serif text-base font-semibold text-foreground">
            How to read it
          </h2>
          <p>
            A high ratio can mean more divorces, fewer marriages, or both. In
            recent years many European countries have seen marriage counts fall
            faster than divorces, which pushes this indicator up even when
            crude divorce rates are flat.
          </p>
          {tur ? (
            <p>
              Türkiye&rsquo;s national figure was {tur.latest.value} in{" "}
              {tur.latest.year}
              {high ? (
                <>
                  {" "}
                  — well below {high.name}&rsquo;s {high.value.toFixed(1)} (
                  {high.year})
                </>
              ) : null}
              {low ? (
                <>
                  {" "}
                  and above {low.name}&rsquo;s {low.value.toFixed(1)} (
                  {low.year})
                </>
              ) : null}
              . Provincial maps like the viral Turkish province choropleths need
              TÜİK province tables; Eurostat only publishes the national ratio
              here.
            </p>
          ) : null}
          <p>
            Related:{" "}
            <Link href="/maps/eu" className="link-editorial">
              EU regional maps
            </Link>
            {" · "}
            <Link href="/fertility/race" className="link-editorial">
              marriage &amp; intermarriage
            </Link>
            {" · "}
            <Link href="/demographics" className="link-editorial">
              census maps
            </Link>
            {" · "}
            <Link href="/migration/citizen-flows" className="link-editorial">
              citizen leave/return
            </Link>
          </p>
          <p>
            Source:{" "}
            <a
              href={pack.sourceUrl}
              className="link-editorial"
              target="_blank"
              rel="noopener noreferrer"
            >
              Eurostat demo_ndivind
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
