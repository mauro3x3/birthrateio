import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { BriefingCountryPicker } from "@/components/briefing-country-picker";
import { getAllCountries } from "@/lib/queries";
import { safe } from "@/lib/safe";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Country briefings",
  description:
    "Build a demographic briefing for any country: fertility, neighbors, workers versus retirees, and whether family policy has moved TFR elsewhere. Pick sections and charts, then generate a memo — or write it yourself and ask AI to expand a paragraph.",
  alternates: { canonical: "/brief" },
};

const FEATURED = [
  { slug: "israel", name: "Israel" },
  { slug: "japan", name: "Japan" },
  { slug: "korea-rep", name: "South Korea" },
  { slug: "france", name: "France" },
  { slug: "hungary", name: "Hungary" },
  { slug: "germany", name: "Germany" },
  { slug: "united-states", name: "United States" },
  { slug: "india", name: "India" },
  { slug: "nigeria", name: "Nigeria" },
  { slug: "brazil", name: "Brazil" },
];

export default async function BriefingsHubPage() {
  const countries = await safe(getAllCountries(), []);
  const options = countries.map((c) => ({
    slug: c.slug,
    name: c.name,
    flagEmoji: c.flagEmoji,
  }));
  const bySlug = new Map(options.map((c) => [c.slug, c]));

  return (
    <div>
      <PageHeader
        title="Country briefings"
        description="A memo a staffer can forward: why fertility matters, how this country compares with its neighbors, how many working-age people versus retirees the pyramid already implies, and whether family policy has moved TFR elsewhere. Tick sections, park each chart, generate — or write the memo yourself and expand a paragraph with AI."
      />
      <div className="container max-w-3xl space-y-8 py-8">
        <div className="space-y-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Pick a country
          </p>
          <BriefingCountryPicker options={options} />
        </div>

        <div className="space-y-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Or start here
          </p>
          <ul className="flex flex-wrap gap-2">
            {FEATURED.map((f) => {
              const c = bySlug.get(f.slug);
              if (!c) return null;
              return (
                <li key={f.slug}>
                  <Link
                    href={`/country/${f.slug}/brief`}
                    className="inline-flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-2 text-sm hover:border-primary/40"
                  >
                    <span>{c.flagEmoji ?? ""}</span>
                    {f.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Every country profile also has a Briefing button. The site takes no
          policy position. Group fertility appears only where a national office
          publishes it.
        </p>
      </div>
    </div>
  );
}
