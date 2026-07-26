"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GlobalSearch } from "@/components/global-search";
import { formatCompact } from "@/lib/utils";

type HeroStats = {
  countries: number;
  indicators: number;
  values: number;
  releases: number;
};

export function HomeHero({ stats }: { stats: HeroStats }) {
  return (
    <section className="relative overflow-hidden bg-brand-navy text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[url('/hero-map.svg')] bg-[length:120%] bg-[center_40%] bg-no-repeat opacity-[0.18]"
        aria-hidden
      />
      <div className="container relative py-12 md:py-16 lg:py-20">
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
        </div>

        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          {[
            { label: "countries", value: stats.countries },
            { label: "indicators", value: stats.indicators },
            { label: "data points", value: formatCompact(stats.values) },
            { label: "releases tracked", value: stats.releases },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-sm border border-white/15 bg-white/5 px-3 py-1.5 text-white/85"
            >
              <span className="font-semibold tabular-nums text-white">
                {s.value}
              </span>{" "}
              <span className="text-white/65">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          <Link
            href="/fertility"
            className="inline-flex items-center gap-1 font-medium text-white hover:underline"
          >
            Browse fertility data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/simulator"
            className="inline-flex items-center gap-1 text-white/70 hover:text-white hover:underline"
          >
            Try the demographic simulator
          </Link>
        </div>
      </div>
    </section>
  );
}
