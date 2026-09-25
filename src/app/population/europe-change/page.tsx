import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { PopulationChangeMapLazy } from "@/components/maps/population-change-map-lazy";
import euChange from "@/lib/data/europe-popchange-pmtiles.json";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Europe population change 2000–2025 — GHSL map",
  description:
    "Interactive MapLibre map of Europe population growth and decline from GHSL GHS-POP grids, 2000 vs 2025. Green growing settlements, pink declining ones.",
  alternates: { canonical: "/population/europe-change" },
};

export default function EuropePopulationChangePage() {
  return (
    <div className="container space-y-8 py-10">
      <PageHeader
        title={euChange.title}
        description={`GHSL GHS-POP · ${euChange.yearFrom}→${euChange.yearTo} · ${euChange.resolution}. Green grew, pink shrank, gray was empty.`}
      />

      <div className="overflow-hidden border border-border bg-[#e8e8e8]">
        <div className="flex flex-wrap items-center gap-4 border-b border-border/60 bg-white/70 px-4 py-2.5 text-[12px]">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-[1px]"
              style={{ background: euChange.colors.growth }}
            />
            Growth
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-[1px]"
              style={{ background: euChange.colors.decline }}
            />
            Decline
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="inline-block h-2.5 w-2.5 rounded-[1px]"
              style={{ background: euChange.colors.uninhabited }}
            />
            Uninhabited
          </span>
        </div>
        <PopulationChangeMapLazy
          layer={euChange.layer}
          bounds={euChange.bounds as [number, number, number, number]}
          minZoom={euChange.minZoom}
          maxZoom={euChange.maxZoom}
          growthColor={euChange.colors.growth}
          declineColor={euChange.colors.decline}
        />
      </div>

      <section className="max-w-2xl space-y-3">
        <SectionHeading
          title="What you are looking at"
          description={euChange.note}
        />
        <p className="text-sm text-muted-foreground">
          Same visual idea as the well-known GHSL settlement-change maps:
          every inhabited grid cell is either growing or shrinking. Cities
          light up green; emptying countryside and post-industrial belts show
          pink. Zoom in — tiles stream from a single PMTiles archive.
        </p>
        <p className="text-sm text-muted-foreground">
          Source:{" "}
          <a
            href={euChange.sourceUrl}
            className="link-editorial"
            target="_blank"
            rel="noopener noreferrer"
          >
            {euChange.source}
          </a>
          {" · "}
          <Link href="/population" className="link-editorial">
            Population explorer
          </Link>
          {" · "}
          <Link href="/maps/eu" className="link-editorial">
            Europe fertility map
          </Link>
        </p>
      </section>
    </div>
  );
}
