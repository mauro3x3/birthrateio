"use client";

import { PopulationPyramid, type PyramidRow } from "@/components/charts/population-pyramid";
import Link from "next/link";

export function BriefingPyramidCard({
  year,
  rows,
  countrySlug,
  countryName,
}: {
  year: number;
  rows: PyramidRow[];
  countrySlug: string;
  countryName: string;
}) {
  if (!rows.length) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-white px-3.5 pb-2 pt-3.5 text-slate-900">
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <div>
            <p className="font-sans text-sm font-semibold leading-tight text-slate-900">
              Age pyramid, {countryName}
            </p>
            <p className="text-xs text-slate-500">
              {year} · male (left) / female (right)
            </p>
          </div>
          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
            people
          </span>
        </div>
        <PopulationPyramid rows={rows} height={320} showSummary={false} />
        <div className="mt-1.5 flex items-center justify-between border-t border-slate-200 pt-1.5">
          <span className="text-[10px] text-slate-400">
            World Bank population by age and sex.{" "}
            <Link
              href={`/country/${countrySlug}#demography`}
              className="underline underline-offset-2"
            >
              Open full pyramid
            </Link>
          </span>
          <span className="font-serif text-[11px] font-semibold text-slate-900">
            birthrate<span className="text-primary">.io</span>
          </span>
        </div>
      </div>
    </div>
  );
}
