import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { ChartCard } from "@/components/charts/chart-card";
import { GroupedBarChart } from "@/components/charts/grouped-bar-chart";
import { GERMANY_BUERGERGELD } from "@/lib/sources/germany-buergergeld-data";
import { formatNumber } from "@/lib/utils";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Germany Bürgergeld rate by nationality",
  description:
    "Official BA SGB II-Quote by nationality for February 2025 — within-group Bürgergeld rates, plus the share of working-age recipients who are German nationals.",
  alternates: { canonical: "/migration/buergergeld" },
};

export default function GermanyBuergergeldPage() {
  const pack = GERMANY_BUERGERGELD;
  const rateRows = pack.rates.map((r) => ({
    nationality: r.nationality,
    Rate: r.sgb2Rate,
  }));
  const shareRows = pack.elbRecipients.rows
    .filter((r) => r.nationality !== "Foreign nationals")
    .map((r) => ({
      nationality: r.nationality,
      Share: r.shareOfElb,
    }));

  const germanElb = pack.elbRecipients.rows.find(
    (r) => r.nationality === "Germany",
  )!;

  return (
    <div>
      <PageHeader
        title={pack.title}
        description="February 2025 · Bundesagentur für Arbeit Migrationsmonitor. Rates within each nationality — not shares of all recipients."
      />

      <div className="container space-y-14 py-8">
        <section>
          <SectionHeading
            id="sgb2-rate"
            title="SGB II rate within each nationality"
            description={pack.definition}
            tocLabel="Within-group rate"
          />
          <div className="mt-5">
            <ChartCard
              title="Share of each nationality receiving Bürgergeld"
              description={pack.chartNote}
              source={pack.source}
              csvRows={pack.rates.map((r) => ({
                nationality: r.nationality,
                sgb2_rate_pct: r.sgb2Rate,
              }))}
              csvName="germany-buergergeld-sgb2-rate-2025-02"
            >
              <GroupedBarChart
                data={rateRows}
                series={[{ key: "Rate", label: "SGB II-Quote (%)" }]}
                xKey="nationality"
                height={400}
                decimals={1}
                unit="%"
                showValues
              />
            </ChartCard>
          </div>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            {pack.note} Source:{" "}
            <a
              href={pack.sourceUrl}
              className="link-editorial"
              target="_blank"
              rel="noopener noreferrer"
            >
              BA Personen nach Staatsangehörigkeiten
            </a>
            .
          </p>
        </section>

        <section>
          <SectionHeading
            id="elb-share"
            title="Who the recipients actually are"
            description={`Among ${formatNumber(pack.elbRecipients.total)} erwerbsfähige Leistungsberechtigte in ${pack.elbRecipients.month}, German nationals were ${germanElb.shareOfElb}% (${formatNumber(germanElb.count)} people) — still a majority.`}
            tocLabel="Share of recipients"
          />
          <div className="mt-5">
            <ChartCard
              title="Share of working-age Bürgergeld recipients (ELB)"
              description={pack.elbRecipients.note}
              source={pack.source}
              csvRows={pack.elbRecipients.rows.map((r) => ({
                nationality: r.nationality,
                elb_count: r.count,
                share_of_elb_pct: r.shareOfElb,
              }))}
              csvName="germany-buergergeld-elb-share-2025-02"
            >
              <GroupedBarChart
                data={shareRows}
                series={[{ key: "Share", label: "Share of ELB (%)" }]}
                xKey="nationality"
                height={400}
                decimals={1}
                unit="%"
                showValues
              />
            </ChartCard>
          </div>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            high within-group rates for recent refugee nationalities reflect
            arrival timing, work restrictions, and labour-market entry — not the
            composition of the Bürgergeld caseload. Related:{" "}
            <Link href="/migration/fiscal-balance" className="link-editorial">
              immigrant fiscal break-even across Europe
            </Link>
            ,{" "}
            <Link href="/migration/germany" className="link-editorial">
              Germany net migration
            </Link>
            ,{" "}
            <Link href="/demographics/germany" className="link-editorial">
              Germany country of birth
            </Link>
            , and{" "}
            <Link href="/country/germany" className="link-editorial">
              the Germany profile
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
