"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  US_DEMOGRAPHICS_META,
  US_PCT_LEGEND,
  US_RACE_GROUPS,
  US_STATE_RACE,
  getUsRaceGroup,
  usPctColor,
  type UsRaceGroupId,
} from "@/lib/sources/us-demographics-data";
import { formatCompact, formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

const RegionChoroplethMap = dynamic(
  () =>
    import("@/components/maps/region-choropleth-map").then(
      (m) => m.RegionChoroplethMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[520px] items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground">
        Loading map…
      </div>
    ),
  },
);

export function UsDemographicsExplorer({
  initialGroup = "white_nh",
}: {
  initialGroup?: UsRaceGroupId;
}) {
  const [groupId, setGroupId] = React.useState<UsRaceGroupId>(initialGroup);
  const group = getUsRaceGroup(groupId);
  const usShare = US_DEMOGRAPHICS_META.unitedStates.shares[groupId];

  const mapData = React.useMemo(
    () =>
      US_STATE_RACE.map((s) => ({
        id: s.fips,
        slug: s.slug,
        name: s.name,
        value: s.shares[groupId],
      })),
    [groupId],
  );

  const ranked = React.useMemo(
    () =>
      [...US_STATE_RACE].sort(
        (a, b) => b.shares[groupId] - a.shares[groupId],
      ),
    [groupId],
  );

  const highest = ranked[0];
  const lowest = ranked[ranked.length - 1];

  const legend = React.useMemo(
    () => US_PCT_LEGEND.map((b) => ({ label: b.label, color: b.color })),
    [],
  );

  return (
    <div className="space-y-6">
      {/* Metric switcher */}
      <div className="flex flex-wrap gap-1.5">
        {US_RACE_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGroupId(g.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm transition-colors",
              g.id === groupId
                ? "bg-foreground text-background"
                : "border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground",
            )}
          >
            {g.shortLabel}
            <span
              className={cn(
                "ml-1.5 tabular-nums text-xs",
                g.id === groupId ? "text-background/65" : "text-muted-foreground/80",
              )}
            >
              {formatNumber(US_DEMOGRAPHICS_META.unitedStates.shares[g.id], 1)}%
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl font-semibold tracking-tight">
                {group.label}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Share of state population · ACS {US_DEMOGRAPHICS_META.year}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              U.S. overall{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {formatNumber(usShare, 1)}%
              </span>
            </p>
          </div>

          <RegionChoroplethMap
            geoUrl="/geo/us-states.json"
            data={mapData}
            colorFor={usPctColor}
            unit="%"
            decimals={1}
            height={520}
            revision={groupId}
            variant="light"
            legend={legend}
            fit="usa"
          />

          <p className="text-xs leading-relaxed text-muted-foreground">
            {group.description} Click a state for its profile. Source:{" "}
            <a
              href={US_DEMOGRAPHICS_META.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {US_DEMOGRAPHICS_META.release.name}
            </a>
            .
          </p>
        </div>

        <aside className="space-y-4">
          <div className="rounded-md border bg-card p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Range
            </p>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Highest</dt>
                <dd className="text-right">
                  <Link
                    href={`/state/${highest.slug}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {highest.name}
                  </Link>
                  <span className="ml-2 tabular-nums text-muted-foreground">
                    {formatNumber(highest.shares[groupId], 1)}%
                  </span>
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t pt-3">
                <dt className="text-muted-foreground">Lowest</dt>
                <dd className="text-right">
                  <Link
                    href={`/state/${lowest.slug}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {lowest.name}
                  </Link>
                  <span className="ml-2 tabular-nums text-muted-foreground">
                    {formatNumber(lowest.shares[groupId], 1)}%
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <div className="overflow-hidden rounded-md border bg-card">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-medium">States ranked</h3>
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">State</th>
                    <th className="px-3 py-2 text-right font-medium">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((s, i) => (
                    <tr key={s.fips} className="border-t">
                      <td className="px-3 py-1.5 tabular-nums text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="px-3 py-1.5">
                        <Link
                          href={`/state/${s.slug}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {s.name}
                        </Link>
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {formatNumber(s.shares[groupId], 1)}%
                        <span className="ml-1.5 hidden text-[10px] text-muted-foreground sm:inline">
                          {formatCompact(s.population)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
