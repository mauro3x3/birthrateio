"use client";

import dynamic from "next/dynamic";
import type { CountryMapEntry } from "@/lib/country-map-atlas";
import type { CountryOption } from "@/components/country-multi-select";

const PopulationRegionCompare = dynamic(
  () =>
    import("@/components/maps/population-region-compare").then(
      (m) => m.PopulationRegionCompare,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center border border-border text-sm text-muted-foreground lg:h-[560px]">
        Loading map…
      </div>
    ),
  },
);

export function PopulationRegionCompareLazy({
  atlas,
  countryOptions,
}: {
  atlas: CountryMapEntry[];
  countryOptions: CountryOption[];
}) {
  return (
    <PopulationRegionCompare atlas={atlas} countryOptions={countryOptions} />
  );
}
