import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { CountryBriefingBuilder } from "@/components/country-briefing-builder";
import { briefingChartsFromFacts } from "@/lib/briefing-charts";
import { getBriefingFacts } from "@/lib/briefing-facts";
import { BRIEFING_CHART_IDS } from "@/lib/briefing-modules";
import { resolveCountrySlug } from "@/lib/country-aliases";
import { getCountryBySlug } from "@/lib/queries";
import { safe } from "@/lib/safe";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const country = await safe(getCountryBySlug(slug), null);
  if (!country) {
    return { title: "Briefing not found", robots: { index: false, follow: true } };
  }
  const title = `${country.name} demographic briefing`;
  const description = `Build a political briefing on ${country.name} fertility, age structure, group TFR where published, and the economic and coalition arithmetic that follows.`;
  const path = `/country/${country.slug}/brief`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "article" },
  };
}

export default async function CountryBriefPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: raw } = await params;
  const resolved = resolveCountrySlug(raw);
  if (resolved && resolved !== raw) {
    permanentRedirect(`/country/${resolved}/brief`);
  }

  const facts = await safe(getBriefingFacts(raw), null);
  if (!facts) notFound();

  return (
    <div>
      <PageHeader
        title={`${facts.flagEmoji ?? ""} ${facts.name} briefing`}
        description="Why it matters, neighbors, workers versus retirees. Generate a draft, write it yourself, then expand or edit any paragraph."
      >
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <Link
            href="/brief"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            All countries
          </Link>
          <Link
            href={`/country/${facts.slug}`}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Country profile
          </Link>
        </span>
      </PageHeader>
      <div className="container py-8">
        <CountryBriefingBuilder
          input={{
            name: facts.name,
            slug: facts.slug,
            iso3: facts.iso3,
            flagEmoji: facts.flagEmoji,
            headline: facts.angle.headline,
            stakes: facts.angle.stakes,
            modules: facts.modules,
            charts: facts.charts,
            chartPreviews: briefingChartsFromFacts(facts, [...BRIEFING_CHART_IDS]),
            mapHref: facts.mapHref,
            callouts: facts.callouts,
            cite: facts.angle.cite,
          }}
        />
      </div>
    </div>
  );
}
