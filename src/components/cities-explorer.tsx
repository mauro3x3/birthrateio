"use client";

import * as React from "react";
import Link from "next/link";
import { CitiesWorldMap } from "@/components/maps/cities-world-map";
import { Input } from "@/components/ui/input";
import { cn, formatCompact } from "@/lib/utils";

export interface CityRow {
  slug: string;
  name: string;
  population: number | null;
  isCapital: boolean;
  latitude: number | null;
  longitude: number | null;
  country: {
    name: string;
    slug: string;
    flagEmoji: string | null;
    continent: string | null;
  };
}

const REGION_ORDER = [
  "All",
  "Asia",
  "Americas",
  "Europe",
  "Middle East & North Africa",
  "Africa",
] as const;

function regionLabel(r: string) {
  if (r === "Middle East & North Africa") return "MENA";
  return r;
}

export function CitiesExplorer({ cities }: { cities: CityRow[] }) {
  const [q, setQ] = React.useState("");
  const [region, setRegion] = React.useState<string>("All");
  const [highlight, setHighlight] = React.useState<string | null>(null);

  const regions = React.useMemo(() => {
    const present = new Set(
      cities.map((c) => c.country.continent).filter(Boolean) as string[],
    );
    return REGION_ORDER.filter((r) => r === "All" || present.has(r));
  }, [cities]);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return cities.filter((c) => {
      if (region !== "All" && c.country.continent !== region) return false;
      if (!needle) return true;
      return (
        c.name.toLowerCase().includes(needle) ||
        c.country.name.toLowerCase().includes(needle)
      );
    });
  }, [cities, q, region]);

  const mapPoints = React.useMemo(
    () =>
      filtered
        .filter(
          (c) =>
            c.latitude != null &&
            c.longitude != null &&
            c.population != null &&
            c.population > 0,
        )
        .map((c) => ({
          slug: c.slug,
          name: c.name,
          lat: c.latitude!,
          lng: c.longitude!,
          population: c.population!,
          country: c.country.name,
        })),
    [filtered],
  );

  const maxPop = filtered[0]?.population ?? 1;
  const featured = filtered.slice(0, 8);
  const totalPop = filtered.reduce((s, c) => s + (c.population ?? 0), 0);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-sm border border-white/10 bg-black">
        <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-end sm:justify-between sm:px-5">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-white/45">
              Metropolitan population
            </p>
            <h2 className="font-serif text-lg font-semibold text-white sm:text-xl">
              {region === "All" ? "World metros" : regionLabel(region)}
              <span className="ml-2 font-sans text-sm font-normal text-white/50">
                {filtered.length} cities · {formatCompact(totalPop)} people
              </span>
            </h2>
          </div>
          <Input
            placeholder="Search cities or countries…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 max-w-xs border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-white/30"
          />
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)]">
          <CitiesWorldMap
            points={mapPoints}
            highlightedSlug={highlight}
            onHover={setHighlight}
            height={460}
          />

          <div className="flex max-h-[460px] flex-col border-t border-white/10 lg:border-l lg:border-t-0">
            <div className="flex flex-wrap gap-x-1 gap-y-1 border-b border-white/10 px-3 py-2.5">
              {regions.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegion(r)}
                  className={cn(
                    "px-2.5 py-1 text-[0.75rem] font-medium transition-colors",
                    region === r
                      ? "text-white"
                      : "text-white/45 hover:text-white/80",
                  )}
                >
                  {regionLabel(r)}
                </button>
              ))}
            </div>

            <ol className="flex-1 overflow-y-auto">
              {featured.map((c, i) => {
                const pop = c.population ?? 0;
                const share = maxPop ? (pop / maxPop) * 100 : 0;
                const active = highlight === c.slug;
                return (
                  <li key={c.slug}>
                    <Link
                      href={`/city/${c.slug}`}
                      onMouseEnter={() => setHighlight(c.slug)}
                      onMouseLeave={() => setHighlight(null)}
                      className={cn(
                        "group relative block px-4 py-3 transition-colors",
                        active ? "bg-white/10" : "hover:bg-white/[0.06]",
                      )}
                    >
                      <div
                        className="pointer-events-none absolute inset-y-0 left-0 bg-[#c49660]/20 transition-[width]"
                        style={{ width: `${share}%` }}
                        aria-hidden
                      />
                      <div className="relative flex items-baseline gap-3">
                        <span className="w-5 shrink-0 font-mono text-xs text-white/35">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="truncate font-medium text-white group-hover:text-[#f0d5a8]">
                              {c.name}
                            </span>
                            {c.isCapital && (
                              <span className="shrink-0 text-[10px] uppercase tracking-wide text-white/35">
                                capital
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-white/45">
                            {c.country.flagEmoji} {c.country.name}
                          </p>
                        </div>
                        <span className="shrink-0 font-serif text-base tabular-nums text-white/90">
                          {formatCompact(pop)}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
              {featured.length === 0 && (
                <li className="px-4 py-10 text-center text-sm text-white/40">
                  No cities match.
                </li>
              )}
            </ol>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-semibold tracking-tight">
              Full ranking
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              All metros in view, ordered by metropolitan population.
            </p>
          </div>
          <p className="text-sm tabular-nums text-muted-foreground">
            {filtered.length} shown
          </p>
        </div>

        <div className="divide-y border-y">
          {filtered.map((c, i) => {
            const pop = c.population ?? 0;
            const share = maxPop ? (pop / maxPop) * 100 : 0;
            const active = highlight === c.slug;
            return (
              <div
                key={c.slug}
                onMouseEnter={() => setHighlight(c.slug)}
                onMouseLeave={() => setHighlight(null)}
                className={cn(
                  "grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 py-3 transition-colors sm:grid-cols-[2.5rem_minmax(0,1fr)_8rem_auto]",
                  active ? "bg-muted/70" : "hover:bg-muted/40",
                )}
              >
                <span className="pl-1 font-mono text-xs text-muted-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <Link
                      href={`/city/${c.slug}`}
                      className="font-medium hover:text-primary"
                    >
                      {c.name}
                    </Link>
                    {c.isCapital && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        capital
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground sm:hidden">
                    <Link
                      href={`/country/${c.country.slug}`}
                      className="hover:text-foreground"
                    >
                      {c.country.flagEmoji} {c.country.name}
                    </Link>
                  </p>
                  <div
                    className="mt-1.5 h-0.5 max-w-md bg-border"
                    aria-hidden
                  >
                    <div
                      className="h-full bg-primary/50 transition-[width]"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
                <div className="hidden min-w-0 sm:block">
                  <Link
                    href={`/country/${c.country.slug}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <span>{c.country.flagEmoji}</span>
                    <span className="truncate">{c.country.name}</span>
                  </Link>
                </div>
                <Link
                  href={`/city/${c.slug}`}
                  className="pr-1 text-right font-serif text-lg tabular-nums tracking-tight hover:text-primary"
                >
                  {formatCompact(pop)}
                </Link>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No cities found.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
