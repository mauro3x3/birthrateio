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
      <div className="flex h-[560px] items-center justify-center rounded-sm border text-sm text-muted-foreground">
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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(260px,320px)_1fr]">
      <aside className="space-y-5 rounded-sm border bg-card p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Population
          </p>
          <h2 className="mt-1 font-serif text-lg font-semibold tracking-tight">
            Race alone, not Hispanic or Latino
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Plus Hispanic or Latino of any race · ACS {US_DEMOGRAPHICS_META.year}
          </p>
        </div>

        <div className="space-y-1">
          {US_RACE_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroupId(g.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-left text-sm transition-colors",
                g.id === groupId
                  ? "bg-foreground text-background"
                  : "hover:bg-muted",
              )}
            >
              <span>{g.shortLabel}</span>
              <span
                className={cn(
                  "tabular-nums text-xs",
                  g.id === groupId
                    ? "text-background/70"
                    : "text-muted-foreground",
                )}
              >
                {formatNumber(
                  US_DEMOGRAPHICS_META.unitedStates.shares[g.id],
                  1,
                )}
                %
              </span>
            </button>
          ))}
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          {group.description} Figures are from the{" "}
          <a
            href={US_DEMOGRAPHICS_META.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            {US_DEMOGRAPHICS_META.release.name}
          </a>{" "}
          (table B03002). Click a state to open its profile.
        </p>

        <div className="space-y-2 border-t pt-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Percent of population
          </p>
          <ul className="space-y-1.5">
            {US_PCT_LEGEND.map((bin) => (
              <li key={bin.label} className="flex items-center gap-2 text-xs">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-sm border border-black/10"
                  style={{ background: bin.color }}
                />
                {bin.label}
              </li>
            ))}
          </ul>
          <p className="pt-1 text-xs text-muted-foreground">
            U.S. percent ={" "}
            <span className="font-medium tabular-nums text-foreground">
              {formatNumber(usShare, 1)}
            </span>
          </p>
        </div>
      </aside>

      <div className="space-y-4">
        <RegionChoroplethMap
          geoUrl="/geo/us-states.json"
          data={mapData}
          colorFor={usPctColor}
          unit="%"
          decimals={1}
          height={560}
          revision={groupId}
        />

        <div className="rounded-sm border">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-medium">
              States ranked by {group.shortLabel.toLowerCase()} share
            </h3>
          </div>
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">State</th>
                  <th className="px-4 py-2 text-right font-medium">Share</th>
                  <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">
                    Population
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((s, i) => (
                  <tr key={s.fips} className="border-t">
                    <td className="px-4 py-1.5 tabular-nums text-muted-foreground">
                      {i + 1}
                    </td>
                    <td className="px-4 py-1.5">
                      <Link
                        href={`/state/${s.slug}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-4 py-1.5 text-right tabular-nums">
                      {formatNumber(s.shares[groupId], 1)}%
                    </td>
                    <td className="hidden px-4 py-1.5 text-right tabular-nums text-muted-foreground sm:table-cell">
                      {formatCompact(s.population)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
