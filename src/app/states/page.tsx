import type { Metadata } from "next";
import Link from "next/link";
import { TopicShell } from "@/components/topic-shell";
import { StatesExplorer } from "@/components/states-explorer";
import { prisma } from "@/lib/prisma";
import { safe } from "@/lib/safe";
import { SLUG } from "@/lib/indicators";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "States & Provinces — Subnational Fertility Maps",
  description:
    "Interactive fertility maps for US states, German Länder, Indian states, Chinese provinces, and Russian regions — from official statistical sources.",
  alternates: { canonical: "/states" },
};

const GEO_BY_ISO3: Record<string, string> = {
  USA: "/geo/admin1-usa.json",
  DEU: "/geo/admin1-deu.json",
  IND: "/geo/admin1-ind.json",
  CHN: "/geo/admin1-chn.json",
  RUS: "/geo/admin1-rus.json",
};

export default async function StatesIndexPage() {
  const countries = await safe(
    prisma.country.findMany({
      where: { admin1Divisions: { some: {} } },
      select: {
        slug: true,
        name: true,
        iso3: true,
        flagEmoji: true,
        admin1Divisions: {
          orderBy: [{ population: "desc" }, { name: "asc" }],
          select: {
            slug: true,
            name: true,
            kind: true,
            population: true,
            indicatorValues: {
              where: {
                subjectType: "ADMIN1",
                dimension: null,
                indicator: { slug: SLUG.fertility },
              },
              orderBy: { year: "desc" },
              take: 1,
              select: { year: true, value: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    [],
  );

  const blocks = countries.map((c) => ({
    slug: c.slug,
    name: c.name,
    iso3: c.iso3,
    flagEmoji: c.flagEmoji,
    geoUrl: GEO_BY_ISO3[c.iso3] ?? null,
    divisions: c.admin1Divisions.map((d) => {
      const tfr = d.indicatorValues[0];
      return {
        slug: d.slug,
        name: d.name,
        kind: d.kind,
        population: d.population,
        tfr: tfr?.value ?? null,
        tfrYear: tfr?.year ?? null,
      };
    }),
  }));

  return (
    <TopicShell
      title="States & provinces"
      description="Subnational fertility for countries whose statistical offices publish it — US states (NCHS), German Länder (Eurostat), Indian states (NFHS), Chinese provinces (NBS), and Russian regions (Rosstat)."
      path="/states"
    >
      <section>
        <p className="text-sm text-muted-foreground">
          Looking for a U.S. race and Hispanic-origin map? See the{" "}
          <Link href="/demographics" className="link-editorial font-medium">
            US demographics map
          </Link>
          .
        </p>
        <div className="mt-5">
          <StatesExplorer countries={blocks} />
        </div>
      </section>
    </TopicShell>
  );
}
