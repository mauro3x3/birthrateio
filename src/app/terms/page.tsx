import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { siteConfig } from "@/lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Terms for using birthrate.io — data attribution, no warranty, acceptable use, and reuse of charts.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div>
      <PageHeader
        title="Terms of use"
        description="The rules for reading, citing, and reusing material on birthrate.io."
      />

      <div className="container max-w-3xl space-y-10 py-8 text-sm leading-relaxed text-muted-foreground">
        <p className="text-xs text-muted-foreground/80">
          Last updated: 16 September 2026 · Applies to {siteConfig.url}
        </p>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            Acceptance
          </h2>
          <p>
            By using birthrate.io you agree to these terms and to the{" "}
            <Link href="/privacy" className="link-editorial">
              privacy policy
            </Link>
            . If you do not agree, do not use the site.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            What the site is
          </h2>
          <p>
            birthrate.io is a presentation and navigation layer over official
            demographic and economic statistics. It does not publish primary
            official statistics of its own. Underlying series remain governed by
            the licences and terms of the original providers listed on the{" "}
            <Link href="/sources" className="link-editorial">
              sources
            </Link>{" "}
            page.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            No warranty
          </h2>
          <p>
            Figures are provided as-is for research, journalism, education, and
            general information. Series can be revised by statistical offices;
            provisional and modeled values are labelled where we know them. We do
            not warrant completeness, uninterrupted availability, or fitness for
            any particular decision — including investment, legal, medical, or
            policy decisions.
          </p>
          <p>
            How numbers are collected and labelled is described in the{" "}
            <Link href="/methodology" className="link-editorial">
              methodology
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            Citation and reuse
          </h2>
          <p>
            You may cite charts and figures with attribution to birthrate.io and
            to the underlying data provider. Download tools on chart pages are
            provided for that purpose. Do not present our presentation layer as
            an official statistical release. Do not scrape the site in a way that
            degrades service for other users or violates a provider&apos;s
            licence.
          </p>
          <p>
            API and bulk access, where offered, is covered separately under{" "}
            <Link href="/pricing" className="link-editorial">
              pricing
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            Acceptable use
          </h2>
          <p>You agree not to:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              attempt to disrupt, overload, or gain unauthorised access to the
              site or its infrastructure;
            </li>
            <li>
              use the site to misrepresent official statistics or to fabricate
              attributions;
            </li>
            <li>
              submit tips or messages that are abusive, illegal, or contain
              malware.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            Third-party links and ads
          </h2>
          <p>
            External data-provider links and advertising (including Google
            AdSense) are outside our control. Their terms and privacy practices
            apply when you leave birthrate.io or interact with an ad.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            Limitation of liability
          </h2>
          <p>
            To the fullest extent permitted by law, birthrate.io and its
            operators are not liable for indirect, incidental, or consequential
            damages arising from use of the site or reliance on any figure shown
            here.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            Changes
          </h2>
          <p>
            We may update these terms by posting a revised version with a new
            date. Continued use after a change constitutes acceptance.
          </p>
        </section>

        <p>
          Questions:{" "}
          <Link href="/contact" className="link-editorial">
            contact
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
