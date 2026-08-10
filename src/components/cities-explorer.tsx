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
  const totalPop = filtered.reduce((s, c) => s + (c.population ?? 0), 0);

  return (
    <div className="flex h-[calc(100dvh-3.75rem)] min-h-[32rem] flex-col bg-[hsl(213_55%_8%)] text-white">
      <header className="flex shrink-0 flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/40">
            Cities
          </p>
          <h1 className="truncate font-serif text-xl font-semibold tracking-tight text-white sm:text-2xl">
            {region === "All" ? "World metros" : regionLabel(region)}
            <span className="ml-2 font-sans text-sm font-normal text-white/60">
              {filtered.length} cities · {formatCompact(totalPop)} people
            </span>
          </h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-0.5">
            {regions.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRegion(r)}
                className={cn(
                  "px-2.5 py-1.5 text-[0.75rem] font-medium transition-colors",
                  region === r
                    ? "text-white"
                    : "text-white/40 hover:text-white/75",
                )}
              >
                {regionLabel(r)}
              </button>
            ))}
          </div>
          <Input
            placeholder="Search cities or countries…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 w-full border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-white/30 sm:w-56"
          />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(14rem,1fr)_minmax(0,1.15fr)] lg:grid-cols-[minmax(0,1.4fr)_minmax(20rem,22rem)] lg:grid-rows-none xl:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]">
        <div className="relative min-h-0">
          <CitiesWorldMap
            points={mapPoints}
            highlightedSlug={highlight}
            onHover={setHighlight}
            fill
          />
        </div>

        <aside className="flex min-h-0 flex-col border-t border-white/10 lg:border-l lg:border-t-0">
          <div className="flex shrink-0 items-baseline justify-between gap-2 border-b border-white/10 px-4 py-2.5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/40">
              Ranked by metro population
            </p>
            <p className="text-xs tabular-nums text-white/35">
              {filtered.length}
            </p>
          </div>

          <ol className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {filtered.map((c, i) => {
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
                      "group relative block px-4 py-2.5 transition-colors",
                      active ? "bg-white/10" : "hover:bg-white/[0.06]",
                    )}
                  >
                    <div
                      className="pointer-events-none absolute inset-y-0 left-0 bg-[#c49660]/18 transition-[width]"
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
            {filtered.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-white/40">
                No cities match.
              </li>
            )}
          </ol>
        </aside>
      </div>
    </div>
  );
}
