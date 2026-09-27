import Link from "next/link";

/**
 * Crawlable homepage body — AdSense / search quality need more than a hero
 * search box and link grid.
 */
export function HomeEditorial() {
  return (
    <section className="border-t border-border bg-background">
      <div className="container grid gap-10 py-12 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:gap-14 md:py-16">
        <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            What this site is
          </p>
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-primary md:text-3xl">
            Official demographic series, in one place
          </h2>
          <p>
            birthrate.io is a public reference for fertility, population,
            migration, mortality, and the age-structure arithmetic that sits
            underneath pensions, schools, and labour markets. It does not invent
            statistics. Every chart traces to a named release — World Bank, UN
            Population Division, OECD, Eurostat, or a national statistical
            office — with the definition and the caveat written on the page.
          </p>
          <p>
            Most agency portals assume you already know the indicator code and
            the geography. Here the path is the reverse: pick a country or a
            question, then see the series, the rank, the map, and a short note
            on what the measure can and cannot say. Charts export as PNG or CSV;
            pages carry a citation block for reuse with attribution.
          </p>
          <p>
            If you need the short argument for why the numbers matter before you
            open a chart, start with{" "}
            <Link href="/why" className="link-editorial font-medium">
              why birthrates matter
            </Link>
            . For how we collect and label series, see{" "}
            <Link href="/methodology" className="link-editorial font-medium">
              methodology
            </Link>{" "}
            and the{" "}
            <Link href="/glossary" className="link-editorial font-medium">
              glossary
            </Link>
            .
          </p>
        </div>

        <aside className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <div className="space-y-2 border-l-2 border-brand-gold/70 pl-4">
            <h3 className="font-serif text-lg font-semibold text-primary">
              Good starting questions
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/fertility" className="link-editorial">
                  Where is period TFR below replacement — and by how much?
                </Link>
              </li>
              <li>
                <Link href="/population/shares" className="link-editorial">
                  Which countries account for the world’s births?
                </Link>
              </li>
              <li>
                <Link href="/workers-retirees" className="link-editorial">
                  How many workers per retiree, now and toward 2100?
                </Link>
              </li>
              <li>
                <Link href="/migration" className="link-editorial">
                  What does net migration change — and what does it not?
                </Link>
              </li>
              <li>
                <Link href="/maps" className="link-editorial">
                  Where do subnational fertility maps diverge from the national
                  average?
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-lg font-semibold text-primary">
              How to read a page
            </h3>
            <p>
              Lead figures are the latest published value with year and rank.
              Timeline maps and rankings sit below. Where a split is
              country-specific (ancestry, religion, education), that is labelled
              as such — we do not invent a group TFR that no office publishes.
              Projections are scenarios, not forecasts of what will happen.
            </p>
            <p>
              Corrections and source tips:{" "}
              <Link href="/contribute" className="link-editorial font-medium">
                help improve the data
              </Link>
              .
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
