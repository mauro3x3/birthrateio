import Link from "next/link";
import { indicatorsBySlugs, sourceByCode } from "@/lib/glossary";

/**
 * "What this page measures" block — definition, unit, and source for every
 * indicator on a hub page. Sits directly under the page header so a reader
 * knows what the numbers mean before seeing a chart.
 */
export function IndicatorDefinitions({
  slugs,
  caveats,
  plain = false,
}: {
  slugs: readonly string[];
  caveats?: readonly string[];
  /** Strip outer chrome when nested in a collapsible section. */
  plain?: boolean;
}) {
  const indicators = indicatorsBySlugs(slugs);
  if (indicators.length === 0 && !caveats?.length) return null;

  return (
    <section
      aria-labelledby={plain ? undefined : "definitions-heading"}
      className={plain ? undefined : "border-y border-border bg-muted/30"}
    >
      <div className={plain ? "space-y-4" : "space-y-4 px-4 py-5 sm:px-5"}>
        {!plain && (
          <h2
            id="definitions-heading"
            data-toc-skip
            className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            What this page measures
          </h2>
        )}

        {indicators.length > 0 && (
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {indicators.map((indicator) => {
              const source = sourceByCode(indicator.source);
              return (
                <div key={indicator.slug} className="space-y-1">
                  <dt className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-serif text-[0.95rem] font-semibold text-primary">
                      {indicator.name}
                    </span>
                    <span className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                      {indicator.unit}
                    </span>
                  </dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground">
                    {indicator.description}
                    {source && (
                      <>
                        {" "}
                        <span className="whitespace-nowrap">
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
                        </span>
                      </>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}

        {caveats && caveats.length > 0 && (
          <ul className="space-y-1.5 border-t border-border pt-4">
            {caveats.map((caveat) => (
              <li
                key={caveat}
                className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
              >
                <span aria-hidden className="select-none text-muted-foreground/60">
                  —
                </span>
                <span>{caveat}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-muted-foreground">
          Definitions for every indicator are listed in the{" "}
          <Link href="/glossary" className="link-editorial">
            glossary
          </Link>
          , and collection methods in the{" "}
          <Link href="/methodology" className="link-editorial">
            methodology
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
