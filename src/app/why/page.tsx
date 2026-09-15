import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Why birthrates and demographics matter",
  description:
    "Why fertility, age structure, and migration change pensions, labour markets, schools, elections, and geopolitics — and how to brief someone who has to act on the numbers.",
  alternates: { canonical: "/why" },
};

const SECTIONS = [
  { id: "short-answer", title: "The short answer" },
  { id: "age", title: "Age structure is the constraint" },
  { id: "money", title: "Pensions, workers, and growth" },
  { id: "places", title: "Schools, housing, and local services" },
  { id: "power", title: "Coalitions, borders, and power" },
  { id: "migration", title: "Migration changes the timing, not the arithmetic" },
  { id: "briefings", title: "What a briefing is for" },
  { id: "read", title: "How to read the numbers" },
];

export default function WhyPage() {
  return (
    <div>
      <PageHeader
        title="Why birthrates and demographics matter"
        description="Fertility is not a vibe. It is the input that, with mortality and migration, sets how many children, workers, and pensioners a country will have — and who they will be."
      />

      <div className="container">
        <div className="grid gap-10 py-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
          <aside className="hidden lg:block">
            <nav aria-label="Contents" className="sticky top-20 space-y-2">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                On this page
              </p>
              <ul className="space-y-1 border-l border-border">
                {SECTIONS.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="-ml-px block border-l border-transparent py-1 pl-3 text-sm leading-snug text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <div className="min-w-0 max-w-3xl space-y-10 text-sm leading-relaxed text-muted-foreground">
            <section id="short-answer" className="scroll-mt-24 space-y-3">
              <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
                The short answer
              </h2>
              <p>
                A total fertility rate is a period snapshot: how many children a
                woman would have if today’s age-specific rates held for a
                lifetime. It is not a forecast of what any real cohort will do.
                It still matters because, once it stays below replacement for
                long enough, the next working-age generation is smaller than the
                last unless migration fills the gap. That shift shows up in
                classrooms first, then in the labour market, then in the ratio
                of pensioners to taxpayers.
              </p>
              <p>
                Demography is slow until it is not. Births this year set the
                size of the 2045 workforce. They also set who that workforce
                will be, because fertility is almost never uniform inside a
                country. Groups that have more children, younger, become a
                larger share of the next electorate whether or not anyone
                planned it.
              </p>
              <p>
                birthrate.io takes no position on whether any of this is good.
                The claim is narrower: if you make budgets, school places,
                housing, immigration rules, or coalition arithmetic, you are
                already making a demographic bet. Better to see the series.
              </p>
            </section>

            <section id="age" className="scroll-mt-24 space-y-3">
              <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
                Age structure is the constraint
              </h2>
              <p>
                Population size is the headline. Age structure is the mechanism.
                Two countries with the same number of people can have opposite
                problems if one is a youth bulge and the other is a rectangle
                with a heavy top. The{" "}
                <Link href="/glossary" className="link-editorial">
                  age-dependency ratio
                </Link>{" "}
                is the blunt version of that: how many children and older adults
                sit on each working-age person.
              </p>
              <p>
                Low fertility does not empty a country overnight. It ages it.
                Median age rises, the share 65+ rises, and the pyramid becomes a
                pillar. High fertility does the reverse, and a very young
                population can outrun schools, jobs, and housing even while the
                national TFR is falling from a higher base.
              </p>
              <p>
                Play a country’s pyramid forward on the{" "}
                <Link href="/simulator" className="link-editorial">
                  simulator
                </Link>{" "}
                or on any{" "}
                <Link href="/country/japan#demography" className="link-editorial">
                  country demography tab
                </Link>
                . The 2100 frame is a model, not a promise — but the 2040 frame
                is mostly people already born.
              </p>
            </section>

            <section id="money" className="scroll-mt-24 space-y-3">
              <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
                Pensions, workers, and growth
              </h2>
              <p>
                Pay-as-you-go pensions and tax-funded health systems are
                transfers from current workers to current retirees. When the
                worker-to-retiree ratio falls, the arithmetic is unforgiving:
                higher contributions, later retirement, lower replacement rates,
                more debt, or some mix. Productivity can offset some of this.
                It has to offset more each decade the ratio worsens.
              </p>
              <p>
                Firms feel it as a hiring constraint before finance ministries
                put it in a white paper. Care, construction, and the public
                sector compete for a thinner prime-age cohort. GDP can still
                grow while GDP per working-age person is doing the real work.
                That is why country pages put fertility next to{" "}
                <Link href="/gdp" className="link-editorial">
                  GDP per capita
                </Link>{" "}
                rather than treating them as separate hobbies.
              </p>
            </section>

            <section id="places" className="scroll-mt-24 space-y-3">
              <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
                Schools, housing, and local services
              </h2>
              <p>
                Births are local. A national TFR of 1.3 can hide a capital at
                1.0 and a periphery at 1.8 — or the reverse. Empty classrooms in
                one district and waiting lists in another are the same
                phenomenon seen from opposite ends. Housing markets price the
                expected number of households; a long fertility decline eventually
                shows up as fewer first-time buyers, then as a different mix of
                demand (smaller units, more accessible housing, more care
                homes).
              </p>
              <p>
                Subnational maps exist for that reason.{" "}
                <Link href="/maps" className="link-editorial">
                  Regional fertility maps
                </Link>{" "}
                and{" "}
                <Link href="/population/shares" className="link-editorial">
                  where the births are
                </Link>{" "}
                are more useful for a mayor or a health minister than a single
                national average.
              </p>
            </section>

            <section id="power" className="scroll-mt-24 space-y-3">
              <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
                Coalitions, borders, and power
              </h2>
              <p>
                Where groups have different fertility, the electorate’s
                composition in twenty years is partly a fertility story. That is
                true whether the split is religion, language, nativity, or
                religiosity. It is also the part of demography most often
                abused, so the rule here is the same as on the rest of the site:
                use an official table, name the category, and do not invent a
                TFR.
              </p>
              <p>
                Israel is the clearest public example. Jewish and Muslim
                period TFRs have converged; Haredi fertility remains far above
                other Jewish women; settlement fertility is a separate, higher
                schedule. Those differentials feed coalition math, the
                education budget, military service debates, and the long-run
                share of the population that is Arab, Haredi, or neither. A
                briefing that only quotes the national 2.8–2.9 misses the
                politics. Generate one from the{" "}
                <Link
                  href="/country/israel/brief"
                  className="link-editorial"
                >
                  Israel briefing builder
                </Link>
                .
              </p>
              <p>
                India has a published religion TFR from NFHS; several European
                offices publish ancestry or immigrant-category TFR; the U.S.
                publishes race and Hispanic-origin TFR. Each series is
                country-specific. None of them tell you how anyone should vote.
                They tell you the weights on the next generation.
              </p>
              <p>
                Across borders, relative cohort size still shows up in military
                age groups, in who emigrates, and in which countries will hold a
                larger share of the world’s births.{" "}
                <Link href="/population/shares" className="link-editorial">
                  Africa’s share of births
                </Link>{" "}
                is already much larger than its share of residents. That is a
                fact about age structure, not a policy slogan.
              </p>
            </section>

            <section id="migration" className="scroll-mt-24 space-y-3">
              <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
                Migration changes the timing, not the arithmetic
              </h2>
              <p>
                Net migration can hold population up while fertility is below
                replacement. It cannot freeze the age structure unless inflows
                stay large and young, year after year. Migrants also age, have
                children at rates that usually converge toward the host
                average, and eventually draw pensions. Treating migration as a
                complete substitute for births is a category error; treating
                births as a complete substitute for migration is the same error
                in the other direction.
              </p>
              <p>
                Country{" "}
                <Link href="/country/germany#migration" className="link-editorial">
                  migration tabs
                </Link>{" "}
                and the{" "}
                <Link href="/migration" className="link-editorial">
                  migration explorer
                </Link>{" "}
                exist so those two flows can be read together.
              </p>
            </section>

            <section id="briefings" className="scroll-mt-24 space-y-3">
              <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
                What a briefing is for
              </h2>
              <p>
                A political briefing is not a hot take. It is a short memo a
                minister, staffer, or journalist can forward: where fertility
                and age structure stand, which groups and regions differ, what
                that does to the budget and the electorate, and which official
                series to cite. You pick the sections and the charts; the site
                writes from the country’s data plus named national-office
                tables.
              </p>
              <p>
                Open the{" "}
                <Link href="/brief" className="link-editorial">
                  country briefings
                </Link>{" "}
                picker, or any country profile’s{" "}
                <strong className="font-medium text-foreground">
                  Briefing
                </strong>{" "}
                button. Examples:{" "}
                <Link href="/country/israel/brief" className="link-editorial">
                  Israel
                </Link>
                ,{" "}
                <Link href="/country/japan/brief" className="link-editorial">
                  Japan
                </Link>
                ,{" "}
                <Link href="/country/india/brief" className="link-editorial">
                  India
                </Link>
                , or{" "}
                <Link
                  href="/country/united-states/brief"
                  className="link-editorial"
                >
                  the United States
                </Link>
                .
              </p>
              <p>
                The memo is descriptive. It will not tell a politician what to
                want. It will tell them which numbers they are already arguing
                about.
              </p>
            </section>

            <section id="read" className="scroll-mt-24 space-y-3">
              <h2 className="section-rule font-serif text-xl font-semibold tracking-tight text-primary">
                How to read the numbers
              </h2>
              <p>
                Period TFR moves with timing (people delaying births) as well as
                with how many children cohorts eventually have. A one-year drop
                is not a new regime. Replacement is about 2.1 in low-mortality
                countries, higher where child mortality is still high. UN
                projections are scenarios. BirthGauge nowcasts are compiled from
                national offices and can be revised.
              </p>
              <p>
                Definitions live in the{" "}
                <Link href="/glossary" className="link-editorial">
                  glossary
                </Link>
                . Collection detail is in{" "}
                <Link href="/methodology" className="link-editorial">
                  methodology
                </Link>
                . If a group TFR is not on an official table, this site will not
                draw it — and a briefing should not invent it either.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
