import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { contactConfig, siteConfig, supportConfig } from "@/lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How birthrate.io collects, uses, and shares information — including analytics, advertising, and cookies.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const email = contactConfig.organisationsEmail;

  return (
    <div>
      <PageHeader
        title="Privacy policy"
        description="What we collect on birthrate.io, why we collect it, and the choices you have."
      />

      <div className="container max-w-3xl space-y-10 py-8 text-sm leading-relaxed text-muted-foreground">
        <p className="text-xs text-muted-foreground/80">
          Last updated: 16 September 2026 · Applies to {siteConfig.url}
        </p>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            Who we are
          </h2>
          <p>
            birthrate.io is an open reference for demographic statistics. The
            site is operated as an independent project. For data corrections,
            partnership enquiries, or privacy requests, use the{" "}
            <Link href="/contact" className="link-editorial">
              contact page
            </Link>
            {email ? (
              <>
                {" "}
                or email{" "}
                <a href={`mailto:${email}`} className="link-editorial">
                  {email}
                </a>
              </>
            ) : null}
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            What this site does with data
          </h2>
          <p>
            Most pages are public statistics from the World Bank, UN agencies,
            OECD, IMF, and national statistical offices. We do not sell personal
            profiles, and we do not require an account to read charts or maps.
          </p>
          <p>We may process limited personal data when you:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              send a tip or correction through the{" "}
              <Link href="/contribute" className="link-editorial">
                contribute form
              </Link>{" "}
              (name, email, and message content you choose to provide);
            </li>
            <li>
              open a donation flow via{" "}
              <a
                href={supportConfig.donationUrl}
                className="link-editorial"
                rel="noopener noreferrer"
                target="_blank"
              >
                {supportConfig.providerName}
              </a>{" "}
              (payment details are handled by that provider, not stored on our
              servers);
            </li>
            <li>browse the site (see cookies and analytics below).</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            Cookies, analytics, and advertising
          </h2>
          <p>
            We use cookies and similar technologies for essential site function,
            audience measurement, and — where enabled — advertising.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="font-medium text-foreground">
                Essential / hosting
              </strong>{" "}
              — the site is hosted on Vercel. Their infrastructure may set
              cookies or logs needed to deliver pages securely.
            </li>
            <li>
              <strong className="font-medium text-foreground">Analytics</strong>{" "}
              — Vercel Analytics and PostHog may record aggregated usage (pages
              viewed, approximate region, device class). These tools help us see
              which explorers people use and whether something is broken.
            </li>
            <li>
              <strong className="font-medium text-foreground">Advertising</strong>{" "}
              — Google AdSense may serve interest-based or contextual ads and set
              cookies for frequency capping and measurement. Google&apos;s use of
              information is described in the{" "}
              <a
                href="https://policies.google.com/technologies/ads"
                className="link-editorial"
                rel="noopener noreferrer"
                target="_blank"
              >
                Google Ads / partner policies
              </a>
              . You can manage ad personalisation in{" "}
              <a
                href="https://adssettings.google.com/"
                className="link-editorial"
                rel="noopener noreferrer"
                target="_blank"
              >
                Google Ad Settings
              </a>
              .
            </li>
          </ul>
          <p>
            Browser controls (blocking third-party cookies, tracking prevention,
            or an ad blocker) will reduce or stop non-essential cookies. The site
            remains readable without accepting advertising cookies.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            How long we keep tips
          </h2>
          <p>
            Contribute-form submissions are kept only as long as needed to
            investigate the tip and improve the dataset, then deleted or
            anonymised. We do not use tip emails for marketing lists.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            Sharing
          </h2>
          <p>
            We do not sell personal information. Processors that help run the
            site (hosting, analytics, ad delivery, donation processors) receive
            only what they need to provide that service, under their own terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            Your choices
          </h2>
          <p>
            Depending on where you live, you may have rights to access, correct,
            or delete personal data we hold about you (for example, an email you
            sent with a tip). Contact us via the{" "}
            <Link href="/contact" className="link-editorial">
              contact page
            </Link>{" "}
            and describe the request. We may need enough detail to find the
            relevant record.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            Children
          </h2>
          <p>
            The site is not directed at children under 16. We do not knowingly
            collect personal information from children.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
            Changes
          </h2>
          <p>
            If this policy changes in a material way, we will update the date at
            the top of this page. Continued use after an update means the revised
            policy applies.
          </p>
        </section>

        <p>
          See also the{" "}
          <Link href="/terms" className="link-editorial">
            terms of use
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
