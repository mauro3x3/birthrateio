import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { CompareTool } from "@/components/compare-tool";
import { CiteThis } from "@/components/data/cite-this";
import { resolveCountrySlug } from "@/lib/country-aliases";
import {
  getAllCountries,
  getCountryBySlug,
  getCountryRankBySlug,
  getLatestValue,
} from "@/lib/queries";
import { SLUG } from "@/lib/indicators";
import { safe } from "@/lib/safe";
import { siteConfig } from "@/lib/site";
import { formatCompact, formatNumber } from "@/lib/utils";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ a: string; b: string }>;
}): Promise<Metadata> {
  const { a: rawA, b: rawB } = await params;
  const a = resolveCountrySlug(rawA);
  const b = resolveCountrySlug(rawB);
  const [ca, cb] = await Promise.all([
    safe(getCountryBySlug(a), null),
    safe(getCountryBySlug(b), null),
  ]);
  if (!ca || !cb) return { title: "Compare countries" };
  const title = `${ca.name} vs ${cb.name} — Demographics Compared`;
  const description = `Side-by-side comparison of fertility, population, GDP and migration for ${ca.name} and ${cb.name}. Charts and rankings from World Bank and UN data.`;
  return {
    title,
    description,
    alternates: { canonical: `/compare/${ca.slug}/${cb.slug}` },
    openGraph: {
      title,
      description,
      url: `/compare/${ca.slug}/${cb.slug}`,
      type: "article",
    },
  };
}

export default async function ComparePairPage({
  params,
}: {
  params: Promise<{ a: string; b: string }>;
}) {
  const { a: rawA, b: rawB } = await params;
  const a = resolveCountrySlug(rawA);
  const b = resolveCountrySlug(rawB);
  if (a === b) notFound();
  if (a !== rawA || b !== rawB) {
    permanentRedirect(`/compare/${a}/${b}`);
  }

  const [ca, cb, options] = await Promise.all([
    safe(getCountryBySlug(a), null),
    safe(getCountryBySlug(b), null),
    safe(getAllCountries(), []),
  ]);
  if (!ca || !cb) notFound();

  const [fertA, fertB, popA, popB, gdpA, gdpB] = await Promise.all([
    safe(getCountryRankBySlug(a, SLUG.fertility), null),
    safe(getCountryRankBySlug(b, SLUG.fertility), null),
    safe(getLatestValue(ca.id, SLUG.population), null),
    safe(getLatestValue(cb.id, SLUG.population), null),
    safe(getCountryRankBySlug(a, SLUG.gdpPerCapitaPppReal), null),
    safe(getCountryRankBySlug(b, SLUG.gdpPerCapitaPppReal), null),
  ]);

  const title = `${ca.name} vs ${cb.name}`;
  const path = `/compare/${a}/${b}`;

  const lead = [
    `A side-by-side look at ${ca.name} and ${cb.name}.`,
    fertA && fertB
      ? `Fertility is ${formatNumber(fertA.value, 2)} births per woman in ${ca.name} (${fertA.year}) versus ${formatNumber(fertB.value, 2)} in ${cb.name} (${fertB.year}).`
      : null,
    popA && popB
      ? `Population stands at ${formatCompact(popA.value)} (${popA.year}) and ${formatCompact(popB.value)} (${popB.year}) respectively.`
      : null,
    gdpA && gdpB
      ? `GDP per capita at purchasing-power parity is $${formatCompact(gdpA.value)} versus $${formatCompact(gdpB.value)}.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description: lead,
    url: `${siteConfig.url}${path}`,
    about: [
      { "@type": "Place", name: ca.name, identifier: ca.iso3 },
      { "@type": "Place", name: cb.name, identifier: cb.iso3 },
    ],
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            <span>
              {ca.flagEmoji} {ca.name}
            </span>
            <span className="text-muted-foreground">vs</span>
            <span>
              {cb.flagEmoji} {cb.name}
            </span>
          </span>
        }
        description={lead}
      />

      <div className="container space-y-8 py-8">
        <section aria-labelledby="snapshot">
          <h2
            id="snapshot"
            className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Snapshot
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Indicator</th>
                  <th className="py-2 pr-4 font-medium">
                    <Link
                      href={`/country/${a}`}
                      className="hover:text-foreground"
                    >
                      {ca.name}
                    </Link>
                  </th>
                  <th className="py-2 font-medium">
                    <Link
                      href={`/country/${b}`}
                      className="hover:text-foreground"
                    >
                      {cb.name}
                    </Link>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/60">
                  <td className="py-2.5 pr-4 text-muted-foreground">
                    Fertility rate
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums font-medium">
                    {fertA ? formatNumber(fertA.value, 2) : "—"}
                    {fertA ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        #{fertA.rank}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2.5 tabular-nums font-medium">
                    {fertB ? formatNumber(fertB.value, 2) : "—"}
                    {fertB ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        #{fertB.rank}
                      </span>
                    ) : null}
                  </td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-2.5 pr-4 text-muted-foreground">
                    Population
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums font-medium">
                    {popA ? formatCompact(popA.value) : "—"}
                  </td>
                  <td className="py-2.5 tabular-nums font-medium">
                    {popB ? formatCompact(popB.value) : "—"}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-muted-foreground">
                    GDP / capita (PPP)
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums font-medium">
                    {gdpA ? `$${formatCompact(gdpA.value)}` : "—"}
                  </td>
                  <td className="py-2.5 tabular-nums font-medium">
                    {gdpB ? `$${formatCompact(gdpB.value)}` : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Topic pages:{" "}
            <Link
              href={`/fertility/${a}`}
              className="underline underline-offset-2"
            >
              {ca.name} fertility
            </Link>
            {" · "}
            <Link
              href={`/fertility/${b}`}
              className="underline underline-offset-2"
            >
              {cb.name} fertility
            </Link>
            {" · "}
            <Link
              href={`/population/${a}`}
              className="underline underline-offset-2"
            >
              {ca.name} population
            </Link>
            {" · "}
            <Link
              href={`/population/${b}`}
              className="underline underline-offset-2"
            >
              {cb.name} population
            </Link>
          </p>
        </section>

        <Suspense>
          <CompareTool
            options={options.map((c) => ({
              slug: c.slug,
              name: c.name,
              flagEmoji: c.flagEmoji,
            }))}
            initial={[a, b]}
          />
        </Suspense>

        <CiteThis title={title} path={path} sources={["World Bank", "UN"]} />
      </div>
    </div>
  );
}
