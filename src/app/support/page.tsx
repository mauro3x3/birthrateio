import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Database, Globe2, Server } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SupportDonate } from "@/components/support-donate";
import { Card, CardContent } from "@/components/ui/card";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Support birthrate.io — Keep Demographic Data Free & Open",
  description:
    "Help keep birthrate.io free for everyone. Your donation supports open demographic data, maps, charts, and tools for researchers, journalists, and the public.",
  alternates: { canonical: "/support" },
  openGraph: {
    title: "Support birthrate.io",
    description:
      "Help keep the world's demographic data platform free and open for everyone.",
  },
};

const pillars = [
  {
    icon: Database,
    title: "Fresh data pipelines",
    body: "Automated ingestion from the UN, World Bank, OECD and other official sources — kept current and auditable.",
  },
  {
    icon: Server,
    title: "Reliable infrastructure",
    body: "Hosting, databases, and compute for maps, animations, simulators, and millions of chart data points.",
  },
  {
    icon: Globe2,
    title: "Free for everyone",
    body: "No paywalls on country profiles, explorers, or downloads. Open access for students, journalists, and policymakers.",
  },
  {
    icon: BookOpen,
    title: "Methodology & accuracy",
    body: "Time spent verifying sources, labeling definitions, and fixing errors so the numbers stay trustworthy.",
  },
];

export default function SupportPage() {
  return (
    <div>
      <PageHeader
        title="Support birthrate.io"
        description="Help us keep demographic data free, open, and accurate for everyone."
      />

      <div className="container max-w-3xl space-y-10 py-10 md:py-14">
        <section className="space-y-4">
          <p className="text-lg leading-relaxed text-foreground md:text-xl">
            <strong className="font-semibold">{siteConfig.name}</strong> is one of
            the world&apos;s largest open references for population, fertility,
            migration, and birth rates — and it&apos;s yours. Every donation helps
            keep {siteConfig.name} <em>free and open</em> for people across the
            globe.
          </p>
          <p className="leading-relaxed text-muted-foreground">
            We are not supported by ads or subscriptions. If birthrate.io helps
            your research, reporting, or curiosity, please consider giving what
            you can. Most gifts are small, but together they keep the lights on.
          </p>
        </section>

        <SupportDonate />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Where your gift goes
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {pillars.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="border-dashed">
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-center gap-2 text-primary">
                    <Icon className="h-4 w-4" />
                    <h3 className="text-sm font-semibold">{title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-3 border-t pt-8 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">
            Other ways to help
          </h2>
          <ul className="list-inside list-disc space-y-1.5">
            <li>
              Share charts and maps from{" "}
              <Link href="/" className="text-primary hover:underline">
                birthrate.io
              </Link>{" "}
              — attribution helps more people find open data.
            </li>
            <li>
              Report errors or outdated figures on country pages so we can fix
              them quickly.
            </li>
            <li>
              Cite official sources linked on each chart when you publish
              analysis.
            </li>
          </ul>
          <p className="pt-2 text-xs">
            Donations are voluntary and not tax-deductible unless we state
            otherwise. Payment processing is handled by the provider linked
            above; we do not store card details on birthrate.io.
          </p>
        </section>
      </div>
    </div>
  );
}
