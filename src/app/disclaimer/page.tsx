import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "birthrate.io publishes demographic reference data from official sources. It is not advice, advocacy, or a substitute for the original statistical release.",
  alternates: { canonical: "/disclaimer" },
};

export default function DisclaimerPage() {
  return (
    <div>
      <PageHeader
        title="Disclaimer"
        description="What this site is for — and what it is not."
      />

      <div className="container max-w-3xl space-y-8 py-8 text-sm leading-relaxed text-muted-foreground">
        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            Reference, not advice
          </h2>
          <p>
            birthrate.io is an independent presentation layer over public
            demographic and economic statistics. Charts, maps, rankings, and
            briefings are for research, journalism, teaching, and general
            understanding. Nothing on the site is legal, medical, financial,
            investment, or policy advice, and nothing here should be treated as
            an official government publication.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            Sources remain authoritative
          </h2>
          <p>
            Underlying figures belong to the World Bank, UN agencies, OECD,
            Eurostat, national statistical offices, and other named providers
            listed on each page and on{" "}
            <Link href="/sources" className="link-editorial">
              sources
            </Link>
            . If a chart and the original release disagree, trust the original
            release and{" "}
            <Link href="/contribute" className="link-editorial">
              tell us
            </Link>
            . Licences and reuse terms of those providers still apply.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            Projections and nowcasts
          </h2>
          <p>
            UN World Population Prospects variants, national projections, and
            provisional nowcasts are scenarios or early estimates. They are not
            guarantees of future population, fertility, or migration. Method
            notes live in{" "}
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
          <p>
            Fertility, migration, and group differences are politically
            contested. The site presents official categories with their
            definitions and does not argue for a policy outcome. Background:{" "}
            <Link href="/about" className="link-editorial">
              about
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            Liability
          </h2>
          <p>
            We work to keep figures current and correctly labelled, but errors
            and lag against the source are possible. Use of the site is at your
            own risk. Formal terms:{" "}
            <Link href="/terms" className="link-editorial">
              terms of use
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
