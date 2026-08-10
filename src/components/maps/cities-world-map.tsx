"use client";

import dynamic from "next/dynamic";
import type { CityMapPoint } from "./cities-world-map-inner";
import { cn } from "@/lib/utils";

const Inner = dynamic(
  () =>
    import("./cities-world-map-inner").then((m) => m.CitiesWorldMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[18rem] w-full items-center justify-center bg-[hsl(213_55%_8%)] text-sm text-white/30">
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
  fill = false,
}: {
  points: CityMapPoint[];
  highlightedSlug?: string | null;
  onHover?: (slug: string | null) => void;
  height?: number;
  /** Fill the parent container instead of a fixed pixel height. */
  fill?: boolean;
}) {
  return (
    <div className={cn(fill && "absolute inset-0")}>
      <Inner
        points={points}
        highlightedSlug={highlightedSlug}
        onHover={onHover}
        height={fill ? "100%" : height}
      />
    </div>
  );
}
