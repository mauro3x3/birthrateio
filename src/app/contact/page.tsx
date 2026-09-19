import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { contactConfig, siteConfig, supportConfig } from "@/lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Contact",
  description:
    "How to reach birthrate.io for data corrections, privacy requests, partnerships, and support.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const email = contactConfig.organisationsEmail;

  return (
    <div>
      <PageHeader
        title="Contact"
        description="Corrections, privacy requests, partnerships, and other enquiries."
      />

      <div className="container max-w-3xl space-y-10 py-8 text-sm leading-relaxed text-muted-foreground">
        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            Data corrections
          </h2>
          <p>
            If a chart looks wrong, outdated, or missing a newly released
            official series, the fastest path is the contribute form. Include the
            page URL and a link to the source when you have one.
          </p>
          <p>
            <Link
              href="/contribute"
              className="link-editorial font-medium text-primary"
            >
              Help improve the data →
            </Link>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            Privacy and legal
          </h2>
          <p>
            For privacy requests (access, correction, or deletion of personal
            data you sent us), partnership or press enquiries, or questions about
            the{" "}
            <Link href="/privacy" className="link-editorial">
              privacy policy
            </Link>{" "}
            or{" "}
            <Link href="/terms" className="link-editorial">
              terms of use
            </Link>
            :
          </p>
          {email ? (
            <p>
              Email{" "}
              <a href={`mailto:${email}`} className="link-editorial font-medium">
                {email}
              </a>
              .
            </p>
          ) : (
            <p>
              Use the{" "}
              <Link href="/contribute?about=privacy-or-contact" className="link-editorial">
                contribute form
              </Link>{" "}
              and set the category to Other, with subject line{" "}
              <span className="text-foreground">Privacy / contact</span>. We
              read these by hand.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            Support the project
          </h2>
          <p>
            The site is free to read. Running costs are covered by ads and
            voluntary donations via {supportConfig.providerName}.
          </p>
          <p>
            <Link href="/support" className="link-editorial font-medium text-primary">
              Donate →
            </Link>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            About the project
          </h2>
          <p>
            birthrate.io ({siteConfig.url}) is an open demographic reference —
            not a government statistical office. Background and editorial
            position:{" "}
            <Link href="/about" className="link-editorial">
              About
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
