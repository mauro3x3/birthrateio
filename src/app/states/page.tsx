import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { safe } from "@/lib/safe";
import { formatCompact, formatNumber } from "@/lib/utils";
import { SLUG } from "@/lib/indicators";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "States & Provinces — Subnational Demographics",
  description:
    "Fertility and population for US states, German Länder, Indian states, Chinese provinces, Russian regions and more — from official statistical sources.",
  alternates: { canonical: "/states" },
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

  return (
    <div>
      <PageHeader
        title="States & provinces"
        description="Subnational fertility and population from official sources — US states (NCHS/Census), German Länder (Eurostat), Indian states (NFHS), Chinese provinces (NBS census), Russian federal subjects (Rosstat)."
      />
      <div className="container space-y-10 py-8">
        <p className="text-sm text-muted-foreground">
          Looking for a U.S. race and Hispanic-origin map? See the{" "}
          <Link
            href="/demographics"
            className="font-medium text-foreground underline underline-offset-2"
          >
            US demographics map
          </Link>
          .
        </p>
        {countries.map((c) => (
          <section key={c.slug} className="space-y-3">
            <div className="flex items-baseline justify-between border-b pb-2">
              <h2 className="text-xl font-semibold tracking-tight">
                <Link
                  href={`/country/${c.slug}`}
                  className="hover:underline"
                >
                  {c.flagEmoji ? `${c.flagEmoji} ` : ""}
                  {c.name}
                </Link>
              </h2>
              <span className="text-sm text-muted-foreground">
                {c.admin1Divisions.length} divisions
              </span>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium text-right">
                      Population
                    </th>
                    <th className="px-4 py-3 font-medium text-right">TFR</th>
                  </tr>
                </thead>
                <tbody>
                  {c.admin1Divisions.map((d) => {
                    const tfr = d.indicatorValues[0];
                    return (
                      <tr
                        key={d.slug}
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="px-4 py-2.5 font-medium">
                          <Link
                            href={`/state/${d.slug}`}
                            className="hover:underline"
                          >
                            {d.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {d.kind.replace(/-/g, " ")}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {d.population != null
                            ? formatCompact(d.population)
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {tfr ? (
                            <span title={`Year ${tfr.year}`}>
                              {formatNumber(tfr.value, 2)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
