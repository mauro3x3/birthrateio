"use client";

import Link from "next/link";
import { GlobalSearch } from "@/components/global-search";

const TOPICS = [
  { title: "Fertility", href: "/fertility" },
  { title: "Population", href: "/population" },
  { title: "Migration", href: "/migration" },
  { title: "GDP", href: "/gdp" },
  { title: "Cities", href: "/cities" },
  { title: "Compare", href: "/compare" },
];

export function HomeHero() {
  return (
    <section className="relative flex min-h-[calc(100dvh-3.75rem)] flex-col overflow-hidden bg-brand-navy text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[url('/hero-map.svg')] bg-[length:120%] bg-[center_40%] bg-no-repeat opacity-[0.18]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-navy via-transparent to-brand-navy/40"
        aria-hidden
      />

      <div className="container relative flex flex-1 flex-col justify-center py-16 md:py-20 lg:py-24">
        <div className="max-w-3xl">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-white/55">
            UN · World Bank · OECD
          </p>
          <h1 className="text-balance font-serif text-[2rem] font-semibold leading-[1.15] text-brand-gold md:text-[2.75rem] lg:text-[3.25rem]">
            Research and data on fertility, population, and migration across the
            world.
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-white/75 md:text-lg">
            Charts, maps, and projections for every country — free to read, cite,
            and share.
          </p>
        </div>

        <div className="mt-8 max-w-2xl">
          <GlobalSearch variant="hero" />
          <nav
            aria-label="Topics"
            className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-2 text-sm"
          >
            {TOPICS.map((topic, i) => (
              <span key={topic.href} className="inline-flex items-center">
                {i > 0 && (
                  <span className="mx-2 text-white/25" aria-hidden>
                    ·
                  </span>
                )}
                <Link
                  href={topic.href}
                  className="text-white/70 underline-offset-4 transition-colors hover:text-brand-gold hover:underline"
                >
                  {topic.title}
                </Link>
              </span>
            ))}
            <span className="mx-2 text-white/25" aria-hidden>
              ·
            </span>
            <Link
              href="/topics"
              className="text-white/45 transition-colors hover:text-white"
            >
              All topics
            </Link>
          </nav>
          <p className="mt-3 text-xs text-white/40">
            Press{" "}
            <kbd className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/55">
              ⌘K
            </kbd>{" "}
            anywhere to search
          </p>
        </div>
      </div>
    </section>
  );
}
