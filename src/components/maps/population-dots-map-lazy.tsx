"use client";

import dynamic from "next/dynamic";

const PopulationDotsMap = dynamic(
  () =>
    import("./population-dots-map").then((m) => m.PopulationDotsMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(70vh,640px)] w-full items-center justify-center bg-[hsl(215_40%_8%)] text-sm text-white/60">
        Loading population tiles…
      </div>
    ),
  },
);

type Props = {
  url: string;
  layer: string;
  bounds: [number, number, number, number];
  minZoom: number;
  maxZoom: number;
};

export function PopulationDotsMapLazy(props: Props) {
  return <PopulationDotsMap {...props} />;
}
