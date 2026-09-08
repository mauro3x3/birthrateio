import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import {
  TfrDhsBackgroundChart,
  TfrUsGroupChart,
} from "@/components/tfr-by-group-chart";
import {
  TFR_US_EDUCATION,
  TFR_US_HISPANIC_ORIGIN,
} from "@/lib/sources/tfr-by-group-data";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Fertility by education, income, and language",
  description:
    "Official total fertility rates by education and household wealth from DHS surveys, U.S. TFR by educational attainment from NCHS, and why language spoken at home has no U.S. TFR table.",
  alternates: { canonical: "/fertility/education" },
};

export default function FertilityByEducationPage() {
  return (
    <div>
      <PageHeader
        title={
          <>
            Fertility by education, income,{" "}
            <span className="text-destructive">and language</span>
          </>
        }
        description="Statistical offices rarely publish TFR by income or by language spoken at home. Where they do publish a close official split — schooling, DHS wealth quintiles, or U.S. Hispanic origin — the numbers are here. Nothing on this page is modelled."
      />
      <div className="container space-y-12 py-8">
        <section>
          <SectionHeading
            id="united-states-education"
            title="United States by education"
            description="NCHS last published TFR by the mother’s educational attainment for 2019. Later final-births reports split TFR by race and Hispanic origin, not by schooling."
            tocLabel="US education"
          />
          <div className="mt-5">
            <TfrUsGroupChart
              pack={TFR_US_EDUCATION}
              title="U.S. total fertility rate by educational attainment, 2019"
            />
          </div>
        </section>

        <section>
          <SectionHeading
            id="dhs-education"
            title="Education in DHS surveys"
            description="Latest Demographic and Health Survey from 2015 onward with TFR by education. Groups are not the same as U.S. degree categories, and surveys are not a comparable time series."
            tocLabel="DHS education"
          />
          <div className="mt-5">
            <TfrDhsBackgroundChart dimension="education" />
          </div>
        </section>

        <section>
          <SectionHeading
            id="dhs-wealth"
            title="Wealth quintile in DHS surveys"
            description="The same surveys, split by household wealth quintile. This is an asset index, not income, wages, or a poverty line."
            tocLabel="DHS wealth"
          />
          <div className="mt-5">
            <TfrDhsBackgroundChart dimension="wealth" />
          </div>
        </section>

        <section>
          <SectionHeading
            id="united-states-language"
            title="Language spoken at home in the United States"
            description="Birth certificates do not record language. There is no official TFR by language spoken at home. Hispanic origin is the closest published TFR split for the largest non-English language community (Spanish). ACS fertility tables also omit language."
            tocLabel="US language"
          />
          <div className="mt-5">
            <TfrUsGroupChart
              pack={TFR_US_HISPANIC_ORIGIN}
              title="U.S. total fertility rate by race and Hispanic origin, 2023"
            />
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Spanish is the main non-English language at home in the ACS; it is
            not the same as Hispanic origin, and origin is not the same as
            nativity. A real language-at-home TFR would have to be built from
            ACS PUMS as a general fertility rate (births in the last 12 months),
            which is not the NCHS period TFR. We do not invent that table.
          </p>
        </section>

        <p className="text-sm text-muted-foreground">
          Regional maps, including Saudi Arabia’s census split of Saudi vs all
          residents:{" "}
          <Link href="/maps/sau" className="link-editorial font-medium">
            Saudi Arabia map
          </Link>
          {" · "}
          <Link href="/maps/mena" className="link-editorial font-medium">
            Middle East provinces
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
