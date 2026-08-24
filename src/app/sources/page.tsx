import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { CATEGORY_LABELS } from "@/lib/glossary";
import { DATA_SOURCES } from "@/lib/sources/reference";
import { INDICATORS } from "@/lib/indicators";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Data Sources & Licences",
  description:
    "Every data provider behind birthrate.io — World Bank, UN Population Division, OECD, Eurostat, HMD, national statistical offices — with licence terms and the indicators each one supplies.",
  alternates: { canonical: "/sources" },
};

export default function SourcesPage() {
  const sources = DATA_SOURCES.map((source) => ({
    ...source,
    indicators: INDICATORS.filter((i) => i.source === source.code),
  })).sort((a, b) => b.indicators.length - a.indicators.length);

  return (
    <div>
      <PageHeader
        title="Data sources"
        description="birthrate.io does not produce primary statistics. Every figure comes from one of the providers below, and each is reproducible from the original release."
      />

      <div className="container max-w-4xl space-y-8 py-8">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Where a series is assembled from more than one provider — long-run life
          expectancy, for example — the composition is described in the{" "}
          <Link href="/glossary" className="link-editorial">
            glossary
          </Link>{" "}
          entry for that indicator. Licence terms below are those of the original
          provider and govern reuse of the underlying data.
        </p>

        <div className="divide-y divide-border border-y border-border">
          {sources.map((source) => (
            <section key={source.code} className="py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="font-serif text-lg font-semibold tracking-tight text-primary">
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {source.name}
                    </a>
                  ) : (
                    source.name
                  )}
                </h2>
                {source.license && (
                  <span className="text-xs text-muted-foreground">
                    Licence: {source.license}
                  </span>
                )}
              </div>

              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {source.description}
              </p>

              {source.indicators.length > 0 && (
                <dl className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <dt className="font-semibold uppercase tracking-wide">
                    Supplies
                  </dt>
                  <dd>
                    {source.indicators
                      .map(
                        (i) =>
                          `${i.shortName} (${CATEGORY_LABELS[i.category]})`,
                      )
                      .join(" · ")}
                  </dd>
                </dl>
              )}
            </section>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">
          Spotted a figure that looks wrong, or a source we should add?{" "}
          <Link href="/contribute" className="link-editorial">
            Tell us
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
