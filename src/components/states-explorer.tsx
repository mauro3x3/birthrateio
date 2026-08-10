"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { buildColorScale } from "@/lib/color-scale";
import { formatCompact, formatNumber, cn } from "@/lib/utils";

const RegionChoroplethMap = dynamic(
  () =>
    import("@/components/maps/region-choropleth-map").then(
      (m) => m.RegionChoroplethMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground">
        Loading map…
      </div>
    ),
  },
);

export type StatesCountryBlock = {
  slug: string;
  name: string;
  iso3: string;
  flagEmoji: string | null;
  geoUrl: string | null;
  divisions: {
    slug: string;
    name: string;
    kind: string;
    population: number | null;
    tfr: number | null;
    tfrYear: number | null;
  }[];
};

const GEO_BY_ISO3: Record<string, string> = {
  USA: "/geo/admin1-usa.json",
  DEU: "/geo/admin1-deu.json",
  IND: "/geo/admin1-ind.json",
  CHN: "/geo/admin1-chn.json",
  RUS: "/geo/admin1-rus.json",
};

function CountrySection({ country }: { country: StatesCountryBlock }) {
  const geoUrl = country.geoUrl ?? GEO_BY_ISO3[country.iso3] ?? null;
  const withTfr = country.divisions.filter((d) => d.tfr != null);

  const scale = React.useMemo(() => {
    // Ignore implausible TFRs so a bad seed row can't blow the colour domain.
    const vals = withTfr
      .map((d) => d.tfr!)
      .filter((v) => v >= 0.5 && v <= 8);
    return buildColorScale(vals, "diverging", 2.1);
  }, [withTfr]);

  const mapData = React.useMemo(
    () =>
      withTfr
        .filter((d) => d.tfr != null && d.tfr >= 0.5 && d.tfr <= 8)
        .map((d) => ({
          id: d.slug,
          slug: d.slug,
          name: d.name,
          value: d.tfr!,
        })),
    [withTfr],
  );

  const legend = React.useMemo(() => {
    if (!Number.isFinite(scale.min) || !Number.isFinite(scale.max)) return [];
    const mid = scale.mid ?? 2.1;
    const stops = [
      { value: scale.min, color: scale.color(scale.min) },
      { value: mid, color: scale.color(mid) },
      { value: scale.max, color: scale.color(scale.max) },
    ];
    // Dedupe if mid is outside [min,max]
    const seen = new Set<string>();
    return stops
      .filter((s) => {
        const k = s.value.toFixed(2);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .sort((a, b) => a.value - b.value)
      .map((s) => ({
        label: formatNumber(s.value, 2),
        color: s.color,
      }));
  }, [scale]);

  const year =
    withTfr.find((d) => d.tfrYear != null)?.tfrYear ?? null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            <Link href={`/country/${country.slug}`} className="hover:underline">
              {country.flagEmoji ? `${country.flagEmoji} ` : ""}
              {country.name}
            </Link>
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Total fertility rate by{" "}
            {country.iso3 === "DEU"
              ? "Land"
              : country.iso3 === "CHN"
                ? "province"
                : country.iso3 === "RUS"
                  ? "region"
                  : "state"}
            {year != null ? ` · ${year}` : ""}
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {country.divisions.length} divisions
          {withTfr.length < country.divisions.length
            ? ` · ${withTfr.length} with TFR`
            : ""}
        </span>
      </div>

      {geoUrl && mapData.length > 0 && (
        <RegionChoroplethMap
          geoUrl={geoUrl}
          data={mapData}
          colorFor={scale.color}
          unit="births / woman"
          decimals={2}
          height={420}
          revision={`${country.iso3}-${year ?? "x"}`}
          variant="light"
          fit={country.iso3 === "USA" ? "usa" : "bounds"}
          legend={legend}
        />
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium text-right">Population</th>
              <th className="px-4 py-3 font-medium text-right">TFR</th>
            </tr>
          </thead>
          <tbody>
            {[...country.divisions]
              .sort((a, b) => (b.tfr ?? -1) - (a.tfr ?? -1))
              .map((d) => (
                <tr
                  key={d.slug}
                  className="border-b border-border/60 last:border-0"
                >
                  <td className="px-4 py-2.5 font-medium">
                    <Link
                      href={`/state/${d.slug}`}
                      className="hover:underline"
                    >
                      {d.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {d.kind.replace(/-/g, " ")}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {d.population != null ? formatCompact(d.population) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {d.tfr != null ? (
                      <span className="inline-flex items-center justify-end gap-2">
                        <span
                          className="hidden h-2.5 w-2.5 rounded-sm border border-black/10 sm:inline-block"
                          style={{ background: scale.color(d.tfr) }}
                          aria-hidden
                        />
                        {formatNumber(d.tfr, 2)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function StatesExplorer({ countries }: { countries: StatesCountryBlock[] }) {
  const withMaps = countries.filter(
    (c) => GEO_BY_ISO3[c.iso3] || c.geoUrl,
  );
  const [active, setActive] = React.useState<string | null>(
    withMaps[0]?.iso3 ?? null,
  );

  const shown = active
    ? countries.filter((c) => c.iso3 === active)
    : countries;

  return (
    <div className="space-y-10">
      {withMaps.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {withMaps.map((c) => (
            <button
              key={c.iso3}
              type="button"
              onClick={() => setActive(c.iso3)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm transition-colors",
                active === c.iso3
                  ? "bg-foreground text-background"
                  : "border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground",
              )}
            >
              {c.flagEmoji ? `${c.flagEmoji} ` : ""}
              {c.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setActive(null)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm transition-colors",
              active === null
                ? "bg-foreground text-background"
                : "border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground",
            )}
          >
            All
          </button>
        </div>
      )}

      {(active ? shown : countries).map((c) => (
        <CountrySection key={c.slug} country={c} />
      ))}
    </div>
  );
}
