import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { INDICATORS } from "@/lib/indicators";
import { DATA_SOURCES } from "@/lib/sources/reference";
import { navTopics } from "@/lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "About",
  description:
    "What birthrate.io is, who it is for, how it is funded, and how to reuse the data — an open reference for demographic statistics from the World Bank, UN, OECD and national statistical offices.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const topicCount = navTopics.reduce(
    (total, topic) => total + topic.links.length,
    0,
  );

  const facts = [
    { label: "Indicators", value: String(INDICATORS.length) },
    { label: "Data providers", value: String(DATA_SOURCES.length) },
    { label: "Topic pages", value: String(topicCount) },
    { label: "Cost to read", value: "Free" },
  ];

  return (
    <div>
      <PageHeader
        title="About birthrate.io"
        description="An open reference for demographic data — fertility, population, migration, mortality, and the economics around them, for every country."
      />

      <div className="container max-w-3xl space-y-10 py-8">
        <dl className="key-figures">
          {facts.map((fact) => (
            <div key={fact.label} className="key-figure">
              <dt className="key-figure-label">{fact.label}</dt>
              <dd className="key-figure-value">{fact.value}</dd>
            </div>
          ))}
        </dl>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            What this is
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Demographic statistics are public, but they are scattered across
            agency portals that each assume you already know what you are looking
            for. birthrate.io collects the core series in one place, gives every
            country a consistent profile, and makes each chart readable,
            downloadable, and citable.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The site publishes no primary statistics of its own. It is a
            presentation layer over the{" "}
            <Link href="/sources" className="link-editorial">
              official releases
            </Link>
            , and its value is in harmonisation, labelling, and navigation rather
            than in new measurement.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            Who it is for
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Journalists checking a figure before publication, researchers who
            need a comparable series quickly, students learning what a fertility
            rate actually measures, and anyone who read a claim about population
            decline and wanted to see the data themselves.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Because of that last group, every page states what it measures and
            what the measure cannot tell you. Definitions live in the{" "}
            <Link href="/glossary" className="link-editorial">
              glossary
            </Link>{" "}
            and collection detail in the{" "}
            <Link href="/methodology" className="link-editorial">
              methodology
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            Editorial position
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Fertility and migration are politically charged, and some of the data
            here is used on all sides of those arguments. The site takes no
            position on what any trend implies or what policy should follow.
            Numbers are presented with their definitions, their sources, and the
            caveats that limit them, including where a comparison is not valid.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Where categories are contested or country-specific — ethnicity, race,
            migration background, recorded crime — that is stated on the page
            rather than smoothed over.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            Reuse and funding
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Every chart can be downloaded as an image or as the CSV behind it.
            Reuse is welcome with attribution, and each page carries a citation
            block. Note that the underlying data remains governed by the licence
            of the original provider, listed on the{" "}
            <Link href="/sources" className="link-editorial">
              sources
            </Link>{" "}
            page.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The site is free to read, carries no advertising, and is run
            independently. Running costs are covered by{" "}
            <Link href="/support" className="link-editorial">
              voluntary donations
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            Corrections
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Errors are inevitable in a dataset this size, and reports are the
            fastest way they get fixed. If something looks wrong,{" "}
            <Link href="/contribute" className="link-editorial">
              tell us
            </Link>{" "}
            which page and series, and it will be traced back to the source.
          </p>
        </section>
      </div>
    </div>
  );
}
