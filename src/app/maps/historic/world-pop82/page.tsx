import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  WorldPop82SeriesExplorer,
  type WorldPop82YearPack,
} from "@/components/world-pop82-series-explorer";
import type { HistoricMapPack } from "@/components/historic-map-explorer";
import type { HistoricMapEntry } from "@/lib/sources/historic-maps-data";
import series from "@/lib/data/world-pop82-series.json";
import pack1914 from "@/lib/data/historic-world-pop82-1914.json";
import pack1945 from "@/lib/data/historic-world-pop82-1945.json";
import pack1990 from "@/lib/data/historic-world-pop82-1990.json";
import pack2026 from "@/lib/data/historic-world-pop82-2026.json";
import pack2050 from "@/lib/data/historic-world-pop82-2050.json";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "World in 82 equal-population regions — 1914 to 2050",
  description:
    series.blurb,
  alternates: { canonical: "/maps/historic/world-pop82" },
};

const PACKS: Record<number, HistoricMapPack> = {
  1914: pack1914 as unknown as HistoricMapPack,
  1945: pack1945 as unknown as HistoricMapPack,
  1990: pack1990 as unknown as HistoricMapPack,
  2026: pack2026 as unknown as HistoricMapPack,
  2050: pack2050 as unknown as HistoricMapPack,
};

function metaFor(
  year: number,
  pack: HistoricMapPack,
  digitized?: boolean,
): HistoricMapEntry {
  const target = pack.totalPopulation
    ? Math.round(pack.totalPopulation / Math.max(pack.areas.length, 1))
    : 0;
  return {
    id: pack.id,
    slug: pack.slug,
    title: pack.title,
    empire: "World",
    year,
    metric: "equal-population",
    kind: "choropleth",
    status: "live",
    region: "Overview",
    blurb: digitized
      ? "Hand-digitized MapPorn reconstruction — each tile ≈ 20 million people in 1914."
      : `Algorithmic equal-population partition — about ${(target / 1e6).toFixed(0)} million people per region in ${year}.`,
    source: pack.source,
    sourceUrl: pack.sourceUrl,
    geoUrl: pack.geoUrl,
  };
}

export default function WorldPop82SeriesPage() {
  const years: WorldPop82YearPack[] = [
    {
      year: 1914,
      digitized: true,
      pack: PACKS[1914]!,
      meta: metaFor(1914, PACKS[1914]!, true),
      worldPop: PACKS[1914]!.totalPopulation,
      targetPop: PACKS[1914]!.totalPopulation
        ? Math.round(PACKS[1914]!.totalPopulation! / 82)
        : undefined,
    },
    ...series.years.map((y) => {
      const pack = PACKS[y.year]!;
      return {
        year: y.year,
        pack,
        meta: metaFor(y.year, pack),
        targetPop: y.targetPop,
        worldPop: y.worldPop,
      };
    }),
  ];

  return (
    <div>
      <PageHeader
        title={series.title}
        description={series.blurb}
      />
      <div className="container space-y-6 py-6 md:py-8">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Also listed under{" "}
          <Link href="/maps/historic" className="link-editorial">
            historic maps
          </Link>
          . Standalone 1914 page:{" "}
          <Link
            href="/maps/historic/world-pop82-1914"
            className="link-editorial"
          >
            equal-population 1914
          </Link>
          .
        </p>
        <WorldPop82SeriesExplorer years={years} />
      </div>
    </div>
  );
}
