import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How birthrate.io collects, harmonises, and labels demographic data — ingestion, estimates versus projections, provisional figures, revisions, and known limitations.",
  alternates: { canonical: "/methodology" },
};

const SECTIONS = [
  { id: "principles", title: "Principles" },
  { id: "ingestion", title: "How data reaches this site" },
  { id: "labels", title: "Estimates, projections, and provisional figures" },
  { id: "harmonisation", title: "Harmonisation and comparability" },
  { id: "modelled", title: "Modelled figures" },
  { id: "revisions", title: "Revisions" },
  { id: "limitations", title: "Known limitations" },
  { id: "corrections", title: "Corrections" },
];

export default function MethodologyPage() {
  return (
    <div>
      <PageHeader
        title="Methodology"
        description="What the numbers on this site are, where they come from, and what they cannot tell you."
      />

      <div className="container">
        <div className="grid gap-10 py-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
          <aside className="hidden lg:block">
            <nav aria-label="Contents" className="sticky top-20 space-y-2">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                On this page
              </p>
              <ul className="space-y-1 border-l border-border">
                {SECTIONS.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="-ml-px block border-l border-transparent py-1 pl-3 text-sm leading-snug text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <div className="min-w-0 max-w-3xl space-y-10 text-sm leading-relaxed text-muted-foreground">
            <section id="principles" className="scroll-mt-24 space-y-3">
              <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
                Principles
              </h2>
              <p>
                birthrate.io publishes no primary statistics. Every figure is
                sourced from a statistical agency or research institution, is
                attributed on the chart where it appears, and can be traced back
                to the original release. Where we transform data, the
                transformation is described here or on the chart itself.
              </p>
              <p>
                Three rules govern everything on the site: label the provenance
                of every number, never present a model as an observation, and
                keep the download that a reader gets identical to the data behind
                the chart they are looking at.
              </p>
            </section>

            <section id="ingestion" className="scroll-mt-24 space-y-3">
              <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
                How data reaches this site
              </h2>
              <p>
                Series are pulled directly from provider APIs and bulk releases
                on a weekly schedule, then written into a single indicator table
                keyed by subject, indicator, and year. Each indicator has one
                canonical definition, unit, and source, listed in the{" "}
                <Link href="/glossary" className="link-editorial">
                  glossary
                </Link>
                .
              </p>
              <p>
                Nothing is hand-edited in the database. When a provider revises a
                series, the next ingestion overwrites the affected values, so the
                site always reflects the current vintage rather than a frozen
                snapshot. Page headers show when the underlying indicators were
                last written.
              </p>
            </section>

            <section id="labels" className="scroll-mt-24 space-y-3">
              <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
                Estimates, projections, and provisional figures
              </h2>
              <p>
                Every value carries one of three labels, and the distinction
                matters more than any single number on the site.
              </p>
              <ul className="space-y-2 pl-0">
                <li className="flex gap-2">
                  <span aria-hidden className="select-none opacity-60">
                    —
                  </span>
                  <span>
                    <strong className="font-semibold text-foreground">
                      Estimates
                    </strong>{" "}
                    describe a past or current year, compiled by an agency from
                    registration, census, or survey data.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span aria-hidden className="select-none opacity-60">
                    —
                  </span>
                  <span>
                    <strong className="font-semibold text-foreground">
                      Projections
                    </strong>{" "}
                    describe future years and depend entirely on their
                    assumptions. They are not forecasts, and charts label them as
                    modelled.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span aria-hidden className="select-none opacity-60">
                    —
                  </span>
                  <span>
                    <strong className="font-semibold text-foreground">
                      Provisional figures
                    </strong>{" "}
                    are early releases, sometimes covering part of a year. They
                    are the most current numbers available and the most likely to
                    change.
                  </span>
                </li>
              </ul>
            </section>

            <section id="harmonisation" className="scroll-mt-24 space-y-3">
              <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
                Harmonisation and comparability
              </h2>
              <p>
                Cross-country comparison is only as good as the weakest
                definition involved. We prefer a single provider covering all
                countries over stitching national sources together, because
                consistency of definition usually matters more than precision in
                any one country.
              </p>
              <p>
                Some categories cannot be harmonised at all. Ethnicity, race, and
                migration background are defined differently in every country
                that measures them, so those pages are presented per country and
                are not comparable across borders. Recorded crime other than
                homicide reflects reporting and policing practice as much as
                underlying offending.
              </p>
              <p>
                Aggregates such as regions, income groups, and world totals are
                excluded from country rankings and maps.
              </p>
            </section>

            <section id="modelled" className="scroll-mt-24 space-y-3">
              <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
                Modelled figures
              </h2>
              <p>
                A few features generate numbers rather than report them: the
                population{" "}
                <Link href="/simulator" className="link-editorial">
                  simulator
                </Link>
                , the live{" "}
                <Link href="/clock" className="link-editorial">
                  clock
                </Link>
                , and the population calculator. These extrapolate from official
                inputs under assumptions the reader controls, and are labelled as
                modelled wherever they appear. They are illustrative tools, not
                official projections, and should not be cited as observations.
              </p>
            </section>

            <section id="revisions" className="scroll-mt-24 space-y-3">
              <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
                Revisions
              </h2>
              <p>
                Demographic data is revised routinely. Provisional fertility
                figures move as late birth registrations arrive; population
                series are rebased after each census; migration estimates are
                revised most of all. A figure changing is normally a sign the
                statistical system is working, not that it failed.
              </p>
              <p>
                Because ingestion overwrites revised values, a chart downloaded
                today may differ from the same chart downloaded next month. Cite
                the access date, which the citation block on each page includes.
              </p>
            </section>

            <section id="limitations" className="scroll-mt-24 space-y-3">
              <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
                Known limitations
              </h2>
              <p>
                Coverage is uneven. Countries without complete vital registration
                appear with modelled or interpolated values from their provider,
                and the site does not currently distinguish those from directly
                measured figures. Migration data is the least complete of any
                domain here. Subnational and city data comes from national
                offices using their own geographies, so regions are not
                comparable across countries.
              </p>
              <p>
                Confidence intervals are not yet displayed, even where the
                provider publishes them.
              </p>
            </section>

            <section id="corrections" className="scroll-mt-24 space-y-3">
              <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
                Corrections
              </h2>
              <p>
                If a figure looks wrong, it may well be.{" "}
                <Link href="/contribute" className="link-editorial">
                  Report it
                </Link>{" "}
                with the page and the series, and we will trace it back to the
                source. Corrections to ingestion logic are applied for every
                country at once rather than patched for a single value.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
