"use client";

import dynamic from "next/dynamic";

const PopulationChangeMap = dynamic(
  () =>
    import("./population-change-map").then((m) => m.PopulationChangeMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(75vh,720px)] w-full items-center justify-center bg-[#e8e8e8] text-sm text-slate-500">
        Loading Europe change tiles…
      </div>
    ),
  },
);

type Props = {
  layer: string;
  bounds: [number, number, number, number];
  minZoom: number;
  maxZoom: number;
  growthColor?: string;
  declineColor?: string;
};

export function PopulationChangeMapLazy(props: Props) {
  return <PopulationChangeMap {...props} />;
}
