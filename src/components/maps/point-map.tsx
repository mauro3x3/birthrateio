"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const InnerPointMap = dynamic(
  () => import("./point-map-inner").then((m) => m.PointMapInner),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
  },
);

export function PointMap({
  lat,
  lng,
  label,
  height = 256,
}: {
  lat: number;
  lng: number;
  label: string;
  height?: number;
}) {
  return <InnerPointMap lat={lat} lng={lng} label={label} height={height} />;
}
