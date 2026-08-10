"use client";

import dynamic from "next/dynamic";
import type { CityMapPoint } from "./cities-world-map-inner";

const Inner = dynamic(
  () =>
    import("./cities-world-map-inner").then((m) => m.CitiesWorldMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[440px] w-full items-center justify-center bg-black text-sm text-white/30">
        Loading map…
      </div>
    ),
  },
);

export function CitiesWorldMap({
  points,
  highlightedSlug,
  onHover,
  height = 440,
}: {
  points: CityMapPoint[];
  highlightedSlug?: string | null;
  onHover?: (slug: string | null) => void;
  height?: number;
}) {
  return (
    <Inner
      points={points}
      highlightedSlug={highlightedSlug}
      onHover={onHover}
      height={height}
    />
  );
}
