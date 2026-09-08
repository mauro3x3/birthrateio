import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { contactConfig } from "@/lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Pricing — Free and Pro",
  description:
    "birthrate.io is free to read: charts, maps, and country pages stay open. Pro is for API access and bulk data downloads.",
  alternates: { canonical: "/pricing" },
};

const mailtoPro = `mailto:${contactConfig.organisationsEmail}?subject=${encodeURIComponent("Pro access — birthrate.io")}`;
const mailtoBusiness = `mailto:${contactConfig.organisationsEmail}?subject=${encodeURIComponent("Business use / higher limits — birthrate.io")}`;

export default function PricingPage() {
  return (
    <div>
      <PageHeader
        title="Pricing"
        description="The site is free to use. Pro is only for people who need the data at scale — an API or bulk downloads — not for reading charts and maps."
      />

      <div className="container max-w-4xl space-y-10 py-10 md:py-14">
        <div className="grid gap-6 md:grid-cols-2">
          <section className="flex flex-col border border-border bg-card p-6 md:p-8">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Free
            </p>
            <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-primary">
              Everyone
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              All of the public site. No account required.
            </p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm leading-relaxed">
              <li>Charts, maps, and country, city, and state pages</li>
              <li>Comparisons, historical series, and tools</li>
              <li>Citations and ordinary chart or CSV downloads</li>
              <li>Supported by ads</li>
            </ul>
            <Button asChild className="mt-8" variant="outline">
              <Link href="/">Continue reading</Link>
            </Button>
          </section>

          <section className="flex flex-col border border-primary/25 bg-card p-6 md:p-8">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Pro
            </p>
            <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-primary">
              Power users
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Programmatic and bulk access. Nothing on the website is locked
              behind this.
            </p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm leading-relaxed">
              <li>API access</li>
              <li>Bulk dataset downloads</li>
              <li>Higher API and download limits</li>
            </ul>
            <Button asChild className="mt-8">
              <a href={mailtoPro}>Get Pro</a>
            </Button>
          </section>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Need higher limits or birthrate.io for business use?{" "}
          <a
            href={mailtoBusiness}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Contact us
          </a>{" "}
          at {contactConfig.organisationsEmail}.
        </p>
      </div>
    </div>
  );
}
