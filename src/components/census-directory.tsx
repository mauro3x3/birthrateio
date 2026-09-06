import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  CENSUS_COUNTRIES,
  type CensusCatalogCountry,
} from "@/lib/sources/census-maps-data";
import { US_DEMOGRAPHICS_META } from "@/lib/sources/us-demographics-data";
import { cn } from "@/lib/utils";

const FEATURED_SLUGS = [
  "us",
  "uk",
  "denmark",
  "germany",
  "russia",
  "spain",
  "france",
];

const US_ENTRY = {
  slug: "us",
  href: "/demographics/us",
  name: "United States",
  topicLabel: "Race and Hispanic origin",
  year: US_DEMOGRAPHICS_META.year,
};

function hrefFor(slug: string) {
  return slug === "us" ? "/demographics/us" : `/demographics/${slug}`;
}

function featuredCountries() {
  const bySlug = new Map(CENSUS_COUNTRIES.map((c) => [c.slug, c]));
  return FEATURED_SLUGS.map((slug) => {
    if (slug === "us") return US_ENTRY;
    const c = bySlug.get(slug);
    if (!c) return null;
    return {
      slug: c.slug,
      href: hrefFor(c.slug),
      name: c.name,
      topicLabel: c.title,
      year: c.year,
    };
  }).filter((c): c is NonNullable<typeof c> => Boolean(c));
}

function restCountries(featured: Set<string>): CensusCatalogCountry[] {
  return CENSUS_COUNTRIES.filter((c) => !featured.has(c.slug)).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export function CensusDirectory({ className }: { className?: string }) {
  const featured = featuredCountries();
  const featuredSlugs = new Set(featured.map((c) => c.slug));
  const rest = restCountries(featuredSlugs);

  return (
    <div className={cn("space-y-8", className)}>
      <ul className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((c) => (
          <li key={c.slug} className="bg-background">
            <Link
              href={c.href}
              className="group flex h-full flex-col px-4 py-5 sm:px-5"
            >
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {c.year}
              </p>
              <p className="mt-1.5 inline-flex items-center gap-1.5 font-serif text-lg font-semibold text-primary">
                <span className="group-hover:underline">{c.name}</span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {c.topicLabel}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {rest.length > 0 ? (
        <div>
          <h2 className="font-serif text-xl font-semibold tracking-tight text-primary">
            All census maps
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Same explorer — pick a country. Definitions are not comparable
            across statistical offices.
          </p>
          <ul className="mt-4 columns-2 gap-x-8 text-sm sm:columns-3">
            {rest.map((c) => (
              <li key={c.slug} className="break-inside-avoid py-1">
                <Link
                  href={hrefFor(c.slug)}
                  className="font-medium text-primary hover:underline"
                >
                  {c.name}
                </Link>
                <span className="text-muted-foreground"> · {c.title}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
