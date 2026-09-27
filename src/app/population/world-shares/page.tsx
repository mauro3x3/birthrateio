import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { ChartCard } from "@/components/charts/chart-card";
import { WorldSharesSeriesChart } from "@/components/world-shares-series-chart";
import { WorldSharesTreemap } from "@/components/world-shares-treemap";
import { getWorldShares } from "@/lib/sources/world-shares-data";
import { formatCompact } from "@/lib/utils";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Share of world population and births — Country trends to 2100",
  description:
    "Each country’s share of world population and of world births, 1950–2100. UN World Population Prospects medium variant via Our World in Data — compare China, India, Nigeria, and more.",
  alternates: { canonical: "/population/world-shares" },
};

export default function WorldSharesPage() {
  const pack = getWorldShares();
  const ranking = pack.countries;
  const chn = ranking.find((c) => c.iso3 === "CHN");
  const ind = ranking.find((c) => c.iso3 === "IND");
  const chn2100 = chn?.population.find((p) => p.year === 2100);
  const ind2100 = ind?.population.find((p) => p.year === 2100);
  const chn1950 = chn?.population.find((p) => p.year === 1950);

  return (
    <div>
      <PageHeader
        title="Share of the world"
        description={`${pack.definition} Toggle countries on the chart — population stock or annual births.`}
      />

      <div className="container space-y-14 py-8">
        <section>
          <SectionHeading
            id="series"
            title="Population and births over time"
            description={`UN medium variant. History through ${pack.forecastFrom - 1}; forecast from ${pack.forecastFrom} to 2100.`}
            tocLabel="Time series"
          />
          <div className="mt-5">
            <ChartCard
              title={pack.title}
              description={
                chn1950 && chn2100 && ind2100
                  ? `China falls from ${chn1950.value}% of world population in 1950 to ${chn2100.value}% by 2100. India ends near ${ind2100.value}%. Switch to births to see who is having the next generation.`
                  : pack.note
              }
              source={pack.source}
              csvRows={pack.countries.flatMap((c) =>
                c.population.map((p) => {
                  const b = c.births.find((x) => x.year === p.year);
                  return {
                    iso3: c.iso3,
                    country: c.name,
                    year: p.year,
                    population_share_pct: p.value,
                    population_projected: p.projected,
                    births_share_pct: b?.value ?? null,
                    births_projected: b?.projected ?? null,
                  };
                }),
              )}
              csvName="world-shares"
            >
              <WorldSharesSeriesChart
                countries={pack.countries}
                defaultIso3s={pack.chartDefault}
                forecastFrom={pack.forecastFrom}
                height={420}
              />
            </ChartCard>
          </div>
        </section>

        <section>
          <SectionHeading
            id="treemap"
            title="Who makes up the world today"
            description={`Area ∝ ${pack.snapshot.populationYear} population (or births). Colours are continents — Asia still dominates the stock; Africa’s share of births is already much larger.`}
            tocLabel="Treemap"
          />
          <div className="mt-5">
            <ChartCard
              title={`World population mosaic, ${pack.snapshot.populationYear}`}
              description={
                pack.snapshot.worldPopulation
                  ? `${formatCompact(pack.snapshot.worldPopulation)} people · ${
                      pack.snapshot.worldBirths
                        ? `${formatCompact(pack.snapshot.worldBirths)} births`
                        : "births"
                    } in ${pack.snapshot.birthsYear}.`
                  : pack.note
              }
              source={pack.source}
            >
              <WorldSharesTreemap
                countries={pack.countries}
                continentColors={pack.continentColors}
                populationYear={pack.snapshot.populationYear}
                birthsYear={pack.snapshot.birthsYear}
                height={560}
              />
            </ChartCard>
          </div>
        </section>

        <section>
          <SectionHeading
            id="ranking"
            title="Latest shares"
            description={`Population ${pack.snapshot.populationYear}; births ${pack.snapshot.birthsYear}. Δ is birth share minus population share — positive means a younger age structure punching above its weight.`}
            tocLabel="Ranking"
          />
          <div className="mt-5 overflow-x-auto border border-border">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Country</th>
                  <th className="px-3 py-2 font-medium tabular-nums">
                    Pop. share
                  </th>
                  <th className="px-3 py-2 font-medium tabular-nums">
                    Birth share
                  </th>
                  <th className="px-3 py-2 font-medium tabular-nums">Δ pp</th>
                </tr>
              </thead>
              <tbody>
                {ranking.slice(0, 50).map((c, i) => {
                  const pop = c.latestPopulation?.value ?? null;
                  const birth = c.latestBirths?.value ?? null;
                  const delta =
                    pop != null && birth != null
                      ? Math.round((birth - pop) * 10) / 10
                      : null;
                  return (
                    <tr
                      key={c.iso3}
                      className="border-b border-border/70 last:border-0"
                    >
                      <td className="px-3 py-1.5 tabular-nums text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="px-3 py-1.5">
                        {c.flag ? (
                          <span className="mr-1.5" aria-hidden>
                            {c.flag}
                          </span>
                        ) : null}
                        {c.name}
                      </td>
                      <td className="px-3 py-1.5 tabular-nums">
                        {pop != null ? `${pop.toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-3 py-1.5 tabular-nums">
                        {birth != null ? `${birth.toFixed(1)}%` : "—"}
                      </td>
                      <td
                        className={`px-3 py-1.5 tabular-nums ${
                          delta != null && delta > 0
                            ? "text-emerald-700"
                            : delta != null && delta < 0
                              ? "text-rose-700"
                              : "text-muted-foreground"
                        }`}
                      >
                        {delta == null
                          ? "—"
                          : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="max-w-2xl space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="font-serif text-base font-semibold text-foreground">
            How to read it
          </h2>
          <p>
            Population share is the stock of people. Birth share is the flow of
            babies that year — so Nigeria or the DRC can outrank much larger
            rich countries on births while still trailing on population.
          </p>
          <p>
            Related:{" "}
            <Link href="/population/shares" className="link-editorial">
              regional birth pies
            </Link>
            {" · "}
            <Link href="/population" className="link-editorial">
              population explorer
            </Link>
            {" · "}
            <Link href="/compare" className="link-editorial">
              compare countries
            </Link>
            {" · "}
            <Link href="/maps/historic/world-pop82" className="link-editorial">
              Equal-population world, 1914–2050
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
              OWID population with UN projections
            </a>
            {" · "}
            <a
              href={pack.birthsSourceUrl}
              className="link-editorial"
              target="_blank"
              rel="noopener noreferrer"
            >
              number of births
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
