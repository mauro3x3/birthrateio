import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { ChartCard } from "@/components/charts/chart-card";
import { GroupedBarChart } from "@/components/charts/grouped-bar-chart";
import { MultiSeriesChart } from "@/components/charts/multi-series-chart";
import {
  EUROPE_IMMIGRANT_FISCAL,
  OECD_IMMIGRANT_FISCAL,
} from "@/lib/sources/europe-immigrant-fiscal-data";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Immigrant fiscal impact — OECD & lifetime break-even",
  description:
    "OECD 2006–18 net fiscal contribution of immigrants vs natives in 25 countries, plus Polani (2026) lifetime break-even pay percentiles for UK, France, Spain, and Germany.",
  alternates: { canonical: "/migration/fiscal-balance" },
};

const POLANI_SERIES = [
  { key: "Germany", label: "Germany", color: "#7EB8D4" },
  { key: "Spain", label: "Spain", color: "#A89BC8" },
  { key: "France", label: "France", color: "#4A7FB5" },
  { key: "UK", label: "UK", color: "#CF1126" },
] as const;

export default function ImmigrantFiscalBalancePage() {
  const polani = EUROPE_IMMIGRANT_FISCAL;
  const oecd = OECD_IMMIGRANT_FISCAL;

  const polaniRows = polani.series.map((r) => ({ ...r }));
  const breakRows = polani.breakEven.map((r) => ({
    country: r.country,
    "Break-even percentile": r.percentile,
  }));

  const oecdARows = [...oecd.countries]
    .sort((a, b) => b.foreignA - a.foreignA)
    .map((c) => ({
      country: c.name,
      Immigrants: c.foreignA,
      Natives: c.nativeA,
    }));

  const oecdC2Rows = [...oecd.countries]
    .sort((a, b) => b.foreignC2 - a.foreignC2)
    .map((c) => ({
      country: c.name,
      Immigrants: c.foreignC2,
      Natives: c.nativeC2,
    }));

  return (
    <div>
      <PageHeader
        title="Immigrant fiscal impact across countries"
        description="Two lenses: OECD yearly accounting for 25 countries (2006–18), and a lifetime break-even comparison for the same household type in four European fiscal systems."
      />

      <div className="container space-y-14 py-8">
        <section>
          <SectionHeading
            id="oecd-individual"
            title="OECD — individual taxes and benefits (Spec A)"
            description={oecd.definition}
            tocLabel="OECD Spec A"
          />
          <div className="mt-5">
            <ChartCard
              title="Net fiscal contribution as % of GDP — individual items"
              description={`${oecd.period}. Spec A: immigrants contribute more in taxes/contributions than they receive in individual benefits in every country shown. ${oecd.note}`}
              source={oecd.source}
              csvRows={oecd.countries.map((c) => ({
                iso3: c.iso3,
                country: c.name,
                foreign_spec_a_pct_gdp: c.foreignA,
                native_spec_a_pct_gdp: c.nativeA,
                foreign_spec_c2_pct_gdp: c.foreignC2,
                native_spec_c2_pct_gdp: c.nativeC2,
              }))}
              csvName="oecd-immigrant-fiscal-impact-2006-2018"
            >
              <GroupedBarChart
                data={oecdARows}
                series={[
                  { key: "Immigrants", label: "Foreign-born", color: "#4A7FB5" },
                  { key: "Natives", label: "Native-born", color: "#94A3B8" },
                ]}
                xKey="country"
                height={480}
                decimals={2}
                unit="% of GDP"
                showValues
              />
            </ChartCard>
          </div>
        </section>

        <section>
          <SectionHeading
            id="oecd-full"
            title="OECD — full budget including public goods (Spec C2)"
            description="Once congestible and pure public goods are shared per capita, immigrant and native totals usually sit between −1% and +1% of GDP — and often mirror the country’s overall deficit."
            tocLabel="OECD Spec C2"
          />
          <div className="mt-5">
            <ChartCard
              title="Net fiscal contribution as % of GDP — all public goods"
              description="Spec C2 from OECD IMO 2021 Table 4.1. Positive = net contribution; negative = net cost under this accounting."
              source={oecd.source}
              csvRows={oecd.countries.map((c) => ({
                iso3: c.iso3,
                country: c.name,
                foreign_spec_c2_pct_gdp: c.foreignC2,
                native_spec_c2_pct_gdp: c.nativeC2,
              }))}
              csvName="oecd-immigrant-fiscal-c2-2006-2018"
            >
              <GroupedBarChart
                data={oecdC2Rows}
                series={[
                  { key: "Immigrants", label: "Foreign-born", color: "#4A7FB5" },
                  { key: "Natives", label: "Native-born", color: "#94A3B8" },
                ]}
                xKey="country"
                height={480}
                decimals={2}
                unit="% of GDP"
                referenceY={0}
                referenceLabel="Break-even"
                showValues
              />
            </ChartCard>
          </div>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Source:{" "}
            <a
              href={oecd.sourceUrl}
              className="link-editorial"
              target="_blank"
              rel="noopener noreferrer"
            >
              {oecd.source}
            </a>
            {" · "}
            <a
              href={oecd.statLink}
              className="link-editorial"
              target="_blank"
              rel="noopener noreferrer"
            >
              StatLink table
            </a>
            . Country briefs pull the matching row automatically where available.
          </p>
        </section>

        <section>
          <SectionHeading
            id="lifetime-balance"
            title={polani.subtitle}
            description={polani.definition}
            tocLabel="Lifetime break-even"
          />
          <div className="mt-5">
            <ChartCard
              title="Immigrants must earn more to be net contributors in the UK"
              description={`${polani.note} Positive = net contribution; negative = net cost.`}
              source={polani.source}
              csvRows={polani.series}
              csvName="europe-immigrant-fiscal-breakeven"
            >
              <MultiSeriesChart
                data={polaniRows}
                series={[...POLANI_SERIES]}
                xKey="percentile"
                height={440}
                decimals={0}
                unit={polani.unitLabel}
                referenceY={0}
                referenceLabel="Break-even"
                xTickFormatter={(v) => `${v}th`}
                tooltipLabelFormatter={(v) => `${v}th pay percentile`}
                endLabelStyle="datawrapper"
                showValues
              />
            </ChartCard>
          </div>
        </section>

        <section>
          <SectionHeading
            id="breakeven"
            title="Pay percentile needed to break even"
            description="Where each country’s Polani curve crosses zero for this household type."
            tocLabel="Break-even percentiles"
          />
          <div className="mt-5">
            <ChartCard
              title="Main-earner percentile at fiscal break-even"
              description="Lower is easier: Germany’s system turns this couple net-positive around the 30th percentile; the UK needs roughly the 55th."
              source={polani.source}
              csvRows={polani.breakEven.map((r) => ({
                country: r.country,
                break_even_percentile: r.percentile,
              }))}
              csvName="europe-immigrant-fiscal-breakeven-percentile"
            >
              <GroupedBarChart
                data={breakRows}
                series={[
                  {
                    key: "Break-even percentile",
                    label: "Break-even percentile",
                    color: "#CF1126",
                  },
                ]}
                xKey="country"
                height={320}
                decimals={0}
                unit="percentile"
                showValues
              />
            </ChartCard>
          </div>
          <ul className="mt-4 max-w-2xl list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {polani.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Lifetime curves are about fiscal design, not immigrant “quality.”
            Related:{" "}
            <Link href="/migration/buergergeld" className="link-editorial">
              Germany Bürgergeld by nationality
            </Link>
            ,{" "}
            <Link href="/migration" className="link-editorial">
              migration hub
            </Link>
            ,{" "}
            <Link href="/brief" className="link-editorial">
              country briefs
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
