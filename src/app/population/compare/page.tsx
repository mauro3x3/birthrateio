import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { PopulationRegionCompareLazy } from "@/components/maps/population-region-compare-lazy";
import { getCountryMapAtlas } from "@/lib/country-map-atlas";
import { getAllCountries } from "@/lib/queries";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Compare regional populations — paint your own map",
  description:
    "Pick countries, paint provinces into groups, sum populations, and download a social-ready map. Density base layer with on-map numbers.",
  alternates: { canonical: "/population/compare" },
};

export default async function PopulationComparePage() {
  const [atlasAll, countries] = await Promise.all([
    Promise.resolve(getCountryMapAtlas()),
    getAllCountries(),
  ]);

  const atlas = atlasAll.filter((c) =>
    c.metrics.some(
      (m) =>
        m.id === "population" &&
        m.years.length > 0 &&
        (m.valuesByYear[m.years[0]!] ?? []).some(
          (r) => r.value != null && Number.isFinite(r.value),
        ),
    ),
  );

  const byIso = new Map(countries.map((c) => [c.iso3, c]));
  const countryOptions = atlas.map((c) => {
    const row = byIso.get(c.iso3);
    return {
      slug: c.iso3,
      name: row?.name ?? c.country,
      flagEmoji: row?.flagEmoji ?? null,
    };
  });

  return (
    <div>
      <PageHeader
        title="Compare regional populations"
        description="Type countries to load, paint provinces into groups, read the totals. Density underneath so empty space isn’t blank gray."
      />

      <div className="container space-y-10 py-8">
        <PopulationRegionCompareLazy
          atlas={atlas}
          countryOptions={countryOptions}
        />

        <section className="max-w-2xl space-y-3">
          <SectionHeading
            title="How to use it"
            description="Add countries from the search box, or hit a preset. Density / population colours the base map; paint groups override. Toggle numbers for headcounts on the map."
          />
          <p className="text-sm text-muted-foreground">
            Regional packs currently cover Russia, China, the US, and Germany.
            Population is the latest year in our admin1 file (Rosstat estimates,
            national censuses / statistical offices). Fertility choropleths for
            the same geographies stay on{" "}
            <Link href="/maps/rus" className="link-editorial">
              /maps
            </Link>
            .
          </p>
          <p className="text-sm text-muted-foreground">
            Related:{" "}
            <Link href="/population" className="link-editorial">
              Population explorer
            </Link>
            {" · "}
            <Link href="/population/india-dots" className="link-editorial">
              India dots
            </Link>
            {" · "}
            <Link href="/population/shares" className="link-editorial">
              Where the births are
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
