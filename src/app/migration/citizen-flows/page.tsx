import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { ChartCard } from "@/components/charts/chart-card";
import { CitizenFlowsScatter } from "@/components/charts/citizen-flows-scatter";
import { getCitizenFlows } from "@/lib/sources/eurostat-citizen-flows-data";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Citizens leaving and coming home — EU & EFTA",
  description:
    "Eurostat citizenship flows: nationals who emigrated vs returned, per 1,000 citizens, with bubble size for absolute leavers. EU and EFTA, latest year.",
  alternates: { canonical: "/migration/citizen-flows" },
};

export default function CitizenFlowsPage() {
  const pack = getCitizenFlows();
  const years = [...new Set(pack.rows.map((r) => r.year))].sort(
    (a, b) => b - a,
  );
  const yearLabel =
    years.length === 1
      ? String(years[0])
      : `${years[years.length - 1]}–${years[0]} (fallback when ${pack.yearPreferred} unpublished)`;

  const netReturn = pack.rows.filter(
    (r) => r.returnPer1000 >= r.leavePer1000,
  ).length;
  const netLeave = pack.rows.length - netReturn;

  return (
    <div>
      <PageHeader
        title="Citizens leaving and coming home"
        description={`Nationals who moved abroad versus nationals who moved back — EU and EFTA, ${yearLabel}. Foreign residents are not counted.`}
      />

      <div className="container space-y-14 py-8">
        <section>
          <SectionHeading
            id="scatter"
            title="Leave rate vs return rate"
            description={pack.definition}
            tocLabel="Scatter"
          />
          <div className="mt-5">
            <ChartCard
              title={`${pack.title}, ${pack.subtitle}`}
              description={`${pack.rows.length} countries. ${netReturn} above the diagonal (more returned than left); ${netLeave} below. ${pack.note}`}
              source={pack.source}
              csvRows={pack.rows.map((r) => ({
                iso3: r.iso3,
                geo: r.geo,
                country: r.name,
                efta: r.efta,
                year: r.year,
                emigrants: r.emigrants,
                return_immigrants: r.returnImmigrants,
                citizen_population: r.citizenPopulation,
                leave_per_1000: r.leavePer1000,
                return_per_1000: r.returnPer1000,
              }))}
              csvName="eurostat-citizen-flows"
            >
              <CitizenFlowsScatter rows={pack.rows} height={580} />
            </ChartCard>
          </div>
        </section>

        <section className="max-w-2xl space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="font-serif text-base font-semibold text-foreground">
            How to read it
          </h2>
          <p>
            The diagonal is equal leave and return rates. Romania sits near
            both axes at once: high churn, roughly balanced. Luxembourg shows
            high leave relative to return. Large Western European countries
            cluster near the origin — low rates of citizen emigration and
            return, even when absolute numbers are large (bubble size).
          </p>
          <p>
            Eurostat codes nationals as &ldquo;reporting country&rdquo;
            (citizen = NAT). Population is nationals on 1 January; flows are
            annual. Prefer {pack.yearPreferred}; fall back one or two years
            when a series is still unpublished (Portugal in this pack uses{" "}
            {pack.rows.find((r) => r.geo === "PT")?.year ?? "an earlier year"}
            ).
          </p>
          <p>
            Related:{" "}
            <Link href="/migration" className="link-editorial">
              migration hub
            </Link>
            {" · "}
            <Link href="/migration/fiscal-balance" className="link-editorial">
              immigrant fiscal balance
            </Link>
            {" · "}
            <Link href="/workers-retirees" className="link-editorial">
              workers vs retirees
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
