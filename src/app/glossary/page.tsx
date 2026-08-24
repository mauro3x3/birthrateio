import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { glossaryGroups, CONCEPTS, sourceByCode } from "@/lib/glossary";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Glossary — Indicator Definitions",
  description:
    "Definitions, units, and sources for every demographic and economic indicator on birthrate.io, plus the statistical concepts needed to read them.",
  alternates: { canonical: "/glossary" },
};

export default function GlossaryPage() {
  const groups = glossaryGroups();

  return (
    <div>
      <PageHeader
        title="Glossary"
        description="Every indicator published on this site, with its definition, unit, and source. Concepts common to all of them are defined at the end."
      />

      <div className="container">
        <div className="grid gap-10 py-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
          <aside className="hidden lg:block">
            <nav aria-label="Glossary sections" className="sticky top-20 space-y-2">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Subjects
              </p>
              <ul className="space-y-1 border-l border-border">
                {groups.map((group) => (
                  <li key={group.category}>
                    <a
                      href={`#${group.category.toLowerCase()}`}
                      className="-ml-px block border-l border-transparent py-1 pl-3 text-sm text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                    >
                      {group.label}
                    </a>
                  </li>
                ))}
                <li>
                  <a
                    href="#concepts"
                    className="-ml-px block border-l border-transparent py-1 pl-3 text-sm text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                  >
                    Statistical concepts
                  </a>
                </li>
              </ul>
            </nav>
          </aside>

          <div className="min-w-0 space-y-12">
            {groups.map((group) => (
              <section
                key={group.category}
                id={group.category.toLowerCase()}
                className="scroll-mt-24"
              >
                <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
                  {group.label}
                </h2>
                <dl className="mt-4 space-y-5">
                  {group.entries.map((entry) => {
                    const source = sourceByCode(entry.source);
                    return (
                      <div key={entry.slug} id={entry.slug} className="scroll-mt-24">
                        <dt className="flex flex-wrap items-baseline gap-x-2">
                          <span className="font-serif text-[1.05rem] font-semibold text-foreground">
                            {entry.name}
                          </span>
                          <span className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                            {entry.unit}
                          </span>
                        </dt>
                        <dd className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                          {entry.description}
                          {source && (
                            <>
                              {" "}
                              Source:{" "}
                              {source.url ? (
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="link-editorial"
                                >
                                  {source.name}
                                </a>
                              ) : (
                                source.name
                              )}
                              .
                            </>
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </section>
            ))}

            <section id="concepts" className="scroll-mt-24">
              <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
                Statistical concepts
              </h2>
              <dl className="mt-4 space-y-5">
                {CONCEPTS.map((concept) => (
                  <div key={concept.id} id={concept.id} className="scroll-mt-24">
                    <dt className="font-serif text-[1.05rem] font-semibold text-foreground">
                      {concept.term}
                    </dt>
                    <dd className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                      {concept.definition}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <p className="border-t border-border pt-6 text-sm text-muted-foreground">
              Details of how these series are collected and combined are on the{" "}
              <Link href="/methodology" className="link-editorial">
                methodology
              </Link>{" "}
              page. A full list of providers is on the{" "}
              <Link href="/sources" className="link-editorial">
                sources
              </Link>{" "}
              page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
